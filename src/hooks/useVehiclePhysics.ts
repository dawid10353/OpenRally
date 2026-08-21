import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, Object3D } from 'three';
import type { VehicleConfig, SurfaceType } from '@/types/vehicle';
import { useInputUpdater } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_VEHICLE_CONFIG, MS_TO_KMH, MAX_DELTA } from '@/config/vehicle';
import { updateGearbox, calculateRPM } from '@/utils/physics/powertrain';
import { applyDrivetrain } from '@/utils/physics/drivetrain';
import { applyTireFrictionAndBrakes } from '@/utils/physics/tires';
import { applyAerodynamics } from '@/utils/physics/aerodynamics';
import { applyAssists } from '@/utils/physics/assists';
import { syncWheelVisuals } from '@/utils/physics/visuals';
import { applyAntiRollBars } from '@/utils/physics/suspension';
import { emitGameEvent } from '@/utils/events';
import { useTerrainData } from '@/components/terrain/TerrainContext';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
const _right = new Vector3();
const _velocity = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();
const _spawnQuat = new Quaternion();
const _spawnEuler = new Euler();
const _posTuple: [number, number, number] = [0, 0, 0];

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
  const { heightmapData, levelData, levelPreset } = useTerrainData();
  const prevGearRef = useRef<number>(1);
  const prevSurfaceRef = useRef<SurfaceType>('tarmac');
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
      controller.setWheelMaxSuspensionForce(i, wheel.maxSuspensionForce ?? 12000);
    }

    vehicleControllerRef.current = controller;

    return () => {
      world.removeVehicleController(controller);
      vehicleControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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
    _right.set(1, 0, 0); // Local right vector (+X is right in Three.js right-handed coordinates)
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

    if (currentGear !== prevGearRef.current) {
      emitGameEvent('gear_shifted', {
        fromGear: prevGearRef.current,
        toGear: currentGear,
      });
      prevGearRef.current = currentGear;
    }

    // --- 1. APPLY DRIVETRAIN (Engine, Reverse) ---
    applyDrivetrain(controller, config, input, forwardSpeed, currentGear);

    // --- 2. APPLY TIRE FRICTION & BRAKES ---
    const { grips: tireGrips, surface } = applyTireFrictionAndBrakes(
      controller,
      config,
      input,
      speedKmh,
      forwardSpeed,
      pos.x,
      pos.y,
      pos.z,
      slipAngle,
      heightmapData,
      levelData,
    );

    if (surface !== prevSurfaceRef.current) {
      emitGameEvent('surface_changed', {
        from: prevSurfaceRef.current,
        to: surface,
      });
      prevSurfaceRef.current = surface;
    }

    // --- 3. APPLY ARCADE ASSISTS ---
    applyAssists(body, config, input, forwardSpeed, dt);

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
    _posTuple[0] = pos.x;
    _posTuple[1] = pos.y;
    _posTuple[2] = pos.z;

    useGameStore.setState({
      speed: Math.round(speedKmh),
      lateralSpeed,
      slipAngle,
      rpm: Math.round(targetRpm),
      gear: currentGear,
      heading: _euler.y,
      position: _posTuple,
      tireGrips,
      surface,
    });

    // --- 8. CHECK RESET STATE ---
    const resetState = useGameStore.getState();
    const spawnPos = levelPreset.spawnPosition;
    const spawnRotY = levelPreset.spawnRotationY;
    const fallResetY = levelPreset.fallResetY;

    if (pos.y < fallResetY || input.reset || resetState.pendingReset) {
      body.setTranslation({ x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] }, true);
      
      _spawnEuler.set(0, spawnRotY, 0);
      _spawnQuat.setFromEuler(_spawnEuler);
      body.setRotation({ x: _spawnQuat.x, y: _spawnQuat.y, z: _spawnQuat.z, w: _spawnQuat.w }, true);

      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      emitGameEvent('vehicle_reset', {
        reason: pos.y < fallResetY ? 'out_of_bounds' : 'manual',
      });

      if (resetState.pendingReset) {
        resetState.triggerReset(false);
      }
    }
  });
}
