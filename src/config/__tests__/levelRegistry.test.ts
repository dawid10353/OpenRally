import { describe, it, expect } from 'vitest';
import {
  LEVEL_REGISTRY,
  DEFAULT_LEVEL_ID,
  getLevelPreset,
  getAvailableLevels,
} from '@/config/levelRegistry';
import { validateLevelPreset } from '@/utils/validation/levelValidator';
import { compileTerrain, getInterpolatedHeight } from '@/utils/terrainCompiler';

describe('Level Registry', () => {
  it('has valid default level ID', () => {
    expect(LEVEL_REGISTRY[DEFAULT_LEVEL_ID]).toBeDefined();
    expect(DEFAULT_LEVEL_ID).toBe('level1_island');
  });

  it('contains valid levels that pass all procedural validation checks', () => {
    const levels = getAvailableLevels();
    expect(levels.length).toBeGreaterThanOrEqual(2);

    for (const level of levels) {
      const validation = validateLevelPreset(level);
      expect(validation.valid, `Level ${level.id} failed validation: ${validation.errors.join(', ')}`).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(level.data.track.points.length).toBeGreaterThanOrEqual(3);
      expect(level.spawnPosition).toHaveLength(3);
    }
  });

  it('retrieves level by ID with fallback to default', () => {
    const island = getLevelPreset(DEFAULT_LEVEL_ID);
    expect(island.id).toBe('level1_island');

    const unknownLevel = getLevelPreset('unknown_level');
    expect(unknownLevel.id).toBe('level1_island');

    const desert = getLevelPreset('level2_desert');
    expect(desert.id).toBe('level2_desert');
    expect(desert.surfaceDescription).toContain('Sand');

    const sweden = getLevelPreset('level3_sweden');
    expect(sweden.id).toBe('level3_sweden');
    expect(sweden.surfaceDescription).toContain('Snow');
  });

  it('ensures spawn position Y is above the terrain ground height for all levels', () => {
    const levels = getAvailableLevels();
    for (const level of levels) {
      const data = compileTerrain(level.data);
      const groundY = getInterpolatedHeight(
        level.spawnPosition[0],
        level.spawnPosition[2],
        data.heights,
        data.rows,
        data.cols,
        level.data.terrainBase.width,
        level.data.terrainBase.depth,
      );
      console.log(`[Spawn Test] Level ${level.id}: groundY = ${groundY.toFixed(2)}, spawnY = ${level.spawnPosition[1]}`);
      expect(level.spawnPosition[1]).toBeGreaterThanOrEqual(groundY + 0.5);
    }
  });
});
