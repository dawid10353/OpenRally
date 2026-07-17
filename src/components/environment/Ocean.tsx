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
  UnsignedByteType,
} from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createNoise2D } from 'simplex-noise';
import { useDepthBuffer } from '@react-three/drei';
import { SKY_CONFIG } from '@/config/environment';
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
  const waterRef = useRef<Water>(null);
  const { scene, camera, size } = useThree();
  const depthBuffer = useDepthBuffer({ size: 1024, frames: Infinity });

  const waterNormals = useMemo(
    () => generateWaterNormalTexture(WATER_NORMAL_TEXTURE_SIZE),
    [],
  );

  const water = useMemo(() => {
    const geometry = new PlaneGeometry(
      WATER_SIZE,
      WATER_SIZE,
      WATER_SEGMENTS,
      WATER_SEGMENTS,
    );

    const sunDir = new Vector3(...SKY_CONFIG.sunPosition).normalize();

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

    // Make sure water doesn't write to depth, otherwise foam math breaks!
    waterMesh.material.depthWrite = false;
    // Essential for transparency blending with foam
    waterMesh.material.transparent = true; 

    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = WATER_POSITION_Y;

    // Inject custom uniforms directly into the ShaderMaterial
    Object.assign(waterMesh.material.uniforms, {
      u_depth: { value: depthBuffer },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      resolution: { value: new Vector2(size.width, size.height) },
      u_waveA: { value: new Vector4(WATER_WAVE_A_DIR.x, WATER_WAVE_A_DIR.y, WATER_WAVE_A_STEEPNESS, WATER_WAVE_A_WAVELENGTH) },
      u_waveB: { value: new Vector4(WATER_WAVE_B_DIR.x, WATER_WAVE_B_DIR.y, WATER_WAVE_B_STEEPNESS, WATER_WAVE_B_WAVELENGTH) },
      u_waveC: { value: new Vector4(WATER_WAVE_C_DIR.x, WATER_WAVE_C_DIR.y, WATER_WAVE_C_STEEPNESS, WATER_WAVE_C_WAVELENGTH) },
      u_foamColor: { value: WATER_FOAM_COLOR },
      u_shallowColor: { value: WATER_SHALLOW_COLOR },
      u_depthThreshold: { value: WATER_DEPTH_THRESHOLD },
      u_foamThreshold: { value: WATER_FOAM_THRESHOLD },
    });

    // Inject Gerstner Waves and Depth buffer logic
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

        vec3 GerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
          float steepness = wave.z;
          float wavelength = wave.w;
          float k = 2.0 * 3.14159 / wavelength;
          float c = sqrt(9.8 / k);
          vec2 d = normalize(wave.xy);
          float f = k * (dot(d, p.xy) - c * time);
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
            d.y * (a * cos(f)),
            a * sin(f)
          );
        }
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        /mirrorCoord\s*=\s*modelMatrix\s*\*\s*vec4\(\s*position,\s*1\.0\s*\);/,
        `
        vec3 gridPoint = position;
        vec3 myTangent = vec3(1.0, 0.0, 0.0);
        vec3 myBinormal = vec3(0.0, 1.0, 0.0);
        vec3 p = gridPoint;
        p += GerstnerWave(u_waveA, gridPoint, myTangent, myBinormal);
        p += GerstnerWave(u_waveB, gridPoint, myTangent, myBinormal);
        p += GerstnerWave(u_waveC, gridPoint, myTangent, myBinormal);

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
        uniform sampler2D u_depth;
        uniform float cameraNear;
        uniform float cameraFar;
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
        vec2 screenUv = gl_FragCoord.xy / resolution;
        
        float depth = texture2D(u_depth, screenUv).r;
        
        float z_b = depth;
        float z_n = 2.0 * z_b - 1.0;
        float linearDepth = 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z_n * (cameraFar - cameraNear));
        
        float surfaceDepth = gl_FragCoord.z;
        float s_n = 2.0 * surfaceDepth - 1.0;
        float linearSurfaceDepth = 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - s_n * (cameraFar - cameraNear));
        
        float diff = max(0.0, linearDepth - linearSurfaceDepth);
        
        float foamAmount = clamp(1.0 - (diff / u_foamThreshold), 0.0, 1.0);
        foamAmount = pow(foamAmount, 2.0); 
        
        float depthAmount = clamp(diff / u_depthThreshold, 0.0, 1.0);
        vec3 deepColor = outgoingLight; 
        vec3 waterAlbedo = mix(u_shallowColor, deepColor, depthAmount);
        
        vec3 finalColor = mix(waterAlbedo, u_foamColor, foamAmount);
        
        gl_FragColor = vec4( finalColor, alpha + foamAmount );
        `
      );
    };

    return waterMesh;
  }, [waterNormals, scene.fog, depthBuffer, camera, size]);

  useFrame(() => {
    if (water.material.uniforms['time']) {
      water.material.uniforms['time'].value += WATER_WAVE_SPEED / 60;
    }
    if (water.material.uniforms['resolution']) {
      water.material.uniforms['resolution'].value.set(size.width, size.height);
    }
  });

  return <primitive ref={waterRef} object={water} />;
}
