import { useEffect, useRef, useCallback } from 'react';
import type { InputState } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRacingStore } from '@/store/racingStore';
import { lerp } from '@/utils/math';
import {
  STEER_SPEED,
  STEER_DEADZONE,
  GAMEPAD_STEER_SPEED,
} from '@/config/input';
import { sampleGamepad, resetGamepadEdgeState, detectGamepadType } from '@/utils/input/gamepad';

export const activeKeys = new Set<string>();

/** Global flag indicating if look-back camera is currently requested (keyboard B or gamepad B/RS) */
let _lookBackRequested = false;

/** Global free-look orbit camera offset from Right Analog Stick [-1.0 to 1.0] */
let _cameraLookX = 0;
let _cameraLookY = 0;

/**
 * Returns true if look-back is active on either keyboard or gamepad.
 */
export function isLookBackActive(): boolean {
  return activeKeys.has('KeyB') || _lookBackRequested;
}

/**
 * Returns the current orbit camera look offset vector from the Right Analog Stick.
 * x: Horizontal pan [-1.0 (Left) to +1.0 (Right)]
 * y: Vertical tilt [-1.0 (Up) to +1.0 (Down)]
 */
export function getCameraLook(): { x: number; y: number } {
  return { x: _cameraLookX, y: _cameraLookY };
}

/**
 * Returns a function that updates and returns the current InputState.
 * Designed to be called inside useFrame with delta time.
 * Handles both Keyboard and Xbox / Gamepad inputs seamlessly.
 */
export function useInputUpdater(): (dt: number) => InputState {
  const stateRef = useRef<InputState>({
    steering: 0,
    throttle: 0,
    brake: 0,
    handbrake: false,
    cameraToggle: false,
    reset: false,
  });

  const cameraToggledRef = useRef(false);
  const escapeToggledRef = useRef(false);
  const telemetryToggledRef = useRef(false);

  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const setGameState = useGameStore((s) => s.setGameState);
  const setTelemetryEnabled = useGameStore((s) => s.setTelemetryEnabled);
  const setGamepadConnected = useGameStore((s) => s.setGamepadConnected);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      activeKeys.add(e.code);

      // Camera cycle
      if (e.code === 'KeyC' && !cameraToggledRef.current) {
        cameraToggledRef.current = true;
        cycleCameraMode();
      }

      // Telemetry HUD toggle
      if (e.code === 'KeyT' && !telemetryToggledRef.current) {
        telemetryToggledRef.current = true;
        const current = useGameStore.getState().telemetryEnabled;
        setTelemetryEnabled(!current);
      }

      // Escape for Pause Menu (only enters pause from active gameplay; unpausing is handled exclusively by MenuOverlay)
      if (e.code === 'Escape' && !escapeToggledRef.current) {
        escapeToggledRef.current = true;

        const state = useGameStore.getState();
        if (state.gameState === 'playing') {
          setGameState('paused');
        }
      }

      if (
        [
          'KeyW', 'KeyA', 'KeyS', 'KeyD',
          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
          'Space',
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
    },
    [cycleCameraMode, setGameState, setTelemetryEnabled],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    activeKeys.delete(e.code);
    if (e.code === 'KeyC') {
      cameraToggledRef.current = false;
    }
    if (e.code === 'KeyT') {
      telemetryToggledRef.current = false;
    }
    if (e.code === 'Escape') {
      escapeToggledRef.current = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const onGamepadConnected = (e: GamepadEvent) => {
      setGamepadConnected(true, e.gamepad.id, detectGamepadType(e.gamepad.id));
    };

    const onGamepadDisconnected = () => {
      setGamepadConnected(false, '', null);
      resetGamepadEdgeState();
    };

    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
    };
  }, [handleKeyDown, handleKeyUp, setGamepadConnected]);

  return useCallback((dt: number): InputState => {
    const gameState = useGameStore.getState().gameState;

    // If not playing (paused or menu), zero out movement inputs and return immediately!
    // Do NOT poll sampleGamepad here so that MenuOverlay has exclusive access to gamepad navigation.
    if (gameState !== 'playing') {
      _cameraLookX = 0;
      _cameraLookY = 0;
      stateRef.current.throttle = 0;
      stateRef.current.brake = 0;
      stateRef.current.steering = 0;
      stateRef.current.handbrake = true;
      stateRef.current.reset = false;
      return stateRef.current;
    }

    const gameMode = useGameStore.getState().gameMode;
    const raceStatus = useRacingStore.getState().raceStatus;
    const isCountingDown = gameMode === 'timeattack' && raceStatus === 'countdown';

    if (isCountingDown) {
      _cameraLookX = 0;
      _cameraLookY = 0;
      stateRef.current.throttle = 0;
      stateRef.current.brake = 1;
      stateRef.current.steering = 0;
      stateRef.current.handbrake = true;
      stateRef.current.reset = false;
      return stateRef.current;
    }

    const sensitivity = useSettingsStore.getState().sensitivity;

    // Poll Gamepad for active gameplay
    const gp = sampleGamepad(sensitivity);

    // Sync gamepad connection status if changed
    const currentGpConnected = useGameStore.getState().gamepadConnected;
    const currentGpType = useGameStore.getState().gamepadType;
    if (gp.connected !== currentGpConnected || gp.type !== currentGpType) {
      setGamepadConnected(gp.connected, gp.name, gp.type);
    }

    // In-game driving hotkeys from Gamepad (only active when playing)
    if (gp.pauseToggle) {
      setGameState('paused');
    }

    if (gp.cameraToggle) {
      cycleCameraMode();
    }

    if (gp.telemetryToggle) {
      const current = useGameStore.getState().telemetryEnabled;
      setTelemetryEnabled(!current);
    }

    _lookBackRequested = gp.lookBack;
    _cameraLookX = gp.cameraLookX;
    _cameraLookY = gp.cameraLookY;

    const keys = activeKeys;

    // Keyboard digital targets
    const kbThrottle = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const kbBrake = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const kbSteer =
      (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
      (keys.has('KeyD') || keys.has('ArrowRight') ? -1 : 0);

    // Combine throttle & brake (Gamepad analog triggers + Keyboard)
    const throttle = Math.max(kbThrottle, gp.throttle);
    const brake = Math.max(kbBrake, gp.brake);
    const handbrake = keys.has('Space') || gp.handbrake;
    const reset = keys.has('KeyR') || gp.resetHeld || gp.resetToggle;

    // Steering calculation:
    // If gamepad analog stick is active, use responsive gamepad interpolation
    // If keyboard is being pressed, use keyboard steering speed
    let targetSteering = 0;
    let steerSpeed = STEER_SPEED;

    if (Math.abs(gp.steering) > 0.001) {
      targetSteering = gp.steering;
      steerSpeed = GAMEPAD_STEER_SPEED;
    } else if (kbSteer !== 0) {
      targetSteering = kbSteer;
      steerSpeed = STEER_SPEED;
    }

    const steerLerp = 1 - Math.exp(-steerSpeed * dt);
    const prevSteering = stateRef.current.steering;
    const newSteering = lerp(prevSteering, targetSteering, steerLerp);

    stateRef.current = {
      steering: Math.abs(newSteering) < STEER_DEADZONE ? 0 : newSteering,
      throttle,
      brake,
      handbrake,
      cameraToggle: false,
      reset,
    };

    return stateRef.current;
  }, [cycleCameraMode, setGameState, setGamepadConnected, setTelemetryEnabled]);
}

