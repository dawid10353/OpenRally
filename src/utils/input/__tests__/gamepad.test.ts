import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyScaledDeadzone,
  applySteeringCurve,
  readTrigger,
  isButtonPressed,
  sampleGamepad,
  resetGamepadEdgeState,
  XBOX_BUTTONS,
  DUALSENSE_BUTTONS,
  detectGamepadType,
} from '../gamepad';

describe('gamepad input utilities', () => {
  beforeEach(() => {
    resetGamepadEdgeState();
  });

  describe('applyScaledDeadzone', () => {
    it('filters out values within deadzone', () => {
      expect(applyScaledDeadzone(0, 0.1)).toBe(0);
      expect(applyScaledDeadzone(0.05, 0.1)).toBe(0);
      expect(applyScaledDeadzone(-0.08, 0.1)).toBe(0);
      expect(applyScaledDeadzone(0.1, 0.1)).toBe(0);
    });

    it('scales values smoothly above deadzone to 1.0', () => {
      expect(applyScaledDeadzone(1.0, 0.1)).toBeCloseTo(1.0);
      expect(applyScaledDeadzone(-1.0, 0.1)).toBeCloseTo(-1.0);
      // Halfway between 0.1 and 1.0 is 0.55 -> should map to 0.5
      expect(applyScaledDeadzone(0.55, 0.1)).toBeCloseTo(0.5);
      expect(applyScaledDeadzone(-0.55, 0.1)).toBeCloseTo(-0.5);
    });
  });

  describe('applySteeringCurve', () => {
    it('preserves zeroes and extreme boundaries', () => {
      expect(applySteeringCurve(0, 1.35)).toBe(0);
      expect(applySteeringCurve(1, 1.35)).toBe(1);
      expect(applySteeringCurve(-1, 1.35)).toBe(-1);
    });

    it('provides softer response at center when exponent > 1', () => {
      const curved = applySteeringCurve(0.5, 1.35);
      expect(curved).toBeLessThan(0.5);
      expect(curved).toBeGreaterThan(0.3);
    });
  });

  describe('readTrigger', () => {
    it('returns 0 for undefined or unpressed trigger', () => {
      expect(readTrigger(undefined)).toBe(0);
      expect(readTrigger({ pressed: false, value: 0, touched: false })).toBe(0);
    });

    it('filters small analog trigger drift below threshold', () => {
      expect(readTrigger({ pressed: false, value: 0.01, touched: true }, 0.05)).toBe(0);
    });

    it('reads analog trigger accurately above threshold', () => {
      expect(readTrigger({ pressed: true, value: 1.0, touched: true }, 0.05)).toBeCloseTo(1.0);
      expect(readTrigger({ pressed: true, value: 0.525, touched: true }, 0.05)).toBeCloseTo(0.5);
    });
  });

  describe('isButtonPressed', () => {
    it('detects pressed digital buttons', () => {
      expect(isButtonPressed(undefined)).toBe(false);
      expect(isButtonPressed({ pressed: false, value: 0, touched: false })).toBe(false);
      expect(isButtonPressed({ pressed: true, value: 1, touched: true })).toBe(true);
      expect(isButtonPressed({ pressed: false, value: 0.8, touched: true })).toBe(true);
    });
  });

  describe('sampleGamepad', () => {
    const createMockGamepad = (
      buttonsState: Record<number, { pressed: boolean; value: number }> = {},
      axesState: number[] = [0, 0, 0, 0],
    ): Gamepad => {
      const buttons: GamepadButton[] = Array.from({ length: 17 }, (_, i) => {
        const state = buttonsState[i] || { pressed: false, value: 0 };
        return {
          pressed: state.pressed,
          value: state.value,
          touched: state.pressed,
        };
      });

      return {
        id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
        index: 0,
        connected: true,
        timestamp: Date.now(),
        mapping: 'standard',
        axes: axesState,
        buttons,
        hapticActuators: [],
        vibrationActuator: null,
      } as unknown as Gamepad;
    };

    it('returns default zero state when no gamepad is connected', () => {
      const sample = sampleGamepad(1.0, null);
      expect(sample.connected).toBe(false);
      expect(sample.steering).toBe(0);
      expect(sample.throttle).toBe(0);
      expect(sample.brake).toBe(0);
      expect(sample.handbrake).toBe(false);
    });

    it('samples analog steering with coordinate inversion (left stick left = positive steer)', () => {
      // Left stick tilted left (axis = -0.8)
      const mockLeft = createMockGamepad({}, [-0.8, 0, 0, 0]);
      const sampleLeft = sampleGamepad(1.0, mockLeft);
      expect(sampleLeft.steering).toBeGreaterThan(0); // Left is positive in OpenRally

      // Left stick tilted right (axis = +0.8)
      const mockRight = createMockGamepad({}, [0.8, 0, 0, 0]);
      const sampleRight = sampleGamepad(1.0, mockRight);
      expect(sampleRight.steering).toBeLessThan(0); // Right is negative in OpenRally
    });

    it('samples RT analog throttle and LT analog brake', () => {
      const mock = createMockGamepad({
        [XBOX_BUTTONS.RT]: { pressed: true, value: 0.75 },
        [XBOX_BUTTONS.LT]: { pressed: true, value: 0.4 },
      });

      const sample = sampleGamepad(1.0, mock);
      expect(sample.throttle).toBeCloseTo(0.75, 1);
      expect(sample.brake).toBeCloseTo(0.4, 1);
    });

    it('handles rising edge triggers for Camera toggle and Pause', () => {
      // Frame 1: Camera button pressed
      const mockPressed = createMockGamepad({
        [XBOX_BUTTONS.Y]: { pressed: true, value: 1.0 },
      });

      const sample1 = sampleGamepad(1.0, mockPressed);
      expect(sample1.cameraToggle).toBe(true);

      // Frame 2: Camera button still held
      const sample2 = sampleGamepad(1.0, mockPressed);
      expect(sample2.cameraToggle).toBe(false); // Should not re-trigger while held

      // Frame 3: Camera button released
      const mockReleased = createMockGamepad({
        [XBOX_BUTTONS.Y]: { pressed: false, value: 0 },
      });
      const sample3 = sampleGamepad(1.0, mockReleased);
      expect(sample3.cameraToggle).toBe(false);

      // Frame 4: Camera button pressed again -> re-triggers!
      const sample4 = sampleGamepad(1.0, mockPressed);
      expect(sample4.cameraToggle).toBe(true);
    });

    it('samples Look Back and Handbrake buttons', () => {
      const mock = createMockGamepad({
        [XBOX_BUTTONS.A]: { pressed: true, value: 1.0 }, // Handbrake
        [XBOX_BUTTONS.B]: { pressed: true, value: 1.0 }, // Look Back
      });

      const sample = sampleGamepad(1.0, mock);
      expect(sample.handbrake).toBe(true);
      expect(sample.lookBack).toBe(true);
    });

    it('correctly maps DualSense PlayStation buttons and triggers', () => {
      const ps5Mock = createMockGamepad({
        [DUALSENSE_BUTTONS.CROSS]: { pressed: true, value: 1.0 }, // Handbrake (✕)
        [DUALSENSE_BUTTONS.R2]: { pressed: true, value: 0.85 },    // Throttle (R2)
        [DUALSENSE_BUTTONS.L2]: { pressed: true, value: 0.35 },    // Brake (L2)
      });
      (ps5Mock as { id: string }).id = 'DualSense Wireless Controller';

      const sample = sampleGamepad(1.0, ps5Mock);
      expect(sample.type).toBe('dualsense');
      expect(sample.handbrake).toBe(true);
      expect(sample.throttle).toBeCloseTo(0.85, 1);
      expect(sample.brake).toBeCloseTo(0.35, 1);
    });

    it('samples Right Stick cameraLookX and cameraLookY with deadzone filtering', () => {
      // Right Stick tilted Right and Up: axes[2] = 0.8, axes[3] = -0.6
      const mockRightStick = createMockGamepad({}, [0, 0, 0.8, -0.6]);
      const sample = sampleGamepad(1.0, mockRightStick);
      expect(sample.cameraLookX).toBeGreaterThan(0.7);
      expect(sample.cameraLookY).toBeLessThan(-0.5);

      // Within deadzone (0.02)
      const mockDeadzone = createMockGamepad({}, [0, 0, 0.02, -0.02]);
      const deadSample = sampleGamepad(1.0, mockDeadzone);
      expect(deadSample.cameraLookX).toBe(0);
      expect(deadSample.cameraLookY).toBe(0);
    });
  });

  describe('detectGamepadType', () => {
    it('identifies DualSense / PlayStation controllers from various browser strings', () => {
      expect(detectGamepadType('DualSense Wireless Controller')).toBe('dualsense');
      expect(detectGamepadType('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('dualsense');
      expect(detectGamepadType('Sony Interactive Entertainment DualSense Wireless Controller')).toBe('dualsense');
      expect(detectGamepadType('PS5 Controller')).toBe('dualsense');
      expect(detectGamepadType('DualShock 4 Wireless Controller')).toBe('dualsense');
    });

    it('identifies Xbox controllers from various browser strings', () => {
      expect(detectGamepadType('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
      expect(detectGamepadType('Xbox Series X Controller')).toBe('xbox');
      expect(detectGamepadType('Xbox One Wireless Controller')).toBe('xbox');
    });

    it('returns generic for unknown gamepad brands', () => {
      expect(detectGamepadType('Generic USB Joystick')).toBe('generic');
      expect(detectGamepadType('')).toBe('generic');
    });
  });
});

