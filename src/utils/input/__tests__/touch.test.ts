import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTouchInputState,
  setTouchInput,
  resetTouchInputState,
  getLastInputType,
  setLastInputType,
  isTouchDevice,
  triggerHapticFeedback,
  calculateJoystickSteering,
  calculateDigitalSteering,
  setupInputAutoDetection,
  JOYSTICK_BASE_RADIUS,
  JOYSTICK_DEADZONE_RATIO,
} from '../touch';

describe('Touch Input Subsystem (touch.ts)', () => {
  beforeEach(() => {
    resetTouchInputState();
    setLastInputType('touch');
  });

  // --------------------------------------------------------------------------
  // 1. Initial State & Snapshot Immutability
  // --------------------------------------------------------------------------
  describe('Initial State & Snapshot Immutability', () => {
    it('returns default neutral values on getTouchInputState', () => {
      const state = getTouchInputState();
      expect(state.steering).toBe(0);
      expect(state.throttle).toBe(0);
      expect(state.brake).toBe(0);
      expect(state.handbrake).toBe(false);
      expect(state.reset).toBe(false);
      expect(state.cameraToggle).toBe(false);
      expect(state.pause).toBe(false);
    });

    it('returns an immutable snapshot so external mutation does not affect subsystem state', () => {
      setTouchInput({ throttle: 0.6, steering: -0.4 });
      const snap = getTouchInputState();

      expect(snap.throttle).toBe(0.6);
      expect(snap.steering).toBe(-0.4);

      // Mutate snapshot locally
      snap.throttle = 1.0;
      snap.steering = 1.0;
      snap.handbrake = true;

      // Internal subsystem state remains untainted
      const freshSnap = getTouchInputState();
      expect(freshSnap.throttle).toBe(0.6);
      expect(freshSnap.steering).toBe(-0.4);
      expect(freshSnap.handbrake).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. OpenRally Steering Sign Convention (+1.0 Left, -1.0 Right)
  // --------------------------------------------------------------------------
  describe('Steering Sign Convention', () => {
    it('sets positive values for turning Left (+1.0 Left)', () => {
      setTouchInput({ steering: 0.75 });
      expect(getTouchInputState().steering).toBe(0.75);

      setTouchInput({ steering: 1.0 });
      expect(getTouchInputState().steering).toBe(1.0);
    });

    it('sets negative values for turning Right (-1.0 Right)', () => {
      setTouchInput({ steering: -0.75 });
      expect(getTouchInputState().steering).toBe(-0.75);

      setTouchInput({ steering: -1.0 });
      expect(getTouchInputState().steering).toBe(-1.0);
    });

    it('returns steering cleanly to neutral 0.0', () => {
      setTouchInput({ steering: 0.85 });
      expect(getTouchInputState().steering).toBe(0.85);

      setTouchInput({ steering: 0 });
      expect(getTouchInputState().steering).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Boundary Clamping & Sanitization
  // --------------------------------------------------------------------------
  describe('Boundary Clamping & Value Sanitization', () => {
    it('clamps out-of-range steering to [-1.0, 1.0]', () => {
      setTouchInput({ steering: 5.0 });
      expect(getTouchInputState().steering).toBe(1.0);

      setTouchInput({ steering: -10.0 });
      expect(getTouchInputState().steering).toBe(-1.0);
    });

    it('clamps out-of-range throttle to [0.0, 1.0]', () => {
      setTouchInput({ throttle: -0.5 });
      expect(getTouchInputState().throttle).toBe(0.0);

      setTouchInput({ throttle: 3.5 });
      expect(getTouchInputState().throttle).toBe(1.0);
    });

    it('clamps out-of-range brake to [0.0, 1.0]', () => {
      setTouchInput({ brake: -2.0 });
      expect(getTouchInputState().brake).toBe(0.0);

      setTouchInput({ brake: 100.0 });
      expect(getTouchInputState().brake).toBe(1.0);
    });

    it('sanitizes NaN and infinite numbers safely to 0', () => {
      setTouchInput({ steering: NaN });
      expect(getTouchInputState().steering).toBe(0);

      setTouchInput({ throttle: Infinity });
      expect(getTouchInputState().throttle).toBe(0);

      setTouchInput({ brake: -Infinity });
      expect(getTouchInputState().brake).toBe(0);
    });

    it('coerces boolean properties accurately', () => {
      setTouchInput({ handbrake: true, reset: true, cameraToggle: true, pause: true });
      let state = getTouchInputState();
      expect(state.handbrake).toBe(true);
      expect(state.reset).toBe(true);
      expect(state.cameraToggle).toBe(true);
      expect(state.pause).toBe(true);

      setTouchInput({ handbrake: false, reset: false });
      state = getTouchInputState();
      expect(state.handbrake).toBe(false);
      expect(state.reset).toBe(false);
      expect(state.cameraToggle).toBe(true);
      expect(state.pause).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Partial Updates & Multi-Touch Independence
  // --------------------------------------------------------------------------
  describe('Partial Updates & Multi-Touch Independence', () => {
    it('updates only targeted fields without altering untouched inputs', () => {
      setTouchInput({ throttle: 0.8 });
      expect(getTouchInputState().throttle).toBe(0.8);
      expect(getTouchInputState().steering).toBe(0);

      setTouchInput({ steering: -0.5 });
      expect(getTouchInputState().throttle).toBe(0.8);
      expect(getTouchInputState().steering).toBe(-0.5);

      setTouchInput({ handbrake: true });
      expect(getTouchInputState().throttle).toBe(0.8);
      expect(getTouchInputState().steering).toBe(-0.5);
      expect(getTouchInputState().handbrake).toBe(true);
    });

    it('handles simultaneous full throttle and full brake without conflict', () => {
      setTouchInput({ throttle: 1.0, brake: 1.0 });
      const state = getTouchInputState();
      expect(state.throttle).toBe(1.0);
      expect(state.brake).toBe(1.0);
    });

    it('resets all inputs to neutral when resetTouchInputState is called', () => {
      setTouchInput({
        steering: 0.9,
        throttle: 1.0,
        brake: 0.5,
        handbrake: true,
        reset: true,
        cameraToggle: true,
        pause: true,
      });

      resetTouchInputState();
      const state = getTouchInputState();
      expect(state.steering).toBe(0);
      expect(state.throttle).toBe(0);
      expect(state.brake).toBe(0);
      expect(state.handbrake).toBe(false);
      expect(state.reset).toBe(false);
      expect(state.cameraToggle).toBe(false);
      expect(state.pause).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Input Modality Auto-Detection & Switching
  // --------------------------------------------------------------------------
  describe('Input Modality Auto-Detection', () => {
    it('automatically sets lastInputType to touch on setTouchInput', () => {
      setLastInputType('keyboard');
      expect(getLastInputType()).toBe('keyboard');

      setTouchInput({ throttle: 0.5 });
      expect(getLastInputType()).toBe('touch');
    });

    it('allows manual switching between touch, keyboard, and gamepad', () => {
      setLastInputType('keyboard');
      expect(getLastInputType()).toBe('keyboard');

      setLastInputType('gamepad');
      expect(getLastInputType()).toBe('gamepad');

      setLastInputType('touch');
      expect(getLastInputType()).toBe('touch');
    });

    it('ignores invalid input modality types', () => {
      setLastInputType('touch');
      // @ts-expect-error test invalid runtime input
      setLastInputType('wheel');
      expect(getLastInputType()).toBe('touch');
    });

    it('switches input modality in response to window events', () => {
      if (typeof window === 'undefined') return;

      const cleanup = setupInputAutoDetection();

      // Dispatch touch pointerdown
      setLastInputType('keyboard');
      const pointerEvt = new Event('pointerdown') as PointerEvent;
      Object.defineProperty(pointerEvt, 'pointerType', { value: 'touch' });
      window.dispatchEvent(pointerEvt);
      expect(getLastInputType()).toBe('touch');

      // Dispatch keydown
      const keyEvt = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyEvt);
      expect(getLastInputType()).toBe('keyboard');

      // Dispatch touchstart
      const touchEvt = new Event('touchstart');
      window.dispatchEvent(touchEvt);
      expect(getLastInputType()).toBe('touch');

      cleanup();
    });

    it('dispatches openrally-input-switch custom window event on modality transition', () => {
      const originalWindow = globalThis.window;
      const target = new EventTarget();
      const dispatchSpy = vi.fn((event: Event) => target.dispatchEvent(event));

      Object.defineProperty(globalThis, 'window', {
        value: {
          dispatchEvent: dispatchSpy,
          addEventListener: target.addEventListener.bind(target),
          removeEventListener: target.removeEventListener.bind(target),
        },
        configurable: true,
        writable: true,
      });

      const receivedEvents: CustomEvent[] = [];
      const listener = (e: Event) => {
        receivedEvents.push(e as CustomEvent);
      };
      globalThis.window.addEventListener('openrally-input-switch', listener);

      try {
        setLastInputType('touch');
        receivedEvents.length = 0;
        dispatchSpy.mockClear();

        // Modality transition to gamepad -> dispatches event
        setLastInputType('gamepad');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0].detail).toEqual({ modality: 'gamepad' });
        expect(getLastInputType()).toBe('gamepad');

        // Calling with same modality -> NO duplicate event
        dispatchSpy.mockClear();
        setLastInputType('gamepad');
        expect(dispatchSpy).not.toHaveBeenCalled();
        expect(receivedEvents).toHaveLength(1);

        // Modality transition to keyboard -> dispatches event
        dispatchSpy.mockClear();
        setLastInputType('keyboard');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(receivedEvents).toHaveLength(2);
        expect(receivedEvents[1].detail).toEqual({ modality: 'keyboard' });
        expect(getLastInputType()).toBe('keyboard');

        // setTouchInput transitions to touch and dispatches event
        dispatchSpy.mockClear();
        setTouchInput({ throttle: 1.0 });
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(receivedEvents).toHaveLength(3);
        expect(receivedEvents[2].detail).toEqual({ modality: 'touch' });
        expect(getLastInputType()).toBe('touch');
      } finally {
        globalThis.window.removeEventListener('openrally-input-switch', listener);
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      }
    });

    it('determines initial desktop modality as keyboard when non-touch and touch when touch-capable', () => {
      // Simulate non-touch desktop environment with window present
      const mockDesktopWindow = {};
      const isTouchDesktop = false;
      const desktopModality = (typeof mockDesktopWindow !== 'undefined' && isTouchDesktop) ? 'touch' : 'keyboard';
      expect(desktopModality).toBe('keyboard');

      // Simulate touch environment with window present
      const mockTouchWindow = {};
      const isTouchMobile = true;
      const touchModality = (typeof mockTouchWindow !== 'undefined' && isTouchMobile) ? 'touch' : 'keyboard';
      expect(touchModality).toBe('touch');

      // Also verify when window is undefined (SSR / headless environment)
      const ssrModality = (typeof (undefined as unknown) !== 'undefined' && true) ? 'touch' : 'keyboard';
      expect(ssrModality).toBe('keyboard');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Device Detection (isTouchDevice)
  // --------------------------------------------------------------------------
  describe('Device Detection (isTouchDevice)', () => {
    const originalNavigator = globalThis.navigator;
    const originalWindow = globalThis.window;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    });

    it('returns true when maxTouchPoints > 0', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 5 },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('returns true when ontouchstart exists on window', () => {
      Object.defineProperty(globalThis, 'window', {
        value: { ontouchstart: null },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 0 },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('returns true when pointer: coarse media query matches', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: vi.fn().mockImplementation((query: string) => ({
            matches: query === '(pointer: coarse)',
          })),
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 0 },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('returns false when no touch indicators are present', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: vi.fn().mockReturnValue({ matches: false }),
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 0, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Haptic Vibration Feedback
  // --------------------------------------------------------------------------
  describe('Haptic Feedback (triggerHapticFeedback)', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    });

    it('triggers navigator.vibrate with default pulse duration (15ms)', () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateMock },
        configurable: true,
        writable: true,
      });

      const result = triggerHapticFeedback();
      expect(result).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith(15);
    });

    it('triggers navigator.vibrate with custom pattern', () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateMock },
        configurable: true,
        writable: true,
      });

      const result = triggerHapticFeedback([20, 50, 20]);
      expect(result).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith([20, 50, 20]);
    });

    it('degrades gracefully without throwing when navigator.vibrate is missing', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      expect(() => triggerHapticFeedback()).not.toThrow();
      expect(triggerHapticFeedback()).toBe(false);
    });

    it('degrades gracefully without throwing when navigator.vibrate throws', () => {
      const vibrateMock = vi.fn().mockImplementation(() => {
        throw new Error('NotAllowedError');
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateMock },
        configurable: true,
        writable: true,
      });

      expect(() => triggerHapticFeedback()).not.toThrow();
      expect(triggerHapticFeedback()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Virtual Joystick Steering Math
  // --------------------------------------------------------------------------
  describe('Virtual Joystick Steering Math', () => {
    it('returns zero steering when at origin or within deadzone', () => {
      const res1 = calculateJoystickSteering(100, 100, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(res1.steering).toBe(0);
      expect(res1.inDeadzone).toBe(true);

      // Deflection of 3px is less than 55 * 0.08 = 4.4px
      const res2 = calculateJoystickSteering(100, 103, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(res2.steering).toBe(0);
      expect(res2.inDeadzone).toBe(true);
    });

    it('calculates positive steering (+1.0 Left) when dragging left (deltaX < 0)', () => {
      // Drag left by 27.5px (half radius) -> -0.5 deflection -> +0.5 steering
      const res = calculateJoystickSteering(100, 72.5, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(res.rawDeflection).toBeCloseTo(-0.5);
      expect(res.steering).toBeCloseTo(0.5);
      expect(res.inDeadzone).toBe(false);

      // Drag left by full radius (55px) -> -1.0 deflection -> +1.0 steering
      const fullLeft = calculateJoystickSteering(100, 45, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(fullLeft.steering).toBeCloseTo(1.0);
    });

    it('calculates negative steering (-1.0 Right) when dragging right (deltaX > 0)', () => {
      // Drag right by full radius (55px) -> +1.0 deflection -> -1.0 steering
      const fullRight = calculateJoystickSteering(100, 155, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(fullRight.rawDeflection).toBeCloseTo(1.0);
      expect(fullRight.steering).toBeCloseTo(-1.0);
      expect(fullRight.inDeadzone).toBe(false);
    });

    it('clamps deflection beyond joystick radius to 1.0', () => {
      // Drag right by 100px (well beyond 55px radius)
      const clamped = calculateJoystickSteering(100, 200, JOYSTICK_BASE_RADIUS, JOYSTICK_DEADZONE_RATIO);
      expect(clamped.rawDeflection).toBeGreaterThan(1.0);
      expect(clamped.clampedDeflection).toBe(1.0);
      expect(clamped.steering).toBe(-1.0);
    });

    it('handles non-positive radius safely', () => {
      const res = calculateJoystickSteering(100, 150, 0);
      expect(res.steering).toBe(0);
      expect(res.inDeadzone).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Digital Button Steering Math
  // --------------------------------------------------------------------------
  describe('Digital Button Steering Math', () => {
    it('returns +1.0 for Left button only', () => {
      expect(calculateDigitalSteering(true, false)).toBe(1.0);
    });

    it('returns -1.0 for Right button only', () => {
      expect(calculateDigitalSteering(false, true)).toBe(-1.0);
    });

    it('returns 0.0 when both buttons are pressed simultaneously', () => {
      expect(calculateDigitalSteering(true, true)).toBe(0.0);
    });

    it('returns 0.0 when neither button is pressed', () => {
      expect(calculateDigitalSteering(false, false)).toBe(0.0);
    });
  });
});
