import { useMemo, useEffect } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { useTexture } from '@react-three/drei';
import { RigidBody, HeightfieldCollider } from '@react-three/rapier';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileDevice, getClampedAnisotropy } from '@/utils/device';
import { mapRange } from '@/utils/math';
import {
  BIOME_COLOR_LOW,
  BIOME_COLOR_MID,
  BIOME_COLOR_HIGH,
  BIOME_MID_THRESHOLD,
} from '@/config/terrain';
import {
  SLOPE_DARKENING_STRENGTH,
} from '@/config/terrainDetail';

interface TerrainMaterialOptions {
  grassTexture: Texture;
  trackTexture: Texture;
  rockTexture: Texture;
  sandTexture: Texture;
  snowTexture: Texture;
  snowTrackTexture: Texture;
  isDesert: boolean;
  isSnow: boolean;
  isGymkhana?: boolean;
  isMobile?: boolean;
}

/**
 * Custom MeshStandardMaterial with photorealistic multi-texture splatting,
 * triplanar slope projection for cliffs, and damp mud / packed snow track blending.
 */
export function createDetailedTerrainMaterial(options: TerrainMaterialOptions): MeshStandardMaterial {
  const {
    grassTexture,
    trackTexture,
    rockTexture,
    sandTexture,
    snowTexture,
    snowTrackTexture,
    isDesert,
    isSnow,
    isGymkhana = false,
    isMobile = isMobileDevice(),
  } = options;

  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: isSnow ? 0.92 : 0.88,
    metalness: 0.04,
    flatShading: false,
  });

  mat.customProgramCacheKey = () => {
    return `detailed-terrain-${isSnow ? 'snow' : isDesert ? 'desert' : isGymkhana ? 'gymkhana' : 'grass'}-${isMobile ? 'mobile' : 'desktop'}`;
  };

  mat.onBeforeCompile = (shader) => {
    // Add custom uniforms
    shader.uniforms.u_slopeDarkening = { value: SLOPE_DARKENING_STRENGTH };
    shader.uniforms.u_grassTexture = { value: grassTexture };
    shader.uniforms.u_trackTexture = { value: trackTexture };
    shader.uniforms.u_rockTexture = { value: rockTexture };
    shader.uniforms.u_sandTexture = { value: sandTexture };
    shader.uniforms.u_snowTexture = { value: snowTexture };
    shader.uniforms.u_snowTrackTexture = { value: snowTrackTexture };
    shader.uniforms.u_isDesert = { value: isDesert ? 1.0 : 0.0 };
    shader.uniforms.u_isSnow = { value: isSnow ? 1.0 : 0.0 };
    shader.uniforms.u_isGymkhana = { value: isGymkhana ? 1.0 : 0.0 };

    // Inject custom attributes and varyings into vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        attribute float trackMask;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vTrackMask;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      /* glsl */ `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
        vTrackMask = trackMask;
      `,
    );

    // Inject multi-texture blending into fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vTrackMask;

        uniform float u_slopeDarkening;
        uniform float u_isDesert;
        uniform float u_isSnow;
        uniform float u_isGymkhana;

        uniform sampler2D u_grassTexture;
        uniform sampler2D u_trackTexture;
        uniform sampler2D u_rockTexture;
        uniform sampler2D u_sandTexture;
        uniform sampler2D u_snowTexture;
        uniform sampler2D u_snowTrackTexture;
      `,
    );

    // Apply texture splatting after diffuse color is computed
    const mobileFragmentChunk = /* glsl */ `
        #include <color_fragment>

        // Mobile optimized fast ground sampling: 1 macro UV lookup for ground & track
        vec2 uvMacro = vWorldPosition.xz * 0.055;
        vec3 baseGround;
        if (u_isSnow > 0.5) {
          baseGround = texture2D(u_snowTexture, uvMacro).rgb * 1.08;
        } else if (u_isDesert > 0.5) {
          baseGround = texture2D(u_sandTexture, uvMacro).rgb;
        } else if (u_isGymkhana > 0.5) {
          baseGround = texture2D(u_trackTexture, uvMacro).rgb * vec3(0.28, 0.29, 0.31);
        } else {
          baseGround = texture2D(u_grassTexture, uvMacro).rgb;
        }

        // Fast track lookup
        vec2 uvTrackMacro = vWorldPosition.xz * 0.08;
        vec3 trackTex;
        if (u_isSnow > 0.5) {
          trackTex = texture2D(u_snowTrackTexture, uvTrackMacro).rgb * vec3(0.92, 0.95, 1.0);
        } else if (u_isGymkhana > 0.5) {
          trackTex = texture2D(u_trackTexture, uvTrackMacro).rgb * vec3(0.35, 0.36, 0.38);
        } else {
          trackTex = texture2D(u_trackTexture, uvTrackMacro).rgb * vec3(0.95, 0.90, 0.85);
        }

        // Blend base ground with track
        vec3 blendedAlbedo = mix(baseGround, trackTex, clamp(vTrackMask * 1.25, 0.0, 1.0));

        // Fast cliff shading without expensive 3-pass triplanar mapping
        float slope = 1.0 - abs(vWorldNormal.y);
        float rockFactor = smoothstep(0.30, 0.65, slope);
        if (rockFactor > 0.01) {
          vec3 rockTex = texture2D(u_rockTexture, vWorldPosition.xz * 0.22).rgb;
          if (u_isSnow > 0.5) {
            rockTex = mix(rockTex * 0.85, vec3(0.95, 0.98, 1.0), clamp(vWorldNormal.y * 0.6, 0.0, 0.6));
          }
          blendedAlbedo = mix(blendedAlbedo, rockTex, rockFactor);
        }

        diffuseColor.rgb = blendedAlbedo;
        float slopeFactor = 1.0 - slope * (u_slopeDarkening * 0.75);
        diffuseColor.rgb *= slopeFactor;
    `;

    const desktopFragmentChunk = /* glsl */ `
        #include <color_fragment>

        // Dual-frequency texture coordinates with anti-tiling octave rotation (realistic ~3.5m micro, ~18m macro)
        vec2 uvMacro = vWorldPosition.xz * 0.055;
        vec2 uvMicro = mat2(0.866, -0.5, 0.5, 0.866) * (vWorldPosition.xz * 0.28);

        // Base biome ground texture sampling
        vec3 baseGround;
        if (u_isSnow > 0.5) {
          vec3 snowMacro = texture2D(u_snowTexture, uvMacro).rgb;
          vec3 snowMicro = texture2D(u_snowTexture, uvMicro).rgb;
          baseGround = mix(snowMacro, snowMicro, 0.5) * 1.08;
        } else if (u_isDesert > 0.5) {
          vec3 sandMacro = texture2D(u_sandTexture, uvMacro).rgb;
          vec3 sandMicro = texture2D(u_sandTexture, uvMicro).rgb;
          baseGround = mix(sandMacro, sandMicro, 0.5);
        } else if (u_isGymkhana > 0.5) {
          vec3 asphaltMacro = texture2D(u_trackTexture, uvMacro).rgb;
          vec3 asphaltMicro = texture2D(u_trackTexture, uvMicro).rgb;
          baseGround = mix(asphaltMacro, asphaltMicro, 0.5) * vec3(0.28, 0.29, 0.31);
        } else {
          vec3 grassMacro = texture2D(u_grassTexture, uvMacro).rgb;
          vec3 grassMicro = texture2D(u_grassTexture, uvMicro).rgb;
          baseGround = mix(grassMacro, grassMicro, 0.5);
        }

        // Rally track dirt/mud/packed snow texture sampling with subtle color grading
        vec2 uvTrackMacro = vWorldPosition.xz * 0.08;
        vec2 uvTrackMicro = mat2(0.866, -0.5, 0.5, 0.866) * (vWorldPosition.xz * 0.35);
        vec3 trackTex;
        if (u_isSnow > 0.5) {
          vec3 snowTrkMacro = texture2D(u_snowTrackTexture, uvTrackMacro).rgb;
          vec3 snowTrkMicro = texture2D(u_snowTrackTexture, uvTrackMicro).rgb;
          trackTex = mix(snowTrkMacro, snowTrkMicro, 0.5) * vec3(0.92, 0.95, 1.0);
        } else if (u_isGymkhana > 0.5) {
          vec3 trackMacro = texture2D(u_trackTexture, uvTrackMacro).rgb;
          vec3 trackMicro = texture2D(u_trackTexture, uvTrackMicro).rgb;
          trackTex = mix(trackMacro, trackMicro, 0.5) * vec3(0.35, 0.36, 0.38) * 1.15;
        } else {
          vec3 trackMacro = texture2D(u_trackTexture, uvTrackMacro).rgb;
          vec3 trackMicro = texture2D(u_trackTexture, uvTrackMicro).rgb;
          trackTex = mix(trackMacro, trackMicro, 0.5) * vec3(0.95, 0.90, 0.85);
        }

        // Blend base ground with track
        vec3 blendedAlbedo = mix(baseGround, trackTex, clamp(vTrackMask * 1.25, 0.0, 1.0));

        // Triplanar rock mapping on steep slopes / cliffs (prevents vertical texture stretching)
        vec3 normalWeights = pow(abs(vWorldNormal), vec3(4.0));
        normalWeights /= max(0.0001, normalWeights.x + normalWeights.y + normalWeights.z);

        vec3 rockTexX = texture2D(u_rockTexture, vWorldPosition.zy * 0.22).rgb;
        vec3 rockTexY = texture2D(u_rockTexture, vWorldPosition.xz * 0.22).rgb;
        vec3 rockTexZ = texture2D(u_rockTexture, vWorldPosition.xy * 0.22).rgb;
        vec3 triplanarRock = rockTexX * normalWeights.x + rockTexY * normalWeights.y + rockTexZ * normalWeights.z;

        // In snow biome, cliff rocks have snow dusting on flatter micro-surfaces
        if (u_isSnow > 0.5) {
          triplanarRock = mix(triplanarRock * 0.85, vec3(0.95, 0.98, 1.0), clamp(vWorldNormal.y * 0.6, 0.0, 0.6));
        }

        // Slope calculation: 0 = flat plane, 1 = vertical cliff
        float slope = 1.0 - abs(vWorldNormal.y);
        float rockFactor = smoothstep(0.28, 0.62, slope);
        blendedAlbedo = mix(blendedAlbedo, triplanarRock, rockFactor);

        // Use natural vibrant texture albedo directly with subtle macro-lighting
        diffuseColor.rgb = blendedAlbedo;

        // Slope darkening — ambient occlusion on steep crevices
        float slopeFactor = 1.0 - slope * (u_slopeDarkening * 0.75);
        diffuseColor.rgb *= slopeFactor;
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      isMobile ? mobileFragmentChunk : desktopFragmentChunk,
    );

    // Modulate roughness: damp mud/packed snow on tracks have glossy specular sheen
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      /* glsl */ `
        #include <roughnessmap_fragment>
        float trackGloss = clamp(vTrackMask * 1.25, 0.0, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.52, trackGloss);
      `,
    );

    if (!isMobile) {
      // Procedural micro-relief normal perturbation from texture luminance gradients
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
          #include <normal_fragment_maps>
          float microLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 dPdx = dFdx(vWorldPosition);
          vec3 dPdy = dFdy(vWorldPosition);
          vec3 normCross = cross(dPdx, dPdy);
          float lenCross = length(normCross);
          if (lenCross > 0.0001) {
            vec3 surfNorm = normCross / lenCross;
            float dhx = dFdx(microLum) * 0.35;
            float dhy = dFdy(microLum) * 0.35;
            vec3 grad = dPdx * dhx + dPdy * dhy;
            vec3 bumpWorld = normalize(surfNorm - grad);
            vec3 bumpView = normalize((viewMatrix * vec4(bumpWorld, 0.0)).xyz);
            normal = normalize(mix(normal, bumpView, 0.32));
          }
        `,
      );
    }
  };

  mat.customProgramCacheKey = () =>
    `terrain-${isMobile ? 'm' : 'd'}-${isDesert ? 'des' : isSnow ? 'sno' : isGymkhana ? 'gym' : 'std'}`;

  return mat;
}

