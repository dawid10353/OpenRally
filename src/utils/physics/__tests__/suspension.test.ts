import { describe, it, expect, vi } from 'vitest';
import { applyAntiRollBars, applyPitchStabilization } from '../suspension';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import { WRC_VEHICLE_CONFIG } from '@/config/vehicleRegistry';
import type { RapierRigidBody } from '@react-three/rapier';
import type { IRapierVehicleController } from '@/types/vehicle';

describe('suspension physics (Anti-Roll & Pitch Stabilization)', () => {
  const createMockBody = (options?: {
    translation?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    angvel?: { x: number; y: number; z: number };
  }): RapierRigidBody & { appliedImpulses: { impulse: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } }[]; appliedTorques: { x: number; y: number; z: number }[] } => {
    const appliedImpulses: { impulse: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } }[] = [];
    const appliedTorques: { x: number; y: number; z: number }[] = [];

    return {
      appliedImpulses,
      appliedTorques,
      translation: () => options?.translation || { x: 0, y: 1, z: 0 },
      rotation: () => options?.rotation || { x: 0, y: 0, z: 0, w: 1 },
      angvel: () => options?.angvel || { x: 0, y: 0, z: 0 },
      linvel: () => ({ x: 0, y: 0, z: 0 }),
      applyImpulseAtPoint: vi.fn((impulse: { x: number; y: number; z: number }, point: { x: number; y: number; z: number }) => {
        appliedImpulses.push({ impulse: { ...impulse }, point: { ...point } });
      }),
      applyTorqueImpulse: vi.fn((torque: { x: number; y: number; z: number }) => {
        appliedTorques.push({ ...torque });
      }),
    } as unknown as RapierRigidBody & { appliedImpulses: { impulse: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } }[]; appliedTorques: { x: number; y: number; z: number }[] };
  };

  const createMockController = (suspensionLengths: number[]): IRapierVehicleController => {
    return {
      wheelSuspensionLength: (i: number) => suspensionLengths[i] ?? 0.32,
      wheelChassisConnectionPointCs: (i: number) => ({
        x: i % 2 === 0 ? -0.8 : 0.8,
        y: -0.2,
        z: i < 2 ? 1.4 : -1.3,
      }),
      setWheelEngineForce: vi.fn(),
      setWheelBrake: vi.fn(),
      setWheelSteering: vi.fn(),
      setWheelFrictionSlip: vi.fn(),
      updateVehicle: vi.fn(),
    } as unknown as IRapierVehicleController;
  };

  it('applies anti-roll forces when body leans laterally in turns', () => {
    const body = createMockBody();
    // Left side compressed (0.20m), right side extended (0.32m)
    const controller = createMockController([0.20, 0.32, 0.20, 0.32]);

    applyAntiRollBars(body, controller, DEFAULT_VEHICLE_CONFIG, 0.016);

    expect(body.applyImpulseAtPoint).toHaveBeenCalled();
    expect(body.appliedImpulses.length).toBeGreaterThanOrEqual(2);
  });

  it('applies anti-squat pitch torque under acceleration when rear suspension compresses', () => {
    const body = createMockBody({ angvel: { x: 0.5, y: 0, z: 0 } });
    // Front suspension extended (0.32m), rear suspension compressed (0.22m) - tail squatting
    const controller = createMockController([0.32, 0.32, 0.22, 0.22]);

    applyPitchStabilization(body, controller, WRC_VEHICLE_CONFIG, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    expect(body.appliedTorques.length).toBeGreaterThan(0);
    // Applies restoring torque to pitch car forward/down to counteract wheelie
    expect(body.appliedTorques[0].x).toBeLessThan(0);
  });

  it('applies anti-dive pitch torque under braking when front suspension compresses', () => {
    const body = createMockBody({ angvel: { x: -0.5, y: 0, z: 0 } });
    // Front suspension compressed (0.20m), rear suspension extended (0.32m) - nose diving
    const controller = createMockController([0.20, 0.20, 0.32, 0.32]);

    applyPitchStabilization(body, controller, WRC_VEHICLE_CONFIG, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    expect(body.appliedTorques.length).toBeGreaterThan(0);
    // Applies restoring torque to pitch car back up to counteract nose-dive/stoppie
    expect(body.appliedTorques[0].x).toBeGreaterThan(0);
  });
});
