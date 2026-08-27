import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  PlaneGeometry,
  RepeatWrapping,
  Vector2,
  Vector3,
  Vector4,
  DataTexture,
  RGBAFormat,
  RedFormat,
  FloatType,
  UnsignedByteType,
  MeshStandardMaterial,
  Mesh,
  LinearFilter,
  type IUniform,
} from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createNoise2D } from 'simplex-noise';
import { SKY_CONFIG } from '@/config/environment';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import {
  WATER_COLOR,
  WATER_SUN_COLOR,
  WATER_ALPHA,
  WATER_DISTORTION_SCALE,
  WATER_SIZE,
  WATER_POSITION_Y,
  WATER_NORMAL_TEXTURE_SIZE,
  WATER_REFLECTION_TEXTURE_SIZE,
  WATER_SEGMENTS,
  WATER_WAVE_SPEED,
  WATER_WAVE_A_DIR,
  WATER_WAVE_A_STEEPNESS,
  WATER_WAVE_A_WAVELENGTH,
  WATER_WAVE_B_DIR,
  WATER_WAVE_B_STEEPNESS,
  WATER_WAVE_B_WAVELENGTH,
  WATER_WAVE_C_DIR,
  WATER_WAVE_C_STEEPNESS,
  WATER_WAVE_C_WAVELENGTH,
  WATER_DEPTH_THRESHOLD,
  WATER_FOAM_THRESHOLD,
  WATER_FOAM_COLOR,
  WATER_SHALLOW_COLOR,
} from '@/config/water';

