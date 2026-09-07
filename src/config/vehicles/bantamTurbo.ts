import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_BANTAM_TURBO_MODEL_PATH } from '@/config/assets';

/**
 * Bantam Turbo Maxi — Mid-engine widebody pocket rocket.
 * Ultra-short wheelbase, aggressive turn-in, and instantaneous pendulum drifts.
 */
export const BANTAM_TURBO_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 135,
  chassisSize: [1.9, 0.6, 3.8],
  weightDistribution: {
    frontBias: 0.46, // Mid-engine rear-biased weight concentration
    engineOffsetZ: 0.15,
    engineOffsetY: -0.16,
    centerOfMassZ: 0.0,
  },
  engine: {
    maxForce: 395,
    maxSpeed: 245,
  },
  drivetrain: {
    frontBias: 0.40, // 40/60 rear-biased AWD for snappy Scandinavian flicks
  },
  brakes: {
    maxForce: 18,
    handbrakeForce: 78,
    frontBias: 0.50,
  },
  suspension: {
    frontAntiRollBarStiffness: 17.0,
    rearAntiRollBarStiffness: 22.0,
    antiSquatStiffness: 34.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 3.6],   // 50 degrees lock at low speeds
      [40, Math.PI / 4.2],  // 42.8 degrees
      [90, Math.PI / 6.2],  // 29 degrees
      [150, Math.PI / 9.5], // 18.9 degrees
      [240, Math.PI / 14],  // 12.8 degrees
    ],
    steeringSpeed: 9.0, // Lightning quick steering response
    assists: {
      yawDamping: 0.10,
      driftGripMultiplier: 0.26,
    },
  },
  aerodynamics: {
    downforceFactor: 18,
  },
  wheels: [
    {
      // Front-left
      position: [-0.96, -0.2, 1.32],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 38,
      suspensionDamping: 4.8,
      maxSuspensionForce: 9500,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.96, -0.2, 1.32],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 38,
      suspensionDamping: 4.8,
      maxSuspensionForce: 9500,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left (widebody rear axle aligned with flared arches)
      position: [-1.02, -0.2, -1.52],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 40,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right (widebody rear axle aligned with flared arches)
      position: [1.02, -0.2, -1.52],
      radius: 0.32,
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

export const VEHICLE_BANTAM_TURBO: VehiclePreset = {
  id: 'bantam_turbo',
  name: 'Bantam Turbo Maxi',
  description: 'Widebody mid-engine hot hatch legend engineered for nimble hairpin mastery, explosive corner exit traction, and effortless oversteer drifts.',
  category: 'rally',
  modelPath: VEHICLE_BANTAM_TURBO_MODEL_PATH,
  modelPositionOffset: [0, 0.12, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 8.2,
    acceleration: 8.9,
    handling: 9.6,
    offroad: 8.0,
    driveType: 'AWD',
  },
  config: BANTAM_TURBO_VEHICLE_CONFIG,
};
