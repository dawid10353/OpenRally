import type { TerrainConfig } from '@/types/terrain';

export const LEVEL1_CONFIG: TerrainConfig = {
  width: 800,
  depth: 800,
  subdivisions: 256,
  amplitude: 30,
  frequency: 0.003,
  octaves: 5,
  lacunarity: 2.0,
  persistence: 0.45,
  seed: 42,
  features: [
    {
      type: 'spawn_flatten',
      x: 0,
      z: 0,
      radius: 30,
      falloff: 20,
    },
    {
      type: 'mountain',
      x: 280,
      z: -280,
      radius: 180,
      height: 160,
      flattenTop: true,
    }
  ],
  track: {
    width: 25,
    falloff: 40,
    targetHeight: -0.5,
    points: [
      { x: 0, z: 0 },
      { x: 100, z: -50 },
      { x: 180, z: -100 },
      { x: 220, z: 0 },
      { x: 150, z: 120 },
      { x: 0, z: 200 },
      { x: -150, z: 100 },
      { x: -200, z: 0 },
      { x: -100, z: -150 },
      { x: -50, z: -50 },
    ],
  },
};
