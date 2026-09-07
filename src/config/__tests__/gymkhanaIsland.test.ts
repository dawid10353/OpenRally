import { describe, it, expect } from 'vitest';
import { LEVEL_PRESET_GYMKHANA, getLevelPreset, getAvailableLevels } from '@/config/levelRegistry';
import { validateLevelPreset, validateLevelTrackClearance } from '@/utils/validation/levelValidator';
import { compileTerrain, getInterpolatedHeight } from '@/utils/terrainCompiler';
import { getSurfaceAtPosition } from '@/utils/physics/tires';

describe('Apex Gymkhana Arena Level Preset', () => {
  it('is registered in level registry and accessible', () => {
    const preset = getLevelPreset('level5_gymkhana');
    expect(preset).toBeDefined();
    expect(preset.id).toBe('level5_gymkhana');
    expect(preset.name).toBe('Apex Gymkhana Arena');
    expect(preset.difficulty).toBe('medium');

    const available = getAvailableLevels();
    expect(available.some((l) => l.id === 'level5_gymkhana')).toBe(true);
  });

  it('restricts supportedModes to freeroam and gymkhana_blitz, excluding timeattack', () => {
    expect(LEVEL_PRESET_GYMKHANA.supportedModes).toEqual(['freeroam', 'gymkhana_blitz']);
    expect(LEVEL_PRESET_GYMKHANA.supportedModes).not.toContain('timeattack');
  });

  it('passes comprehensive LevelPreset runtime validation schema', () => {
    const validation = validateLevelPreset(LEVEL_PRESET_GYMKHANA);
    expect(validation.valid, `Validation errors: ${validation.errors.join(', ')}`).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('passes track clearance validation for all placed props', () => {
    const clearance = validateLevelTrackClearance(LEVEL_PRESET_GYMKHANA);
    expect(clearance.valid, `Clearance errors: ${clearance.errors.join(', ')}`).toBe(true);
    expect(clearance.errors).toHaveLength(0);
  });

  it('contains bespoke gymkhana obstacles: shipping containers and drift pylons', () => {
    const props = LEVEL_PRESET_GYMKHANA.data.props;
    const containers = props.filter((p) => p.type === 'shipping_container');
    const pylons = props.filter((p) => p.type === 'drift_pylon');

    expect(containers.length).toBeGreaterThanOrEqual(10);
    expect(pylons.length).toBeGreaterThanOrEqual(8);
  });

  it('spawns safely above ground level on the tarmac arena plateau', () => {
    const data = compileTerrain(LEVEL_PRESET_GYMKHANA.data);
    const spawnPos = LEVEL_PRESET_GYMKHANA.spawnPosition;
    const groundY = getInterpolatedHeight(
      spawnPos[0],
      spawnPos[2],
      data.heights,
      data.rows,
      data.cols,
      LEVEL_PRESET_GYMKHANA.data.terrainBase.width,
      LEVEL_PRESET_GYMKHANA.data.terrainBase.depth,
    );

    expect(spawnPos[1]).toBeGreaterThanOrEqual(groundY + 0.4);
    expect(spawnPos[1]).toBeLessThanOrEqual(groundY + 2.0);
  });

  it('classifies island plateau surface as tarmac in getSurfaceAtPosition', () => {
    const data = compileTerrain(LEVEL_PRESET_GYMKHANA.data);
    // On the 8m plateau
    const surface = getSurfaceAtPosition(0, 8.0, 0, data, LEVEL_PRESET_GYMKHANA.data);
    expect(surface).toBe('tarmac');

    const surfaceOuter = getSurfaceAtPosition(100, 8.0, 100, data, LEVEL_PRESET_GYMKHANA.data);
    expect(surfaceOuter).toBe('tarmac');
  });
});
