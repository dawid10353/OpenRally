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
  /** Maximum force the suspension spring can apply (N) */
  readonly maxSuspensionForce?: number;
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
 * Drivetrain configuration
 */
export interface DrivetrainConfig {
  /** Torque bias towards the front (0.0 = 100% rear-wheel drive, 1.0 = 100% front-wheel drive, 0.5 = 50/50 AWD) */
  readonly frontBias: number;
}

/**
 * Suspension & Chassis dynamics configuration
 */
export interface SuspensionConfig {
  /** Stiffness of the front anti-roll bar */
  readonly frontAntiRollBarStiffness: number;
  /** Stiffness of the rear anti-roll bar */
  readonly rearAntiRollBarStiffness: number;
}

/**
 * Configuration for tire grip on different surfaces.
 */
export interface TireGripCurve {
  /** Base grip level before peak slip angle */
  readonly baseGrip: number;
  /** The slip angle (radians) at which grip is highest */
  readonly peakSlipAngle: number;
  /** Grip level after exceeding peak slip angle (sliding) */
  readonly slideGrip: number;
}

export interface TireConfig {
  /** Grip curve for the front wheels */
  readonly front: TireGripCurve;
  /** Grip curve for the rear wheels */
  readonly rear: TireGripCurve;
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
  readonly drivetrain: DrivetrainConfig;
  readonly brakes: BrakesConfig;
  readonly suspension: SuspensionConfig;
  readonly handling: HandlingConfig;
  readonly aerodynamics: AerodynamicsConfig;
  readonly wheels: readonly [WheelInfo, WheelInfo, WheelInfo, WheelInfo];
}

/**
 * Surface types present on the terrain.
 */
export type SurfaceType = 'tarmac' | 'mud' | 'grass' | 'sand' | 'snow' | 'gravel';

/**
 * Display category for vehicle selection.
 */
export type VehicleCategory = 'rally' | 'sports' | 'offroad' | 'arcade';

/**
 * Normalized 1-10 stats for UI gauges in garage/menu.
 */
export interface VehicleStats {
  /** Top speed rating (1-10) */
  readonly topSpeed: number;
  /** Acceleration rating (1-10) */
  readonly acceleration: number;
  /** Handling / agility rating (1-10) */
  readonly handling: number;
  /** Offroad capability rating (1-10) */
  readonly offroad: number;
  /** Drivetrain label (e.g. 'AWD', 'RWD', 'FWD') */
  readonly driveType: 'AWD' | 'RWD' | 'FWD';
}

/**
 * Complete vehicle preset metadata and physical configuration.
 */
export interface VehiclePreset {
  /** Unique vehicle identifier */
  readonly id: string;
  /** Display name shown in UI */
  readonly name: string;
  /** Short description / flavor text */
  readonly description: string;
  /** Vehicle category */
  readonly category: VehicleCategory;
  /** Path to primary chassis 3D GLB model */
  readonly modelPath: string;
  /** Optional custom wheel 3D GLB model path */
  readonly wheelModelPath?: string;
  /** Visual scale factor for chassis model */
  readonly modelScale?: Vector3Tuple;
  /** Visual offset position [x, y, z] for chassis model */
  readonly modelPositionOffset?: Vector3Tuple;
  /** Normalized UI stats */
  readonly stats: VehicleStats;
  /** Full physics and dynamics configuration */
  readonly config: VehicleConfig;
}

/**
 * Interface representing the Rapier DynamicRayCastVehicleController methods
 * used by vehicle physics calculations and visual synchronization.
 */
export interface IRapierVehicleController {
  setWheelEngineForce(wheelIndex: number, force: number): void;
  setWheelBrake(wheelIndex: number, brake: number): void;
  setWheelSteering(wheelIndex: number, steering: number): void;
  setWheelFrictionSlip(wheelIndex: number, friction: number): void;
  wheelSuspensionLength(wheelIndex: number): number | null | undefined;
  wheelChassisConnectionPointCs(wheelIndex: number): { x: number; y: number; z: number } | null | undefined;
  wheelSteering(wheelIndex: number): number | null | undefined;
}


