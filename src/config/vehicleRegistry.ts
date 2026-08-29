import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_MODEL_PATH, VEHICLE_WRC_MODEL_PATH } from './assets';
import { DEFAULT_VEHICLE_CONFIG } from './vehicle';

/**
 * Classic Group A Rally Hatchback — 50/50 AWD, agile, forgiving suspension.
 */
export const VEHICLE_RALLY_HATCHBACK: VehiclePreset = {
  id: 'rally_hatchback',
  name: 'Apex Rally AWD',
  description: 'Balanced 4-wheel-drive classic rally hatchback tuned for versatile all-terrain grip and responsive cornering.',
  category: 'rally',
  modelPath: VEHICLE_MODEL_PATH,
  modelPositionOffset: [0, 0.2, 0.1],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 7.5,
    acceleration: 8.0,
    handling: 8.5,
    offroad: 8.0,
    driveType: 'AWD',
  },
  config: DEFAULT_VEHICLE_CONFIG,
};

/**
 * Modern WRC Rally Car — Aggressive downforce, wide track, explosive turbo acceleration.
 */
export const WRC_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 150,
  chassisSize: [2.0, 0.6, 4.0],
  engine: {
    maxForce: 420, // Explosive WRC turbo boost with planted pitch stability
    maxSpeed: 265,
  },
  drivetrain: {
    frontBias: 0.48, // 48/52 Rear-biased AWD for nimble rally throttle steering
  },
  brakes: {
    maxForce: 18,
    handbrakeForce: 70,
    frontBias: 0.50, // Balanced 50/50 4-wheel brake distribution (no nose-dive / stoppies)
  },
  suspension: {
    frontAntiRollBarStiffness: 18.0,
    rearAntiRollBarStiffness: 20.0, // Stiffer rear ARB eliminates understeer and promotes razor-sharp turn-in
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 3.8],    // 47.3 degrees at 0 km/h
      [40, Math.PI / 4.5],   // 40 degrees at 40 km/h (instant agile corner entry)
      [90, Math.PI / 7.0],   // 25.7 degrees at 90 km/h (sharp medium-speed steering)
      [150, Math.PI / 11],   // 16.3 degrees at 150 km/h
      [240, Math.PI / 16],   // 11.25 degrees at 240 km/h
    ],
    steeringSpeed: 9.5, // Razor-sharp modern WRC rally steering response
    assists: {
      yawDamping: 0.06, // Natural rotation and agile drift control
      driftGripMultiplier: 0.24,
    },
  },
  aerodynamics: {
    downforceFactor: 22, // Modern WRC aerodynamic downforce
  },
  wheels: [
    {
      // Front-left
      position: [-0.88, -0.2, 1.38],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 38,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.88, -0.2, 1.38],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 38,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.89, -0.2, -1.25],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 40,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.89, -0.2, -1.25],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 40,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
  ],
};

/**
 * Modern Rally1 Car Preset.
 */
export const VEHICLE_RALLY_WRC: VehiclePreset = {
  id: 'rally_wrc',
  name: 'Vortex Rally1',
  description: 'Next-gen modern Rally1 machine with aggressive aero, explosive turbo acceleration, and razor-sharp high-speed downforce handling.',
  category: 'rally',
  modelPath: VEHICLE_WRC_MODEL_PATH,
  modelPositionOffset: [0, 0.10, 0.1],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 8.8,
    acceleration: 9.2,
    handling: 9.3,
    offroad: 8.8,
    driveType: 'AWD',
  },
  config: WRC_VEHICLE_CONFIG,
};

/**
 * Registry of all available vehicles in OpenRally.
 */
export const VEHICLE_REGISTRY: Record<string, VehiclePreset> = {
  rally_hatchback: VEHICLE_RALLY_HATCHBACK,
  rally_wrc: VEHICLE_RALLY_WRC,
};

/** Default vehicle preset ID */
export const DEFAULT_VEHICLE_ID = 'rally_hatchback';

/**
 * Retrieves a vehicle preset by ID, falling back to default if not found.
 */
export function getVehiclePreset(id: string): VehiclePreset {
  return VEHICLE_REGISTRY[id] ?? VEHICLE_RALLY_HATCHBACK;
}

/**
 * Returns an array of all registered vehicle presets.
 */
export function getAvailableVehicles(): VehiclePreset[] {
  return Object.values(VEHICLE_REGISTRY);
}
