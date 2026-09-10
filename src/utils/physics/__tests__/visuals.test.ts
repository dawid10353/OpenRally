import { describe, it, expect } from 'vitest';
import { Object3D } from 'three';
import { syncWheelVisuals } from '@/utils/physics/visuals';
import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';

describe('syncWheelVisuals', () => {
  const mockConfig: VehicleConfig = {
    mass: 1200,
    dimensions: { length: 4.2, width: 1.8, height: 1.3 },
    wheels: [
      {
        position: [0.8, -0.1, 1.2],
        radius: 0.35,
        width: 0.22,
        suspensionRestLength: 0.35,
        suspensionStiffness: 30,
        maxSuspensionTravel: 0.2,
        steerable: true,
        powered: true,
      },
      {
        position: [-0.8, -0.1, 1.2],
        radius: 0.35,
        width: 0.22,
        suspensionRestLength: 0.35,
        suspensionStiffness: 30,
        maxSuspensionTravel: 0.2,
        steerable: true,
        powered: true,
      },
    ],
    engine: {
      maxTorque: 400,
      maxRpm: 7500,
      idleRpm: 1000,
      powerCurve: [1.0],
    },
    brakes: {
      maxBrakeForce: 3000,
      frontBias: 0.6,
      handbrakeForce: 2500,
    },
    aerodynamics: {
      dragCoefficient: 0.35,
      downforceCoefficient: 0.5,
    },
  };

  const createMockController = (contacts: boolean[]): IRapierVehicleController => ({
    wheelChassisConnectionPointCs: () => ({ x: 0.8, y: -0.1, z: 1.2 }),
    wheelSuspensionLength: () => 0.3,
    wheelSteering: () => 0.15,
    wheelIsInContact: (i: number) => contacts[i] ?? false,
  });

  it('sets wheelObj.userData.isGrounded = true when wheelIsInContact returns true', () => {
    const wheel0 = new Object3D();
    const wheel1 = new Object3D();
    const child0 = new Object3D();
    const child1 = new Object3D();
    wheel0.add(child0);
    wheel1.add(child1);

    const wheelRefs = { current: [wheel0, wheel1] };
    const controller = createMockController([true, true]);

    syncWheelVisuals(controller, wheelRefs, mockConfig, 10, 1 / 60, 2000, 2);

    expect(wheel0.userData.isGrounded).toBe(true);
    expect(wheel1.userData.isGrounded).toBe(true);
    expect(wheel0.rotation.y).toBeCloseTo(0.15);
  });

  it('sets wheelObj.userData.isGrounded = false when wheelIsInContact returns false (airborne)', () => {
    const wheel0 = new Object3D();
    const wheel1 = new Object3D();
    const child0 = new Object3D();
    const child1 = new Object3D();
    wheel0.add(child0);
    wheel1.add(child1);

    const wheelRefs = { current: [wheel0, wheel1] };
    const controller = createMockController([false, false]);

    syncWheelVisuals(controller, wheelRefs, mockConfig, 10, 1 / 60, 4000, 3);

    expect(wheel0.userData.isGrounded).toBe(false);
    expect(wheel1.userData.isGrounded).toBe(false);
  });

  it('correctly tracks partial airborne state (one wheel lifted)', () => {
    const wheel0 = new Object3D();
    const wheel1 = new Object3D();
    const child0 = new Object3D();
    const child1 = new Object3D();
    wheel0.add(child0);
    wheel1.add(child1);

    const wheelRefs = { current: [wheel0, wheel1] };
    const controller = createMockController([true, false]);

    syncWheelVisuals(controller, wheelRefs, mockConfig, 10, 1 / 60, 3000, 2);

    expect(wheel0.userData.isGrounded).toBe(true);
    expect(wheel1.userData.isGrounded).toBe(false);
  });
});
