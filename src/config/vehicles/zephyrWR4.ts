import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_ZEPHYR_WR4_MODEL_PATH } from '@/config/assets';

/**
 * Zephyr WR-4 — Iconic symmetrical AWD gravel champion.
 * Unrivaled chassis balance, progressive sliding, and benchmark rally reliability.
 */
export const ZEPHYR_WR4_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 148,
  chassisSize: [1.9, 0.6, 4.0],
  weightDistribution: {
    frontBias: 0.53, // 53% front engine mass creates natural rally balance without excessive nose heaviness
    engineOffsetZ: 0.85,
    engineOffsetY: -0.18,
    centerOfMassZ: 0.08, // +0.08m forward offset (~53/47 weight distribution)
  },
  engine: {
    maxForce: 410,
    maxSpeed: 255,
  },
  drivetrain: {
    frontBias: 0.48, // 48/52 Rear-biased AWD for nimble throttle steering
  },
  brakes: {
    maxForce: 18,
    handbrakeForce: 70,
    frontBias: 0.50, // Balanced 50/50 brake distribution preventing nose-dive
  },
  suspension: {
    frontAntiRollBarStiffness: 18.0,
    rearAntiRollBarStiffness: 20.0, // Stiffer rear ARB eliminates understeer
    antiSquatStiffness: 35.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 3.8],
      [40, Math.PI / 4.5],
      [90, Math.PI / 7.0],
      [150, Math.PI / 11.0],
      [240, Math.PI / 16.0],
    ],
    steeringSpeed: 8.0,
    assists: {
      yawDamping: 0.14,
      driftGripMultiplier: 0.25,
    },
  },
  aerodynamics: {
    downforceFactor: 21,
  },
  wheels: [
    {
      // Front-left
      position: [-0.88, -0.2, 1.38],
      radius: 0.32,
      suspensionRestLength: 0.30,
      suspensionTravel: 0.22,
      suspensionStiffness: 42,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.88, -0.2, 1.38],
      radius: 0.32,
      suspensionRestLength: 0.30,
      suspensionTravel: 0.22,
      suspensionStiffness: 42,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.89, -0.2, -1.23],
      radius: 0.32,
      suspensionRestLength: 0.27,
      suspensionTravel: 0.20,
      suspensionStiffness: 44,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.89, -0.2, -1.23],
      radius: 0.32,
      suspensionRestLength: 0.27,
      suspensionTravel: 0.20,
      suspensionStiffness: 44,
      suspensionDamping: 5.0,
      maxSuspensionForce: 10000,
      steerable: false,
      powered: true,
    },
  ],
};

export const VEHICLE_ZEPHYR_WR4: VehiclePreset = {
  id: 'zephyr_wr4',
  name: 'Zephyr WR-4',
  description: 'The golden standard of rally championships. Featuring symmetrical all-wheel drive, telepathic turn-in, and exceptionally controllable four-wheel drifts on loose surfaces.',
  category: 'rally',
  modelPath: VEHICLE_ZEPHYR_WR4_MODEL_PATH,
  modelPositionOffset: [0, 0.025, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 8.5,
    acceleration: 8.8,
    handling: 9.3,
    offroad: 9.0,
    driveType: 'AWD',
  },
  config: ZEPHYR_WR4_VEHICLE_CONFIG,
};
