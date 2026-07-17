import type { VehicleConfig } from '@/types/vehicle';

// ─── Speed & Movement ───────────────────────────────────────────────
/** Conversion factor: multiply m/s by this to get km/h */
export const MS_TO_KMH = 3.6;

/** Minimum forward speed (m/s) before braking force is applied instead of reverse */
export const BRAKE_SPEED_THRESHOLD = 0.5;

/** Reverse engine force multiplier (fraction of max engine force) */
export const REVERSE_FORCE_MULTIPLIER = 0.8;

// ─── Gearbox (5-speed automatic) ────────────────────────────────────
export const GEAR_RATIOS = [0, 2.5, 1.8, 1.3, 1.0, 0.8]; // Index is gear (0=N/R, 1..5)
export const SHIFT_UP_SPEEDS = [0, 40, 80, 130, 180, 999]; // Shift to next gear when exceeding these speeds (km/h)
export const SHIFT_DOWN_SPEEDS = [0, 0, 30, 70, 120, 170]; // Shift to previous gear when falling below these speeds (km/h)

// ─── Friction ────────────────────────────────────────────────────────
/** Base friction slip for steerable (front) wheels on normal terrain */
export const FRICTION_FRONT_NORMAL = 3.0;

/** Base friction slip for powered (rear) wheels on normal terrain */
export const FRICTION_REAR_NORMAL = 3.5;

/** Friction slip for steerable wheels on sand/low terrain */
export const FRICTION_FRONT_SAND = 1.5;

/** Friction slip for powered wheels on sand/low terrain */
export const FRICTION_REAR_SAND = 2.0;

/** Friction slip applied to rear wheels during handbrake (drift mode) */
export const FRICTION_HANDBRAKE = 0.5;

/** Terrain elevation threshold below which sand friction is applied */
export const SAND_ELEVATION_THRESHOLD = 0;

// ─── Reset ───────────────────────────────────────────────────────────
/** Y position below which the vehicle resets (fallen into ocean, wheels completely submerged) */
export const FALL_RESET_Y = -8.25;

/** Position the vehicle resets to after falling (spawned on the track) */
export const RESET_SPAWN_POSITION: [number, number, number] = [-220, 0.5, 0];

/** Euler Y rotation (heading in radians) when spawned/reset */
export const RESET_SPAWN_ROTATION_Y = Math.PI + 0.7;

// ─── Frame Clamping ──────────────────────────────────────────────────
/** Maximum frame delta (seconds) to prevent physics explosion after tab switch */
export const MAX_DELTA = 0.05;

// ─── Default Vehicle Config ──────────────────────────────────────────
/** Default vehicle configuration — physics parameters for the Stage 1 car */
export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 150,
  chassisSize: [2, 0.6, 4],
  maxEngineForce: 400, // Reduced from 800 because now 4 wheels are powered (AWD)
  maxBrakeForce: 60,
  handbrakeForce: 100,
  maxSteeringAngle: Math.PI / 6, // 30 degrees
  steeringSpeed: 5,
  maxSpeed: 240,
  downforceFactor: 50, // Applied per m/s of speed
  wheels: [
    {
      // Front-left
      position: [-0.76, -0.2, 1.45],
      radius: 0.35,
      suspensionRestLength: 0.3,
      suspensionTravel: 0.3,
      suspensionStiffness: 20,
      suspensionDamping: 2.5,
      steerable: true,
      powered: true, // Now AWD to prevent wheelies
    },
    {
      // Front-right
      position: [0.76, -0.2, 1.45],
      radius: 0.35,
      suspensionRestLength: 0.3,
      suspensionTravel: 0.3,
      suspensionStiffness: 20,
      suspensionDamping: 2.5,
      steerable: true,
      powered: true, // Now AWD
    },
    {
      // Rear-left
      position: [-0.76, -0.2, -1.4],
      radius: 0.35,
      suspensionRestLength: 0.3,
      suspensionTravel: 0.3,
      suspensionStiffness: 20,
      suspensionDamping: 2.5,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.76, -0.2, -1.4],
      radius: 0.35,
      suspensionRestLength: 0.3,
      suspensionTravel: 0.3,
      suspensionStiffness: 20,
      suspensionDamping: 2.5,
      steerable: false,
      powered: true,
    },
  ],
};
