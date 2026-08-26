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
  chassisMass: 135,
  chassisSize: [1.9, 0.6, 4.1],
  engine: {
    maxForce: 520, // Explosive turbo boost
    maxSpeed: 265,
  },
  drivetrain: {
    frontBias: 0.5, // 50/50 AWD
  },
  brakes: {
    maxForce: 28,
    handbrakeForce: 75,
    frontBias: 0.55,
  },
  suspension: {
    frontAntiRollBarStiffness: 18.0,
    rearAntiRollBarStiffness: 14.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 4],      // 45 degrees at 0 km/h
      [50, Math.PI / 5],     // 36 degrees at 50 km/h (ultra-sharp corner entry)
      [120, Math.PI / 9],    // 20 degrees at 120 km/h
      [200, Math.PI / 18],   // 10 degrees at 200 km/h
    ],
    steeringSpeed: 8.0, // Razor-sharp modern rally steering response
    assists: {
      yawDamping: 0.09,
      driftGripMultiplier: 0.22,
    },
  },
  aerodynamics: {
    downforceFactor: 22, // Modern WRC aerodynamic downforce
  },
  wheels: [
    {
      // Front-left
      position: [-0.78, -0.2, 1.22],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 4.2,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.78, -0.2, 1.22],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 4.2,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.78, -0.2, -1.15],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.28,
      suspensionStiffness: 40,
      suspensionDamping: 4.5,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.78, -0.2, -1.15],
      radius: 0.35,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.28,
      suspensionStiffness: 40,
      suspensionDamping: 4.5,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
  ],
};

/**
 * Modern Rally1 WRC Car Preset.
 */
export const VEHICLE_RALLY_WRC: VehiclePreset = {
  id: 'rally_wrc',
  name: 'Vortex WRC Rally1',
  description: 'Next-gen modern WRC rally machine with aggressive aero, explosive turbo acceleration, and razor-sharp high-speed downforce handling.',
  category: 'rally',
  modelPath: VEHICLE_WRC_MODEL_PATH,
  modelPositionOffset: [0, 0.22, 0.0],
  modelScale: [2.3, 2.3, 2.3],
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
