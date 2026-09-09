import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion } from 'three';
import type { VehicleConfig } from '@/types/vehicle';

const _bodyQuat = new Quaternion();
const _downVector = new Vector3();
const _waterDragImpulse = new Vector3();

export function applyAerodynamics(
  body: RapierRigidBody,
  config: VehicleConfig,
  forwardSpeed: number,
  velocity: Vector3,
  posY: number,
  dt: number
) {
  // Apply aerodynamic downforce along the local down axis to keep the car grounded without crushing it
  const bodyRot = body.rotation();
  _bodyQuat.set(bodyRot.x, bodyRot.y, bodyRot.z, bodyRot.w);
  _downVector.set(0, -1, 0).applyQuaternion(_bodyQuat);

  const safeSpeed = Number.isFinite(forwardSpeed) ? Math.abs(forwardSpeed) : 0;
  const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const rawDownforce = safeSpeed * config.aerodynamics.downforceFactor * safeDt;
  // Safety clamp: downforce impulse per frame should not exceed 70% of vehicle gravity weight
  const mass = typeof body.mass === 'function' ? body.mass() : (config.chassisMass || 150);
  const maxDownforce = mass * 9.81 * 0.7 * safeDt;
  const clampedDownforce = Math.min(rawDownforce, maxDownforce);

  if (Number.isFinite(clampedDownforce) && clampedDownforce > 0) {
    _downVector.multiplyScalar(clampedDownforce);
    if (
      Number.isFinite(_downVector.x) &&
      Number.isFinite(_downVector.y) &&
      Number.isFinite(_downVector.z)
    ) {
      body.applyImpulse(_downVector, true);
    }
  }

  // Apply water drag if partially submerged
  const WATER_SURFACE_CHASSIS_Y = -7.15; // Chassis Y when wheels just touch water
  if (Number.isFinite(posY) && posY < WATER_SURFACE_CHASSIS_Y) {
    const depth = Math.max(0, WATER_SURFACE_CHASSIS_Y - posY);
    // Increased drag based on depth (zero GC allocation with preallocated scratch vector)
    const dragFactor = depth * 80 * safeDt;
    _waterDragImpulse.set(-velocity.x * dragFactor, 0, -velocity.z * dragFactor);
    if (
      Number.isFinite(_waterDragImpulse.x) &&
      Number.isFinite(_waterDragImpulse.z)
    ) {
      body.applyImpulse(_waterDragImpulse, true);
    }
  }
}
