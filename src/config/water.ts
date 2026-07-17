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
export const WATER_NORMAL_TEXTURE_SIZE = 512;

/** Resolution of the planar reflection render target (pixels) */
export const WATER_REFLECTION_TEXTURE_SIZE = 512;

/** Number of subdivisions for the water plane geometry */
export const WATER_SEGMENTS = 64;

/** Speed multiplier for wave animation (higher = faster waves) */
export const WATER_WAVE_SPEED = 0.4;
