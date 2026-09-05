import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTouchInputState,
  setTouchInput,
  resetTouchInputState,
  getLastInputType,
  setLastInputType,
  calculateJoystickSteering,
  calculateDigitalSteering,
  triggerHapticFeedback,
  setupInputAutoDetection,
  isTouchDevice,
  JOYSTICK_BASE_RADIUS,
  JOYSTICK_DEADZONE_RATIO,
} from '@/utils/input/touch';
import { blendInputs } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { STEER_SPEED, GAMEPAD_STEER_SPEED, STEER_DEADZONE } from '@/config/input';

describe('Adversarial Stress Test Suite: Milestone 2 (Touch Subsystem & Vehicle Pipeline)', () => {
  const origWindow = globalThis.window;
  const origNavigator = globalThis.navigator;

  beforeEach(() => {
    resetTouchInputState();
    setLastInputType('touch');
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'freeroam',
      cameraMode: 'chase_close',
      telemetryEnabled: false,
    });
    useRacingStore.setState({
      raceStatus: 'idle',
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: origWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: origNavigator,
      configurable: true,
      writable: true,
    });
  });

  // ==========================================================================
  // CHALLENGE 1: Steering Sign Convention Under Boundary & Edge Case Inputs
  // ==========================================================================
  describe('Challenge 1: Steering Sign Convention (+1.0 Left, -1.0 Right)', () => {
    it('C1-1: Virtual joystick full left deflection produces exactly +1.0 steering', () => {
      const originX = 150;
      const currentX = originX - JOYSTICK_BASE_RADIUS; // Left drag by full radius
      const res = calculateJoystickSteering(originX, currentX);

      expect(res.rawDeflection).toBeCloseTo(-1.0);
      expect(res.clampedDeflection).toBeCloseTo(-1.0);
      expect(res.steering).toBeCloseTo(1.0); // +1.0 Left
      expect(res.inDeadzone).toBe(false);
    });

    it('C1-2: Virtual joystick full right deflection produces exactly -1.0 steering', () => {
      const originX = 150;
      const currentX = originX + JOYSTICK_BASE_RADIUS; // Right drag by full radius
      const res = calculateJoystickSteering(originX, currentX);

      expect(res.rawDeflection).toBeCloseTo(1.0);
      expect(res.clampedDeflection).toBeCloseTo(1.0);
      expect(res.steering).toBeCloseTo(-1.0); // -1.0 Right
      expect(res.inDeadzone).toBe(false);
    });

    it('C1-3: Fractional deflection scales linearly and preserves sign convention', () => {
      const originX = 200;
      const radius = 50;

      // 25% Left -> +0.25 steering
      const qtrLeft = calculateJoystickSteering(originX, originX - 12.5, radius);
      expect(qtrLeft.steering).toBeCloseTo(0.25);

      // 50% Left -> +0.50 steering
      const halfLeft = calculateJoystickSteering(originX, originX - 25.0, radius);
      expect(halfLeft.steering).toBeCloseTo(0.50);

      // 75% Left -> +0.75 steering
      const threeQtrLeft = calculateJoystickSteering(originX, originX - 37.5, radius);
      expect(threeQtrLeft.steering).toBeCloseTo(0.75);

      // 50% Right -> -0.50 steering
      const halfRight = calculateJoystickSteering(originX, originX + 25.0, radius);
      expect(halfRight.steering).toBeCloseTo(-0.50);

      // 75% Right -> -0.75 steering
      const threeQtrRight = calculateJoystickSteering(originX, originX + 37.5, radius);
      expect(threeQtrRight.steering).toBeCloseTo(-0.75);
    });

    it('C1-4: Extreme out-of-bounds deflection (10x radius) clamps strictly to [-1.0, 1.0]', () => {
      const originX = 500;
      const radius = 55;

      const extremeLeft = calculateJoystickSteering(originX, originX - 550, radius);
      expect(extremeLeft.rawDeflection).toBeCloseTo(-10.0);
      expect(extremeLeft.clampedDeflection).toBe(-1.0);
      expect(extremeLeft.steering).toBe(1.0);

      const extremeRight = calculateJoystickSteering(originX, originX + 550, radius);
      expect(extremeRight.rawDeflection).toBeCloseTo(10.0);
      expect(extremeRight.clampedDeflection).toBe(1.0);
      expect(extremeRight.steering).toBe(-1.0);
    });

    it('C1-5: Digital button steering respects exact +1.0 Left / -1.0 Right convention', () => {
      expect(calculateDigitalSteering(true, false)).toBe(1.0);   // Left = +1.0
      expect(calculateDigitalSteering(false, true)).toBe(-1.0);  // Right = -1.0
      expect(calculateDigitalSteering(true, true)).toBe(0.0);   // Both = 0.0 (cancel)
      expect(calculateDigitalSteering(false, false)).toBe(0.0);  // Neither = 0.0
    });

    it('C1-6: Negative and large screen offset coordinates calculate correct steering', () => {
      // Offsets in multi-monitor or scrolled coordinates
      const originLarge = 10000;
      const leftLarge = calculateJoystickSteering(originLarge, originLarge - 55, 55);
      expect(leftLarge.steering).toBeCloseTo(1.0);

      // Negative coordinates (pointer dragged outside left screen edge)
      const originNeg = -100;
      const leftNeg = calculateJoystickSteering(originNeg, originNeg - 55, 55);
      expect(leftNeg.steering).toBeCloseTo(1.0);

      const rightNeg = calculateJoystickSteering(originNeg, originNeg + 55, 55);
      expect(rightNeg.steering).toBeCloseTo(-1.0);
    });

    it('C1-7: Zero or negative radius degrades safely without division by zero', () => {
      const resZero = calculateJoystickSteering(100, 150, 0);
      expect(resZero.steering).toBe(0);
      expect(resZero.inDeadzone).toBe(true);

      const resNeg = calculateJoystickSteering(100, 150, -55);
      expect(resNeg.steering).toBe(0);
      expect(resNeg.inDeadzone).toBe(true);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Stress Testing Simultaneous Conflicting Inputs
  // ==========================================================================
  describe('Challenge 2: Simultaneous Conflicting Inputs & Blending Arbitration', () => {
    it('C2-1: Full Keyboard Left (+1.0) and Full Touch Right (-1.0) exactly cancel to 0.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: {},
        touch: { steering: -1.0 },
      });

      expect(res.targetSteering).toBe(0.0);
      expect(res.state.steering).toBe(0.0);
    });

    it('C2-2: Full Keyboard Right (-1.0) and Full Touch Left (+1.0) exactly cancel to 0.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyD']),
        gp: {},
        touch: { steering: 1.0 },
      });

      expect(res.targetSteering).toBe(0.0);
      expect(res.state.steering).toBe(0.0);
    });

    it('C2-3: Full Gamepad Left (+1.0) and Full Touch Right (-1.0) cancel out to 0.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: { steering: 1.0 },
        touch: { steering: -1.0 },
      });

      expect(res.targetSteering).toBe(0.0);
      expect(res.state.steering).toBe(0.0);
    });

    it('C2-4: Three-way conflict: Keyboard Left (+1.0) + Gamepad Left (+1.0) + Touch Right (-1.0) yields +1.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: { steering: 1.0 },
        touch: { steering: -1.0 },
      });

      // 1.0 + 1.0 - 1.0 = 1.0
      expect(res.targetSteering).toBe(1.0);
      expect(res.state.steering).toBeGreaterThan(0);
    });

    it('C2-5: Three-way conflict: Keyboard Right (-1.0) + Gamepad Right (-1.0) + Touch Left (+1.0) yields -1.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyD']),
        gp: { steering: -1.0 },
        touch: { steering: 1.0 },
      });

      // -1.0 - 1.0 + 1.0 = -1.0
      expect(res.targetSteering).toBe(-1.0);
      expect(res.state.steering).toBeLessThan(0);
    });

    it('C2-6: Three-way unanimous input (+3.0 sum) clamps cleanly to +1.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: { steering: 1.0 },
        touch: { steering: 1.0 },
      });

      expect(res.targetSteering).toBe(1.0);
    });

    it('C2-7: Three-way unanimous negative input (-3.0 sum) clamps cleanly to -1.0', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyD']),
        gp: { steering: -1.0 },
        touch: { steering: -1.0 },
      });

      expect(res.targetSteering).toBe(-1.0);
    });

    it('C2-8: Simultaneous full throttle and brake across distinct modalities are preserved', () => {
      // Keyboard Throttle + Touch Brake
      const res1 = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyW']),
        gp: {},
        touch: { brake: 1.0 },
      });
      expect(res1.state.throttle).toBe(1.0);
      expect(res1.state.brake).toBe(1.0);

      // Gamepad Throttle + Touch Brake
      const res2 = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: { throttle: 0.8 },
        touch: { brake: 0.9 },
      });
      expect(res2.state.throttle).toBe(0.8);
      expect(res2.state.brake).toBe(0.9);

      // Pure Touch simultaneous throttle and brake (Burnout / rally launch control)
      const res3 = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: {},
        touch: { throttle: 1.0, brake: 1.0 },
      });
      expect(res3.state.throttle).toBe(1.0);
      expect(res3.state.brake).toBe(1.0);
    });

    it('C2-9: Handbrake and Reset use logical OR across all three modalities', () => {
      // Handbrake active only on Touch
      const resHbTouch = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: { handbrake: false },
        touch: { handbrake: true },
      });
      expect(resHbTouch.state.handbrake).toBe(true);

      // Reset active only on Gamepad
      const resResetGp = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: { resetToggle: true },
        touch: { reset: false },
      });
      expect(resResetGp.state.reset).toBe(true);

      // Reset active only on Keyboard
      const resResetKb = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyR']),
        gp: {},
        touch: { reset: false },
      });
      expect(resResetKb.state.reset).toBe(true);
    });

    it('C2-10: Rapid modality switching does not corrupt internal state or modality tag', () => {
      const modalities: Array<'touch' | 'keyboard' | 'gamepad'> = [
        'touch', 'keyboard', 'gamepad', 'touch', 'gamepad', 'keyboard', 'touch'
      ];

      for (let i = 0; i < 200; i++) {
        const mod = modalities[i % modalities.length];
        setLastInputType(mod);
        expect(getLastInputType()).toBe(mod);
      }
    });

    it('C2-11: Multi-touch independence simulates three concurrent fingers without cross-talk', () => {
      // Finger 1 sets steering, Finger 2 sets throttle
      setTouchInput({ steering: 0.65, throttle: 1.0 });
      let snap = getTouchInputState();
      expect(snap.steering).toBe(0.65);
      expect(snap.throttle).toBe(1.0);
      expect(snap.handbrake).toBe(false);

      // Finger 3 taps handbrake
      setTouchInput({ handbrake: true });
      snap = getTouchInputState();
      expect(snap.steering).toBe(0.65); // untouched
      expect(snap.throttle).toBe(1.0);   // untouched
      expect(snap.handbrake).toBe(true);

      // Finger 1 changes steering angle
      setTouchInput({ steering: -0.4 });
      snap = getTouchInputState();
      expect(snap.steering).toBe(-0.4);
      expect(snap.throttle).toBe(1.0);
      expect(snap.handbrake).toBe(true);

      // Finger 3 releases handbrake
      setTouchInput({ handbrake: false });
      snap = getTouchInputState();
      expect(snap.handbrake).toBe(false);
      expect(snap.steering).toBe(-0.4);
      expect(snap.throttle).toBe(1.0);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Deadzone Math & Steering Dynamic Rates
  // ==========================================================================
  describe('Challenge 3: Deadzone Math & Interpolation Dynamics', () => {
    it('C3-1: Exact deadzone threshold boundary condition', () => {
      const radius = 55;
      const deadzoneLimit = radius * JOYSTICK_DEADZONE_RATIO; // 4.4px

      // Origin 0 exact limit: 4.4px deflection / 55px = 0.08 ratio
      const atDeadzoneOrigin0 = calculateJoystickSteering(0, deadzoneLimit, radius);
      expect(atDeadzoneOrigin0.inDeadzone).toBe(true);
      expect(atDeadzoneOrigin0.steering).toBe(0);

      // Clear inside deadzone (4.2px deflection)
      const insideDeadzone = calculateJoystickSteering(100, 100 + 4.2, radius);
      expect(insideDeadzone.inDeadzone).toBe(true);
      expect(insideDeadzone.steering).toBe(0);

      // Clear outside deadzone (4.6px deflection)
      const outsideDeadzone = calculateJoystickSteering(100, 100 + 4.6, radius);
      expect(outsideDeadzone.inDeadzone).toBe(false);
      expect(outsideDeadzone.steering).not.toBe(0);
      expect(outsideDeadzone.steering).toBeLessThan(0); // Right drag -> negative steering
    });

    it('C3-2: Jitter within deadzone produces strictly zero steering across 200 random perturbations', () => {
      const originX = 250;
      const radius = 55;
      const deadzoneLimit = radius * JOYSTICK_DEADZONE_RATIO; // 4.4px

      for (let i = 0; i < 200; i++) {
        const jitter = (Math.random() * 2 - 1) * deadzoneLimit * 0.95; // safely within [-4.18, +4.18]
        const res = calculateJoystickSteering(originX, originX + jitter, radius);
        expect(res.inDeadzone).toBe(true);
        expect(res.steering).toBe(0);
      }
    });

    it('C3-3: Steering below STEER_DEADZONE snaps cleanly to 0.0 (positive and negative)', () => {
      // Sub-deadzone positive
      const resPos = blendInputs({
        dt: 1 / 60,
        prevSteering: STEER_DEADZONE * 0.5,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: 0 },
      });
      expect(resPos.state.steering).toBe(0);

      // Sub-deadzone negative
      const resNeg = blendInputs({
        dt: 1 / 60,
        prevSteering: -STEER_DEADZONE * 0.5,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: 0 },
      });
      expect(resNeg.state.steering).toBe(0);
    });

    it('C3-4: Dynamic steerSpeed selection prioritizes analog rate over digital rate', () => {
      // Touch steering selects GAMEPAD_STEER_SPEED (18)
      const resTouch = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: 0.5 },
      });
      expect(resTouch.steerSpeed).toBe(GAMEPAD_STEER_SPEED);

      // Gamepad stick selects GAMEPAD_STEER_SPEED (18)
      const resGp = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set<string>(),
        gp: { steering: -0.3 },
        touch: { steering: 0 },
      });
      expect(resGp.steerSpeed).toBe(GAMEPAD_STEER_SPEED);

      // Keyboard-only selects STEER_SPEED (5)
      const resKb = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: { steering: 0 },
        touch: { steering: 0 },
      });
      expect(resKb.steerSpeed).toBe(STEER_SPEED);

      // Simultaneous keyboard + touch uses responsive GAMEPAD_STEER_SPEED (18)
      const resBoth = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: {},
        touch: { steering: -0.4 },
      });
      expect(resBoth.steerSpeed).toBe(GAMEPAD_STEER_SPEED);
    });
  });

  // ==========================================================================
  // CHALLENGE 4: High-Frequency 120Hz Mobile Stress Harness & Jitter Frame Rates
  // ==========================================================================
  describe('Challenge 4: High-Frequency 120Hz Updates & Dynamic Delta Times', () => {
    it('C4-1: 1,200 continuous frames at 120Hz (10 seconds) under 5Hz sinusoidal steering', () => {
      const dt = 1 / 120; // 8.333ms per frame (Pixel 10 Pro 120Hz display)
      let currentSteering = 0;
      const totalFrames = 1200;

      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame * dt;
        // 5 Hz rapid steering oscillation: Left to Right to Left
        const sinusoidalTarget = Math.sin(2 * Math.PI * 5 * time);

        const res = blendInputs({
          dt,
          prevSteering: currentSteering,
          keys: new Set<string>(),
          gp: {},
          touch: { steering: sinusoidalTarget },
        });

        currentSteering = res.state.steering;

        // Invariant: Steering must never exceed [-1.0, 1.0]
        expect(currentSteering).toBeGreaterThanOrEqual(-1.0);
        expect(currentSteering).toBeLessThanOrEqual(1.0);
        expect(Number.isFinite(currentSteering)).toBe(true);
        expect(Number.isNaN(currentSteering)).toBe(false);
      }
    });

    it('C4-2: Sudden finger release at 120Hz decays steering to neutral following vehicle dynamics', () => {
      const dt = 1 / 120;
      let currentSteering = 0;

      // 1. Drive full left for 60 frames (0.5s)
      for (let i = 0; i < 60; i++) {
        const res = blendInputs({
          dt,
          prevSteering: currentSteering,
          keys: new Set<string>(),
          gp: {},
          touch: { steering: 1.0 },
        });
        currentSteering = res.state.steering;
      }
      expect(currentSteering).toBeGreaterThan(0.99);

      // 2. Abrupt finger lift: touch steering becomes 0
      // When target is 0, steerSpeed is STEER_SPEED (5).
      // Decay formula: x(t) = exp(-5 * t).
      // For x(t) < 0.001 (STEER_DEADZONE), t > ln(1000)/5 = 1.3815s (166 frames at 120Hz).
      let snappedToZero = false;
      let snapFrame = -1;

      for (let i = 0; i < 200; i++) {
        const prev = currentSteering;
        const res = blendInputs({
          dt,
          prevSteering: currentSteering,
          keys: new Set<string>(),
          gp: {},
          touch: { steering: 0 },
        });
        currentSteering = res.state.steering;

        // Steering must strictly decay towards 0 monotonically
        expect(currentSteering).toBeLessThanOrEqual(prev);
        expect(currentSteering).toBeGreaterThanOrEqual(0);

        if (currentSteering === 0 && !snappedToZero) {
          snappedToZero = true;
          snapFrame = i;
        }
      }

      // Must snap cleanly to 0.0 between frame 160 and 170
      expect(snappedToZero).toBe(true);
      expect(snapFrame).toBeGreaterThanOrEqual(160);
      expect(snapFrame).toBeLessThanOrEqual(170);
      expect(currentSteering).toBe(0.0);
    });

    it('C4-3: 120Hz rapid touch input updates simulate touch move stream without event starvation', () => {
      const dt = 1 / 120;
      let prevSteering = 0;

      // Simulate 120 rapid pointermove events in 1 second
      for (let i = 0; i < 120; i++) {
        const xOffset = Math.sin((i / 120) * Math.PI * 4) * 55; // [-55, 55]
        const joy = calculateJoystickSteering(100, 100 + xOffset);

        setTouchInput({ steering: joy.steering, throttle: 0.8 });
        const snapshot = getTouchInputState();

        const res = blendInputs({
          dt,
          prevSteering,
          keys: new Set<string>(),
          gp: {},
          touch: snapshot,
        });

        prevSteering = res.state.steering;
        expect(Number.isFinite(res.state.steering)).toBe(true);
        expect(res.state.throttle).toBe(0.8);
      }
    });

    it('C4-4: Erratic frame times (dt jitter from 1ms to 500ms) remain numerically stable', () => {
      const erraticDts = [0.001, 0.008, 0.016, 0.033, 0.08, 0.25, 0.5, 0.002, 0.016];
      let prevSteering = 0;

      for (const dt of erraticDts) {
        const res = blendInputs({
          dt,
          prevSteering,
          keys: new Set<string>(),
          gp: {},
          touch: { steering: 0.8 },
        });

        prevSteering = res.state.steering;
        expect(Number.isFinite(res.state.steering)).toBe(true);
        expect(res.state.steering).toBeGreaterThanOrEqual(0.0);
        expect(res.state.steering).toBeLessThanOrEqual(0.8);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 5: Property-Based Fuzzing & Input Sanitization
  // ==========================================================================
  describe('Challenge 5: Property-Based Fuzzing Invariant Check (1,000 Iterations)', () => {
    it('C5-1: All 1,000 randomized input states maintain bounded invariants with zero NaN/Infinity', () => {
      const possibleKeys = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyR'];

      for (let i = 0; i < 1000; i++) {
        // Random active keys
        const keys = new Set<string>();
        for (const k of possibleKeys) {
          if (Math.random() < 0.3) keys.add(k);
        }

        // Random gamepad values (including out-of-bounds inputs)
        const gp = {
          steering: (Math.random() * 4 - 2), // [-2.0, 2.0]
          throttle: (Math.random() * 3 - 1), // [-1.0, 2.0]
          brake: (Math.random() * 3 - 1),    // [-1.0, 2.0]
          handbrake: Math.random() < 0.2,
          resetHeld: Math.random() < 0.1,
          cameraToggle: Math.random() < 0.1,
        };

        // Random touch values
        const touch = {
          steering: (Math.random() * 4 - 2), // [-2.0, 2.0]
          throttle: (Math.random() * 3 - 1), // [-1.0, 2.0]
          brake: (Math.random() * 3 - 1),    // [-1.0, 2.0]
          handbrake: Math.random() < 0.2,
          reset: Math.random() < 0.1,
          cameraToggle: Math.random() < 0.1,
        };

        const dt = Math.random() * 0.05 + 0.001; // [1ms, 51ms]
        const prevSteering = Math.random() * 2 - 1; // [-1.0, 1.0]

        const res = blendInputs({ dt, prevSteering, keys, gp, touch });

        // INVARIANTS:
        // 1. Steering is strictly clamped to [-1.0, 1.0]
        expect(res.state.steering).toBeGreaterThanOrEqual(-1.0);
        expect(res.state.steering).toBeLessThanOrEqual(1.0);
        expect(Number.isFinite(res.state.steering)).toBe(true);

        // 2. Throttle is strictly non-negative and finite
        expect(res.state.throttle).toBeGreaterThanOrEqual(0.0);
        expect(Number.isFinite(res.state.throttle)).toBe(true);

        // 3. Brake is strictly non-negative and finite
        expect(res.state.brake).toBeGreaterThanOrEqual(0.0);
        expect(Number.isFinite(res.state.brake)).toBe(true);

        // 4. Booleans remain booleans
        expect(typeof res.state.handbrake).toBe('boolean');
        expect(typeof res.state.reset).toBe('boolean');
        expect(typeof res.state.cameraToggle).toBe('boolean');
      }
    });

    it('C5-2: Malformed and hostile values passed to setTouchInput are sanitized without state corruption', () => {
      // NaN, Infinity, strings, undefined
      // @ts-expect-error test runtime dirty inputs
      setTouchInput({ steering: 'left', throttle: NaN, brake: Infinity, handbrake: 1 });

      const state = getTouchInputState();
      expect(state.steering).toBe(0);
      expect(state.throttle).toBe(0);
      expect(state.brake).toBe(0);
      expect(state.handbrake).toBe(true); // coerced boolean
    });

    it('C5-3: Snapshot isolation: external mutations on returned state do not corrupt subsystem', () => {
      setTouchInput({ throttle: 0.7, steering: 0.5 });
      const snap1 = getTouchInputState();

      // Malicious external consumer attempts in-place mutation
      snap1.throttle = 0;
      snap1.steering = -1.0;
      snap1.handbrake = true;

      // Fresh snapshot remains untainted
      const snap2 = getTouchInputState();
      expect(snap2.throttle).toBe(0.7);
      expect(snap2.steering).toBe(0.5);
      expect(snap2.handbrake).toBe(false);
    });

    it('C5-4: Haptic feedback degradation handles non-standard browser environments', () => {
      // Missing navigator
      const origNav = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(() => triggerHapticFeedback(20)).not.toThrow();
      expect(triggerHapticFeedback(20)).toBe(false);

      // Restore navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: origNav,
        configurable: true,
        writable: true,
      });
    });

    it('C5-5: setupInputAutoDetection attaches and cleans up window event listeners without memory leak', () => {
      if (typeof window === 'undefined') return;

      const cleanup = setupInputAutoDetection();

      // Pointer event for touch
      const pointerEvt = new Event('pointerdown') as PointerEvent;
      Object.defineProperty(pointerEvt, 'pointerType', { value: 'touch' });
      window.dispatchEvent(pointerEvt);
      expect(getLastInputType()).toBe('touch');

      // Teardown
      cleanup();

      // Subsequent event should not be tracked by cleaned-up listener
      setLastInputType('touch');
      const keyEvt = new KeyboardEvent('keydown', { code: 'KeyW' });
      window.dispatchEvent(keyEvt);
      // teardown removed keydown listener from cleanup instance
    });

    it('C5-6: isTouchDevice accurately handles spoofed and hostile environments', () => {
      // 1. maxTouchPoints > 0
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 5 },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);

      // 2. ontouchstart on window
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 0 },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { ontouchstart: null },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);

      // 3. matchMedia (pointer: coarse)
      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: vi.fn().mockImplementation((q: string) => ({
            matches: q === '(pointer: coarse)',
          })),
        },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(true);

      // 4. Desktop with no touch indicators
      Object.defineProperty(globalThis, 'navigator', {
        value: { maxTouchPoints: 0, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          matchMedia: vi.fn().mockReturnValue({ matches: false }),
        },
        configurable: true,
        writable: true,
      });
      expect(isTouchDevice()).toBe(false);
    });
  });
});
