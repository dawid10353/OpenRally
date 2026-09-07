import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_PHANTOM_B_MODEL_PATH } from '@/config/assets';

/**
 * Phantom B-Spec — Mid-engine lightweight Group B prototype.
 * High-revving turbo, responsive throttle steering, and nimble chassis.
 */
export const PHANTOM_B_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 140,
  chassisSize: [1.9, 0.6, 4.0],
  weightDistribution: {
    frontBias: 0.50, // Mid-engine 50/50 balance
    engineOffsetZ: 0.20,
    engineOffsetY: -0.16,
    centerOfMassZ: 0.04,
  },
  engine: {
    maxForce: 440,
    maxSpeed: 275,
  },
  drivetrain: {
    frontBias: 0.48, // 48/52 Rear-biased AWD
  },
  brakes: {
    maxForce: 19,
    handbrakeForce: 72,
    frontBias: 0.52,
  },
  suspension: {
    frontAntiRollBarStiffness: 19.0,
    rearAntiRollBarStiffness: 22.0,
    antiSquatStiffness: 36.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 3.7],
      [40, Math.PI / 4.4],
      [90, Math.PI / 6.8],
      [150, Math.PI / 10.5],
      [240, Math.PI / 15.5],
    ],
    steeringSpeed: 8.5,
    assists: {
      yawDamping: 0.13,
      driftGripMultiplier: 0.25,
    },
  },
  aerodynamics: {
    downforceFactor: 24,
  },
  wheels: [
    {
      // Front-left
      position: [-0.89, -0.2, 1.36],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 39,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.89, -0.2, 1.36],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 39,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.89, -0.2, -1.38],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.89, -0.2, -1.38],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: false,
      powered: true,
    },
  ],
};

export const VEHICLE_PHANTOM_B: VehiclePreset = {
  id: 'apex_phantom_b',
  name: 'Phantom B-Spec',
  description: 'Ultra-lightweight mid-engine Group B prototype engineered for extreme acceleration, razor-sharp transient response, and high-rpm rally racing.',
  category: 'rally',
  modelPath: VEHICLE_PHANTOM_B_MODEL_PATH,
  modelPositionOffset: [0, 0.04, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 9.1,
    acceleration: 9.4,
    handling: 9.2,
    offroad: 8.6,
    driveType: 'AWD',
  },
  config: PHANTOM_B_VEHICLE_CONFIG,
};
