import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_VANGUARD_GT_MODEL_PATH } from '@/config/assets';

/**
 * Vanguard GT-Aero — High-speed aerodynamic GT rally coupe.
 * Extended wheelbase, low drag profile, high-speed stability.
 */
export const VANGUARD_GT_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 155,
  chassisSize: [1.9, 0.6, 4.2],
  weightDistribution: {
    frontBias: 0.54,
    engineOffsetZ: 0.90,
    engineOffsetY: -0.18,
    centerOfMassZ: 0.08,
  },
  engine: {
    maxForce: 430,
    maxSpeed: 280,
  },
  drivetrain: {
    frontBias: 0.35, // 35/65 RWD-biased AWD for exhilarating sports GT dynamics
  },
  brakes: {
    maxForce: 20,
    handbrakeForce: 72,
    frontBias: 0.56,
  },
  suspension: {
    frontAntiRollBarStiffness: 21.0,
    rearAntiRollBarStiffness: 21.0,
    antiSquatStiffness: 35.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 4.0],
      [40, Math.PI / 4.8],
      [90, Math.PI / 7.5],
      [150, Math.PI / 12.0],
      [240, Math.PI / 17.5],
    ],
    steeringSpeed: 7.8,
    assists: {
      yawDamping: 0.14,
      driftGripMultiplier: 0.22,
    },
  },
  aerodynamics: {
    downforceFactor: 25,
  },
  wheels: [
    {
      // Front-left
      position: [-0.92, -0.2, 1.25],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.23,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.92, -0.2, 1.25],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.23,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left (wide rear track)
      position: [-1.02, -0.2, -1.38],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.23,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right (wide rear track)
      position: [1.02, -0.2, -1.38],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.23,
      suspensionStiffness: 41,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10500,
      steerable: false,
      powered: true,
    },
  ],
};

export const VEHICLE_VANGUARD_GT: VehiclePreset = {
  id: 'vanguard_gt',
  name: 'Vanguard GT-Aero',
  description: 'Grand touring aerodynamic rally coupe with extended wheelbase high-speed tracking, rear-biased AWD balance, and 280 km/h top end.',
  category: 'sports',
  modelPath: VEHICLE_VANGUARD_GT_MODEL_PATH,
  modelPositionOffset: [0, 0.08, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 9.4,
    acceleration: 8.8,
    handling: 8.9,
    offroad: 7.6,
    driveType: 'AWD',
  },
  config: VANGUARD_GT_VEHICLE_CONFIG,
};
