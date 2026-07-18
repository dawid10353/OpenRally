import { Color } from 'three';
import type { LevelData } from '@/types/level';

import { LEVEL1_DATA } from './level1';

// ─── Default Level Config ─────────────────────────────────────────
/** Default level configuration for Stage 1 */
export const DEFAULT_LEVEL_DATA: LevelData = LEVEL1_DATA;

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
/** Color used for tree props */
export const PROP_COLOR_TREE = new Color('#2d4c1e');

/** Color used for rock props */
export const PROP_COLOR_ROCK = new Color('#606060');
