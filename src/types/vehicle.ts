import type { Vector3Tuple } from 'three';

/**
 * Configuration for a single wheel on the vehicle.
 */
export interface WheelInfo {
  /** Position offset relative to chassis center [x, y, z] */
  readonly position: Vector3Tuple;
  /** Wheel radius in world units */
  readonly radius: number;
  /** Suspension rest length */
  readonly suspensionRestLength: number;
  /** Maximum suspension travel distance */
  readonly suspensionTravel: number;
  /** Suspension stiffness coefficient */
  readonly suspensionStiffness: number;
  /** Suspension damping coefficient */
  readonly suspensionDamping: number;
  /** Whether this wheel can steer */
  readonly steerable: boolean;
  /** Whether this wheel receives engine force */
  readonly powered: boolean;
}

/**
 * Full vehicle configuration — physics and visual parameters.
 */
export interface VehicleConfig {
  /** Mass of the chassis in kg */
  readonly chassisMass: number;
  /** Chassis dimensions [width, height, length] */
  readonly chassisSize: Vector3Tuple;
  /** Maximum engine force applied to powered wheels */
  readonly maxEngineForce: number;
  /** Maximum braking force */
  readonly maxBrakeForce: number;
  /** Handbrake force (applied to rear wheels only) */
  readonly handbrakeForce: number;
  /** Maximum steering angle in radians */
  readonly maxSteeringAngle: number;
  /** Steering speed (how fast the wheel turns) */
  readonly steeringSpeed: number;
  /** Maximum speed in km/h (for HUD / limiter) */
  readonly maxSpeed: number;
  /** Downforce coefficient to keep the car glued to the ground at high speeds */
  readonly downforceFactor: number;
  /** Configuration for each wheel (4 wheels) */
  readonly wheels: readonly [WheelInfo, WheelInfo, WheelInfo, WheelInfo];
}


