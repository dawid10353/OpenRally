import { describe, it, expect, vi } from 'vitest';
import { Object3D } from 'three';
import { syncWheelVisuals } from '@/utils/physics/visuals';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';

describe('syncWheelVisuals', () => {
  const createMockController = (contacts: boolean[]): IRapierVehicleController => ({
    setWheelEngineForce: vi.fn(),
    setWheelBrake: vi.fn(),
    setWheelSteering: vi.fn(),
    setWheelFrictionSlip: vi.fn(),
    wheelChassisConnectionPointCs: () => ({ x: 0.8, y: -0.1, z: 1.2 }),
    wheelSuspensionLength: () => 0.3,
    wheelSteering: () => 0.15,
    wheelIsInContact: (i: number) => contacts[i] ?? false,
  });

  it('sets wheelObj.userData.isGrounded = true when wheelIsInContact returns true', () => {
    const wheels = Array.from({ length: 4 }, () => {
      const obj = new Object3D();
      obj.add(new Object3D());
      return obj;
    });

    const wheelRefs = { current: wheels };
    const controller = createMockController([true, true, true, true]);

    syncWheelVisuals(controller, wheelRefs, DEFAULT_VEHICLE_CONFIG, 10, 1 / 60, 2000, 2);

    expect(wheels[0].userData.isGrounded).toBe(true);
    expect(wheels[1].userData.isGrounded).toBe(true);
    expect(wheels[0].rotation.y).toBeCloseTo(0.15);
  });

  it('sets wheelObj.userData.isGrounded = false when wheelIsInContact returns false (airborne)', () => {
    const wheels = Array.from({ length: 4 }, () => {
      const obj = new Object3D();
      obj.add(new Object3D());
      return obj;
    });

    const wheelRefs = { current: wheels };
    const controller = createMockController([false, false, false, false]);

    syncWheelVisuals(controller, wheelRefs, DEFAULT_VEHICLE_CONFIG, 10, 1 / 60, 4000, 3);

    expect(wheels[0].userData.isGrounded).toBe(false);
    expect(wheels[1].userData.isGrounded).toBe(false);
  });

  it('correctly tracks partial airborne state (one wheel lifted)', () => {
    const wheels = Array.from({ length: 4 }, () => {
      const obj = new Object3D();
      obj.add(new Object3D());
      return obj;
    });

    const wheelRefs = { current: wheels };
    const controller = createMockController([true, false, true, true]);

    syncWheelVisuals(controller, wheelRefs, DEFAULT_VEHICLE_CONFIG, 10, 1 / 60, 3000, 2);

    expect(wheels[0].userData.isGrounded).toBe(true);
    expect(wheels[1].userData.isGrounded).toBe(false);
  });
});
