/**
 * Touch Input Subsystem for OpenRally.
 *
 * Provides a zero-render mutable touch input state sampler, coordinate math for
 * virtual analog joysticks and digital buttons, input modality auto-detection,
 * and graceful haptic feedback.
 */

import { isMobileDevice } from '@/utils/device';

/**
 * Normalized touch input state sampled by the vehicle physics update loop.
 */
export interface TouchInputState {
  /**
   * Steering input [-1.0, 1.0].
   * OpenRally convention: +1.0 is Left, -1.0 is Right.
   */
  steering: number;
  /** Throttle input [0.0, 1.0] */
  throttle: number;
  /** Brake / reverse input [0.0, 1.0] */
  brake: number;
  /** Handbrake toggle/hold */
  handbrake: boolean;
  /** Single-frame pulse trigger for car reset */
  reset: boolean;
  /** Single-frame pulse trigger for camera cycle */
  cameraToggle: boolean;
  /** Single-frame pulse trigger for pause menu */
  pause: boolean;
}

export type InputType = 'touch' | 'keyboard' | 'gamepad';

export interface JoystickSteeringResult {
  rawDeflection: number;
  clampedDeflection: number;
  steering: number;
  inDeadzone: boolean;
}

export const JOYSTICK_BASE_RADIUS = 55; // px
export const JOYSTICK_DEADZONE_RATIO = 0.08; // 8% of radius

const initialTouchInputState: TouchInputState = {
  steering: 0,
  throttle: 0,
  brake: 0,
  handbrake: false,
  reset: false,
  cameraToggle: false,
  pause: false,
};

// Module-level mutable state for 60fps zero-render polling
let currentTouchInputState: TouchInputState = { ...initialTouchInputState };
let currentLastInputType: InputType =
  typeof window !== 'undefined' && isTouchDevice() ? 'touch' : 'keyboard';

/**
 * Returns an immutable snapshot of the current touch input state.
 * Returns a new object so external consumers mutating the snapshot cannot corrupt the internal state.
 */
export function getTouchInputState(): TouchInputState {
  return { ...currentTouchInputState };
}

/**
 * Updates partial touch input state with strict sanitization, clamping, and type checking.
 * Automatically marks the last active input type as 'touch'.
 */
export function setTouchInput(partial: Partial<TouchInputState>): void {
  if (partial.steering !== undefined) {
    currentTouchInputState.steering =
      typeof partial.steering === 'number' && Number.isFinite(partial.steering)
        ? Math.max(-1.0, Math.min(1.0, partial.steering))
        : 0;
  }
  if (partial.throttle !== undefined) {
    currentTouchInputState.throttle =
      typeof partial.throttle === 'number' && Number.isFinite(partial.throttle)
        ? Math.max(0.0, Math.min(1.0, partial.throttle))
        : 0;
  }
  if (partial.brake !== undefined) {
    currentTouchInputState.brake =
      typeof partial.brake === 'number' && Number.isFinite(partial.brake)
        ? Math.max(0.0, Math.min(1.0, partial.brake))
        : 0;
  }
  if (partial.handbrake !== undefined) {
    currentTouchInputState.handbrake = Boolean(partial.handbrake);
  }
  if (partial.reset !== undefined) {
    currentTouchInputState.reset = Boolean(partial.reset);
  }
  if (partial.cameraToggle !== undefined) {
    currentTouchInputState.cameraToggle = Boolean(partial.cameraToggle);
  }
  if (partial.pause !== undefined) {
    currentTouchInputState.pause = Boolean(partial.pause);
  }

  setLastInputType('touch');
}

/**
 * Resets all touch inputs to neutral zero / false state.
 */
export function resetTouchInputState(): void {
  currentTouchInputState = { ...initialTouchInputState };
}

/**
 * Returns the most recently active input modality ('touch', 'keyboard', or 'gamepad').
 */
export function getLastInputType(): InputType {
  return currentLastInputType;
}

/**
 * Manually sets the last active input modality.
 * Dispatches 'openrally-input-switch' custom window event on modality transition.
 */
export function setLastInputType(type: InputType): void {
  if (type === 'touch' || type === 'keyboard' || type === 'gamepad') {
    if (currentLastInputType !== type) {
      currentLastInputType = type;
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('openrally-input-switch', { detail: { modality: type } })
        );
      }
    }
  }
}

/**
 * Checks whether the client environment supports touch interaction.
 */
export function isTouchDevice(): boolean {
  if (typeof window !== 'undefined' && isMobileDevice()) {
    return true;
  }

  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return true;
  }

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 0
  ) {
    return true;
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return true;
  }

  return false;
}

/**
 * Triggers haptic vibration feedback via navigator.vibrate if available.
 * Fails silently if haptics are not supported or rejected by permissions.
 */
export function triggerHapticFeedback(pattern: number | number[] = 15): boolean {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    // Graceful degradation when vibration is prohibited or unsupported
  }
  return false;
}

/**
 * Virtual joystick steering calculation:
 * Deflection along the X axis normalized to [-1.0, 1.0].
 * In OpenRally physics: +1.0 is Left (deltaX < 0), -1.0 is Right (deltaX > 0).
 */
export function calculateJoystickSteering(
  originX: number,
  currentX: number,
  radius: number = JOYSTICK_BASE_RADIUS,
  deadzoneRatio: number = JOYSTICK_DEADZONE_RATIO
): JoystickSteeringResult {
  if (radius <= 0) {
    return { rawDeflection: 0, clampedDeflection: 0, steering: 0, inDeadzone: true };
  }

  const deltaX = currentX - originX;
  const rawDeflection = deltaX / radius;
  const clampedDeflection = Math.max(-1.0, Math.min(1.0, rawDeflection));
  const inDeadzone = Math.abs(clampedDeflection) <= deadzoneRatio;

  // Moving left (deltaX < 0) -> positive steering (+1.0 Left)
  // Moving right (deltaX > 0) -> negative steering (-1.0 Right)
  const steering = inDeadzone ? 0 : -clampedDeflection;

  return {
    rawDeflection,
    clampedDeflection,
    steering,
    inDeadzone,
  };
}

/**
 * Digital button steering calculation:
 * Left button: +1.0 (Left)
 * Right button: -1.0 (Right)
 * Both pressed: 0.0 (Cancel out)
 */
export function calculateDigitalSteering(
  leftPressed: boolean,
  rightPressed: boolean
): number {
  if (leftPressed && rightPressed) return 0;
  if (leftPressed) return 1.0;
  if (rightPressed) return -1.0;
  return 0.0;
}

/**
 * Attaches global window event listeners for input mode auto-detection.
 * Returns a teardown cleanup function.
 */
export function setupInputAutoDetection(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      setLastInputType('touch');
    }
  };

  const onTouchStart = () => {
    setLastInputType('touch');
  };

  const onKeyDown = () => {
    setLastInputType('keyboard');
  };

  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('keydown', onKeyDown, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('keydown', onKeyDown);
  };
}

// Auto-register in browser environment
if (typeof window !== 'undefined') {
  setupInputAutoDetection();
}