function generateWaterNormalTexture(size: number): DataTexture {
  const noise2D = createNoise2D();
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const nx = x / size;
      const ny = y / size;

      const eps = 1.0 / size;
      const hL = noise2D((nx - eps) * 8, ny * 8) * 0.5 +
                 noise2D((nx - eps) * 16 + 5.3, ny * 16 + 2.7) * 0.25;
      const hR = noise2D((nx + eps) * 8, ny * 8) * 0.5 +
                 noise2D((nx + eps) * 16 + 5.3, ny * 16 + 2.7) * 0.25;
      const hD = noise2D(nx * 8, (ny - eps) * 8) * 0.5 +
                 noise2D(nx * 16 + 5.3, (ny - eps) * 16 + 2.7) * 0.25;
      const hU = noise2D(nx * 8, (ny + eps) * 8) * 0.5 +
                 noise2D(nx * 16 + 5.3, (ny + eps) * 16 + 2.7) * 0.25;

      const strength = 1.5;
      let normalX = (hL - hR) * strength;
      let normalY = (hD - hU) * strength;
      let normalZ = 1.0;

      const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
      normalX /= len;
      normalY /= len;
      normalZ /= len;

      data[idx + 0] = Math.floor((normalX * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((normalY * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((normalZ * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

export function Ocean() {
  const waterRef = useRef<Water | Mesh>(null);
  const { scene, size } = useThree();
  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  const normalMapSize =
    graphicsQuality === 'low'
      ? 128
      : graphicsQuality === 'medium'
      ? 256
      : graphicsQuality === 'high'
      ? WATER_NORMAL_TEXTURE_SIZE
      : 512;
  const segmentsCount =
    graphicsQuality === 'low'
      ? 128
      : graphicsQuality === 'medium'
      ? 256
      : graphicsQuality === 'high'
      ? WATER_SEGMENTS
      : 512;

  const waterNormals = useMemo(
    () => generateWaterNormalTexture(normalMapSize),
    [normalMapSize],
  );

  const terrainHeightmap = useMemo(() => {
    // We use the terrain heightmap directly instead of rendering the whole scene to a depth buffer.
    // This provides a HUGE performance boost (saves a full render pass).
    const texture = new DataTexture(
      heightmapData.heights,
      heightmapData.cols,
      heightmapData.rows,
      RedFormat,
      FloatType
    );
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, [heightmapData]);

  const water = useMemo(() => {
    const geometry = new PlaneGeometry(
      WATER_SIZE,
      WATER_SIZE,
      segmentsCount,
      segmentsCount,
    );

    const sunDir = new Vector3(...SKY_CONFIG.sunPosition).normalize();
    const commonUniforms = {
      u_terrainHeightmap: { value: terrainHeightmap },
      u_terrainSize: { value: new Vector2(levelData.terrainBase.width, levelData.terrainBase.depth) },
      resolution: { value: new Vector2(size.width, size.height) },
      u_waveA: { value: new Vector4(WATER_WAVE_A_DIR.x, WATER_WAVE_A_DIR.y, WATER_WAVE_A_STEEPNESS, WATER_WAVE_A_WAVELENGTH) },
      u_waveB: { value: new Vector4(WATER_WAVE_B_DIR.x, WATER_WAVE_B_DIR.y, WATER_WAVE_B_STEEPNESS, WATER_WAVE_B_WAVELENGTH) },
      u_waveC: { value: new Vector4(WATER_WAVE_C_DIR.x, WATER_WAVE_C_DIR.y, WATER_WAVE_C_STEEPNESS, WATER_WAVE_C_WAVELENGTH) },
      u_foamColor: { value: WATER_FOAM_COLOR },
      u_shallowColor: { value: WATER_SHALLOW_COLOR },
      u_depthThreshold: { value: WATER_DEPTH_THRESHOLD },
      u_foamThreshold: { value: WATER_FOAM_THRESHOLD },
    };

    if (graphicsQuality === 'high' || graphicsQuality === 'very_high') {
      const waterMesh = new Water(geometry, {
        textureWidth: WATER_REFLECTION_TEXTURE_SIZE,
        textureHeight: WATER_REFLECTION_TEXTURE_SIZE,
        waterNormals,
        sunDirection: sunDir,
        sunColor: WATER_SUN_COLOR,
        waterColor: WATER_COLOR,
        distortionScale: WATER_DISTORTION_SCALE,
        fog: scene.fog !== undefined && scene.fog !== null,
        alpha: WATER_ALPHA,
      });

      waterMesh.material.transparent = false; 
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = WATER_POSITION_Y;

      Object.assign(waterMesh.material.uniforms, commonUniforms);

      waterMesh.material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          'uniform float time;',
          `
          uniform float time;
          uniform vec4 u_waveA;
          uniform vec4 u_waveB;
          uniform vec4 u_waveC;
          varying vec3 vWorldPos;
          varying vec3 vWaveNormal;

          vec3 GerstnerWave(vec4 wave, vec2 worldCoord, inout vec3 tangent, inout vec3 binormal) {
            float steepness = wave.z;
            float wavelength = wave.w;
            float k = 2.0 * 3.14159 / wavelength;
            float c = sqrt(9.8 / k);
            vec2 d = normalize(wave.xy);
            float f = k * (dot(d, worldCoord) - c * time);
            float a = steepness / k;

            tangent += vec3(
              -d.x * d.x * (steepness * sin(f)),
              -d.x * d.y * (steepness * sin(f)),
              d.x * (steepness * cos(f))
            );
            binormal += vec3(
              -d.x * d.y * (steepness * sin(f)),
              -d.y * d.y * (steepness * sin(f)),
              d.y * (steepness * cos(f))
            );
            // Local plane coordinates: x is +X, y is -Z, z is +Y
            return vec3(
              d.x * (a * cos(f)),
              -d.y * (a * cos(f)),
              a * sin(f)
            );
          }
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          /mirrorCoord\s*=\s*modelMatrix\s*\*\s*vec4\(\s*position,\s*1\.0\s*\);/,
          `
          vec4 worldOrig = modelMatrix * vec4(position, 1.0);
          vec3 myTangent = vec3(1.0, 0.0, 0.0);
          vec3 myBinormal = vec3(0.0, 1.0, 0.0);
          vec3 p = position;
          p += GerstnerWave(u_waveA, worldOrig.xz, myTangent, myBinormal);
          p += GerstnerWave(u_waveB, worldOrig.xz, myTangent, myBinormal);
          p += GerstnerWave(u_waveC, worldOrig.xz, myTangent, myBinormal);

          vec3 transformed = p;
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWaveNormal = normalize(normalMatrix * normalize(cross(myTangent, myBinormal)));
          mirrorCoord = modelMatrix * vec4( transformed, 1.0 );
          `
        );
        
        shader.vertexShader = shader.vertexShader.replace(
          /vec4\s*mvPosition\s*=\s*modelViewMatrix\s*\*\s*vec4\(\s*position,\s*1\.0\s*\);/,
          'vec4 mvPosition =  modelViewMatrix * vec4( transformed, 1.0 );'
        );

        shader.fragmentShader = `
          uniform sampler2D u_terrainHeightmap;
          uniform vec2 u_terrainSize;
          uniform vec2 resolution;
          
          uniform vec3 u_foamColor;
          uniform vec3 u_shallowColor;
          uniform float u_depthThreshold;
          uniform float u_foamThreshold;
          
          varying vec3 vWorldPos;
          varying vec3 vWaveNormal;
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
          /vec3\s*surfaceNormal\s*=\s*normalize\(\s*noise\.xzy\s*\*\s*vec3\(\s*1\.5,\s*1\.0,\s*1\.5\s*\)\s*\);/,
          `
          vec3 texNormal = noise.xzy * vec3( 1.5, 1.0, 1.5 );
          vec3 surfaceNormal = normalize( vWaveNormal + texNormal );
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          /gl_FragColor\s*=\s*vec4\(\s*outgoingLight,\s*alpha\s*\);/,
          `
          vec2 terrainUv = vec2(
            (vWorldPos.x + u_terrainSize.x * 0.5) / u_terrainSize.x,
            (vWorldPos.z + u_terrainSize.y * 0.5) / u_terrainSize.y
          );
          
          // Sample terrain heightmap clamped to [0, 1] range
          float terrainHeight = texture2D(u_terrainHeightmap, clamp(terrainUv, 0.0, 1.0)).r;

          // If outside terrain bounding box, blend to deep seabed floor (-65.0)
          vec2 boxDist = max(vec2(0.0), abs(terrainUv - 0.5) * 2.0 - vec2(1.0));
          float distOutside = length(boxDist * u_terrainSize * 0.5);
          terrainHeight = mix(terrainHeight, -65.0, clamp(distOutside / 50.0, 0.0, 1.0));

          float waterDepth = vWorldPos.y - terrainHeight;
          
          // Foam only exists in shallow water near shore (0.0 < waterDepth < u_foamThreshold)
          float foamAmount = 0.0;
          if (waterDepth > 0.0 && waterDepth < u_foamThreshold) {
            float f = 1.0 - (waterDepth / u_foamThreshold);
            foamAmount = f * f;
          }
          
          // Depth transition: 0 = shallow turquoise (shore), 1 = deep ocean
          float depthAmount = clamp(waterDepth / u_depthThreshold, 0.0, 1.0);
          depthAmount = smoothstep(0.0, 1.0, depthAmount);
          
          vec3 deepColor = outgoingLight; 
          vec3 waterAlbedo = mix(u_shallowColor, deepColor, depthAmount);
          vec3 finalColor = mix(waterAlbedo, u_foamColor, foamAmount);
          
          gl_FragColor = vec4( finalColor, 1.0 );
          `
        );
      };

      return waterMesh;
    } else {
      // LOW & MEDIUM Quality - Optimize by removing the expensive mirror render pass
      const material = new MeshStandardMaterial({
        color: WATER_COLOR,
        roughness: 0.1,
        metalness: 0.8,
        transparent: false,
        opacity: 1.0,
        normalMap: waterNormals,
      });

      const waterMesh = new Mesh(geometry, material);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = WATER_POSITION_Y;

      material.onBeforeCompile = (shader) => {
        // We have to add 'time' since MeshStandardMaterial doesn't have it natively
        shader.uniforms.time = { value: 0 };
        Object.assign(shader.uniforms, commonUniforms);

        // We assign the shader back to material so useFrame can update time
        material.userData.shader = shader;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          uniform float time;
          uniform vec4 u_waveA;
          uniform vec4 u_waveB;
          uniform vec4 u_waveC;
          varying vec3 vWorldPos;
          varying vec3 vWaveNormal;

          vec3 GerstnerWave(vec4 wave, vec2 worldCoord, inout vec3 tangent, inout vec3 binormal) {
            float steepness = wave.z;
            float wavelength = wave.w;
            float k = 2.0 * 3.14159 / wavelength;
            float c = sqrt(9.8 / k);
            vec2 d = normalize(wave.xy);
            float f = k * (dot(d, worldCoord) - c * time);
            float a = steepness / k;

            tangent += vec3(
              -d.x * d.x * (steepness * sin(f)),
              -d.x * d.y * (steepness * sin(f)),
              d.x * (steepness * cos(f))
            );
            binormal += vec3(
              -d.x * d.y * (steepness * sin(f)),
              -d.y * d.y * (steepness * sin(f)),
              d.y * (steepness * cos(f))
            );
            return vec3(
              d.x * (a * cos(f)),
              -d.y * (a * cos(f)),
              a * sin(f)
            );
          }
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <beginnormal_vertex>',
          `
          #include <beginnormal_vertex>
          vec4 worldOrig = modelMatrix * vec4(position, 1.0);
          vec3 myTangent = vec3(1.0, 0.0, 0.0);
          vec3 myBinormal = vec3(0.0, 1.0, 0.0);
          vec3 p = position;
          p += GerstnerWave(u_waveA, worldOrig.xz, myTangent, myBinormal);
          p += GerstnerWave(u_waveB, worldOrig.xz, myTangent, myBinormal);
          p += GerstnerWave(u_waveC, worldOrig.xz, myTangent, myBinormal);

          vWaveNormal = normalize(normalMatrix * normalize(cross(myTangent, myBinormal)));
          objectNormal = normalize(cross(myTangent, myBinormal));
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed = p;
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          uniform sampler2D u_terrainHeightmap;
          uniform vec2 u_terrainSize;
          uniform vec2 resolution;
          
          uniform vec3 u_foamColor;
          uniform vec3 u_shallowColor;
          uniform float u_depthThreshold;
          uniform float u_foamThreshold;
          
          varying vec3 vWorldPos;
          varying vec3 vWaveNormal;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          
          vec2 terrainUv = vec2(
            (vWorldPos.x + u_terrainSize.x * 0.5) / u_terrainSize.x,
            (vWorldPos.z + u_terrainSize.y * 0.5) / u_terrainSize.y
          );
          
          // Sample terrain heightmap clamped to [0, 1] range
          float terrainHeight = texture2D(u_terrainHeightmap, clamp(terrainUv, 0.0, 1.0)).r;

          // If outside terrain bounding box, blend to deep seabed floor (-65.0)
          vec2 boxDist = max(vec2(0.0), abs(terrainUv - 0.5) * 2.0 - vec2(1.0));
          float distOutside = length(boxDist * u_terrainSize * 0.5);
          terrainHeight = mix(terrainHeight, -65.0, clamp(distOutside / 50.0, 0.0, 1.0));

          float waterDepth = vWorldPos.y - terrainHeight;
          
          // Foam only exists in shallow water near shore (0.0 < waterDepth < u_foamThreshold)
          float foamAmount = 0.0;
          if (waterDepth > 0.0 && waterDepth < u_foamThreshold) {
            float f = 1.0 - (waterDepth / u_foamThreshold);
            foamAmount = f * f;
          }
          
          // Depth transition: 0 = shallow turquoise (shore), 1 = deep ocean
          float depthAmount = clamp(waterDepth / u_depthThreshold, 0.0, 1.0);
          depthAmount = smoothstep(0.0, 1.0, depthAmount);
          
          vec3 deepColor = gl_FragColor.rgb; 
          vec3 waterAlbedo = mix(u_shallowColor, deepColor, depthAmount);
          vec3 finalColor = mix(waterAlbedo, u_foamColor, foamAmount);
          
          gl_FragColor = vec4( finalColor, 1.0 );
          `
        );
      };

      return waterMesh;
    }
  }, [waterNormals, scene.fog, terrainHeightmap, levelData, size, segmentsCount, graphicsQuality]);

  useFrame(({ camera }) => {
    // Snap water mesh to grid increments based on camera position for infinite seamless ocean
    const gridSpacing = WATER_SIZE / segmentsCount;
    const snapX = Math.floor(camera.position.x / gridSpacing) * gridSpacing;
    const snapZ = Math.floor(camera.position.z / gridSpacing) * gridSpacing;
    if (waterRef.current) {
      waterRef.current.position.x = snapX;
      waterRef.current.position.z = snapZ;
    }

    const mat = water.material as {
      uniforms?: Record<string, IUniform>;
      userData?: {
        shader?: {
          uniforms: {
            time: IUniform<number>;
          };
        };
      };
    };
    // For High quality (Water.js)
    if (mat.uniforms && mat.uniforms['time']) {
      mat.uniforms['time'].value += WATER_WAVE_SPEED / 60;
    }
    if (mat.uniforms && mat.uniforms['resolution']) {
      mat.uniforms['resolution'].value.set(size.width, size.height);
    }
    // For Low/Medium quality (MeshStandardMaterial)
    if (mat.userData && mat.userData.shader) {
      mat.userData.shader.uniforms.time.value += WATER_WAVE_SPEED / 60;
    }
  });

  return <primitive ref={waterRef} object={water} />;
}
