import { useMemo } from 'react';
import {
  PlaneGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { useTexture } from '@react-three/drei';
import { RigidBody, HeightfieldCollider } from '@react-three/rapier';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { mapRange } from '@/utils/math';
import type { GraphicsQuality } from '@/types';
import {
  BIOME_COLOR_LOW,
  BIOME_COLOR_MID,
  BIOME_COLOR_HIGH,
  BIOME_MID_THRESHOLD,
} from '@/config/terrain';
import {
  DETAIL_NOISE_SCALE,
  DETAIL_NOISE_STRENGTH,
  SLOPE_DARKENING_STRENGTH,
} from '@/config/terrainDetail';

interface TerrainMaterialOptions {
  quality: GraphicsQuality;
  grassTexture: Texture;
  trackTexture: Texture;
  rockTexture: Texture;
  sandTexture: Texture;
  isDesert: boolean;
}

/**
 * Custom MeshStandardMaterial with photorealistic multi-texture splatting,
 * triplanar slope projection for cliffs, damp mud track blending, and micro-relief.
 */
export function createDetailedTerrainMaterial(options: TerrainMaterialOptions): MeshStandardMaterial {
  const { quality, grassTexture, trackTexture, rockTexture, sandTexture, isDesert } = options;

  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });

  mat.onBeforeCompile = (shader) => {
    // Add custom uniforms
    shader.uniforms.u_detailScale = { value: DETAIL_NOISE_SCALE };
    shader.uniforms.u_detailStrength = { value: DETAIL_NOISE_STRENGTH };
    shader.uniforms.u_slopeDarkening = { value: SLOPE_DARKENING_STRENGTH };
    shader.uniforms.u_grassTexture = { value: grassTexture };
    shader.uniforms.u_trackTexture = { value: trackTexture };
    shader.uniforms.u_rockTexture = { value: rockTexture };
    shader.uniforms.u_sandTexture = { value: sandTexture };
    shader.uniforms.u_isDesert = { value: isDesert ? 1.0 : 0.0 };

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

        uniform float u_detailScale;
        uniform float u_detailStrength;
        uniform float u_slopeDarkening;
        uniform float u_isDesert;

        uniform sampler2D u_grassTexture;
        uniform sampler2D u_trackTexture;
        uniform sampler2D u_rockTexture;
        uniform sampler2D u_sandTexture;

        ${quality !== 'low' ? `
        float hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 2; i++) {
            value += amplitude * noise2D(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        ` : ''}
      `,
    );

    // Apply texture splatting after diffuse color is computed
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `
        #include <color_fragment>

        // Dual-frequency texture coordinates with anti-tiling octave rotation (realistic ~3.5m micro, ~18m macro)
        vec2 uvMacro = vWorldPosition.xz * 0.055;
        vec2 uvMicro = mat2(0.866, -0.5, 0.5, 0.866) * (vWorldPosition.xz * 0.28);

        // Base biome ground texture sampling
        vec3 baseGround;
        if (u_isDesert > 0.5) {
          vec3 sandMacro = texture2D(u_sandTexture, uvMacro).rgb;
          vec3 sandMicro = texture2D(u_sandTexture, uvMicro).rgb;
          baseGround = mix(sandMacro, sandMicro, 0.5);
        } else {
          vec3 grassMacro = texture2D(u_grassTexture, uvMacro).rgb;
          vec3 grassMicro = texture2D(u_grassTexture, uvMicro).rgb;
          baseGround = mix(grassMacro, grassMicro, 0.5);
        }

        // Rally track dirt/mud texture sampling
        vec2 uvTrackMacro = vWorldPosition.xz * 0.08;
        vec2 uvTrackMicro = mat2(0.866, -0.5, 0.5, 0.866) * (vWorldPosition.xz * 0.35);
        vec3 trackMacro = texture2D(u_trackTexture, uvTrackMacro).rgb;
        vec3 trackMicro = texture2D(u_trackTexture, uvTrackMicro).rgb;
        vec3 trackTex = mix(trackMacro, trackMicro, 0.5);

        // Blend base ground with track
        vec3 blendedAlbedo = mix(baseGround, trackTex, clamp(vTrackMask * 1.25, 0.0, 1.0));

        // Triplanar rock mapping on steep slopes / cliffs (prevents vertical texture stretching)
        vec3 normalWeights = pow(abs(vWorldNormal), vec3(4.0));
        normalWeights /= max(0.0001, normalWeights.x + normalWeights.y + normalWeights.z);

        vec3 rockTexX = texture2D(u_rockTexture, vWorldPosition.zy * 0.22).rgb;
        vec3 rockTexY = texture2D(u_rockTexture, vWorldPosition.xz * 0.22).rgb;
        vec3 rockTexZ = texture2D(u_rockTexture, vWorldPosition.xy * 0.22).rgb;
        vec3 triplanarRock = rockTexX * normalWeights.x + rockTexY * normalWeights.y + rockTexZ * normalWeights.z;

        // Slope calculation: 0 = flat plane, 1 = vertical cliff
        float slope = 1.0 - abs(vWorldNormal.y);
        float rockFactor = smoothstep(0.28, 0.62, slope);
        blendedAlbedo = mix(blendedAlbedo, triplanarRock, rockFactor);

        // Use natural vibrant texture albedo directly with subtle macro-lighting
        diffuseColor.rgb = blendedAlbedo;

        ${quality !== 'low' ? `
        // Micro-relief noise overlay
        float detailNoise = fbm(uvMicro * 15.0);
        float noiseMod = 1.0 + (detailNoise * 2.0 - 1.0) * (u_detailStrength * 0.45);
        diffuseColor.rgb *= noiseMod;
        ` : ''}

        // Slope darkening — ambient occlusion on steep crevices
        float slopeFactor = 1.0 - slope * (u_slopeDarkening * 0.8);
        diffuseColor.rgb *= slopeFactor;
      `,
    );
  };

  return mat;
}

/**
 * 3D visual and physics terrain component.
 * Displaces a dense plane geometry based on procedural heightmap data,
 * loads PBR textures for grass, gravel tracks, and mountain cliffs,
 * and attaches a Rapier HeightfieldCollider for rigid-body physics.
 */
export function Terrain() {
  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  // Load AI-generated terrain textures
  const [grassTexture, trackTexture, rockTexture, sandTexture] = useTexture([
    '/textures/terrain/grass.jpg',
    '/textures/terrain/dirt_track.jpg',
    '/textures/terrain/rock_cliff.jpg',
    '/textures/terrain/desert_sand.jpg',
  ]);

  // Set repeat wrapping and SRGB color space on all terrain textures
  useMemo(() => {
    const anisotropy = graphicsQuality === 'very_high' ? 16 : graphicsQuality === 'high' ? 8 : 4;
    [grassTexture, trackTexture, rockTexture, sandTexture].forEach((tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
    });
  }, [grassTexture, trackTexture, rockTexture, sandTexture, graphicsQuality]);

  const isDesert = levelData.id.toLowerCase().includes('desert');

  const geometry = useMemo(() => {
    // Create plane geometry matching heightmap dimensions
    const geo = new PlaneGeometry(
      levelData.terrainBase.width,
      levelData.terrainBase.depth,
      levelData.terrainBase.subdivisions,
      levelData.terrainBase.subdivisions,
    );

    // Rotate plane to lie flat (PlaneGeometry is in XY, we need XZ)
    geo.rotateX(-Math.PI / 2);

    // Displace vertices using heightmap
    const positions = geo.attributes.position;
    const colors: number[] = [];
    const trackMaskArray: number[] = [];

    const tempColor = new Color();
    const MUD_COLOR = new Color('#3b2818');

    for (let i = 0; i < positions.count; i++) {
      const height = heightmapData.heights[i];
      const trackMask = heightmapData.trackMasks[i];
      positions.setY(i, height);
      trackMaskArray.push(trackMask);

      // Color based on normalized height
      const normalizedHeight = mapRange(
        height,
        heightmapData.minHeight,
        heightmapData.maxHeight,
        0,
        1,
      );

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

      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }

    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geo.setAttribute('trackMask', new Float32BufferAttribute(trackMaskArray, 1));
    geo.computeVertexNormals();

    return geo;
  }, [heightmapData, levelData]);

  // Create custom multi-texture material
  const material = useMemo(
    () =>
      createDetailedTerrainMaterial({
        quality: graphicsQuality,
        grassTexture,
        trackTexture,
        rockTexture,
        sandTexture,
        isDesert,
      }),
    [graphicsQuality, grassTexture, trackTexture, rockTexture, sandTexture, isDesert],
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
      <mesh geometry={geometry} material={material} receiveShadow={graphicsQuality !== 'low'} />
    </RigidBody>
  );
}

