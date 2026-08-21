import { describe, it, expect } from 'vitest';
import {
  VEHICLE_REGISTRY,
  DEFAULT_VEHICLE_ID,
  getVehiclePreset,
  getAvailableVehicles,
} from '@/config/vehicleRegistry';
import { validateVehiclePreset } from '@/utils/validation/vehicleValidator';

describe('Vehicle Registry', () => {
  it('has valid default vehicle ID', () => {
    expect(VEHICLE_REGISTRY[DEFAULT_VEHICLE_ID]).toBeDefined();
    expect(DEFAULT_VEHICLE_ID).toBe('rally_hatchback');
  });

  it('contains valid presets that pass all physical validation checks', () => {
    const vehicles = getAvailableVehicles();
    expect(vehicles.length).toBeGreaterThanOrEqual(3);

    for (const vehicle of vehicles) {
      const validation = validateVehiclePreset(vehicle);
      expect(validation.valid, `Vehicle ${vehicle.id} failed validation: ${validation.errors.join(', ')}`).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(vehicle.config.wheels).toHaveLength(4);
    }
  });

  it('retrieves preset by ID with fallback to default', () => {
    const defaultCar = getVehiclePreset(DEFAULT_VEHICLE_ID);
    expect(defaultCar.id).toBe('rally_hatchback');

    const unknownCar = getVehiclePreset('non_existent_car');
    expect(unknownCar.id).toBe('rally_hatchback');

    const coupe = getVehiclePreset('rally_coupe');
    expect(coupe.id).toBe('rally_coupe');
    expect(coupe.stats.driveType).toBe('RWD');
  });
});
