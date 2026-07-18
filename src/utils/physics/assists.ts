import type { RapierRigidBody } from '@react-three/rapier';
import type { VehicleConfig } from '@/types/vehicle';

export function applyAssists(
  body: RapierRigidBody, 
  config: VehicleConfig, 
  slipAngle: number, 
  lateralSpeed: number, 
  dt: number
) {
  // Simple yaw damping assist:
  // If the car is sliding (high slip angle/lateral speed), apply a slight counter-torque
  // to prevent it from spinning out instantly, simulating a more arcade feel.
  if (Math.abs(lateralSpeed) > 2) {
    const damping = -slipAngle * config.handling.assists.yawDamping * dt * 50;
    body.applyTorqueImpulse({ x: 0, y: damping, z: 0 }, true);
  }
}
