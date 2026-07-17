import { Color, Vector2 } from 'three';

// ─── Water / Ocean Config ────────────────────────────────────────────

/** Deep water color */
export const WATER_COLOR = 0x001e3c;

/** Sun color for water specular highlights (matches LIGHTING_CONFIG.directional.color) */
export const WATER_SUN_COLOR = 0xfff5e6;

/** Water transparency (0 = fully transparent, 1 = opaque) */
export const WATER_ALPHA = 0.85;

/** Distortion scale for reflection wobble */
export const WATER_DISTORTION_SCALE = 3.7;

/** Size of the water plane (world units, square) */
export const WATER_SIZE = 2000;

/** Y position of the water plane (should match existing ocean placement) */
export const WATER_POSITION_Y = -8;

/** Resolution of the procedurally generated wave normal texture (pixels) */
export const WATER_NORMAL_TEXTURE_SIZE = 256;

/** Resolution of the planar reflection render target (pixels) */
export const WATER_REFLECTION_TEXTURE_SIZE = 512;

/** Number of subdivisions for the water plane geometry */
export const WATER_SEGMENTS = 512;

/** Speed multiplier for wave animation (higher = faster waves) */
export const WATER_WAVE_SPEED = 0.4;

// ─── Depth & Foam ───────────────────────────────────────────────────

/** Threshold for foam rendering (distance from geometry intersection in world units) */
export const WATER_FOAM_THRESHOLD = 0.8;

/** Threshold for depth color (distance in world units to transition to deep water color) */
export const WATER_DEPTH_THRESHOLD = 15.0;

/** Color of the foam at intersections */
export const WATER_FOAM_COLOR = new Color(0xffffff);

/** Shallow water color (near shores) */
export const WATER_SHALLOW_COLOR = new Color(0x27a599);

// ─── Gerstner Waves (Calm water for Rally) ──────────────────────────

export const WATER_WAVE_A_DIR = new Vector2(1.0, 0.5).normalize();
export const WATER_WAVE_A_STEEPNESS = 0.015;
export const WATER_WAVE_A_WAVELENGTH = 30.0;

export const WATER_WAVE_B_DIR = new Vector2(0.5, 1.0).normalize();
export const WATER_WAVE_B_STEEPNESS = 0.01;
export const WATER_WAVE_B_WAVELENGTH = 20.0;

export const WATER_WAVE_C_DIR = new Vector2(-0.2, 0.5).normalize();
export const WATER_WAVE_C_STEEPNESS = 0.005;
export const WATER_WAVE_C_WAVELENGTH = 10.0;

