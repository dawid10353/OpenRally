import type { LevelPreset } from '@/types/level';
import { LEVEL1_DATA } from './level1';
import { LEVEL2_DESERT_DATA } from './levels/desertCanyon';

/**
 * Stage 1 / Default Level: Island Circuit.
 * Coastal asphalt/mud track surrounded by ocean and green hills.
 * Vehicle spawns directly on the marked start grid facing the Start/Finish Gantry.
 */
export const LEVEL_PRESET_ISLAND: LevelPreset = {
  id: 'level1_island',
  name: 'Island Circuit',
  description: 'Coastal circuit featuring rolling green hills, mud track curves, and ocean vistas.',
  difficulty: 'easy',
  surfaceDescription: 'Mud & Grass',
  data: LEVEL1_DATA,
  spawnPosition: [-4.0, 0.8, 2.0],
  spawnRotationY: Math.atan2(90 - (-70), -45 - 35), // ~2.034 rad (116.5°) aligned with start straight
  fallResetY: -8.25,
};

/**
 * Stage 2 Level: Desert Canyon.
 * Arid canyon with rocky slopes, loose sand dunes, and sharp sweeping curves.
 * Vehicle spawns directly on the marked start grid facing the Start/Finish Gantry.
 */
export const LEVEL_PRESET_DESERT: LevelPreset = {
  id: 'level2_desert',
  name: 'Desert Canyon',
  description: 'Arid desert basin with rocky canyon passes, loose sand dunes, and elevated ridges.',
  difficulty: 'medium',
  surfaceDescription: 'Sand & Gravel',
  data: LEVEL2_DESERT_DATA,
  spawnPosition: [-4.2, 2.3, -1.5],
  spawnRotationY: Math.atan2(110 - (-70), 40 - (-25)), // ~1.225 rad (70.2°) aligned with start straight
  fallResetY: -10.0,
  environment: {
    sky: {
      sunPosition: [100, 30, -50],
      inclination: 0.6,
      azimuth: 0.3,
    },
    fog: {
      color: '#d4b483',
      near: 150,
      far: 1400,
    },
  },
};

/**
 * Registry of all available levels in OpenRally.
 */
export const LEVEL_REGISTRY: Record<string, LevelPreset> = {
  level1_island: LEVEL_PRESET_ISLAND,
  level2_desert: LEVEL_PRESET_DESERT,
};

/** Default active level ID */
export const DEFAULT_LEVEL_ID = 'level1_island';

/**
 * Returns level preset by ID, falling back to Island Circuit if not found.
 */
export function getLevelPreset(id: string): LevelPreset {
  return LEVEL_REGISTRY[id] ?? LEVEL_PRESET_ISLAND;
}

/**
 * Returns an array of all registered level presets.
 */
export function getAvailableLevels(): LevelPreset[] {
  return Object.values(LEVEL_REGISTRY);
}
