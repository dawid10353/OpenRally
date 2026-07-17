/**
 * Configuration for procedural terrain generation.
 */
export interface TerrainConfig {
  /** World-space width of the terrain (X axis) */
  readonly width: number;
  /** World-space depth of the terrain (Z axis) */
  readonly depth: number;
  /** Number of subdivisions along each axis */
  readonly subdivisions: number;
  /** Maximum height amplitude */
  readonly amplitude: number;
  /** Base noise frequency */
  readonly frequency: number;
  /** Number of noise octaves for fBM */
  readonly octaves: number;
  /** Frequency multiplier per octave */
  readonly lacunarity: number;
  /** Amplitude multiplier per octave */
  readonly persistence: number;
  /** Random seed for noise */
  readonly seed: number;
}

/**
 * Generated heightmap data — shared between visual mesh and physics collider.
 */
export interface HeightmapData {
  /** Raw height values, row-major order, size = (subdivisions+1)^2 */
  readonly heights: Float32Array;
  /** Track mask values, row-major order, 1.0 = center of track, 0.0 = no track */
  readonly trackMasks: Float32Array;
  /** Number of columns (X direction) */
  readonly cols: number;
  /** Number of rows (Z direction) */
  readonly rows: number;
  /** Minimum height value in the map */
  readonly minHeight: number;
  /** Maximum height value in the map */
  readonly maxHeight: number;
}


