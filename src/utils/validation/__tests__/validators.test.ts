import { describe, it, expect } from 'vitest';
import { validateVehicleConfig } from '@/utils/validation/vehicleValidator';
import { validateLevelData } from '@/utils/validation/levelValidator';
import { validateSurfaceDefinition } from '@/utils/validation/surfaceValidator';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import { LEVEL1_DATA } from '@/config/level1';
import { SURFACE_REGISTRY } from '@/config/surfaceRegistry';

describe('Runtime Validators', () => {
  describe('validateVehicleConfig', () => {
    it('passes on valid vehicle config', () => {
      const res = validateVehicleConfig(DEFAULT_VEHICLE_CONFIG);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('catches invalid chassis mass and negative dimensions', () => {
      const badConfig = {
        ...DEFAULT_VEHICLE_CONFIG,
        chassisMass: -10,
        chassisSize: [0, -1, 4] as [number, number, number],
      };
      const res = validateVehicleConfig(badConfig);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('chassisMass'))).toBe(true);
      expect(res.errors.some((e) => e.includes('chassisSize'))).toBe(true);
    });

    it('catches incorrect wheel count', () => {
      const badWheelsConfig = {
        ...DEFAULT_VEHICLE_CONFIG,
        wheels: [DEFAULT_VEHICLE_CONFIG.wheels[0], DEFAULT_VEHICLE_CONFIG.wheels[1]],
      };
      // @ts-expect-error test runtime rejection of invalid wheel count
      const res = validateVehicleConfig(badWheelsConfig);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('wheels count'))).toBe(true);
    });

    it('catches non-monotonic steering curve', () => {
      const badCurveConfig = {
        ...DEFAULT_VEHICLE_CONFIG,
        handling: {
          ...DEFAULT_VEHICLE_CONFIG.handling,
          steeringCurve: [
            [100, 0.2],
            [50, 0.4],
          ] as readonly [number, number][],
        },
      };
      const res = validateVehicleConfig(badCurveConfig);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('sorted strictly ascending'))).toBe(true);
    });
  });

  describe('validateLevelData', () => {
    it('passes on valid LevelData', () => {
      const res = validateLevelData(LEVEL1_DATA);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('catches invalid track points count', () => {
      const badTrackLevel = {
        ...LEVEL1_DATA,
        track: {
          ...LEVEL1_DATA.track,
          points: [{ x: 0, z: 0 }],
        },
      };
      const res = validateLevelData(badTrackLevel);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('at least 3 points'))).toBe(true);
    });
  });

  describe('validateSurfaceDefinition', () => {
    it('passes on valid surface definition', () => {
      const res = validateSurfaceDefinition(SURFACE_REGISTRY.mud);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('catches invalid grip values', () => {
      const badSurface = {
        ...SURFACE_REGISTRY.grass,
        tireModel: {
          front: { baseGrip: -1, peakSlipAngle: 0.3, slideGrip: 1.0 },
          rear: { baseGrip: 2.0, peakSlipAngle: 0.3, slideGrip: 1.0 },
        },
      };
      const res = validateSurfaceDefinition(badSurface);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('baseGrip must be > 0'))).toBe(true);
    });

    it('catches invalid rolling resistance and looseSurfaceTractionLoss', () => {
      const badPropsSurface = {
        ...SURFACE_REGISTRY.sand,
        rollingResistance: -0.05,
        looseSurfaceTractionLoss: 1.5,
      };
      const res = validateSurfaceDefinition(badPropsSurface);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('rollingResistance must be >= 0'))).toBe(true);
      expect(res.errors.some((e) => e.includes('looseSurfaceTractionLoss must be between [0, 1]'))).toBe(true);
    });
  });
});
