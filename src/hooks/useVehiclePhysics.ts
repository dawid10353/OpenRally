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
  FRICTION_FRONT_NORMAL,
  FRICTION_REAR_NORMAL,
  FRICTION_FRONT_SAND,
  FRICTION_REAR_SAND,
  FRICTION_HANDBRAKE,
  SAND_ELEVATION_THRESHOLD,
  FALL_RESET_Y,
  RESET_SPAWN_POSITION,
  RESET_SPAWN_ROTATION_Y,
  MAX_DELTA,
  GEAR_RATIOS,
  SHIFT_UP_SPEEDS,
  SHIFT_DOWN_SPEEDS,
} from '@/config/vehicle';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
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

function applyTireFrictionAndBrakes(
  controller: any,
  config: VehicleConfig,
  input: any,
  forwardSpeed: number,
  posY: number
) {
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

    // Base friction — terrain surface detection
    let baseSlip = wheel.steerable ? FRICTION_FRONT_NORMAL : FRICTION_REAR_NORMAL;
    if (posY < SAND_ELEVATION_THRESHOLD) {
      baseSlip = wheel.steerable ? FRICTION_FRONT_SAND : FRICTION_REAR_SAND;
    }

    // Handbrake — rear wheels only
    if (input.handbrake && !wheel.steerable) {
      brakeForce = config.brakes.handbrakeForce;
      // Reduce rear friction for drift
      controller.setWheelFrictionSlip(i, FRICTION_HANDBRAKE);
    } else {
      controller.setWheelFrictionSlip(i, baseSlip);
    }
    controller.setWheelBrake(i, brakeForce);

    // Steering
    if (wheel.steerable) {
      const steerAngle = input.steering * config.handling.maxSteeringAngle;
      controller.setWheelSteering(i, steerAngle);
    }
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

function calculateRPM(
  speedKmh: number,
  currentGear: number,
  input: any
): number {
  let targetRpm = 1000;
  if (currentGear === -1) {
    // Realistic RPM for reverse gear
    targetRpm = 1000 + (Math.min(speedKmh, 40) / 40) * 4000;
    
    // Rev blip when starting in reverse
    if (input.brake > 0 && speedKmh < 10) {
      targetRpm += input.brake * 1500 * (1 - speedKmh / 10);
    }
  } else if (currentGear > 0) {
    const minSpeed = currentGear === 1 ? 0 : SHIFT_UP_SPEEDS[currentGear - 1];
    const maxSpeed = SHIFT_UP_SPEEDS[currentGear] === 999 ? 240 : SHIFT_UP_SPEEDS[currentGear];
    const speedInRange = Math.max(0, speedKmh - minSpeed);
    const range = Math.max(1, maxSpeed - minSpeed);
    targetRpm = 1000 + (speedInRange / range) * 7000;
    
    // Rev blip when starting or holding throttle at low speeds
    if (input.throttle > 0 && speedKmh < 10) {
      targetRpm += input.throttle * 1500 * (1 - speedKmh / 10);
    }
  }
  
  // Add small random fluctuation to RPM for realism
  targetRpm += (Math.random() - 0.5) * 50;
  
  // Clamp RPM
  return Math.min(8000, Math.max(800, targetRpm));
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
      // Friction slip
      controller.setWheelFrictionSlip(i, wheel.steerable ? FRICTION_FRONT_NORMAL : FRICTION_REAR_NORMAL);
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
    const bodyQuat = body.rotation();
    _quat.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w);
    _forward.applyQuaternion(_quat);

    _velocity.set(linvel.x, linvel.y, linvel.z);
    const forwardSpeed = _velocity.dot(_forward); // m/s along forward axis
    const speedKmh = Math.abs(forwardSpeed) * MS_TO_KMH;

    // Automatic Gearbox Logic
    const state = useGameStore.getState();
    let currentGear = state.gear;

    if (input.brake > 0 && forwardSpeed < BRAKE_SPEED_THRESHOLD) {
      currentGear = -1; // Reverse
    } else if (speedKmh < 1 && input.throttle === 0 && input.brake === 0) {
      currentGear = 1; // Idle in 1st gear
    } else {
      if (currentGear < 1) currentGear = 1; // Ensure forward gear

      // Shift up
      if (currentGear < 5 && speedKmh > SHIFT_UP_SPEEDS[currentGear]) {
        currentGear++;
      } 
      // Shift down
      else if (currentGear > 1 && speedKmh < SHIFT_DOWN_SPEEDS[currentGear]) {
        currentGear--;
      }
    }

    // --- 1. APPLY DRIVETRAIN (Engine, Reverse) ---
    applyDrivetrain(controller, config, input, forwardSpeed, currentGear);

    // --- 2. APPLY TIRE FRICTION & BRAKES ---
    applyTireFrictionAndBrakes(controller, config, input, forwardSpeed, pos.y);

    // --- 3. UPDATE RAPIER VEHICLE ---
    controller.updateVehicle(dt);

    // --- 4. APPLY AERODYNAMICS & EXTERNAL FORCES ---
    applyAerodynamics(body, config, forwardSpeed, _velocity, pos.y, dt);

    // --- 5. SYNC VISUALS ---
    syncWheelVisuals(controller, wheelRefs, config, forwardSpeed, dt);

    // --- 6. UPDATE TELEMETRY & HUD ---
    const targetRpm = calculateRPM(speedKmh, currentGear, input);
    _euler.setFromQuaternion(_quat, 'YXZ');

    // Batch all state updates into one call
    useGameStore.setState({
      speed: Math.round(speedKmh),
      rpm: Math.round(targetRpm),
      gear: currentGear,
      heading: _euler.y,
      position: [pos.x, pos.y, pos.z],
    });

    // --- 7. CHECK RESET STATE ---
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
