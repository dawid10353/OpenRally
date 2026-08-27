import { Color, Vector2 } from 'three';

// ─── Water / Ocean Config ────────────────────────────────────────────

/** Deep water color */
export const WATER_COLOR = 0x07283c;

/** Sun color for water specular highlights (matches LIGHTING_CONFIG.directional.color) */
export const WATER_SUN_COLOR = 0xfff4e6;

/** Water transparency (1.0 = fully opaque ocean with shader depth extinction) */
export const WATER_ALPHA = 1.0;

/** Distortion scale for reflection wobble */
export const WATER_DISTORTION_SCALE = 3.5;

/** Size of the water plane (world units, square) */
export const WATER_SIZE = 8000;

/** Y position of the water plane (should match existing ocean placement) */
export const WATER_POSITION_Y = -8;

/** Resolution of the procedurally generated wave normal texture (pixels) */
export const WATER_NORMAL_TEXTURE_SIZE = 256;

/** Resolution of the planar reflection render target (pixels) */
export const WATER_REFLECTION_TEXTURE_SIZE = 512;

/** Number of subdivisions for the water plane geometry */
export const WATER_SEGMENTS = 512;

/** Speed multiplier for wave animation (higher = faster waves) */
export const WATER_WAVE_SPEED = 0.35;

// ─── Depth & Foam ───────────────────────────────────────────────────

/** Threshold for foam rendering (distance from geometry intersection in world units) */
export const WATER_FOAM_THRESHOLD = 1.0;

/** Threshold for depth color (distance in world units to transition to deep water color) */
export const WATER_DEPTH_THRESHOLD = 18.0;

/** Color of the foam at intersections */
export const WATER_FOAM_COLOR = new Color(0xffffff);

/** Shallow water color (near shores) */
export const WATER_SHALLOW_COLOR = new Color(0x197470);

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

