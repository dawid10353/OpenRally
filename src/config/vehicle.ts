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

// ─── Friction & Tire Models ──────────────────────────────────────────
export const TIRE_MODELS: Record<'tarmac' | 'mud' | 'grass' | 'sand', import('@/types/vehicle').TireConfig> = {
  tarmac: {
    front: { baseGrip: 3.2, peakSlipAngle: Math.PI / 8, slideGrip: 3.0 },
    rear: { baseGrip: 3.6, peakSlipAngle: Math.PI / 8, slideGrip: 3.3 },
  },
  mud: {
    front: { baseGrip: 2.3, peakSlipAngle: Math.PI / 6, slideGrip: 1.9 },
    rear: { baseGrip: 2.5, peakSlipAngle: Math.PI / 6, slideGrip: 2.0 },
  },
  grass: {
    front: { baseGrip: 2.0, peakSlipAngle: Math.PI / 7, slideGrip: 1.6 },
    rear: { baseGrip: 2.3, peakSlipAngle: Math.PI / 7, slideGrip: 1.8 },
  },
  sand: {
    front: { baseGrip: 1.5, peakSlipAngle: Math.PI / 6, slideGrip: 1.3 },
    rear: { baseGrip: 1.8, peakSlipAngle: Math.PI / 6, slideGrip: 1.5 },
  },
};

/** Terrain elevation threshold below which sand friction is applied */
export const SAND_ELEVATION_THRESHOLD = 0;

// ─── Reset ───────────────────────────────────────────────────────────
/** Y position below which the vehicle resets (fallen into ocean, wheels completely submerged) */
export const FALL_RESET_Y = -8.25;

/** Position the vehicle resets to after falling (spawned on the track) */
export const RESET_SPAWN_POSITION: [number, number, number] = [-209.8, -0.2, -38.0];

/** Euler Y rotation (heading in radians) when spawned/reset */
export const RESET_SPAWN_ROTATION_Y = Math.PI + 0.7 - (120 * Math.PI / 180);

// ─── Frame Clamping ──────────────────────────────────────────────────
/** Maximum frame delta (seconds) to prevent physics explosion after tab switch */
export const MAX_DELTA = 0.05;

// ─── Default Vehicle Config ──────────────────────────────────────────
/** Default vehicle configuration — physics parameters for the Stage 1 car */
export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 150,
  chassisSize: [2, 0.6, 4],
  engine: {
    maxForce: 400, // AWD powered
    maxSpeed: 240,
  },
  drivetrain: {
    frontBias: 0.5, // 50/50 AWD
  },
  brakes: {
    maxForce: 20, // Firm and responsive braking with realistic weight transfer
    handbrakeForce: 65,
    frontBias: 0.50, // 50/50 even 4-wheel brake distribution
  },
  suspension: {
    frontAntiRollBarStiffness: 14.0, // Active ARB prevents rollovers on aggressive turns
    rearAntiRollBarStiffness: 10.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 4],      // 45 degrees at 0 km/h
      [50, Math.PI / 5.5],   // ~33 degrees at 50 km/h (great responsive cornering)
      [120, Math.PI / 10],   // 18 degrees at 120 km/h
      [200, Math.PI / 20],   // 9 degrees at 200 km/h
    ],
    steeringSpeed: 6, // Fast, agile steering response
    assists: {
      yawDamping: 0.12, // Subtle, natural drift assist for satisfying slides
      driftGripMultiplier: 0.18,
    },
  },
  aerodynamics: {
    downforceFactor: 15, // Smooth high-speed stability without crushing suspension
  },
  wheels: [
    {
      // Front-left
      position: [-0.76, -0.2, 1.45],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.30,
      suspensionStiffness: 32,
      suspensionDamping: 3.5,
      maxSuspensionForce: 8000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.76, -0.2, 1.45],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.30,
      suspensionStiffness: 32,
      suspensionDamping: 3.5,
      maxSuspensionForce: 8000,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.76, -0.2, -1.4],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.30,
      suspensionStiffness: 32,
      suspensionDamping: 3.5,
      maxSuspensionForce: 8000,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.76, -0.2, -1.4],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.30,
      suspensionStiffness: 32,
      suspensionDamping: 3.5,
      maxSuspensionForce: 8000,
      steerable: false,
      powered: true,
    },
  ],
};
