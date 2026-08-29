import type { VehiclePreset } from '@/types/vehicle';
import { VEHICLE_MODEL_PATH } from '@/config/assets';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';

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