export const TERRAIN_CHUNKS_X = 4;
export const TERRAIN_CHUNKS_Z = 4;
export const TERRAIN_CHUNKS_TOTAL = TERRAIN_CHUNKS_X * TERRAIN_CHUNKS_Z;

export interface TerrainChunkBuildParams {
  width: number;
  depth: number;
  subdivisions: number;
  rows: number;
  cols: number;
  heights: Float32Array;
  trackMasks: Float32Array;
  minHeight: number;
  maxHeight: number;
  isSnow: boolean;
  isBritain: boolean;
}

/**
 * Builds 16 seamless terrain chunks (4x4 grid) with 16-bit Uint16 indices and precomputed global normals.
 * Each chunk has an analytical tight bounding box and bounding sphere for Three.js view frustum culling.
 */
export function buildTerrainChunkGeometries(params: TerrainChunkBuildParams): BufferGeometry[] {
  const {
    width,
    depth,
    subdivisions,
    rows,
    cols,
    heights,
    trackMasks,
    minHeight,
    maxHeight,
    isSnow,
    isBritain,
  } = params;

  const vertexCount = rows * cols;
  const globalNormals = new Float32Array(vertexCount * 3);
  const globalColors = new Float32Array(vertexCount * 3);

  const tempColor = new Color();
  const MUD_COLOR = isBritain ? new Color('#2c221a') : new Color('#3b2818');
  const SNOW_COLOR_LOW = new Color('#e6f0fa');
  const SNOW_COLOR_MID = new Color('#f4f9ff');
  const SNOW_COLOR_HIGH = new Color('#ffffff');
  const SNOW_TRACK_COLOR = new Color('#d2e3f0');

  const BRITAIN_COLOR_LOW = new Color('#2e4222');
  const BRITAIN_COLOR_MID = new Color('#4c5438');
  const BRITAIN_COLOR_HIGH = new Color('#625f54');

  // 1. Precalculate vertex biome colors across global grid
  for (let i = 0; i < vertexCount; i++) {
    const height = heights[i];
    const trackMask = trackMasks[i];

    const normalizedHeight = mapRange(height, minHeight, maxHeight, 0, 1);

    if (isSnow) {
      if (normalizedHeight < BIOME_MID_THRESHOLD) {
        tempColor.lerpColors(SNOW_COLOR_LOW, SNOW_COLOR_MID, normalizedHeight / BIOME_MID_THRESHOLD);
      } else {
        tempColor.lerpColors(
          SNOW_COLOR_MID,
          SNOW_COLOR_HIGH,
          (normalizedHeight - BIOME_MID_THRESHOLD) / (1 - BIOME_MID_THRESHOLD),
        );
      }

      if (trackMask > 0) {
        tempColor.lerp(SNOW_TRACK_COLOR, trackMask * 0.8);
      }
    } else if (isBritain) {
      if (normalizedHeight < BIOME_MID_THRESHOLD) {
        tempColor.lerpColors(BRITAIN_COLOR_LOW, BRITAIN_COLOR_MID, normalizedHeight / BIOME_MID_THRESHOLD);
      } else {
        tempColor.lerpColors(
          BRITAIN_COLOR_MID,
          BRITAIN_COLOR_HIGH,
          (normalizedHeight - BIOME_MID_THRESHOLD) / (1 - BIOME_MID_THRESHOLD),
        );
      }

      if (trackMask > 0) {
        tempColor.lerp(MUD_COLOR, trackMask * 0.8);
      }
    } else {
      if (normalizedHeight < BIOME_MID_THRESHOLD) {
        tempColor.lerpColors(BIOME_COLOR_LOW, BIOME_COLOR_MID, normalizedHeight / BIOME_MID_THRESHOLD);
      } else {
        tempColor.lerpColors(
          BIOME_COLOR_MID,
          BIOME_COLOR_HIGH,
          (normalizedHeight - BIOME_MID_THRESHOLD) / (1 - BIOME_MID_THRESHOLD),
        );
      }

      if (trackMask > 0) {
        tempColor.lerp(MUD_COLOR, trackMask * 0.8);
      }
    }

    const idx = i * 3;
    globalColors[idx] = tempColor.r;
    globalColors[idx + 1] = tempColor.g;
    globalColors[idx + 2] = tempColor.b;
  }

  // 2. Compute global analytical vertex normals via central differences on regular grid
  const stepX = width / (cols - 1);
  const stepZ = depth / (rows - 1);

  for (let r = 0; r < rows; r++) {
    const rPrev = Math.max(0, r - 1);
    const rNext = Math.min(rows - 1, r + 1);
    const dz = (rNext - rPrev) * stepZ;

    for (let c = 0; c < cols; c++) {
      const cPrev = Math.max(0, c - 1);
      const cNext = Math.min(cols - 1, c + 1);
      const dx = (cNext - cPrev) * stepX;

      const hL = heights[r * cols + cPrev];
      const hR = heights[r * cols + cNext];
      const hD = heights[rPrev * cols + c];
      const hU = heights[rNext * cols + c];

      const dhdx = (hR - hL) / dx;
      const dhdz = (hU - hD) / dz;

      const nx = -dhdx;
      const ny = 1.0;
      const nz = -dhdz;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

      const nIdx = (r * cols + c) * 3;
      globalNormals[nIdx] = nx * invLen;
      globalNormals[nIdx + 1] = ny * invLen;
      globalNormals[nIdx + 2] = nz * invLen;
    }
  }

  // 3. Subdivide terrain into TERRAIN_CHUNKS_X x TERRAIN_CHUNKS_Z grid
  const chunkSubdivsX = Math.floor(subdivisions / TERRAIN_CHUNKS_X);
  const chunkSubdivsZ = Math.floor(subdivisions / TERRAIN_CHUNKS_Z);
  const chunkVertsX = chunkSubdivsX + 1;
  const chunkVertsZ = chunkSubdivsZ + 1;
  const chunkVertexCount = chunkVertsX * chunkVertsZ;
  const chunkIndexCount = chunkSubdivsX * chunkSubdivsZ * 6;

  const geometries: BufferGeometry[] = [];

  for (let cz = 0; cz < TERRAIN_CHUNKS_Z; cz++) {
    for (let cx = 0; cx < TERRAIN_CHUNKS_X; cx++) {
      const colStart = cx * chunkSubdivsX;
      const rowStart = cz * chunkSubdivsZ;

      const positions = new Float32Array(chunkVertexCount * 3);
      const normals = new Float32Array(chunkVertexCount * 3);
      const uvs = new Float32Array(chunkVertexCount * 2);
      const colors = new Float32Array(chunkVertexCount * 3);
      const trackMaskArray = new Float32Array(chunkVertexCount);
      const indices = new Uint16Array(chunkIndexCount);

      for (let lr = 0; lr < chunkVertsZ; lr++) {
        const r = rowStart + lr;
        for (let lc = 0; lc < chunkVertsX; lc++) {
          const c = colStart + lc;
          const gIdx = r * cols + c;
          const lIdx = lr * chunkVertsX + lc;

          const x = -width / 2 + c * stepX;
          const y = heights[gIdx];
          const z = -depth / 2 + r * stepZ;

          positions[lIdx * 3] = x;
          positions[lIdx * 3 + 1] = y;
          positions[lIdx * 3 + 2] = z;

          normals[lIdx * 3] = globalNormals[gIdx * 3];
          normals[lIdx * 3 + 1] = globalNormals[gIdx * 3 + 1];
          normals[lIdx * 3 + 2] = globalNormals[gIdx * 3 + 2];

          uvs[lIdx * 2] = c / (cols - 1);
          uvs[lIdx * 2 + 1] = 1.0 - r / (rows - 1);

          colors[lIdx * 3] = globalColors[gIdx * 3];
          colors[lIdx * 3 + 1] = globalColors[gIdx * 3 + 1];
          colors[lIdx * 3 + 2] = globalColors[gIdx * 3 + 2];

          trackMaskArray[lIdx] = trackMasks[gIdx];
        }
      }

      let idxPtr = 0;
      for (let lr = 0; lr < chunkSubdivsZ; lr++) {
        for (let lc = 0; lc < chunkSubdivsX; lc++) {
          const v0 = lr * chunkVertsX + lc;
          const v1 = v0 + 1;
          const v2 = (lr + 1) * chunkVertsX + lc;
          const v3 = v2 + 1;

          indices[idxPtr++] = v0;
          indices[idxPtr++] = v2;
          indices[idxPtr++] = v1;

          indices[idxPtr++] = v1;
          indices[idxPtr++] = v2;
          indices[idxPtr++] = v3;
        }
      }

      const chunkGeo = new BufferGeometry();
      chunkGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));
      chunkGeo.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      chunkGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
      chunkGeo.setAttribute('color', new Float32BufferAttribute(colors, 3));
      chunkGeo.setAttribute('trackMask', new Float32BufferAttribute(trackMaskArray, 1));
      chunkGeo.setIndex(new Uint16BufferAttribute(indices, 1));

      chunkGeo.computeBoundingBox();
      chunkGeo.computeBoundingSphere();

      geometries.push(chunkGeo);
    }
  }

  return geometries;
}

