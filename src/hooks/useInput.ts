import { useEffect, useRef, useCallback } from 'react';
import type { InputState } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { lerp } from '@/utils/math';
import { STEER_SPEED, STEER_DEADZONE } from '@/config/input';

/**
 * Returns a function that updates and returns the current InputState.
 * Designed to be called inside useFrame with delta time.
 * Includes global hotkeys like Escape for pausing.
 */
export function useInputUpdater(): (dt: number) => InputState {
  const keysRef = useRef(new Set<string>());
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
  
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const setGameState = useGameStore((s) => s.setGameState);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      // Camera cycle
      if (e.code === 'KeyC' && !cameraToggledRef.current) {
        cameraToggledRef.current = true;
        cycleCameraMode();
      }
      
      // Escape for Pause Menu
      if (e.code === 'Escape' && !escapeToggledRef.current) {
        escapeToggledRef.current = true;
        
        const state = useGameStore.getState();
        // If we are playing, pause. If paused, unpause.
        if (state.gameState === 'playing') {
          setGameState('paused');
        } else if (state.gameState === 'paused') {
          setGameState('playing');
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
    [cycleCameraMode, setGameState],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code);
    if (e.code === 'KeyC') {
      cameraToggledRef.current = false;
    }
    if (e.code === 'Escape') {
      escapeToggledRef.current = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return useCallback((dt: number): InputState => {
    const gameState = useGameStore.getState().gameState;
    
    // If not playing, zero out movement inputs and return immediately
    if (gameState !== 'playing') {
      stateRef.current.throttle = 0;
      stateRef.current.brake = 0;
      stateRef.current.steering = 0;
      stateRef.current.handbrake = true;
      stateRef.current.reset = false;
      return stateRef.current;
    }

    const keys = keysRef.current;

    const throttleTarget = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const brakeTarget = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const steerTarget =
      (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
      (keys.has('KeyD') || keys.has('ArrowRight') ? -1 : 0);

    const steerLerp = 1 - Math.exp(-STEER_SPEED * dt);
    const prevSteering = stateRef.current.steering;
    const newSteering = lerp(prevSteering, steerTarget, steerLerp);

    stateRef.current = {
      steering: Math.abs(newSteering) < STEER_DEADZONE ? 0 : newSteering,
      throttle: throttleTarget,
      brake: brakeTarget,
      handbrake: keys.has('Space'),
      cameraToggle: false,
      reset: keys.has('KeyR'),
    };

    return stateRef.current;
  }, []);
}
