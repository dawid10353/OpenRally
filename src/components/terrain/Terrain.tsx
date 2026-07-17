import { useMemo } from 'react';
import {
  PlaneGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
} from 'three';
import { RigidBody, HeightfieldCollider } from '@react-three/rapier';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { mapRange } from '@/utils/math';
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

/**
 * Custom MeshStandardMaterial with procedural detail noise overlay
 * and slope-based darkening, applied via onBeforeCompile.
 */
function createDetailedTerrainMaterial(quality: 'low' | 'medium' | 'high'): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: false,
  });

  mat.onBeforeCompile = (shader) => {
    // Add custom uniforms
    shader.uniforms.u_detailScale = { value: DETAIL_NOISE_SCALE };
    shader.uniforms.u_detailStrength = { value: DETAIL_NOISE_STRENGTH };
    shader.uniforms.u_slopeDarkening = { value: SLOPE_DARKENING_STRENGTH };

    // Inject varyings into vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      /* glsl */ `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
      `,
    );

    // Inject detail noise into fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;

        uniform float u_detailScale;
        uniform float u_detailStrength;
        uniform float u_slopeDarkening;

        ${quality !== 'low' ? `
        // Hash-based procedural noise (no texture needed)
        // Based on Morgan McGuire @morgan3d https://www.shadertoy.com/view/4dS3Wd
        float hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f); // smoothstep

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

    // Apply noise and slope darkening after diffuse color is computed
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `
        #include <color_fragment>

        ${quality !== 'low' ? `
        // Detail noise overlay — breaks up flat vertex color gradients
        vec2 noiseCoord = vWorldPosition.xz * u_detailScale * 0.01;
        float detailNoise = fbm(noiseCoord * 50.0);
        // Remap from [0,1] to [-1,1] and apply strength
        float noiseMod = 1.0 + (detailNoise * 2.0 - 1.0) * u_detailStrength;
        diffuseColor.rgb *= noiseMod;
        ` : ''}

        // Slope darkening — steep terrain gets darker (micro-shadow illusion)
        float slope = 1.0 - abs(vWorldNormal.y); // 0 = flat, 1 = vertical
        float slopeFactor = 1.0 - slope * u_slopeDarkening;
        diffuseColor.rgb *= slopeFactor;
      `,
    );
  };

  return mat;
}

/**
 * Procedural terrain with heightmap-based geometry and physics collider.
 * Uses Perlin noise fBM for natural-looking hills and valleys.
 * Vertex-colored gradient: green (low) → brown (mid) → gray (high).
 *
 * Enhanced with procedural detail noise and slope darkening
 * applied via onBeforeCompile on MeshStandardMaterial.
 *
 * Heightmap data is consumed from TerrainContext (shared with PropsInstancer).
 */
export function Terrain() {
  const { heightmapData, config } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  const geometry = useMemo(() => {
    // Create plane geometry matching heightmap dimensions
    const geo = new PlaneGeometry(
      config.width,
      config.depth,
      config.subdivisions,
      config.subdivisions,
    );

    // Rotate plane to lie flat (PlaneGeometry is in XY, we need XZ)
    geo.rotateX(-Math.PI / 2);

    // Displace vertices using heightmap
    const positions = geo.attributes.position;
    const colors: number[] = [];

    const tempColor = new Color();

    for (let i = 0; i < positions.count; i++) {
      const height = heightmapData.heights[i];
      positions.setY(i, height);

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

      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }

    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [heightmapData, config]);

  // Custom material with detail noise (created once)
  const material = useMemo(() => createDetailedTerrainMaterial(graphicsQuality), [graphicsQuality]);

  // Prepare heights for Rapier HeightfieldCollider
  // Rapier wants heights in row-major order, but its rows correspond to local X and cols to local Z.
  // PlaneGeometry has rows along Z and cols along X. Therefore, we must transpose the array.
  const rapierHeights = useMemo(() => {
    const { rows, cols, heights } = heightmapData;
    const transposed = new Float32Array(heights.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // PlaneGeometry: r is Z-axis, c is X-axis
        // Rapier: r (row) is X-axis, c (col) is Z-axis
        transposed[c * rows + r] = heights[r * cols + c];
      }
    }
    return transposed;
  }, [heightmapData]);

  return (
    <RigidBody type="fixed" colliders={false} friction={1.2}>
      <HeightfieldCollider
        args={[
          config.subdivisions,
          config.subdivisions,
          rapierHeights as unknown as number[],
          {
            x: config.width,
            y: 1,
            z: config.depth,
          },
        ]}
      />
      <mesh geometry={geometry} material={material} receiveShadow={graphicsQuality !== 'low'} />
    </RigidBody>
  );
}
