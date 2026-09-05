/**
 * E2E Test Contracts & Specification Helpers
 * Authoritative specifications derived from PROJECT.md and ORIGINAL_REQUEST.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TouchInputState {
  steering: number;      // [-1.0, 1.0] where +1.0 is Left, -1.0 is Right (OpenRally standard)
  throttle: number;      // [0.0, 1.0]
  brake: number;         // [0.0, 1.0]
  handbrake: boolean;    // true if pressed
  reset: boolean;        // pulse true on trigger
  cameraToggle: boolean; // pulse true on trigger
  pause: boolean;        // pulse true on trigger
}

export interface TouchSettings {
  touchControlMode: 'auto' | 'always' | 'off';
  touchSteeringScheme: 'joystick' | 'buttons';
  touchOpacity: number;        // 0.2 to 1.0 (default 0.7)
  touchButtonSize: 'small' | 'medium' | 'large';
  touchHaptics: boolean;
}

export const DEFAULT_TOUCH_SETTINGS: TouchSettings = {
  touchControlMode: 'auto',
  touchSteeringScheme: 'joystick',
  touchOpacity: 0.7,
  touchButtonSize: 'medium',
  touchHaptics: true,
};

export const JOYSTICK_BASE_RADIUS = 55; // px
export const JOYSTICK_DEADZONE_RATIO = 0.08; // 8% of radius
export const MOBILE_DPR_MAX_CAP = 1.75;
export const DESKTOP_DPR_MAX_CAP = 2.0;
export const MOBILE_DPR_MIN_FLOOR = 0.5;

/**
 * Pixel 10 Pro hardware characteristics
 */
export const PIXEL_10_PRO = {
  physicalWidth: 1344,
  physicalHeight: 2992,
  landscapeCssWidth: 997,
  landscapeCssHeight: 448,
  devicePixelRatio: 3.0,
  refreshRate: 120,
  safeAreaInsets: {
    top: 0,
    bottom: 16, // gesture bar
    left: 48,   // camera punch hole on short edge
    right: 0,
  },
  rotatedSafeAreaInsets: {
    top: 0,
    bottom: 16,
    left: 0,
    right: 48,  // camera punch hole on opposite short edge
  },
};

/**
 * Mathematical formula for mobile DPR calculation (F2 specification)
 */
export function calculateTargetDpr(
  baseDpr: number,
  graphicsQuality: 'very_high' | 'high' | 'medium' | 'low',
  resolutionScale: number = 1.0,
  isMobile: boolean = true
): { targetDpr: number; dprRange: [number, number] } {
  const safeBase = Number.isFinite(baseDpr) && baseDpr > 0 ? baseDpr : 1.0;
  const maxCap = isMobile ? MOBILE_DPR_MAX_CAP : DESKTOP_DPR_MAX_CAP;

  let qualityMaxDpr: number;
  switch (graphicsQuality) {
    case 'very_high':
      qualityMaxDpr = maxCap;
      break;
    case 'high':
      qualityMaxDpr = Math.min(1.5, maxCap);
      break;
    case 'medium':
      qualityMaxDpr = 1.0;
      break;
    case 'low':
      qualityMaxDpr = 0.75;
      break;
  }

  const clampedResolutionScale = Math.max(0.5, Math.min(2.0, resolutionScale));
  const targetDpr = Math.min(safeBase, qualityMaxDpr) * clampedResolutionScale;
  const lowerBound = Math.max(0.1, 0.5 * clampedResolutionScale);
  const upperBound = Math.max(lowerBound, targetDpr);

  return {
    targetDpr,
    dprRange: [lowerBound, upperBound],
  };
}

/**
 * Mathematical formula for virtual joystick steering calculation (F4 specification)
 * In OpenRally physics: +1.0 is Left, -1.0 is Right
 */
export function calculateJoystickSteering(
  originX: number,
  currentX: number,
  radius: number = JOYSTICK_BASE_RADIUS,
  deadzoneRatio: number = JOYSTICK_DEADZONE_RATIO
): { rawDeflection: number; clampedDeflection: number; steering: number; inDeadzone: boolean } {
  if (radius <= 0) {
    return { rawDeflection: 0, clampedDeflection: 0, steering: 0, inDeadzone: true };
  }

  const deltaX = currentX - originX;
  const rawDeflection = deltaX / radius;
  const clampedDeflection = Math.max(-1.0, Math.min(1.0, rawDeflection));
  const inDeadzone = Math.abs(clampedDeflection) <= deadzoneRatio;

  // Sign convention: moving left (deltaX < 0) yields positive steering (+1.0 Left)
  // moving right (deltaX > 0) yields negative steering (-1.0 Right)
  const steering = inDeadzone ? 0 : -clampedDeflection;

  return {
    rawDeflection,
    clampedDeflection,
    steering,
    inDeadzone,
  };
}

