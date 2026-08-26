import type { VehiclePreset } from '@/types/vehicle';
import { VEHICLE_MODEL_PATH } from './assets';
import { DEFAULT_VEHICLE_CONFIG } from './vehicle';

/**
 * Standard Rally Hatchback — 50/50 AWD, agile, forgiving suspension.
 */
export const VEHICLE_RALLY_HATCHBACK: VehiclePreset = {
  id: 'rally_hatchback',
  name: 'Apex Rally AWD',
  description: 'Balanced 4-wheel-drive rally hatchback tuned for versatile all-terrain grip and responsive cornering.',
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
 * Veloce Sport Coupe — RWD, high power, drift-oriented setup.
 */
export const VEHICLE_SPORT_COUPE: VehiclePreset = {
  id: 'rally_coupe',
  name: 'Veloce Sport RWD',
  description: 'High-revving rear-wheel-drive drift coupe designed for oversteer slides and asphalt/gravel power.',
  category: 'sports',
  modelPath: VEHICLE_MODEL_PATH,
  modelPositionOffset: [0, 0.0, 0],
  modelScale: [1, 1, 1],
  stats: {
    topSpeed: 9.0,
    acceleration: 9.0,
    handling: 9.0,
    offroad: 4.5,
    driveType: 'RWD',
  },
  config: {
    ...DEFAULT_VEHICLE_CONFIG,
    chassisMass: 135,
    engine: {
      maxForce: 480,
      maxSpeed: 265,
    },
    drivetrain: {
      frontBias: 0.0, // Pure RWD
    },
    brakes: {
      maxForce: 24,
      handbrakeForce: 75,
      frontBias: 0.65,
    },
    suspension: {
      frontAntiRollBarStiffness: 18.0,
      rearAntiRollBarStiffness: 12.0,
    },
    handling: {
      ...DEFAULT_VEHICLE_CONFIG.handling,
      steeringSpeed: 7.0,
      assists: {
        yawDamping: 0.08,
        driftGripMultiplier: 0.22,
      },
    },
    aerodynamics: {
      downforceFactor: 18,
    },
    wheels: [
      {
        ...DEFAULT_VEHICLE_CONFIG.wheels[0],
        powered: false, // Front wheels unpowered in RWD
      },
      {
        ...DEFAULT_VEHICLE_CONFIG.wheels[1],
        powered: false,
      },
      {
        ...DEFAULT_VEHICLE_CONFIG.wheels[2],
        powered: true,
      },
      {
        ...DEFAULT_VEHICLE_CONFIG.wheels[3],
        powered: true,
      },
    ],
  },
};

/**
 * Baja Dune Runner — heavy-duty offroader with long-travel suspension and high torque.
 */
export const VEHICLE_DESERT_TRUCK: VehiclePreset = {
  id: 'desert_truck',
  name: 'Baja Dune Runner AWD',
  description: 'Heavy-duty offroad trophy truck with raised long-travel suspension and high low-end torque.',
  category: 'offroad',
  modelPath: VEHICLE_MODEL_PATH,
  modelPositionOffset: [0, 0.0, 0],
  modelScale: [1, 1, 1],
  stats: {
    topSpeed: 6.5,
    acceleration: 7.5,
    handling: 6.5,
    offroad: 10.0,
    driveType: 'AWD',
  },
  config: {
    ...DEFAULT_VEHICLE_CONFIG,
    chassisMass: 175,
    chassisSize: [2.1, 0.7, 4.2],
    engine: {
      maxForce: 520,
      maxSpeed: 210,
    },
    drivetrain: {
      frontBias: 0.5,
    },
    brakes: {
      maxForce: 25,
      handbrakeForce: 70,
      frontBias: 0.55,
    },
    suspension: {
      frontAntiRollBarStiffness: 12.0,
      rearAntiRollBarStiffness: 9.0,
    },
    handling: {
      ...DEFAULT_VEHICLE_CONFIG.handling,
      steeringSpeed: 5.5,
      assists: {
        yawDamping: 0.15,
        driftGripMultiplier: 0.16,
      },
    },
    aerodynamics: {
      downforceFactor: 12,
    },
    wheels: [
      {
        position: [-0.82, -0.2, 1.45],
        radius: 0.38,
        suspensionRestLength: 0.40,
        suspensionTravel: 0.38,
        suspensionStiffness: 28,
        suspensionDamping: 4.0,
        maxSuspensionForce: 10000,
        steerable: true,
        powered: true,
      },
      {
        position: [0.82, -0.2, 1.45],
        radius: 0.38,
        suspensionRestLength: 0.40,
        suspensionTravel: 0.38,
        suspensionStiffness: 28,
        suspensionDamping: 4.0,
        maxSuspensionForce: 10000,
        steerable: true,
        powered: true,
      },
      {
        position: [-0.82, -0.2, -1.4],
        radius: 0.38,
        suspensionRestLength: 0.40,
        suspensionTravel: 0.38,
        suspensionStiffness: 28,
        suspensionDamping: 4.0,
        maxSuspensionForce: 10000,
        steerable: false,
        powered: true,
      },
      {
        position: [0.82, -0.2, -1.4],
        radius: 0.38,
        suspensionRestLength: 0.40,
        suspensionTravel: 0.38,
        suspensionStiffness: 28,
        suspensionDamping: 4.0,
        maxSuspensionForce: 10000,
        steerable: false,
        powered: true,
      },
    ],
  },
};

/**
 * Registry of all available vehicles in OpenRally.
 */
export const VEHICLE_REGISTRY: Record<string, VehiclePreset> = {
  rally_hatchback: VEHICLE_RALLY_HATCHBACK,
  rally_coupe: VEHICLE_SPORT_COUPE,
  desert_truck: VEHICLE_DESERT_TRUCK,
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
