import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  PlaneGeometry,
  RepeatWrapping,
  Vector3,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
} from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createNoise2D } from 'simplex-noise';
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
} from '@/config/water';

/**
 * Procedurally generates a tileable normal map for water waves
 * using simplex noise. Runs once at startup, no external assets needed.
 */
function generateWaterNormalTexture(size: number): DataTexture {
  const noise2D = createNoise2D();
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Sample noise at different scales for detail
      const nx = x / size;
      const ny = y / size;

      // Compute normal from noise gradient (central differences)
      const eps = 1.0 / size;
      const hL = noise2D((nx - eps) * 8, ny * 8) * 0.5 +
                 noise2D((nx - eps) * 16 + 5.3, ny * 16 + 2.7) * 0.25;
      const hR = noise2D((nx + eps) * 8, ny * 8) * 0.5 +
                 noise2D((nx + eps) * 16 + 5.3, ny * 16 + 2.7) * 0.25;
      const hD = noise2D(nx * 8, (ny - eps) * 8) * 0.5 +
                 noise2D(nx * 16 + 5.3, (ny - eps) * 16 + 2.7) * 0.25;
      const hU = noise2D(nx * 8, (ny + eps) * 8) * 0.5 +
                 noise2D(nx * 16 + 5.3, (ny + eps) * 16 + 2.7) * 0.25;

      // Normal from height differences (tangent space)
      const strength = 1.5;
      let normalX = (hL - hR) * strength;
      let normalY = (hD - hU) * strength;
      let normalZ = 1.0;

      // Normalize
      const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
      normalX /= len;
      normalY /= len;
      normalZ /= len;

      // Encode to 0–255 range (tangent-space normal map convention)
      data[idx + 0] = Math.floor((normalX * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((normalY * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((normalZ * 0.5 + 0.5) * 255);
      data[idx + 3] = 255; // Alpha (unused but needed for n1+n2+n3 reference)
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Animated ocean with planar reflections and wave normal maps.
 *
 * Uses Three.js Water from examples with a procedurally generated
 * normal texture (simplex noise). Integrates with existing scene
 * lighting and fog configuration.
 */
export function Ocean() {
  const waterRef = useRef<Water>(null);
  const { scene } = useThree();

  // Generate water normal texture once
  const waterNormals = useMemo(
    () => generateWaterNormalTexture(WATER_NORMAL_TEXTURE_SIZE),
    [],
  );

  // Create Water mesh
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

    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = WATER_POSITION_Y;

    return waterMesh;
  }, [waterNormals, scene.fog]);

  // Store ref
  useFrame(() => {
    if (water.material.uniforms['time']) {
      water.material.uniforms['time'].value += WATER_WAVE_SPEED / 60;
    }
  });

  return <primitive ref={waterRef} object={water} />;
}
