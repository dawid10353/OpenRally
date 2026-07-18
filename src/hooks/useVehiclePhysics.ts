import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, Object3D } from 'three';
import type { VehicleConfig } from '@/types/vehicle';
import { useInputUpdater } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import {
  DEFAULT_VEHICLE_CONFIG,
  MS_TO_KMH,
  BRAKE_SPEED_THRESHOLD,
  REVERSE_FORCE_MULTIPLIER,
  TIRE_MODELS,
  SAND_ELEVATION_THRESHOLD,
  FALL_RESET_Y,
  RESET_SPAWN_POSITION,
  RESET_SPAWN_ROTATION_Y,
  MAX_DELTA,
  GEAR_RATIOS,
} from '@/config/vehicle';
import { updateGearbox, calculateRPM } from '@/utils/physics/powertrain';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
const _right = new Vector3();
const _velocity = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();

// ─── Physics Helper Functions ────────────────────────────────────────

function applyDrivetrain(
  controller: any,
  config: VehicleConfig,
  input: any,
  forwardSpeed: number,
  currentGear: number
) {
  const gearRatio = currentGear > 0 ? GEAR_RATIOS[currentGear] : 1;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];
    if (wheel.powered) {
      let engineForce = 0;
      if (input.throttle > 0) {
        engineForce = config.engine.maxForce * input.throttle * gearRatio;
      } else if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
        // Braking when moving forward
        engineForce = 0;
      } else if (input.brake > 0) {
        // Reverse
        engineForce = -config.engine.maxForce * input.brake * REVERSE_FORCE_MULTIPLIER;
      }
      controller.setWheelEngineForce(i, engineForce);
    } else {
      controller.setWheelEngineForce(i, 0);
    }
  }
}

function getInterpolatedSteeringAngle(speedKmh: number, curve: readonly [number, number][]): number {
  if (!curve || curve.length === 0) return 0;
  if (speedKmh <= curve[0][0]) return curve[0][1];
  if (speedKmh >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

  for (let i = 0; i < curve.length - 1; i++) {
    if (speedKmh >= curve[i][0] && speedKmh <= curve[i + 1][0]) {
      const t = (speedKmh - curve[i][0]) / (curve[i + 1][0] - curve[i][0]);
      return curve[i][1] + t * (curve[i + 1][1] - curve[i][1]);
    }
  }
  return curve[0][1];
}

function applyTireFrictionAndBrakes(
  controller: any,
  config: VehicleConfig,
  input: any,
  speedKmh: number,
  forwardSpeed: number,
  posY: number
) {
  const isSand = posY < SAND_ELEVATION_THRESHOLD;
  const tireModel = isSand ? TIRE_MODELS.sand : TIRE_MODELS.tarmac;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];

    // Braking
    let brakeForce = 0;
    if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
      // Brake Bias
      const frontBias = config.brakes.frontBias;
      const rearBias = 1.0 - frontBias;
      // Multiplier ensures the total braking power remains consistent
      const brakeMultiplier = wheel.steerable ? (frontBias * 2) : (rearBias * 2);
      brakeForce = config.brakes.maxForce * input.brake * brakeMultiplier;
    }

    // Base friction
    let currentFriction = wheel.steerable ? tireModel.frontGrip : tireModel.rearGrip;

    // Handbrake — drift assist grip multiplier
    if (input.handbrake && !wheel.steerable) {
      brakeForce = config.brakes.handbrakeForce;
      currentFriction *= config.handling.assists.driftGripMultiplier;
    }

    controller.setWheelFrictionSlip(i, currentFriction);
    controller.setWheelBrake(i, brakeForce);

    // Steering
    if (wheel.steerable) {
      const maxSteerAngle = getInterpolatedSteeringAngle(speedKmh, config.handling.steeringCurve);
      const steerAngle = input.steering * maxSteerAngle;
      controller.setWheelSteering(i, steerAngle);
    }
  }
}

function applyAssists(body: RapierRigidBody, config: VehicleConfig, slipAngle: number, lateralSpeed: number, dt: number) {
  // Simple yaw damping assist:
  // If the car is sliding (high slip angle/lateral speed), apply a slight counter-torque
  // to prevent it from spinning out instantly, simulating a more arcade feel.
  if (Math.abs(lateralSpeed) > 2) {
    const damping = -slipAngle * config.handling.assists.yawDamping * dt * 50;
    body.applyTorqueImpulse({ x: 0, y: damping, z: 0 }, true);
  }
}

function applyAerodynamics(
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

function syncWheelVisuals(
  controller: any,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
  config: VehicleConfig,
  forwardSpeed: number,
  dt: number
) {
  const wheels = wheelRefs.current;
  if (!wheels) return;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheelObj = wheels[i];
    if (!wheelObj) continue;

    const connection = controller.wheelChassisConnectionPointCs(i);
    const suspension = controller.wheelSuspensionLength(i);
    const steer = controller.wheelSteering(i);
    const wheelConfig = config.wheels[i];

    if (connection != null && suspension != null) {
      // Position: connection point - suspension compression
      wheelObj.position.set(
        connection.x,
        connection.y - suspension,
        connection.z,
      );

      // Steering rotation (Y axis)
      if (steer != null) {
        wheelObj.rotation.y = steer;
      }

      // Spin rotation (X axis) based on speed
      const spinSpeed = (forwardSpeed / wheelConfig.radius) * dt;
      wheelObj.children[0]?.rotateX(spinSpeed);
    }
  }
}