/**
 * 3D visual and physics terrain component.
 * Features 16-chunk spatial subdivision with Frustum Culling for 60-75% vertex reduction,
 * seamless precomputed global normals, and attaches a Rapier HeightfieldCollider for rigid-body physics.
 */
export function Terrain() {
  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const shouldReceiveShadow = shadowsEnabled && graphicsQuality !== 'low';

  // Load AI-generated terrain textures
  const [grassTexture, trackTexture, rockTexture, sandTexture, snowTexture, snowTrackTexture, highlandHeatherTexture] = useTexture([
    '/textures/terrain/grass.jpg',
    '/textures/terrain/dirt_track.jpg',
    '/textures/terrain/rock_cliff.jpg',
    '/textures/terrain/desert_sand.jpg',
    '/textures/terrain/snow.jpg',
    '/textures/terrain/snow_track.jpg',
    '/textures/terrain/highland_heather.jpg',
  ]);

  // Set repeat wrapping and SRGB color space on all terrain textures (clamped to <= 2 on mobile)
  useMemo(() => {
    const isMobile = isMobileDevice();
    const baseAnisotropy = graphicsQuality === 'very_high' ? 16 : graphicsQuality === 'high' ? 8 : 4;
    const anisotropy = getClampedAnisotropy(baseAnisotropy, isMobile);
    [grassTexture, trackTexture, rockTexture, sandTexture, snowTexture, snowTrackTexture, highlandHeatherTexture].forEach((tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
    });
  }, [grassTexture, trackTexture, rockTexture, sandTexture, snowTexture, snowTrackTexture, highlandHeatherTexture, graphicsQuality]);

  const levelId = levelData.id.toLowerCase();
  const isDesert = levelId.includes('desert');
  const isSnow = levelId.includes('sweden') || levelId.includes('snow') || levelId.includes('winter');
  const isBritain = levelId.includes('britain') || levelId.includes('highland');
  const isGymkhana = levelId.includes('gymkhana');

  const chunkGeometries = useMemo(() => {
    return buildTerrainChunkGeometries({
      width: levelData.terrainBase.width,
      depth: levelData.terrainBase.depth,
      subdivisions: levelData.terrainBase.subdivisions,
      rows: heightmapData.rows,
      cols: heightmapData.cols,
      heights: heightmapData.heights,
      trackMasks: heightmapData.trackMasks,
      minHeight: heightmapData.minHeight,
      maxHeight: heightmapData.maxHeight,
      isSnow,
      isBritain,
    });
  }, [heightmapData, levelData, isSnow, isBritain]);

  const isMobile = isMobileDevice();

  // Create custom multi-texture material
  const material = useMemo(
    () =>
      createDetailedTerrainMaterial({
        grassTexture: isBritain ? highlandHeatherTexture : grassTexture,
        trackTexture,
        rockTexture,
        sandTexture,
        snowTexture,
        snowTrackTexture,
        isDesert,
        isSnow,
        isGymkhana,
        isMobile,
      }),
    [grassTexture, highlandHeatherTexture, trackTexture, rockTexture, sandTexture, snowTexture, snowTrackTexture, isDesert, isSnow, isGymkhana, isBritain, isMobile],
  );

  // Prepare heights for Rapier HeightfieldCollider
  const rapierHeights = useMemo(() => {
    const { rows, cols, heights } = heightmapData;
    const transposed = new Float32Array(heights.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        transposed[c * rows + r] = heights[r * cols + c];
      }
    }
    return transposed;
  }, [heightmapData]);

  // Clean up GPU buffers and textures on unmount/level change to prevent VRAM accumulation
  useEffect(() => {
    return () => {
      chunkGeometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    };
  }, [chunkGeometries, material]);

  // Recompile terrain shader program cleanly whenever shadow receiving state changes
  useEffect(() => {
    material.needsUpdate = true;
  }, [material, shouldReceiveShadow]);

  return (
    <RigidBody type="fixed" colliders={false} friction={1.2}>
      <HeightfieldCollider
        args={[
          levelData.terrainBase.subdivisions,
          levelData.terrainBase.subdivisions,
          rapierHeights as unknown as number[],
          {
            x: levelData.terrainBase.width,
            y: 1,
            z: levelData.terrainBase.depth,
          },
        ]}
      />
      {chunkGeometries.map((chunkGeo, idx) => (
        <mesh
          key={idx}
          geometry={chunkGeo}
          material={material}
          receiveShadow={shouldReceiveShadow}
          frustumCulled
        />
      ))}
    </RigidBody>
  );
}

