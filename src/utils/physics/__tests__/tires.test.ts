import { describe, it, expect, vi } from 'vitest';
import { getSurfaceAtPosition, getInterpolatedSteeringAngle, applyTireFrictionAndBrakes } from '../tires';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';

describe('tire and surface physics', () => {
  describe('getSurfaceAtPosition', () => {
    it('returns sand when elevation is below sand threshold', () => {
      expect(getSurfaceAtPosition(0, -2, 0)).toBe('sand');
    });

    it('returns mud when position is on track with high mask', () => {
      const mockHeightmap: HeightmapData = {
        heights: new Float32Array(9),
        trackMasks: new Float32Array([0, 0, 0, 0, 0.8, 0, 0, 0, 0]),
        cols: 3,
        rows: 3,
        minHeight: 0,
        maxHeight: 10,
      };

      const mockLevel: LevelData = {
        id: 'test',
        name: 'Test Level',
        terrainBase: {
          width: 300,
          depth: 300,
          subdivisions: 2,
          amplitude: 10,
          frequency: 0.01,
          octaves: 2,
          lacunarity: 2,
          persistence: 0.5,
          seed: 1,
        },
        track: { points: [], width: 10, falloff: 2, targetHeight: 5 },
        heightModifiers: [],
        props: [],
      };

      // Center of terrain (0, 5, 0) maps to center of trackMasks (index 4)
      const surface = getSurfaceAtPosition(0, 5, 0, mockHeightmap, mockLevel);
      expect(surface).toBe('mud');
    });

    it('returns grass when off the track at positive elevation', () => {
      expect(getSurfaceAtPosition(100, 5, 100)).toBe('grass');
    });
  });

  describe('getInterpolatedSteeringAngle', () => {
    const curve: readonly [number, number][] = [
      [0, Math.PI / 4],   // 45 deg at 0 km/h
      [100, Math.PI / 8], // 22.5 deg at 100 km/h
    ];

    it('clamps to max angle at 0 km/h or below', () => {
      expect(getInterpolatedSteeringAngle(0, curve)).toBeCloseTo(Math.PI / 4);
      expect(getInterpolatedSteeringAngle(-10, curve)).toBeCloseTo(Math.PI / 4);
    });

    it('clamps to min angle at high speed', () => {
      expect(getInterpolatedSteeringAngle(150, curve)).toBeCloseTo(Math.PI / 8);
    });

    it('interpolates smoothly between speed points', () => {
      const midAngle = getInterpolatedSteeringAngle(50, curve);
      expect(midAngle).toBeCloseTo((Math.PI / 4 + Math.PI / 8) / 2);
    });
  });

  describe('applyTireFrictionAndBrakes', () => {
    const createMockController = (): IRapierVehicleController & {
      frictions: number[];
      brakes: number[];
      steerings: number[];
    } => {
      const frictions: number[] = [0, 0, 0, 0];
      const brakes: number[] = [0, 0, 0, 0];
      const steerings: number[] = [0, 0, 0, 0];

      return {
        frictions,
        brakes,
        steerings,
        setWheelFrictionSlip: vi.fn((i, f) => {
          frictions[i] = f;
        }),
        setWheelBrake: vi.fn((i, b) => {
          brakes[i] = b;
        }),
        setWheelSteering: vi.fn((i, s) => {
          steerings[i] = s;
        }),
        setWheelEngineForce: vi.fn(),
        wheelSuspensionLength: vi.fn(),
        wheelChassisConnectionPointCs: vi.fn(),
        wheelSteering: vi.fn(),
      };
    };

    it('applies friction and brakes to all wheels', () => {
      const controller = createMockController();
      const result = applyTireFrictionAndBrakes(
        controller,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 1, handbrake: false, steering: 0.5 },
        60,
        16.6,
        0,
        2,
        0,
        0 // no slip
      );

      expect(result.grips).toHaveLength(4);
      expect(controller.setWheelBrake).toHaveBeenCalledTimes(4);
      expect(controller.brakes[0]).toBeGreaterThan(0);
      expect(controller.steerings[0]).toBeGreaterThan(0); // front left steers
    });

    it('increases rear braking and reduces rear grip during handbrake', () => {
      const controller = createMockController();
      applyTireFrictionAndBrakes(
        controller,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 0, handbrake: true, steering: 0 },
        40,
        11.1,
        0,
        2,
        0,
        0
      );

      // Rear wheels (index 2 and 3) should have handbrake force
      expect(controller.brakes[2]).toBe(DEFAULT_VEHICLE_CONFIG.brakes.handbrakeForce);
      expect(controller.brakes[3]).toBe(DEFAULT_VEHICLE_CONFIG.brakes.handbrakeForce);
      // Front wheels should not have handbrake applied
      expect(controller.brakes[0]).toBe(0);
      expect(controller.brakes[1]).toBe(0);
    });

    it('reduces rear wheel grip on loose surfaces when throttle is applied (power oversteer)', () => {
      const controllerWithoutThrottle = createMockController();
      const resultNoThrottle = applyTireFrictionAndBrakes(
        controllerWithoutThrottle,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 0, handbrake: false, steering: 0, throttle: 0 },
        40,
        11.1,
        0,
        -5, // Y < 0 -> sand surface
        0,
        0
      );
      const noThrottleGrips = [...resultNoThrottle.grips];

      const controllerWithThrottle = createMockController();
      const resultWithThrottle = applyTireFrictionAndBrakes(
        controllerWithThrottle,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 0, handbrake: false, steering: 0, throttle: 1 },
        40,
        11.1,
        0,
        -5, // Y < 0 -> sand surface
        0,
        0
      );

      expect(resultNoThrottle.surface).toBe('sand');
      expect(resultWithThrottle.surface).toBe('sand');
      // Rear wheels (index 2, 3) should experience reduced grip under full throttle on sand
      expect(resultWithThrottle.grips[2]).toBeLessThan(noThrottleGrips[2]);
      expect(resultWithThrottle.grips[3]).toBeLessThan(noThrottleGrips[3]);
    });
  });
});
