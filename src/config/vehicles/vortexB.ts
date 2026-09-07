import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_VORTEX_B_MODEL_PATH } from '@/config/assets';

/**
 * Vortex Rally B — Twin-charged mid-engine Group B homologation icon.
 * Explosive turbo boost, lightweight tubular spaceframe, and legendary 80s rally pedigree.
 */
export const VORTEX_B_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 138,
  chassisSize: [1.84, 0.58, 4.1],
  weightDistribution: {
    frontBias: 0.47, // Mid-engine 47/53 rearward bias for traction and agility
    engineOffsetZ: -0.15,
    engineOffsetY: -0.16,
    centerOfMassZ: -0.02,
  },
  engine: {
    maxForce: 450,
    maxSpeed: 280,
  },
  drivetrain: {
    frontBias: 0.45, // 45/55 Rear-biased AWD for aggressive rally drifts
  },
  brakes: {
    maxForce: 20,
    handbrakeForce: 75,
    frontBias: 0.52,
  },
  suspension: {
    frontAntiRollBarStiffness: 19.5,
    rearAntiRollBarStiffness: 22.5,
    antiSquatStiffness: 38.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 3.6],
      [40, Math.PI / 4.3],
      [90, Math.PI / 6.7],
      [150, Math.PI / 10.2],
      [240, Math.PI / 15.0],
    ],
    steeringSpeed: 8.8,
    assists: {
      yawDamping: 0.12,
      driftGripMultiplier: 0.26,
    },
  },
  aerodynamics: {
    downforceFactor: 26, // Large rally rear wing & hood vents
  },
  wheels: [
    {
      // Front-left
      position: [-0.88, -0.2, 1.13],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 40,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10200,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.88, -0.2, 1.13],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 40,
      suspensionDamping: 5.2,
      maxSuspensionForce: 10200,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.90, -0.2, -1.05],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 42,
      suspensionDamping: 5.4,
      maxSuspensionForce: 10800,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.90, -0.2, -1.05],
      radius: 0.32,
      suspensionRestLength: 0.32,
      suspensionTravel: 0.24,
      suspensionStiffness: 42,
      suspensionDamping: 5.4,
      maxSuspensionForce: 10800,
      steerable: false,
      powered: true,
    },
  ],
};

export const VEHICLE_VORTEX_B: VehiclePreset = {
  id: 'vortex_b',
  name: 'Vortex Rally B',
  description: 'Twin-charged mid-engine Group B icon. Lightweight tubular spaceframe, explosive acceleration, aggressive downforce, and legendary rally pedigree.',
  category: 'rally',
  modelPath: VEHICLE_VORTEX_B_MODEL_PATH,
  modelPositionOffset: [0, 0.04, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 9.3,
    acceleration: 9.6,
    handling: 9.4,
    offroad: 8.8,
    driveType: 'AWD',
  },
  config: VORTEX_B_VEHICLE_CONFIG,
};
