import type { VehiclePreset, VehicleConfig } from '@/types/vehicle';
import { VEHICLE_KODIAK_RAID_MODEL_PATH } from '@/config/assets';

/**
 * Kodiak Raid Pro — Heavy-duty cross-country raid powerhouse.
 * Massive suspension travel, indestructible off-road clearance, and unrelenting low-end torque.
 */
export const KODIAK_RAID_VEHICLE_CONFIG: VehicleConfig = {
  chassisMass: 175,
  chassisSize: [2.0, 0.65, 4.1],
  weightDistribution: {
    frontBias: 0.52,
    engineOffsetZ: 0.85,
    engineOffsetY: -0.15,
    centerOfMassZ: 0.05,
  },
  engine: {
    maxForce: 450, // Massive low-end crawler and hillclimbing torque
    maxSpeed: 235,
  },
  drivetrain: {
    frontBias: 0.50, // Permanent locked 50/50 AWD
  },
  brakes: {
    maxForce: 22,
    handbrakeForce: 75,
    frontBias: 0.55,
  },
  suspension: {
    frontAntiRollBarStiffness: 16.0, // Softer ARB allows independent wheel articulation on boulders/ruts
    rearAntiRollBarStiffness: 17.0,
    antiSquatStiffness: 32.0,
  },
  handling: {
    steeringCurve: [
      [0, Math.PI / 4.1],
      [40, Math.PI / 4.8],
      [90, Math.PI / 7.2],
      [150, Math.PI / 11.5],
      [240, Math.PI / 17.0],
    ],
    steeringSpeed: 7.5,
    assists: {
      yawDamping: 0.16,
      driftGripMultiplier: 0.22,
    },
  },
  aerodynamics: {
    downforceFactor: 16,
  },
  wheels: [
    {
      // Front-left
      position: [-0.94, -0.15, 1.27],
      radius: 0.34,
      suspensionRestLength: 0.35,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 5.5,
      maxSuspensionForce: 12500,
      steerable: true,
      powered: true,
    },
    {
      // Front-right
      position: [0.94, -0.15, 1.27],
      radius: 0.34,
      suspensionRestLength: 0.35,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 5.5,
      maxSuspensionForce: 12500,
      steerable: true,
      powered: true,
    },
    {
      // Rear-left
      position: [-0.95, -0.15, -1.39],
      radius: 0.34,
      suspensionRestLength: 0.35,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 5.5,
      maxSuspensionForce: 12500,
      steerable: false,
      powered: true,
    },
    {
      // Rear-right
      position: [0.95, -0.15, -1.39],
      radius: 0.34,
      suspensionRestLength: 0.35,
      suspensionTravel: 0.28,
      suspensionStiffness: 38,
      suspensionDamping: 5.5,
      maxSuspensionForce: 12500,
      steerable: false,
      powered: true,
    },
  ],
};

export const VEHICLE_KODIAK_RAID: VehiclePreset = {
  id: 'kodiak_raid',
  name: 'Kodiak Raid Pro',
  description: 'Armored cross-country raid titan engineered to conquer extreme desert dunes, deep mud ruts, and massive high-flying jumps without flinching.',
  category: 'offroad',
  modelPath: VEHICLE_KODIAK_RAID_MODEL_PATH,
  modelPositionOffset: [0, 0.12, 0.0],
  modelScale: [4.5, 4.5, 4.5],
  stats: {
    topSpeed: 7.8,
    acceleration: 8.6,
    handling: 8.0,
    offroad: 9.8,
    driveType: 'AWD',
  },
  config: KODIAK_RAID_VEHICLE_CONFIG,
};
