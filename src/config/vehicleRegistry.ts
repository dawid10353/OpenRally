import type { VehiclePreset } from '@/types/vehicle';
import { VEHICLE_RALLY_HATCHBACK } from './vehicles/hatchback';
import { VEHICLE_RALLY_WRC } from './vehicles/wrc';

// Re-export vehicle presets and configs for backwards compatibility
export { VEHICLE_RALLY_HATCHBACK } from './vehicles/hatchback';
export { VEHICLE_RALLY_WRC, WRC_VEHICLE_CONFIG } from './vehicles/wrc';

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
