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
  FALL_RESET_Y,
  RESET_SPAWN_POSITION,
  RESET_SPAWN_ROTATION_Y,
  MAX_DELTA,
} from '@/config/vehicle';
import { updateGearbox, calculateRPM } from '@/utils/physics/powertrain';
import { applyDrivetrain } from '@/utils/physics/drivetrain';
import { applyTireFrictionAndBrakes } from '@/utils/physics/tires';
import { applyAerodynamics } from '@/utils/physics/aerodynamics';
import { applyAssists } from '@/utils/physics/assists';
import { syncWheelVisuals } from '@/utils/physics/visuals';
import { applyAntiRollBars } from '@/utils/physics/suspension';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
const _right = new Vector3();
const _velocity = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();

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
    const tireGrips = applyTireFrictionAndBrakes(controller, config, input, speedKmh, forwardSpeed, pos.y, slipAngle);

    // --- 3. APPLY ARCADE ASSISTS ---
    applyAssists(body, config, slipAngle, lateralSpeed, dt);

    // --- 3.5. APPLY SUSPENSION ARB ---
    applyAntiRollBars(body, controller, config, dt);

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
      tireGrips,
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