/**
 * Vehicle physics hook using Rapier's DynamicRayCastVehicleController.
 * Handles engine force, steering, braking, and handbrake.
 *
 * @param chassisRef - Ref to the chassis RigidBody
 * @param wheelRefs - Array of refs to visual wheel Object3Ds
 * @param config - Vehicle configuration (defaults to DEFAULT_VEHICLE_CONFIG)
 */
export function useVehiclePhysics(
  chassisRef: React.RefObject<RapierRigidBody | null>,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
  config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
): void {
  const { world, rapier } = useRapier();
  const vehicleControllerRef = useRef<InstanceType<
    typeof rapier.DynamicRayCastVehicleController
  > | null>(null);
  const getInput = useInputUpdater();

  // Initialize the vehicle controller
  useEffect(() => {
    const body = chassisRef.current;
    if (!body) return;

    const controller = world.createVehicleController(body);

    // Add wheels
    config.wheels.forEach((wheel) => {
      controller.addWheel(
        // connection point (chassis-local)
        { x: wheel.position[0], y: wheel.position[1], z: wheel.position[2] },
        // suspension direction (downward)
        { x: 0, y: -1, z: 0 },
        // axle direction (lateral)
        { x: -1, y: 0, z: 0 },
        // suspension rest length
        wheel.suspensionRestLength,
        // wheel radius
        wheel.radius,
      );
    });

    // Configure suspension for each wheel
    for (let i = 0; i < config.wheels.length; i++) {
      const wheel = config.wheels[i];
      controller.setWheelSuspensionStiffness(i, wheel.suspensionStiffness);
      controller.setWheelMaxSuspensionTravel(i, wheel.suspensionTravel);
      controller.setWheelSuspensionCompression(i, wheel.suspensionDamping * 0.8);
      controller.setWheelSuspensionRelaxation(i, wheel.suspensionDamping);
    }

    vehicleControllerRef.current = controller;

    return () => {
      world.removeVehicleController(controller);
      vehicleControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame update: apply forces, read state
  useFrame((_, delta) => {
    const controller = vehicleControllerRef.current;
    const body = chassisRef.current;
    if (!controller || !body) return;

    const dt = Math.min(delta, MAX_DELTA);
    const input = getInput(dt);

    // Calculate current speed (m/s → km/h)
    const linvel = body.linvel();
    const pos = body.translation();

    _forward.set(0, 0, 1);
    _right.set(-1, 0, 0); // Local right vector (assuming vehicle faces +Z and +X is left, so -X is right. Check this! 
    // In ThreeJS default, if forward is +Z, left is +X, right is -X. 
    const bodyQuat = body.rotation();
    _quat.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w);
    _forward.applyQuaternion(_quat);
    _right.applyQuaternion(_quat);

    _velocity.set(linvel.x, linvel.y, linvel.z);
    const forwardSpeed = _velocity.dot(_forward); // m/s along forward axis
    const lateralSpeed = _velocity.dot(_right);   // m/s along lateral axis
    const speedKmh = Math.abs(forwardSpeed) * MS_TO_KMH;
    
    // Slip angle calculation
    let slipAngle = 0;
    if (Math.abs(forwardSpeed) > 1.0) {
      slipAngle = Math.atan2(lateralSpeed, forwardSpeed);
    }

    // Automatic Gearbox Logic
    const state = useGameStore.getState();
    const currentGear = updateGearbox(speedKmh, forwardSpeed, input, state.gear);

    // --- 1. APPLY DRIVETRAIN (Engine, Reverse) ---
    applyDrivetrain(controller, config, input, forwardSpeed, currentGear);

    // --- 2. APPLY TIRE FRICTION & BRAKES ---
    applyTireFrictionAndBrakes(controller, config, input, speedKmh, forwardSpeed, pos.y);

    // --- 3. APPLY ARCADE ASSISTS ---
    applyAssists(body, config, slipAngle, lateralSpeed, dt);

    // --- 4. UPDATE RAPIER VEHICLE ---
    controller.updateVehicle(dt);

    // --- 5. APPLY AERODYNAMICS & EXTERNAL FORCES ---
    applyAerodynamics(body, config, forwardSpeed, _velocity, pos.y, dt);

    // --- 6. SYNC VISUALS ---
    syncWheelVisuals(controller, wheelRefs, config, forwardSpeed, dt);

    // --- 7. UPDATE TELEMETRY & HUD ---
    const targetRpm = calculateRPM(speedKmh, currentGear, input);
    _euler.setFromQuaternion(_quat, 'YXZ');

    // Batch all state updates into one call
    useGameStore.setState({
      speed: Math.round(speedKmh),
      lateralSpeed,
      slipAngle,
      rpm: Math.round(targetRpm),
      gear: currentGear,
      heading: _euler.y,
      position: [pos.x, pos.y, pos.z],
    });

    // --- 8. CHECK RESET STATE ---
    const resetState = useGameStore.getState();
    if (pos.y < FALL_RESET_Y || input.reset || resetState.pendingReset) {
      body.setTranslation({ x: RESET_SPAWN_POSITION[0], y: RESET_SPAWN_POSITION[1], z: RESET_SPAWN_POSITION[2] }, true);
      
      const spawnQuat = new Quaternion().setFromEuler(new Euler(0, RESET_SPAWN_ROTATION_Y, 0));
      body.setRotation({ x: spawnQuat.x, y: spawnQuat.y, z: spawnQuat.z, w: spawnQuat.w }, true);

      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      if (resetState.pendingReset) {
        resetState.triggerReset(false);
      }
    }
  });
}
