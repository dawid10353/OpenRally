import type { LevelData, LevelPreset } from '@/types/level';
import type { ValidationResult } from './vehicleValidator';

/**
 * Validates level data (terrain base, track spline, height modifiers, props).
 */
export function validateLevelData(data: LevelData): ValidationResult {
  const errors: string[] = [];

  if (!data) {
    return { valid: false, errors: ['LevelData is null or undefined'] };
  }

  if (!data.id || typeof data.id !== 'string') {
    errors.push('LevelData.id is required.');
  }
  if (!data.name || typeof data.name !== 'string') {
    errors.push('LevelData.name is required.');
  }

  // TerrainBase checks
  const tb = data.terrainBase;
  if (!tb) {
    errors.push('LevelData.terrainBase is missing.');
  } else {
    if (tb.width <= 0 || tb.depth <= 0) {
      errors.push(`Invalid terrain dimensions: width=${tb.width}, depth=${tb.depth}. Must be > 0.`);
    }
    if (tb.subdivisions < 16) {
      errors.push(`subdivisions must be >= 16 (currently: ${tb.subdivisions}).`);
    }
    if (tb.amplitude <= 0) {
      errors.push(`amplitude must be > 0 (currently: ${tb.amplitude}).`);
    }
    if (tb.octaves < 1) {
      errors.push(`octaves must be >= 1 (currently: ${tb.octaves}).`);
    }
  }

  // Track checks
  const track = data.track;
  if (!track) {
    errors.push('LevelData.track is missing.');
  } else {
    if (!Array.isArray(track.points) || track.points.length < 3) {
      errors.push(`Track points must contain at least 3 points to form a closed spline (currently: ${track.points?.length ?? 0}).`);
    }
    if (track.width <= 0) {
      errors.push(`Track width must be > 0 (currently: ${track.width}).`);
    }
    if (track.falloff < 0) {
      errors.push(`Track falloff must be >= 0 (currently: ${track.falloff}).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a level preset metadata and spawn properties.
 */
export function validateLevelPreset(preset: LevelPreset): ValidationResult {
  const errors: string[] = [];

  if (!preset.id || typeof preset.id !== 'string') {
    errors.push('LevelPreset.id is missing or not a string.');
  }
  if (!preset.name || typeof preset.name !== 'string') {
    errors.push('LevelPreset.name is missing or not a string.');
  }
  if (!preset.spawnPosition || preset.spawnPosition.length !== 3) {
    errors.push('LevelPreset.spawnPosition must be a 3-element tuple [x, y, z].');
  }

  const dataValidation = validateLevelData(preset.data);
  if (!dataValidation.valid) {
    errors.push(...dataValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
