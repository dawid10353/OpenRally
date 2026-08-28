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
    front: { baseGrip: 3.4, peakSlipAngle: Math.PI / 8, slideGrip: 3.1 },
    rear: { baseGrip: 3.4, peakSlipAngle: Math.PI / 8, slideGrip: 3.1 },
  },
  mud: {
    front: { baseGrip: 2.3, peakSlipAngle: Math.PI / 6.5, slideGrip: 1.8 },
    rear: { baseGrip: 2.15, peakSlipAngle: Math.PI / 6.5, slideGrip: 1.6 },
  },
  grass: {
    front: { baseGrip: 1.85, peakSlipAngle: Math.PI / 7, slideGrip: 1.3 },
    rear: { baseGrip: 1.65, peakSlipAngle: Math.PI / 7, slideGrip: 1.15 },
  },
  sand: {
    front: { baseGrip: 1.4, peakSlipAngle: Math.PI / 6, slideGrip: 1.0 },
    rear: { baseGrip: 1.2, peakSlipAngle: Math.PI / 6, slideGrip: 0.8 },
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
    maxForce: 18, // Firm and responsive braking with balanced weight transfer
    handbrakeForce: 65,
    frontBias: 0.50, // 50/50 even 4-wheel brake distribution
  },
  suspension: {
    frontAntiRollBarStiffness: 14.0, // Balanced ARB prevents understeer and keeps car level
    rearAntiRollBarStiffness: 15.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 4],      // 45 degrees at 0 km/h
      [40, Math.PI / 4.8],   // ~37.5 degrees at 40 km/h (agile turn-in)
      [90, Math.PI / 7.5],   // 24 degrees at 90 km/h (sharp medium-speed steering)
      [150, Math.PI / 12],   // 15 degrees at 150 km/h
      [220, Math.PI / 18],   // 10 degrees at 220 km/h
    ],
    steeringSpeed: 7.5, // Crisp, responsive steering input
    assists: {
      yawDamping: 0.08, // Dynamic agility assist for satisfying slides without understeer
      driftGripMultiplier: 0.22,
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
      suspensionTravel: 0.28,
      suspensionStiffness: 34,
      suspensionDamping: 4.0,
      maxSuspensionForce: 8000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.76, -0.2, 1.45],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.28,
      suspensionStiffness: 34,
      suspensionDamping: 4.0,
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
