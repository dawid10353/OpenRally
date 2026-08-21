import { describe, it, expect, vi } from 'vitest';
import { applyDrivetrain } from '../drivetrain';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';

describe('drivetrain physics', () => {
  const createMockController = (): IRapierVehicleController & { forces: number[] } => {
    const forces: number[] = [0, 0, 0, 0];
    return {
      forces,
      setWheelEngineForce: vi.fn((wheelIndex: number, force: number) => {
        forces[wheelIndex] = force;
      }),
      setWheelBrake: vi.fn(),
      setWheelSteering: vi.fn(),
      setWheelFrictionSlip: vi.fn(),
      wheelSuspensionLength: vi.fn(),
      wheelChassisConnectionPointCs: vi.fn(),
      wheelSteering: vi.fn(),
    };
  };

  it('applies positive engine force to powered wheels when throttle > 0', () => {
    const controller = createMockController();
    applyDrivetrain(
      controller,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 1, brake: 0 },
      10,
      1 // 1st gear
    );

    // All 4 wheels are powered in AWD default config
    expect(controller.setWheelEngineForce).toHaveBeenCalledTimes(4);
    expect(controller.forces[0]).toBeGreaterThan(0);
    expect(controller.forces[1]).toBeGreaterThan(0);
    expect(controller.forces[2]).toBeGreaterThan(0);
    expect(controller.forces[3]).toBeGreaterThan(0);
  });

  it('applies negative engine force when reversing at low speed with brake pressed', () => {
    const controller = createMockController();
    applyDrivetrain(
      controller,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 0, brake: 1 },
      0, // Low speed -> triggers reverse
      -1
    );

    expect(controller.forces[0]).toBeLessThan(0);
    expect(controller.forces[1]).toBeLessThan(0);
    expect(controller.forces[2]).toBeLessThan(0);
    expect(controller.forces[3]).toBeLessThan(0);
  });

  it('sets 0 engine force when braking at high forward speed', () => {
    const controller = createMockController();
    applyDrivetrain(
      controller,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 0, brake: 1 },
      20, // Moving forward -> braking, not reverse engine force
      2
    );

    expect(controller.forces[0]).toBe(0);
    expect(controller.forces[1]).toBe(0);
    expect(controller.forces[2]).toBe(0);
    expect(controller.forces[3]).toBe(0);
  });
});
