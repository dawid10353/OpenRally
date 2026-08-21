import { describe, it, expect, vi } from 'vitest';
import { applyAssists } from '../assists';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { RapierRigidBody } from '@react-three/rapier';
import type { InputState } from '@/types/game';

describe('assists physics', () => {
  const createMockBody = (options?: {
    angvel?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    mass?: number;
  }): RapierRigidBody & { appliedTorques: { x: number; y: number; z: number }[] } => {
    const appliedTorques: { x: number; y: number; z: number }[] = [];

    return {
      appliedTorques,
      angvel: () => options?.angvel || { x: 0, y: 0, z: 0 },
      rotation: () => options?.rotation || { x: 0, y: 0, z: 0, w: 1 },
      mass: () => options?.mass ?? 150,
      applyTorqueImpulse: vi.fn((torque: { x: number; y: number; z: number }) => {
        appliedTorques.push({ ...torque });
      }),
    } as unknown as RapierRigidBody & { appliedTorques: { x: number; y: number; z: number }[] };
  };

  const baseInput: InputState = {
    steering: 0,
    throttle: 1,
    brake: 0,
    handbrake: false,
    cameraToggle: false,
    reset: false,
  };

  it('applies stabilizing torque impulse when car experiences unintended yaw rotation', () => {
    // Car spinning around Y axis with 0 steering input
    const body = createMockBody({ angvel: { x: 0, y: 2.0, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, baseInput, 20, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    expect(body.appliedTorques.length).toBeGreaterThan(0);
    // Opposes the positive angular velocity
    expect(body.appliedTorques[0].y).toBeLessThan(0);
  });

  it('does not apply restrictive yaw torque when handbrake is held (allowing drift/spins)', () => {
    const body = createMockBody({ angvel: { x: 0, y: 2.0, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, handbrake: true }, 20, 0.016);

    // Should not apply yaw damping when handbraking
    const yawTorques = body.appliedTorques.map((t) => t.y);
    const sumYaw = yawTorques.reduce((a, b) => a + b, 0);
    expect(sumYaw).toBe(0);
  });
});
