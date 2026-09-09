import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, Object3D } from 'three';
import type { VehicleConfig, SurfaceType } from '@/types/vehicle';
import { useInputUpdater } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_VEHICLE_CONFIG, MS_TO_KMH, MAX_DELTA } from '@/config/vehicle';
import { updateGearbox, handleManualGearShift, calculateRPM } from '@/utils/physics/powertrain';
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
const _settledPos = { x: 0, y: 0, z: 0 };
const _settledRot = { x: 0, y: 0, z: 0, w: 1 };
const _settledSuspensions: number[] = [0, 0, 0, 0];
const _zeroVel = { x: 0, y: 0, z: 0 };
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
  const isSettledRef = useRef<boolean>(false);
  const pausedStateRef = useRef<{
    linvel: { x: number; y: number; z: number };
    angvel: { x: number; y: number; z: number };
    pos: { x: number; y: number; z: number };
    rot: { x: number; y: number; z: number; w: number };
    speed: number;
    rpm: number;
    gear: number;
    isAirborne: boolean;
  } | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const vehicleControllerRef = useRef<InstanceType<
    typeof rapier.DynamicRayCastVehicleController
  > | null>(null);
  const getInput = useInputUpdater();

  // Safely dispose the active vehicle controller without throwing WASM errors
  const disposeController = () => {
    if (vehicleControllerRef.current) {
      try {
        world.removeVehicleController(vehicleControllerRef.current);
      } catch (err) {
        console.warn('[useVehiclePhysics] Suppressed removeVehicleController error:', err);
      }
      vehicleControllerRef.current = null;
    }
  };

  // Idempotently configure and attach the vehicle controller to a valid rigid body
  const setupController = (body: RapierRigidBody) => {
    if (typeof body.isValid === 'function' && !body.isValid()) return;
    disposeController();

    try {
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
    } catch (err) {
      console.error('[useVehiclePhysics] Error setting up vehicle controller:', err);
    }
  };

  // Initialize and synchronize the vehicle controller when preset or level changes
  useEffect(() => {
    settleFramesRef.current = 0;
    isSettledRef.current = false;
    currentRpmRef.current = 1000;
    isAirborneRef.current = false;
    pausedStateRef.current = null;
    isPausedRef.current = false;

    const body = chassisRef.current;
    if (body && (typeof body.isValid !== 'function' || body.isValid())) {
      setupController(body);
    }

    return () => {
      disposeController();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, levelPreset.id]);

  // Frame update: apply forces, read state
  useFrame((_, delta) => {
    const gameState = useGameStore.getState().gameState;
    const body = chassisRef.current;
    if (!body || (typeof body.isValid === 'function' && !body.isValid())) return;

    if (!vehicleControllerRef.current) {
      setupController(body);
      if (!vehicleControllerRef.current) return;
    }

    const controller = vehicleControllerRef.current;

    // Settle vehicle physics on ground before dismissing loading screen
    if (!useGameStore.getState().isSceneReady) {
      settleFramesRef.current += 1;
      if (settleFramesRef.current >= 15) {
        useGameStore.getState().setSceneReady(true);
      }
    }

    // --- CHECK PENDING RESET FOR ALL STATES (PLAYING, LOADING, PAUSED, MENU) ---
    const resetState = useGameStore.getState();
    const spawnPos = levelPreset.spawnPosition;
    const spawnRotY = levelPreset.spawnRotationY;
    const fallResetY = levelPreset.fallResetY;
    const currentBodyPos = body.translation();
    const curLinvel = body.linvel();
    const curAngvel = body.angvel();

    // Numerical sanity guard: detect NaN or infinite values produced by extreme collisions or solver instability
    const isCorrupted =
      !Number.isFinite(currentBodyPos.x) ||
      !Number.isFinite(currentBodyPos.y) ||
      !Number.isFinite(currentBodyPos.z) ||
      !Number.isFinite(curLinvel.x) ||
      !Number.isFinite(curLinvel.y) ||
      !Number.isFinite(curLinvel.z) ||
      !Number.isFinite(curAngvel.x) ||
      !Number.isFinite(curAngvel.y) ||
      !Number.isFinite(curAngvel.z);

    if (isCorrupted || currentBodyPos.y < fallResetY || resetState.pendingReset) {
      body.setTranslation({ x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] }, true);

      _spawnEuler.set(0, spawnRotY, 0);
      _spawnQuat.setFromEuler(_spawnEuler);
      body.setRotation({ x: _spawnQuat.x, y: _spawnQuat.y, z: _spawnQuat.z, w: _spawnQuat.w }, true);

      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      currentRpmRef.current = 1000;
      isAirborneRef.current = false;
      settleFramesRef.current = 0;
      isSettledRef.current = false;
      pausedStateRef.current = null;
      isPausedRef.current = false;

      emitGameEvent('vehicle_reset', {
        reason: isCorrupted ? 'stability_guard' : currentBodyPos.y < fallResetY ? 'out_of_bounds' : 'manual',
      });

      if (resetState.pendingReset) {
        resetState.triggerReset(false);
      }

      if (resetState.gameMode === 'timeattack' && gameState === 'playing') {
        useRacingStore.getState().startCountdown();
      } else if (resetState.gameMode === 'gymkhana_blitz' && gameState === 'playing') {
        useGymkhanaStore.getState().resetBlitz();
        useGymkhanaStore.getState().startCountdown();
      }
      return;
    }

    // ─── 0. PAUSE STATE HANDLING (FREEZE & RESTORE IDENTICAL PRE-PAUSE MOMENTUM) ───
    if (gameState === 'paused') {
      if (!isPausedRef.current) {
        // First frame entering pause: capture the exact simulation state
        const curLinvel = body.linvel();
        const curAngvel = body.angvel();
        const curPos = body.translation();
        const curRot = body.rotation();

        pausedStateRef.current = {
          linvel: { x: curLinvel.x, y: curLinvel.y, z: curLinvel.z },
          angvel: { x: curAngvel.x, y: curAngvel.y, z: curAngvel.z },
          pos: { x: curPos.x, y: curPos.y, z: curPos.z },
          rot: { x: curRot.x, y: curRot.y, z: curRot.z, w: curRot.w },
          speed: prevSpeedKmhRef.current,
          rpm: currentRpmRef.current,
          gear: prevGearRef.current,
          isAirborne: isAirborneRef.current,
        };
        isPausedRef.current = true;
      }

      // While paused: keep the vehicle solidly stationary at paused coordinates
      // Do NOT apply braking forces or step vehicle controller to avoid altering wheel/suspension physics!
      if (pausedStateRef.current) {
        body.setTranslation(pausedStateRef.current.pos, true);
        body.setRotation(pausedStateRef.current.rot, true);
        body.setLinvel(_zeroVel, true);
        body.setAngvel(_zeroVel, true);
      }
      return;
    }

    // Resuming from pause back to 'playing':
    if (isPausedRef.current) {
      isPausedRef.current = false;
      if (pausedStateRef.current) {
        const saved = pausedStateRef.current;
        body.setTranslation(saved.pos, true);
        body.setRotation(saved.rot, true);
        body.setLinvel(saved.linvel, true);
        body.setAngvel(saved.angvel, true);
        prevSpeedKmhRef.current = saved.speed;
        currentRpmRef.current = saved.rpm;
        prevGearRef.current = saved.gear;
        isAirborneRef.current = saved.isAirborne;

        useGameStore.setState({
          speed: Math.round(saved.speed),
          rpm: Math.round(saved.rpm),
          gear: saved.gear,
        });

        pausedStateRef.current = null;
      }
    }

    // ─── 0.5. TITLE / MENU / LOADING SPAWN SETTLE ───
    if (gameState === 'title' || gameState === 'menu' || gameState === 'loading') {
      pausedStateRef.current = null;
      isPausedRef.current = false;

      // 1. If already settled in menu: keep vehicle 100% frozen, solid, and motionless
      if (isSettledRef.current) {
        body.setTranslation(_settledPos, true);
        body.setRotation(_settledRot, true);
        body.setLinvel(_zeroVel, true);
        body.setAngvel(_zeroVel, true);

        // Keep visual wheels completely static at resting suspension length
        const wheels = wheelRefs.current;
        if (wheels) {
          for (let i = 0; i < config.wheels.length; i++) {
            const wheelObj = wheels[i];
            if (!wheelObj) continue;
            const connection = controller.wheelChassisConnectionPointCs(i);
            const suspension = _settledSuspensions[i] ?? (config.wheels[i].suspensionRestLength * 0.7);
            if (connection != null) {
              wheelObj.position.set(connection.x, connection.y - suspension, connection.z);
              wheelObj.rotation.y = 0;
            }
          }
        }
        return;
      }

      // 2. Settle & landing phase (first ~40 frames after spawn):
      settleFramesRef.current += 1;
      for (let i = 0; i < config.wheels.length; i++) {
        controller.setWheelBrake(i, 3000);
        controller.setWheelEngineForce(i, 0);
      }
      controller.updateVehicle(delta);
      syncWheelVisuals(controller, wheelRefs, config, 0, delta, 1000, 1);

      // Check if vehicle has touched ground and vertical velocity has stabilized
      const currentLinvel = body.linvel();
      const hasLanded =
        (settleFramesRef.current >= 18 && Math.abs(currentLinvel.y) < 0.25) ||
        settleFramesRef.current >= 40;

      if (hasLanded) {
        const p = body.translation();
        const r = body.rotation();
        _settledPos.x = p.x;
        _settledPos.y = p.y;
        _settledPos.z = p.z;
        _settledRot.x = r.x;
        _settledRot.y = r.y;
        _settledRot.z = r.z;
        _settledRot.w = r.w;
        for (let i = 0; i < config.wheels.length; i++) {
          _settledSuspensions[i] = controller.wheelSuspensionLength(i) ?? (config.wheels[i].suspensionRestLength * 0.7);
        }
        isSettledRef.current = true;
        body.setLinvel(_zeroVel, true);
        body.setAngvel(_zeroVel, true);
        if (!useGameStore.getState().isSceneReady) {
          useGameStore.getState().setSceneReady(true);
        }
      }
      return;
    }

    if (isSettledRef.current) {
      isSettledRef.current = false;
    }

    const safeDelta = Number.isFinite(delta) && delta > 0 ? delta : 1 / 60;
    const dt = Math.max(0.001, Math.min(safeDelta, MAX_DELTA));
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
    const isCountingDown = 
      (state.gameMode === 'timeattack' && useRacingStore.getState().raceStatus === 'countdown') ||
      (state.gameMode === 'gymkhana_blitz' && useGymkhanaStore.getState().status === 'countdown');

    if (isCountingDown) {
      body.setLinvel({ x: 0, y: Math.min(0, linvel.y), z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    const isGymkhanaFinished =
      useGymkhanaStore.getState().showResultsModal ||
      (state.gameMode === 'gymkhana_blitz' && useGymkhanaStore.getState().status === 'completed');

    if (isGymkhanaFinished) {
      body.setLinvel({ x: linvel.x * 0.88, y: Math.min(0, linvel.y), z: linvel.z * 0.88 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    const transmissionMode = useSettingsStore.getState().transmissionMode;
    let currentGear: number;

    if (transmissionMode === 'manual') {
      currentGear = handleManualGearShift(state.gear, input, isAirborneRef.current);
    } else {
      currentGear = updateGearbox(speedKmh, forwardSpeed, input, state.gear, isAirborneRef.current, {
        slipAngle,
      });
    }

    if (currentGear !== prevGearRef.current) {
      emitGameEvent('gear_shifted', {
        fromGear: prevGearRef.current,
        toGear: currentGear,
      });
      prevGearRef.current = currentGear;
    }

    // --- 1. APPLY DRIVETRAIN (Engine, Reverse, Rev Limiter) ---
    applyDrivetrain(controller, config, input, forwardSpeed, currentGear, slipAngle, speedKmh);

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
    try {
      controller.updateVehicle(dt);
    } catch (simErr) {
      console.warn('[useVehiclePhysics] Suppressed Rapier vehicle solver exception:', simErr);
      body.setTranslation({ x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      emitGameEvent('vehicle_reset', { reason: 'stability_guard' });
      return;
    }

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
      if (
        Number.isFinite(_dragImpulse.x) &&
        Number.isFinite(_dragImpulse.y) &&
        Number.isFinite(_dragImpulse.z)
      ) {
        body.applyImpulse(_dragImpulse, true);
      }
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
      currentGear,
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

    // Batch all state updates into one call (strictly sanitizing values against NaN)
    _posTuple[0] = Number.isFinite(pos.x) ? pos.x : spawnPos[0];
    _posTuple[1] = Number.isFinite(pos.y) ? pos.y : spawnPos[1];
    _posTuple[2] = Number.isFinite(pos.z) ? pos.z : spawnPos[2];

    // Update pre-allocated telemetry object to eliminate per-frame GC allocations
    _telemetryState.speed = Number.isFinite(speedKmh) ? Math.round(speedKmh) : 0;
    _telemetryState.lateralSpeed = Number.isFinite(lateralSpeed) ? lateralSpeed : 0;
    _telemetryState.slipAngle = Number.isFinite(slipAngle) ? slipAngle : 0;
    _telemetryState.rpm = Number.isFinite(targetRpm) ? Math.round(targetRpm) : 1000;
    _telemetryState.gear = currentGear;
    _telemetryState.heading = Number.isFinite(_euler.y) ? _euler.y : 0;
    _telemetryState.position = _posTuple;
    _telemetryState.tireGrips = tireGrips;
    _telemetryState.surface = surface;

    useGameStore.setState(_telemetryState);

    // --- 8. CHECK MANUAL RESET (KEYBOARD 'R' OR GAMEPAD BUTTON) ---
    if (input.reset) {
      body.setTranslation({ x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] }, true);

      _spawnEuler.set(0, spawnRotY, 0);
      _spawnQuat.setFromEuler(_spawnEuler);
      body.setRotation({ x: _spawnQuat.x, y: _spawnQuat.y, z: _spawnQuat.z, w: _spawnQuat.w }, true);

      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      currentRpmRef.current = 1000;
      isAirborneRef.current = false;
      settleFramesRef.current = 0;
      pausedStateRef.current = null;
      isPausedRef.current = false;

      emitGameEvent('vehicle_reset', {
        reason: 'manual',
      });

      if (resetState.gameMode === 'timeattack') {
        useRacingStore.getState().startCountdown();
      } else if (resetState.gameMode === 'gymkhana_blitz') {
        useGymkhanaStore.getState().resetBlitz();
        useGymkhanaStore.getState().startCountdown();
      }
    }
  });
}
