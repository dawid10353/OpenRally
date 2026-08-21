import { describe, it, expect } from 'vitest';
import {
  LEVEL_REGISTRY,
  DEFAULT_LEVEL_ID,
  getLevelPreset,
  getAvailableLevels,
} from '@/config/levelRegistry';
import { validateLevelPreset } from '@/utils/validation/levelValidator';

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
  });
});
