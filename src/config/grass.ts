import { Color } from 'three';

// ─── Grass Instancing Config ────────────────────────────────────────

/** Total number of grass tuft clusters to scatter across the terrain */
export const GRASS_COUNT = 80_000;

/** Minimum height of a grass tuft (world units) */
export const GRASS_HEIGHT_MIN = 0.08;

/** Maximum height of a grass tuft (world units) */
export const GRASS_HEIGHT_MAX = 0.22;

/** Width of a single grass blade at base (world units) */
export const GRASS_WIDTH = 0.18;

/** Width at the tip as fraction of base (0 = pointy, 1 = rectangle) */
export const GRASS_TIP_WIDTH = 0.15;

// ─── Wind Animation ─────────────────────────────────────────────────

/** Wind sway speed */
export const WIND_SPEED = 1.8;

/** Wind sway max displacement (world units) — very subtle for short grass */
export const WIND_STRENGTH = 0.02;

// ─── Placement Rules ────────────────────────────────────────────────

/** Max normalized terrain height (0–1) where grass grows */
export const GRASS_MAX_TERRAIN_HEIGHT = 0.45;

/** Min distance from map center to keep spawn zone clear */
export const GRASS_CLEARING_RADIUS = 18;

/** Fraction of map edge within which grass can appear */
export const GRASS_EDGE_MARGIN = 0.85;

// ─── Colors ─────────────────────────────────────────────────────────

/** Brightest grass tuft color (dry yellowish green) */
export const GRASS_COLOR_LIGHT = new Color('#a39a48');

/** Darkest grass tuft color (dry brownish green) */
export const GRASS_COLOR_DARK = new Color('#756c2e');
