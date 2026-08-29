import { describe, it, expect, vi } from 'vitest';
import { Vector3 } from 'three';
import { applyDrivetrain, applyAwdDriftPropulsion } from '../drivetrain';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';
import type { RapierRigidBody } from '@react-three/rapier';

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

  it('boosts engine force during steering under throttle to overcome cornering tire scrub', () => {
    const straightController = createMockController();
    applyDrivetrain(
      straightController,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 1, brake: 0, steering: 0 },
      15,
      2
    );

    const corneringController = createMockController();
    applyDrivetrain(
      corneringController,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 1, brake: 0, steering: 0.8 },
      15,
      2
    );

    // Forces during cornering should be higher than straight line to maintain exit power
    expect(corneringController.forces[0]).toBeGreaterThan(straightController.forces[0]);
    expect(corneringController.forces[2]).toBeGreaterThan(straightController.forces[2]);
  });

  it('boosts AWD engine force during high-angle drifts to maintain speed and momentum', () => {
    const straightController = createMockController();
    applyDrivetrain(
      straightController,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 1, brake: 0, steering: 0 },
      15,
      2,
      0 // No slip
    );

    const driftingController = createMockController();
    applyDrivetrain(
      driftingController,
      DEFAULT_VEHICLE_CONFIG,
      { throttle: 1, brake: 0, steering: 0 },
      15,
      2,
      Math.PI / 6 // 30 degrees slip angle
    );

    // Forces during high slip drift should be significantly boosted to retain kinetic energy
    expect(driftingController.forces[0]).toBeGreaterThan(straightController.forces[0]);
    expect(driftingController.forces[2]).toBeGreaterThan(straightController.forces[2]);
  });

  describe('applyAwdDriftPropulsion', () => {
    it('applies directional tractive impulse along forward vector when power-sliding under throttle', () => {
      const appliedImpulses: { x: number; y: number; z: number }[] = [];
      const mockBody = {
        mass: () => 150,
        applyImpulse: vi.fn((impulse: { x: number; y: number; z: number }) => {
          appliedImpulses.push({ ...impulse });
        }),
      } as unknown as RapierRigidBody;

      const forwardVec = new Vector3(0, 0, 1);
      applyAwdDriftPropulsion(
        mockBody,
        DEFAULT_VEHICLE_CONFIG,
        { throttle: 1, steering: 0.5 },
        forwardVec,
        60,
        Math.PI / 6, // 30 deg slip
        1.0,
        0.016
      );

      expect(mockBody.applyImpulse).toHaveBeenCalled();
      expect(appliedImpulses.length).toBe(1);
      expect(appliedImpulses[0].z).toBeGreaterThan(0);
    });

    it('does not apply drift propulsion when throttle is zero or slip angle is near zero', () => {
      const mockBody = {
        mass: () => 150,
        applyImpulse: vi.fn(),
      } as unknown as RapierRigidBody;

      const forwardVec = new Vector3(0, 0, 1);
      // Zero throttle
      applyAwdDriftPropulsion(
        mockBody,
        DEFAULT_VEHICLE_CONFIG,
        { throttle: 0, steering: 0 },
        forwardVec,
        60,
        Math.PI / 6,
        1.0,
        0.016
      );
      expect(mockBody.applyImpulse).not.toHaveBeenCalled();

      // Zero slip
      applyAwdDriftPropulsion(
        mockBody,
        DEFAULT_VEHICLE_CONFIG,
        { throttle: 1, steering: 0 },
        forwardVec,
        60,
        0,
        1.0,
        0.016
      );
      expect(mockBody.applyImpulse).not.toHaveBeenCalled();
    });
  });
});
