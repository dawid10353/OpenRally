import { Color } from 'three';

// ─── Pool Size ───────────────────────────────────────────────────────
/** Maximum number of simultaneously active dust/smoke particles (desktop) */
export const MAX_PARTICLES = 400;

/** Mobile pool size for dust/smoke particles to reduce CPU overhead and VBO memory footprint */
export const MOBILE_MAX_PARTICLES = 150;

/** Maximum number of water splash particles (desktop) */
export const WATER_MAX_PARTICLES = 500;

/** Mobile pool size for water splash particles */
export const WATER_MOBILE_MAX_PARTICLES = 250;

// ─── Colors ──────────────────────────────────────────────────────────
/** Color used for dust kicked up during normal driving */
export const DUST_COLOR = new Color('#a89b82');

/** Color used for smoke during drift/handbrake */
export const SMOKE_COLOR = new Color('#dddddd');

// ─── Speed Thresholds ────────────────────────────────────────────────
/** Minimum lateral angular velocity (rad/s) to count as drifting */
export const DRIFT_ANGVEL_THRESHOLD = 1.5;

/** Minimum linear speed (m/s) for any particle emission */
export const DRIVING_SPEED_THRESHOLD = 2;

// ─── Emission ────────────────────────────────────────────────────────
/** Probability of emitting a particle per rear wheel per frame while drifting */
export const EMIT_PROBABILITY_DRIFT = 0.8;

/** Probability of emitting a particle per rear wheel per frame while driving normally */
export const EMIT_PROBABILITY_DRIVE = 1.0;

/** Y offset below wheel center to start particles at ground level */
export const GROUND_OFFSET = 0.2;

// ─── Particle Lifetime ──────────────────────────────────────────────
/** Max lifetime (seconds) of a drift/smoke particle */
export const DRIFT_PARTICLE_LIFETIME = 1.5;

/** Max lifetime (seconds) of a normal dust particle */
export const DRIVE_PARTICLE_LIFETIME = 0.6;

// ─── Tire Tracks Configuration ──────────────────────────────────────
/** Maximum number of tire track segments */
export const MAX_TRACKS = 1000;

/** Width of a tire track segment */
export const TRACK_WIDTH = 0.32;

/** Lifetime (seconds) of a tire track before it completely fades */
export const TRACK_LIFETIME = 15;

/** Minimum distance (meters) between track segments to prevent overlapping */
export const TRACK_MIN_DISTANCE = 0.2;

/** Color of the tire tracks (sand/dirt color) */
export const TRACK_COLOR = new Color('#382618');

/**
 * Quality-based settings presets for tire ribbon buffers.
 */
export const TIRE_TRACK_QUALITY_PRESETS = {
  low: {
    maxSegments: 400,
    lifetime: 8,
    minDistance: 0.3,
  },
  medium: {
    maxSegments: 800,
    lifetime: 15,
    minDistance: 0.2,
  },
  high: {
    maxSegments: 1600,
    lifetime: 24,
    minDistance: 0.15,
  },
  very_high: {
    maxSegments: 2500,
    lifetime: 35,
    minDistance: 0.12,
  },
} as const;

/**
 * Mobile-scaled quality presets for tire ribbon buffers.
 * Reduces segment memory overhead and geometry VBO upload pressure on mobile GPUs.
 */
export const TIRE_TRACK_MOBILE_PRESETS = {
  low: {
    maxSegments: 250,
    lifetime: 6,
    minDistance: 0.35,
  },
  medium: {
    maxSegments: 350,
    lifetime: 8,
    minDistance: 0.28,
  },
  high: {
    maxSegments: 500,
    lifetime: 12,
    minDistance: 0.22,
  },
  very_high: {
    maxSegments: 750,
    lifetime: 16,
    minDistance: 0.18,
  },
} as const;

