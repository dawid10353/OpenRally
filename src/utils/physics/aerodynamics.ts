import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion } from 'three';
import type { VehicleConfig } from '@/types/vehicle';

const _bodyQuat = new Quaternion();
const _downVector = new Vector3();

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

  const rawDownforce = Math.abs(forwardSpeed) * config.aerodynamics.downforceFactor * dt;
  // Safety clamp: downforce impulse per frame should not exceed 70% of vehicle gravity weight
  const maxDownforce = body.mass() * 9.81 * 0.7 * dt;
  const clampedDownforce = Math.min(rawDownforce, maxDownforce);

  _downVector.multiplyScalar(clampedDownforce);
  body.applyImpulse(_downVector, true);

  // Apply water drag if partially submerged
  const WATER_SURFACE_CHASSIS_Y = -7.15; // Chassis Y when wheels just touch water
  if (posY < WATER_SURFACE_CHASSIS_Y) {
    const depth = Math.max(0, WATER_SURFACE_CHASSIS_Y - posY);
    // Increased drag based on depth
    const dragFactor = depth * 80 * dt;
    body.applyImpulse({ 
      x: -velocity.x * dragFactor, 
      y: 0, 
      z: -velocity.z * dragFactor 
    }, true);
  }
}
