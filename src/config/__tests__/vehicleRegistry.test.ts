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
    expect(vehicles.length).toBeGreaterThanOrEqual(1);

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
    expect(defaultCar.stats.driveType).toBe('AWD');

    const unknownCar = getVehiclePreset('non_existent_car');
    expect(unknownCar.id).toBe('rally_hatchback');
  });

  it('guarantees resting wheel clearance below body anchor points', () => {
    const vehicles = getAvailableVehicles();
    for (const vehicle of vehicles) {
      for (const wheel of vehicle.config.wheels) {
        expect(wheel.suspensionRestLength).toBeGreaterThan(0.2);
        const restingY = wheel.position[1] - wheel.suspensionRestLength * 0.75;
        // Wheel center at rest must sit below the anchor mount point
        expect(restingY).toBeLessThan(wheel.position[1]);
        // Wheel top must have clearance relative to chassis top
        expect(restingY + wheel.radius).toBeLessThan(vehicle.modelPositionOffset ? vehicle.modelPositionOffset[1] + 0.4 : 0.6);
      }
    }
  });
});
