import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, Object3D } from 'three';
import type { VehicleConfig, SurfaceType } from '@/types/vehicle';
import { useInputUpdater } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { DEFAULT_VEHICLE_CONFIG, MS_TO_KMH, MAX_DELTA } from '@/config/vehicle';
import { updateGearbox, calculateRPM } from '@/utils/physics/powertrain';
import { applyDrivetrain, applyAwdDriftPropulsion } from '@/utils/physics/drivetrain';
import { applyTireFrictionAndBrakes } from '@/utils/physics/tires';
import { applyAerodynamics } from '@/utils/physics/aerodynamics';
import { applyAssists } from '@/utils/physics/assists';
import { syncWheelVisuals } from '@/utils/physics/visuals';
import { applyAntiRollBars } from '@/utils/physics/suspension';
import { emitGameEvent } from '@/utils/events';
import { getSurfaceDefinition } from '@/config/surfaceRegistry';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { rumbleImpact, rumbleSlip, rumbleSurface } from '@/utils/input/gamepadHaptics';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
const _right = new Vector3();
const _velocity = new Vector3();
const _dragImpulse = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();
const _spawnQuat = new Quaternion();
const _spawnEuler = new Euler();
const _posTuple: [number, number, number] = [0, 0, 0];
const _telemetryState = {
  speed: 0,
  lateralSpeed: 0,
  slipAngle: 0,
  rpm: 0,
  gear: 1,
  heading: 0,
  position: _posTuple,
  tireGrips: [1, 1, 1, 1] as number[],
  surface: 'tarmac' as SurfaceType,
};

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
  const prevSpeedKmhRef = useRef<number>(0);
  const currentRpmRef = useRef<number>(1000);
  const isAirborneRef = useRef<boolean>(false);
  const settleFramesRef = useRef<number>(0);
  const vehicleControllerRef = useRef<InstanceType<
    typeof rapier.DynamicRayCastVehicleController
  > | null>(null);
  const getInput = useInputUpdater();

  useEffect(() => {
    settleFramesRef.current = 0;
    currentRpmRef.current = 1000;
    isAirborneRef.current = false;
  }, [levelPreset.id, config]);

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
    if (useGameStore.getState().gameState !== 'playing') return;

    const controller = vehicleControllerRef.current;
    const body = chassisRef.current;
    if (!controller || !body) return;

    // Settle vehicle physics on ground before dismissing loading screen
    if (!useGameStore.getState().isSceneReady) {
      settleFramesRef.current += 1;
      if (settleFramesRef.current >= 15) {
        useGameStore.getState().setSceneReady(true);
      }
    }

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
    // Use planar ground speed so cornering/drifting does not cause artificial RPM drop or gear downshift
    const groundSpeed = Math.hypot(forwardSpeed, lateralSpeed);
    const speedKmh = groundSpeed * MS_TO_KMH;
    
    // Slip angle calculation
    let slipAngle = 0;
    if (Math.abs(forwardSpeed) > 1.0) {
      slipAngle = Math.atan2(lateralSpeed, forwardSpeed);
    }

    // Automatic Gearbox Logic
    const state = useGameStore.getState();
    const isCountingDown = state.gameMode === 'timeattack' && useRacingStore.getState().raceStatus === 'countdown';

    if (isCountingDown) {
      body.setLinvel({ x: 0, y: Math.min(0, linvel.y), z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    const currentGear = updateGearbox(speedKmh, forwardSpeed, input, state.gear, isAirborneRef.current);

    if (currentGear !== prevGearRef.current) {
      emitGameEvent('gear_shifted', {
        fromGear: prevGearRef.current,
        toGear: currentGear,
      });
      prevGearRef.current = currentGear;
    }

    // --- 1. APPLY DRIVETRAIN (Engine, Reverse) ---
    applyDrivetrain(controller, config, input, forwardSpeed, currentGear, slipAngle);

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

    // --- 4.1. GROUND CONTACT & AIRBORNE TELEMETRY ---
    let groundedCount = 0;
    for (let i = 0; i < config.wheels.length; i++) {
      if (controller.wheelIsInContact ? controller.wheelIsInContact(i) : true) {
        groundedCount++;
      }
    }
    const groundedRatio = groundedCount / Math.max(1, config.wheels.length);
    const isAirborne = groundedCount === 0;
    isAirborneRef.current = isAirborne;

    // --- 4.5. GAMEPAD HAPTIC RUMBLE FEEDBACK ---
    const speedDelta = prevSpeedKmhRef.current - speedKmh;
    if (speedDelta > 25 && prevSpeedKmhRef.current > 30) {
      // Sudden deceleration / heavy collision impact
      rumbleImpact(Math.min(1.0, speedDelta / 60));
    } else if (Math.abs(lateralSpeed) > 2.8 || (input.handbrake && speedKmh > 12)) {
      // Tire slip / drifting vibration
      rumbleSlip(Math.min(1.0, Math.abs(lateralSpeed) / 7));
    } else if (surface !== 'tarmac' && speedKmh > 15) {
      // Off-road surface roughness
      const surfaceIntensity = surface === 'sand' ? 1.3 : surface === 'mud' ? 1.1 : 0.9;
      rumbleSurface(Math.min(1.0, (speedKmh / 80) * surfaceIntensity));
    }
    prevSpeedKmhRef.current = speedKmh;

    // --- 5. APPLY AERODYNAMICS & SURFACE ROLLING DRAG ---
    applyAerodynamics(body, config, forwardSpeed, _velocity, pos.y, dt);

    const surfaceDef = getSurfaceDefinition(surface);

    // Physical rolling resistance (loose ground deceleration: sand, tall grass, mud)
    if (groundedRatio > 0 && Math.abs(forwardSpeed) > 0.1) {
      // During active throttle drifts, reduce rolling drag to maintain forward momentum
      const isDriftingUnderPower = Math.abs(slipAngle) > 0.15 && input.throttle > 0.1;
      const driftDragReduction = isDriftingUnderPower ? 0.35 : 1.0;
      const rollingResistance = (surfaceDef.rollingResistance ?? 0.005) * driftDragReduction;
      const dragImpulseMagnitude = rollingResistance * body.mass() * 9.81 * groundedRatio * dt;
      const clampedDrag = Math.min(dragImpulseMagnitude, Math.abs(forwardSpeed) * body.mass());
      _dragImpulse.copy(_forward).multiplyScalar(-Math.sign(forwardSpeed) * clampedDrag);
      body.applyImpulse(_dragImpulse, true);
    }

    // --- 5.1. APPLY AWD POWER-SLIDE PROPULSION ---
    applyAwdDriftPropulsion(
      body,
      config,
      input,
      _forward,
      speedKmh,
      slipAngle,
      groundedRatio,
      dt,
    );

    // --- 6. UPDATE TELEMETRY & ENGINE RPM ---
    const targetRpm = calculateRPM(speedKmh, currentGear, input, {
      currentRpm: currentRpmRef.current,
      dt,
      groundedRatio,
      isAirborne,
      slipAngle,
      steering: input.steering,
      looseSurfaceTractionLoss: surfaceDef.looseSurfaceTractionLoss,
    });
    currentRpmRef.current = targetRpm;

    // --- 6.5. SYNC VISUALS ---
    syncWheelVisuals(controller, wheelRefs, config, forwardSpeed, dt, targetRpm, currentGear);

    // --- 7. UPDATE TELEMETRY & HUD ---
    _euler.setFromQuaternion(_quat, 'YXZ');

    // Batch all state updates into one call
    _posTuple[0] = pos.x;
    _posTuple[1] = pos.y;
    _posTuple[2] = pos.z;

    // Update pre-allocated telemetry object to eliminate per-frame GC allocations
    _telemetryState.speed = Math.round(speedKmh);
    _telemetryState.lateralSpeed = lateralSpeed;
    _telemetryState.slipAngle = slipAngle;
    _telemetryState.rpm = Math.round(targetRpm);
    _telemetryState.gear = currentGear;
    _telemetryState.heading = _euler.y;
    _telemetryState.position = _posTuple;
    _telemetryState.tireGrips = tireGrips;
    _telemetryState.surface = surface;

    useGameStore.setState(_telemetryState);

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

      currentRpmRef.current = 1000;
      isAirborneRef.current = false;

      emitGameEvent('vehicle_reset', {
        reason: pos.y < fallResetY ? 'out_of_bounds' : 'manual',
      });

      if (resetState.pendingReset) {
        resetState.triggerReset(false);
      }

      if (resetState.gameMode === 'timeattack') {
        useRacingStore.getState().startCountdown();
      }
    }
  });
}
