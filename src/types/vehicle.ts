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
 * Engine configuration
 */
export interface EngineConfig {
  /** Maximum engine force applied to powered wheels */
  readonly maxForce: number;
  /** Maximum speed in km/h (for HUD / limiter) */
  readonly maxSpeed: number;
}

/**
 * Braking configuration
 */
export interface BrakesConfig {
  /** Maximum braking force */
  readonly maxForce: number;
  /** Handbrake force (applied to rear wheels only) */
  readonly handbrakeForce: number;
  /** Brake bias towards the front (0.0 = 100% rear, 1.0 = 100% front). Typically ~0.7. */
  readonly frontBias: number;
}

/**
 * Configuration for tire grip on different surfaces.
 */
export interface TireConfig {
  /** Base grip level for the front wheels */
  readonly frontGrip: number;
  /** Base grip level for the rear wheels */
  readonly rearGrip: number;
}

/**
 * Handling and steering configuration
 */
export interface HandlingConfig {
  /** 
   * Steering curve mapping speed (km/h) to max steering angle (radians).
   * Example: [[0, Math.PI / 4], [100, Math.PI / 8]]
   */
  readonly steeringCurve: readonly [number, number][];
  /** Steering speed (how fast the wheel turns) */
  readonly steeringSpeed: number;
  /** Arcade assists configuration */
  readonly assists: {
    /** How much the game helps to keep the car straight when sliding */
    readonly yawDamping: number;
    /** Grip multiplier applied to rear wheels during handbrake */
    readonly driftGripMultiplier: number;
  };
}

/**
 * Aerodynamics configuration
 */
export interface AerodynamicsConfig {
  /** Downforce coefficient to keep the car glued to the ground at high speeds */
  readonly downforceFactor: number;
}

/**
 * Full vehicle configuration — physics and visual parameters.
 */
export interface VehicleConfig {
  /** Mass of the chassis in kg */
  readonly chassisMass: number;
  /** Chassis dimensions [width, height, length] */
  readonly chassisSize: Vector3Tuple;
  
  readonly engine: EngineConfig;
  readonly brakes: BrakesConfig;
  readonly handling: HandlingConfig;
  readonly aerodynamics: AerodynamicsConfig;
  
  /** Configuration for each wheel (4 wheels) */
  readonly wheels: readonly [WheelInfo, WheelInfo, WheelInfo, WheelInfo];
}

