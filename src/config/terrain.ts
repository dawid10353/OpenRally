import { Color } from 'three';
import type { TerrainConfig } from '@/types/terrain';

// ─── Default Terrain Config ─────────────────────────────────────────
/** Default terrain configuration for Stage 1 */
export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 800,
  depth: 800,
  subdivisions: 256,
  amplitude: 30,
  frequency: 0.003,
  octaves: 5,
  lacunarity: 2.0,
  persistence: 0.45,
  seed: 42,
};

// ─── Spawn Flatten Zone ─────────────────────────────────────────────
/** Radius of the flat spawn zone at the center of the map (world units) */
export const FLATTEN_RADIUS = 30;

/** Falloff distance beyond the flatten radius for smooth transition */
export const FLATTEN_FALLOFF = 20;

// ─── Biome Colors ───────────────────────────────────────────────────
/** Vertex color for low-elevation terrain (grass) */
export const BIOME_COLOR_LOW = new Color(0x4a7c3f);

/** Vertex color for mid-elevation terrain (earth/brown) */
export const BIOME_COLOR_MID = new Color(0x8b6914);

/** Vertex color for high-elevation terrain (rock/gray) */
export const BIOME_COLOR_HIGH = new Color(0x888888);

/** Height threshold below which low→mid interpolation is used (normalized 0–1) */
export const BIOME_MID_THRESHOLD = 0.4;

// ─── Props ──────────────────────────────────────────────────────────
/** Number of environment props (trees/rocks) to scatter */
export const NUM_PROPS = 800;

/** Minimum distance from center to keep the spawn clearing free of props */
export const PROPS_CLEARING_RADIUS = 40;

/** Fraction of the map edge used to keep props within bounds */
export const PROPS_EDGE_MARGIN = 0.9;

/** Probability of a prop being a tree (vs. rock) */
export const TREE_PROBABILITY = 0.7;

/** Color used for tree props */
export const PROP_COLOR_TREE = new Color('#2d4c1e');

/** Color used for rock props */
export const PROP_COLOR_ROCK = new Color('#606060');
