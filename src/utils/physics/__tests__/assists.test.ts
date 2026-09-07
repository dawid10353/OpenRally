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

  it('applies stabilizing torque impulse when car experiences unintended yaw rotation off-throttle', () => {
    // Car spinning around Y axis with 0 steering input and 0 throttle
    const body = createMockBody({ angvel: { x: 0, y: 2.0, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, throttle: 0 }, 20, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    expect(body.appliedTorques.length).toBeGreaterThan(0);
    // Opposes the positive angular velocity
    expect(body.appliedTorques[0].y).toBeLessThan(0);
  });

  it('allows natural power sliding under throttle without aggressive neutral yaw fighting', () => {
    // Car sliding at moderate yaw rate under active throttle
    const body = createMockBody({ angvel: { x: 0, y: 1.5, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, throttle: 1 }, 20, 0.016);

    // Yaw torques should not forcefully clamp the slide
    const yawTorques = body.appliedTorques.map((t) => t.y);
    const sumYaw = yawTorques.reduce((a, b) => a + b, 0);
    expect(sumYaw).toBe(0);
  });

  it('does not apply restrictive yaw torque when handbrake is held (allowing drift/spins)', () => {
    const body = createMockBody({ angvel: { x: 0, y: 2.0, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, handbrake: true }, 20, 0.016);

    // Should not apply yaw damping when handbraking
    const yawTorques = body.appliedTorques.map((t) => t.y);
    const sumYaw = yawTorques.reduce((a, b) => a + b, 0);
    expect(sumYaw).toBe(0);
  });

  it('applies agile turn-in torque assisting corner entry when steering is applied', () => {
    // Car moving forward at 15 m/s with left steering (+0.8) and minimal angular velocity
    const body = createMockBody({ angvel: { x: 0, y: 0, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, steering: 0.8 }, 15, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    const yawTorques = body.appliedTorques.map((t) => t.y);
    const sumYaw = yawTorques.reduce((a, b) => a + b, 0);
    // Should apply positive torque in the direction of left steering
    expect(sumYaw).toBeGreaterThan(0);
  });

  it('applies authoritative countersteer torque when steering opposes active yaw rotation', () => {
    // Car rotating clockwise / right (angvel.y = -1.8) and driver countersteers left (+0.9)
    const body = createMockBody({ angvel: { x: 0, y: -1.8, z: 0 } });
    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, steering: 0.9 }, 15, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    const yawTorques = body.appliedTorques.map((t) => t.y);
    const sumYaw = yawTorques.reduce((a, b) => a + b, 0);
    // Countersteer should generate strong positive torque to catch the slide
    expect(sumYaw).toBeGreaterThan(0);
  });

  it('applies strong anti-wheelie restoring torque when throttle is applied with nose pitching up', () => {
    // Car nose pointing upwards (e.g. pitch rotation around X) under full throttle
    // Quaternion representing nose-up pitch (around X axis):
    // rotating by -0.1 rad around X produces positive forwardVec.y
    const q = { x: -0.05, y: 0, z: 0, w: 0.9987 };
    const body = createMockBody({ rotation: q, angvel: { x: 0, y: 0, z: 0 } });

    applyAssists(body, DEFAULT_VEHICLE_CONFIG, { ...baseInput, throttle: 1 }, 10, 0.016);

    expect(body.applyTorqueImpulse).toHaveBeenCalled();
    const pitchTorques = body.appliedTorques.map((t) => t.x);
    const sumPitch = pitchTorques.reduce((a, b) => a + b, 0);
    // Positive torque around X pulls the nose back down
    expect(sumPitch).toBeGreaterThan(0);
  });
});
