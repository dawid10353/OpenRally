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
 * Registry of all available vehicles in OpenRally.
 */
export const VEHICLE_REGISTRY: Record<string, VehiclePreset> = {
  rally_hatchback: VEHICLE_RALLY_HATCHBACK,
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
