// ─── Terrain Detail Noise Config ─────────────────────────────────────

/**
 * How many times the detail noise pattern repeats across the terrain.
 * Higher = finer grain visible up close.
 */
export const DETAIL_NOISE_SCALE = 20.0;

/**
 * Strength of the noise overlay on vertex colors (0 = none, 1 = full).
 * 0.15 means the noise modulates brightness by ±15%.
 */
export const DETAIL_NOISE_STRENGTH = 0.15;

/**
 * How much steep slopes darken the surface (0 = none, 1 = full black).
 * Simulates micro-shadows in crevices and cliff faces.
 */
export const SLOPE_DARKENING_STRENGTH = 0.3;