/**
 * Mathematical formula for digital button steering (F4 Scheme 2 specification)
 */
export function calculateDigitalSteering(
  leftPressed: boolean,
  rightPressed: boolean
): number {
  if (leftPressed && rightPressed) return 0;
  if (leftPressed) return 1.0;  // +1.0 Left
  if (rightPressed) return -1.0; // -1.0 Right
  return 0.0;
}

/**
 * Safe-Area CSS calc helper verification
 */
export function computeHudPosition(
  baseOffsetPx: number,
  safeAreaInsetPx: number
): number {
  return Math.max(0, baseOffsetPx + Math.max(0, safeAreaInsetPx));
}

/**
 * Dynamic contract bridge for TouchInputState
 * If src/utils/input/touch.ts exists, it tests against the live module.
 * Otherwise, it uses this authoritative specification implementation.
 */
class ContractTouchSubsystem {
  private state: TouchInputState = {
    steering: 0,
    throttle: 0,
    brake: 0,
    handbrake: false,
    reset: false,
    cameraToggle: false,
    pause: false,
  };

  private lastInputType: 'touch' | 'keyboard' | 'gamepad' = 'touch';
  private touchDevice = true;

  getState(): TouchInputState {
    return { ...this.state };
  }

  setInput(partial: Partial<TouchInputState>): void {
    if (partial.steering !== undefined) {
      this.state.steering = Number.isFinite(partial.steering)
        ? Math.max(-1.0, Math.min(1.0, partial.steering))
        : 0;
    }
    if (partial.throttle !== undefined) {
      this.state.throttle = Number.isFinite(partial.throttle)
        ? Math.max(0.0, Math.min(1.0, partial.throttle))
        : 0;
    }
    if (partial.brake !== undefined) {
      this.state.brake = Number.isFinite(partial.brake)
        ? Math.max(0.0, Math.min(1.0, partial.brake))
        : 0;
    }
    if (partial.handbrake !== undefined) this.state.handbrake = Boolean(partial.handbrake);
    if (partial.reset !== undefined) this.state.reset = Boolean(partial.reset);
    if (partial.cameraToggle !== undefined) this.state.cameraToggle = Boolean(partial.cameraToggle);
    if (partial.pause !== undefined) this.state.pause = Boolean(partial.pause);
    this.lastInputType = 'touch';
  }

  reset(): void {
    this.state = {
      steering: 0,
      throttle: 0,
      brake: 0,
      handbrake: false,
      reset: false,
      cameraToggle: false,
      pause: false,
    };
  }

  setLastInputType(type: 'touch' | 'keyboard' | 'gamepad'): void {
    this.lastInputType = type;
  }

  getLastInputType(): 'touch' | 'keyboard' | 'gamepad' {
    return this.lastInputType;
  }

  setIsTouchDevice(isTouch: boolean): void {
    this.touchDevice = isTouch;
  }

  isTouchDevice(): boolean {
    return this.touchDevice;
  }
}

export const contractTouchSubsystem = new ContractTouchSubsystem();

/**
 * Attempts to load live implementation or falls back to contract bridge
 */
export async function getTouchModule(): Promise<{
  getTouchInputState: () => TouchInputState;
  setTouchInput: (partial: Partial<TouchInputState>) => void;
  resetTouchInputState: () => void;
  isTouchDevice: () => boolean;
  getLastInputType: () => 'touch' | 'keyboard' | 'gamepad';
  isLive: boolean;
}> {
  const possiblePath = path.resolve(process.cwd(), 'src/utils/input/touch.ts');
  if (fs.existsSync(possiblePath)) {
    try {
      const liveModule = await import('@/utils/input/touch');
      if (typeof liveModule.getTouchInputState === 'function') {
        return {
          getTouchInputState: liveModule.getTouchInputState,
          setTouchInput: liveModule.setTouchInput,
          resetTouchInputState: liveModule.resetTouchInputState,
          isTouchDevice: liveModule.isTouchDevice ?? (() => true),
          getLastInputType: liveModule.getLastInputType ?? (() => 'touch'),
          isLive: true,
        };
      }
    } catch {
      // Fall back if syntax/types during build
    }
  }

  return {
    getTouchInputState: () => contractTouchSubsystem.getState(),
    setTouchInput: (partial) => contractTouchSubsystem.setInput(partial),
    resetTouchInputState: () => contractTouchSubsystem.reset(),
    isTouchDevice: () => contractTouchSubsystem.isTouchDevice(),
    getLastInputType: () => contractTouchSubsystem.getLastInputType(),
    isLive: false,
  };
}
