import { useMemo } from 'react';
import { PlaneGeometry, Color, Float32BufferAttribute } from 'three';
import { RigidBody, HeightfieldCollider } from '@react-three/rapier';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { mapRange } from '@/utils/math';
import {
  BIOME_COLOR_LOW,
  BIOME_COLOR_MID,
  BIOME_COLOR_HIGH,
  BIOME_MID_THRESHOLD,
} from '@/config/terrain';

/**
 * Procedural terrain with heightmap-based geometry and physics collider.
 * Uses Perlin noise fBM for natural-looking hills and valleys.
 * Vertex-colored gradient: green (low) → brown (mid) → gray (high).
 *
 * Heightmap data is consumed from TerrainContext (shared with PropsInstancer).
 */
export function Terrain() {
  const { heightmapData, config } = useTerrainData();

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
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.05}
          flatShading={false}
        />
      </mesh>
    </RigidBody>
  );
}
