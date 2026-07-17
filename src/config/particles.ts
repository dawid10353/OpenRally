import { Color } from 'three';

// ─── Pool Size ───────────────────────────────────────────────────────
/** Maximum number of simultaneously active dust/smoke particles */
export const MAX_PARTICLES = 800;

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

// ─── Tire Tracks ─────────────────────────────────────────────────────
/** Maximum number of tire track segments */
export const MAX_TRACKS = 2000;

/** Width of a tire track segment */
export const TRACK_WIDTH = 0.3;

/** Lifetime (seconds) of a tire track before it completely fades */
export const TRACK_LIFETIME = 15;

/** Minimum distance (meters) between track segments to prevent overlapping */
export const TRACK_MIN_DISTANCE = 0.3;

/** Color of the tire tracks (sand/dirt color) */
export const TRACK_COLOR = new Color('#6b5533');
