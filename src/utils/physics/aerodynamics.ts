import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import type { VehicleConfig } from '@/types/vehicle';

export function applyAerodynamics(
  body: RapierRigidBody,
  config: VehicleConfig,
  forwardSpeed: number,
  velocity: Vector3,
  posY: number,
  dt: number
) {
  // Apply aerodynamic downforce to keep the car grounded
  const downforce = Math.abs(forwardSpeed) * config.aerodynamics.downforceFactor * dt;
  body.applyImpulse({ x: 0, y: -downforce, z: 0 }, true);

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
