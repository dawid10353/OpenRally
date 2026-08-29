import { describe, it, expect, vi } from 'vitest';
import { getSurfaceAtPosition, getInterpolatedSteeringAngle, applyTireFrictionAndBrakes } from '../tires';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';

describe('tire and surface physics', () => {
  describe('getSurfaceAtPosition', () => {
    const mockHeightmap: HeightmapData = {
      heights: new Float32Array(9),
      trackMasks: new Float32Array([0, 0, 0, 0, 0.8, 0, 0, 0, 0]),
      cols: 3,
      rows: 3,
      minHeight: 0,
      maxHeight: 10,
    };

    const mockLevel: LevelData = {
      id: 'level1_island',
      name: 'Island Level',
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

    const mockDesertLevel: LevelData = {
      ...mockLevel,
      id: 'level2_desert_canyon',
      name: 'Desert Canyon',
    };

    const mockSwedenLevel: LevelData = {
      ...mockLevel,
      id: 'level3_sweden_snow',
      name: 'Sweden Snow Rally',
    };

    it('returns sand when off track and elevation is below sand threshold', () => {
      expect(getSurfaceAtPosition(-140, -6, -140, mockHeightmap, mockLevel)).toBe('sand');
    });

    it('prioritizes track surface (mud) over low elevation when on track', () => {
      // Center of terrain (0, -6, 0) is on track (mask = 0.8) even at low elevation
      const surface = getSurfaceAtPosition(0, -6, 0, mockHeightmap, mockLevel);
      expect(surface).toBe('mud');
    });

    it('returns mud when position is on track with high mask', () => {
      // Center of terrain (0, 5, 0) maps to center of trackMasks (index 4)
      const surface = getSurfaceAtPosition(0, 5, 0, mockHeightmap, mockLevel);
      expect(surface).toBe('mud');
    });

    it('returns gravel when on track on a desert map', () => {
      const surface = getSurfaceAtPosition(0, 5, 0, mockHeightmap, mockDesertLevel);
      expect(surface).toBe('gravel');
    });

    it('returns sand when off track on a desert map', () => {
      const surface = getSurfaceAtPosition(-140, 15, -140, mockHeightmap, mockDesertLevel);
      expect(surface).toBe('sand');
    });

    it('returns snow when on track on a Sweden snow map', () => {
      const surface = getSurfaceAtPosition(0, 5, 0, mockHeightmap, mockSwedenLevel);
      expect(surface).toBe('snow');
    });

    it('returns snow when off track on a Sweden snow map', () => {
      const surface = getSurfaceAtPosition(-140, 15, -140, mockHeightmap, mockSwedenLevel);
      expect(surface).toBe('snow');
    });

    it('returns grass when off the track at normal elevation on island', () => {
      expect(getSurfaceAtPosition(-140, 5, -140, mockHeightmap, mockLevel)).toBe('grass');
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
        { brake: 1, handbrake: false, steering: 0, throttle: 0 },
        50,
        13.8,
        0,
        5,
        0,
        0
      );

      expect(result.grips).toHaveLength(4);
      expect(controller.frictions[0]).toBeGreaterThan(0);
      expect(controller.brakes[0]).toBeGreaterThan(0);
      expect(controller.brakes[1]).toBeGreaterThan(0);
      expect(controller.brakes[2]).toBeGreaterThan(0);
      expect(controller.brakes[3]).toBeGreaterThan(0);
    });

    it('increases rear braking and reduces rear grip during handbrake', () => {
      const controller = createMockController();
      const result = applyTireFrictionAndBrakes(
        controller,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 0, handbrake: true, steering: 0, throttle: 0 },
        50,
        13.8,
        0,
        5,
        0,
        0
      );

      // Handbrake only locks rear wheels (index 2, 3)
      expect(controller.brakes[0]).toBe(0);
      expect(controller.brakes[1]).toBe(0);
      expect(controller.brakes[2]).toBeGreaterThan(0);
      expect(controller.brakes[3]).toBeGreaterThan(0);
      // Rear grip reduced for drifting
      expect(result.grips[2]).toBeLessThan(result.grips[0]);
    });

    it('reduces all powered wheel grips synchronously on loose surfaces when throttle is applied (AWD power slide)', () => {
      const controllerWithoutThrottle = createMockController();
      const resultNoThrottle = applyTireFrictionAndBrakes(
        controllerWithoutThrottle,
        DEFAULT_VEHICLE_CONFIG,
        { brake: 0, handbrake: false, steering: 0, throttle: 0 },
        40,
        11.1,
        0,
        -7, // Y < -5.0 -> coastal sand surface
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
        -7, // Y < -5.0 -> coastal sand surface
        0,
        0
      );

      expect(resultNoThrottle.surface).toBe('sand');
      expect(resultWithThrottle.surface).toBe('sand');
      // In AWD mode, all 4 driven wheels (0, 1, 2, 3) should experience synchronized grip reduction under full throttle
      expect(resultWithThrottle.grips[0]).toBeLessThan(noThrottleGrips[0]);
      expect(resultWithThrottle.grips[1]).toBeLessThan(noThrottleGrips[1]);
      expect(resultWithThrottle.grips[2]).toBeLessThan(noThrottleGrips[2]);
      expect(resultWithThrottle.grips[3]).toBeLessThan(noThrottleGrips[3]);
    });
  });
});
