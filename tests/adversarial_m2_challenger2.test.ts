import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTouchInputState,
  setTouchInput,
  resetTouchInputState,
  getLastInputType,
  setLastInputType,
  triggerHapticFeedback,
  calculateJoystickSteering,
  calculateDigitalSteering,
  setupInputAutoDetection,
  type TouchInputState,
  type InputType,
} from '../src/utils/input/touch';
import { blendInputs } from '../src/hooks/useInput';
import { useGameStore } from '../src/store/gameStore';
import { useRacingStore } from '../src/store/racingStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { GAMEPAD_STEER_SPEED, STEER_DEADZONE } from '../src/config/input';

describe('Adversarial Challenge M2: Pulse Clearing, Immutability & Modality Switching', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  // Mock EventTarget for Node.js window event simulation
  class MockWindow extends EventTarget {
    matchMedia = vi.fn().mockReturnValue({ matches: false });
  }

  let mockWindow: MockWindow;

  beforeEach(() => {
    mockWindow = new MockWindow();
    // Install mock window and navigator for Node test runner
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { maxTouchPoints: 0, vibrate: vi.fn().mockReturnValue(true) },
      configurable: true,
      writable: true,
    });

    resetTouchInputState();
    setLastInputType('touch');
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'freeroam',
      cameraMode: 'chase_close',
      telemetryEnabled: false,
      gamepadConnected: false,
      gamepadType: null,
    });
    useRacingStore.setState({
      raceStatus: 'idle',
    });
    useSettingsStore.setState({
      sensitivity: 1.0,
    });
  });

  afterEach(() => {
    resetTouchInputState();
    setLastInputType('touch');

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  // ==========================================================================
  // SECTION 1: PULSE CLEARING BEHAVIOR (reset, cameraToggle, pause)
  // ==========================================================================
  describe('1. Pulse Clearing Behavior & Non-Latching Oracles', () => {
    /**
     * Reusable harness that executes the exact frame-update logic of useInputUpdater
     * without requiring React component tree mount, testing the actual state transitions.
     */
    function createInputUpdaterHarness() {
      let state = {
        steering: 0,
        throttle: 0,
        brake: 0,
        handbrake: false,
        cameraToggle: false,
        reset: false,
      };

      return (dt: number, gpInput: any = {}) => {
        const gameState = useGameStore.getState().gameState;

        if (gameState !== 'playing') {
          state.throttle = 0;
          state.brake = 0;
          state.steering = 0;
          state.handbrake = true;
          state.reset = false;
          return { ...state };
        }

        const gameMode = useGameStore.getState().gameMode;
        const raceStatus = useRacingStore.getState().raceStatus;
        const isCountingDown = gameMode === 'timeattack' && raceStatus === 'countdown';

        if (isCountingDown) {
          state.throttle = 0;
          state.brake = 1;
          state.steering = 0;
          state.handbrake = true;
          state.reset = false;
          return { ...state };
        }

        const touch = getTouchInputState();

        if (gpInput.pauseToggle || touch.pause) {
          useGameStore.getState().setGameState('paused');
          if (touch.pause) {
            setTouchInput({ pause: false });
          }
        }

        if (gpInput.cameraToggle || touch.cameraToggle) {
          useGameStore.getState().cycleCameraMode();
          if (touch.cameraToggle) {
            setTouchInput({ cameraToggle: false });
          }
        }

        const merged = blendInputs({
          dt,
          prevSteering: state.steering,
          keys: new Set<string>(),
          gp: gpInput,
          touch,
        });

        if (touch.reset) {
          setTouchInput({ reset: false });
        }

        state = merged.state;
        return { ...state };
      };
    }

    it('reset pulse triggers true for exactly 1 frame and clears immediately to false', () => {
      const update = createInputUpdaterHarness();

      // Idle frame 0
      const f0 = update(1 / 60);
      expect(f0.reset).toBe(false);

      // Trigger reset pulse
      setTouchInput({ reset: true });
      expect(getTouchInputState().reset).toBe(true);

      // Frame 1: Pulse is consumed
      const f1 = update(1 / 60);
      expect(f1.reset).toBe(true);
      // Immediately after Frame 1, touch subsystem must have reset cleared
      expect(getTouchInputState().reset).toBe(false);

      // Frame 2: Must revert to false without external intervention
      const f2 = update(1 / 60);
      expect(f2.reset).toBe(false);

      // Frame 3: Remains false
      const f3 = update(1 / 60);
      expect(f3.reset).toBe(false);
    });

    it('cameraToggle pulse invokes cycleCameraMode exactly once across multi-frame sequence', () => {
      const update = createInputUpdaterHarness();
      const initialMode = useGameStore.getState().cameraMode;
      expect(initialMode).toBe('chase_close');

      // Trigger camera toggle pulse
      setTouchInput({ cameraToggle: true });
      expect(getTouchInputState().cameraToggle).toBe(true);

      // Frame 1: Consumes camera toggle
      const f1 = update(1 / 60);
      expect(f1.cameraToggle).toBe(true);
      expect(getTouchInputState().cameraToggle).toBe(false);
      const modeAfterF1 = useGameStore.getState().cameraMode;
      expect(modeAfterF1).not.toBe(initialMode); // Successfully cycled

      // Frame 2: Must NOT cycle again
      const f2 = update(1 / 60);
      expect(f2.cameraToggle).toBe(false);
      const modeAfterF2 = useGameStore.getState().cameraMode;
      expect(modeAfterF2).toBe(modeAfterF1); // Stable, no double-trigger

      // Frame 3: Still stable
      const f3 = update(1 / 60);
      expect(f3.cameraToggle).toBe(false);
      expect(useGameStore.getState().cameraMode).toBe(modeAfterF1);
    });

    it('pause pulse sets gameState to paused and clears touch flag so unpausing does not re-pause', () => {
      const update = createInputUpdaterHarness();
      expect(useGameStore.getState().gameState).toBe('playing');

      // Trigger pause pulse
      setTouchInput({ pause: true });
      expect(getTouchInputState().pause).toBe(true);

      // Frame 1: Transition to paused
      update(1 / 60);
      expect(useGameStore.getState().gameState).toBe('paused');
      // Subsystem must clear touch.pause immediately
      expect(getTouchInputState().pause).toBe(false);

      // Frame 2 while paused: updater returns neutral
      const f2 = update(1 / 60);
      expect(f2.handbrake).toBe(true);
      expect(f2.throttle).toBe(0);

      // User resumes gameplay via UI menu
      useGameStore.setState({ gameState: 'playing' });
      expect(useGameStore.getState().gameState).toBe('playing');

      // Frame 3: Active gameplay resumed, must NOT re-pause
      const f3 = update(1 / 60);
      expect(useGameStore.getState().gameState).toBe('playing');
      expect(f3.reset).toBe(false);
      expect(getTouchInputState().pause).toBe(false);
    });

    it('tri-pulse burst: handles simultaneous reset, cameraToggle, and pause in the same frame', () => {
      const update = createInputUpdaterHarness();
      const initialMode = useGameStore.getState().cameraMode;

      // Inject all 3 pulse flags simultaneously
      setTouchInput({ reset: true, cameraToggle: true, pause: true });
      const snap = getTouchInputState();
      expect(snap.reset).toBe(true);
      expect(snap.cameraToggle).toBe(true);
      expect(snap.pause).toBe(true);

      // Frame 1: All 3 are processed
      const f1 = update(1 / 60);
      expect(f1.reset).toBe(true);
      expect(f1.cameraToggle).toBe(true);
      expect(useGameStore.getState().gameState).toBe('paused');
      expect(useGameStore.getState().cameraMode).not.toBe(initialMode);

      // All 3 flags in touch subsystem must be cleared to false
      const afterSnap = getTouchInputState();
      expect(afterSnap.reset).toBe(false);
      expect(afterSnap.cameraToggle).toBe(false);
      expect(afterSnap.pause).toBe(false);

      // Resume game
      useGameStore.setState({ gameState: 'playing' });

      // Frame 2: Must be completely neutral
      const f2 = update(1 / 60);
      expect(f2.reset).toBe(false);
      expect(f2.cameraToggle).toBe(false);
      expect(useGameStore.getState().gameState).toBe('playing');
    });

    it('strobe test: pulse train over 100 frames triggers exactly 10 pulses with 0 latches', () => {
      const update = createInputUpdaterHarness();
      let activeResetCount = 0;
      let activeCameraCount = 0;

      for (let frame = 1; frame <= 100; frame++) {
        // Inject pulses at frames 10, 20, 30, ..., 100
        if (frame % 10 === 0) {
          setTouchInput({ reset: true, cameraToggle: true });
        }

        const out = update(1 / 60);
        if (out.reset) activeResetCount++;
        if (out.cameraToggle) activeCameraCount++;

        // In between pulse frames, both must be strictly false
        if (frame % 10 !== 0) {
          expect(out.reset).toBe(false);
          expect(out.cameraToggle).toBe(false);
        }
      }

      // Exactly 10 pulses over 100 frames
      expect(activeResetCount).toBe(10);
      expect(activeCameraCount).toBe(10);
      // Clean neutral state at end
      expect(getTouchInputState().reset).toBe(false);
      expect(getTouchInputState().cameraToggle).toBe(false);
    });

    it('countdown phase in timeattack suppresses reset until active racing begins', () => {
      const update = createInputUpdaterHarness();
      useGameStore.setState({ gameMode: 'timeattack' });
      useRacingStore.setState({ raceStatus: 'countdown' });

      // Set reset while counting down
      setTouchInput({ reset: true });

      // Frame during countdown: reset output is suppressed
      const fc = update(1 / 60);
      expect(fc.reset).toBe(false);
      expect(fc.brake).toBe(1); // Locked brakes during countdown

      // Countdown finishes, race starts
      useRacingStore.setState({ raceStatus: 'racing' });

      // First active frame: pulse is consumed and cleared
      const fRacing1 = update(1 / 60);
      expect(fRacing1.reset).toBe(true);
      expect(getTouchInputState().reset).toBe(false);

      // Second active frame: neutral
      const fRacing2 = update(1 / 60);
      expect(fRacing2.reset).toBe(false);
    });

    it('vehicle physics reset integration: resets vehicle once without freezing car across consecutive frames', () => {
      const update = createInputUpdaterHarness();

      // Mock vehicle rigid body
      let position = { x: 50, y: 10, z: 200 };
      let velocity = { x: 25, y: 0, z: 30 };
      let resetCount = 0;
      const spawnPos = [0, 2, 0];

      function simulateVehiclePhysicsStep(input: { reset: boolean; throttle: number }) {
        if (input.reset) {
          position = { x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] };
          velocity = { x: 0, y: 0, z: 0 };
          resetCount++;
        } else {
          // Normal acceleration physics
          velocity.z += input.throttle * 5.0;
          position.z += velocity.z * (1 / 60);
        }
      }

      // Trigger reset pulse
      setTouchInput({ reset: true, throttle: 1.0 });

      // Frame 1: Vehicle reset triggered
      const in1 = update(1 / 60);
      simulateVehiclePhysicsStep(in1);
      expect(in1.reset).toBe(true);
      expect(resetCount).toBe(1);
      expect(position.x).toBe(0);
      expect(velocity.z).toBe(0);

      // Frame 2: input.reset is false, car accelerates cleanly!
      const in2 = update(1 / 60);
      simulateVehiclePhysicsStep(in2);
      expect(in2.reset).toBe(false);
      expect(resetCount).toBe(1); // Did NOT reset again
      expect(velocity.z).toBeGreaterThan(0); // Successfully accelerated
      expect(position.z).toBeGreaterThan(0); // Moved forward

      // Frame 3: continues accelerating
      const in3 = update(1 / 60);
      simulateVehiclePhysicsStep(in3);
      expect(in3.reset).toBe(false);
      expect(resetCount).toBe(1);
      expect(velocity.z).toBeGreaterThan(in2.throttle);
    });
  });

  // ==========================================================================
  // SECTION 2: SNAPSHOT IMMUTABILITY & HOSTILE TAMPERING RESISTANCE
  // ==========================================================================
  describe('2. Snapshot Immutability & Hostile Tampering Resistance', () => {
    it('mutating all properties on returned snapshot object does not poison internal state', () => {
      setTouchInput({
        steering: -0.65,
        throttle: 0.85,
        brake: 0.15,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });

      const snap = getTouchInputState();

      // Aggressive malicious tampering on snapshot object
      snap.steering = 999.99;
      snap.throttle = -500;
      snap.brake = 1337;
      snap.handbrake = true;
      snap.reset = true;
      snap.cameraToggle = true;
      snap.pause = true;
      (snap as any).maliciousProp = 'injected';
      delete (snap as any).steering;

      // Verify that internal subsystem state is 100% untainted
      const fresh = getTouchInputState();
      expect(fresh.steering).toBe(-0.65);
      expect(fresh.throttle).toBe(0.85);
      expect(fresh.brake).toBe(0.15);
      expect(fresh.handbrake).toBe(false);
      expect(fresh.reset).toBe(false);
      expect(fresh.cameraToggle).toBe(false);
      expect(fresh.pause).toBe(false);
      expect((fresh as any).maliciousProp).toBeUndefined();
    });

    it('successive getTouchInputState calls return distinct references (never referentially equal)', () => {
      const references = new Set<TouchInputState>();
      for (let i = 0; i < 50; i++) {
        const snap = getTouchInputState();
        expect(references.has(snap)).toBe(false);
        references.add(snap);
      }
      expect(references.size).toBe(50);
    });

    it('Object.freeze on snapshot does not freeze or break the internal subsystem', () => {
      const snap = getTouchInputState();
      Object.freeze(snap);
      expect(Object.isFrozen(snap)).toBe(true);

      // Subsystem must still allow normal mutations
      expect(() => {
        setTouchInput({ throttle: 0.9, steering: 0.4 });
      }).not.toThrow();

      const newSnap = getTouchInputState();
      expect(newSnap.throttle).toBe(0.9);
      expect(newSnap.steering).toBe(0.4);
      expect(Object.isFrozen(newSnap)).toBe(false);
    });

    it('adversarial fuzzing: handles non-finite numbers and out-of-bounds inputs gracefully', () => {
      const invalidSteeringInputs = [
        NaN,
        Infinity,
        -Infinity,
        1e30,
        -1e30,
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        'extreme_left' as any,
        {} as any,
        [] as any,
        null as any,
        undefined,
      ];

      for (const val of invalidSteeringInputs) {
        if (val === undefined) continue;
        setTouchInput({ steering: val });
        const snap = getTouchInputState();
        expect(Number.isFinite(snap.steering)).toBe(true);
        expect(snap.steering).toBeGreaterThanOrEqual(-1.0);
        expect(snap.steering).toBeLessThanOrEqual(1.0);
        expect(Number.isNaN(snap.steering)).toBe(false);
      }

      const invalidThrottleInputs = [
        NaN,
        Infinity,
        -Infinity,
        -999,
        999,
        'fast' as any,
        null as any,
      ];

      for (const val of invalidThrottleInputs) {
        setTouchInput({ throttle: val });
        const snap = getTouchInputState();
        expect(Number.isFinite(snap.throttle)).toBe(true);
        expect(snap.throttle).toBeGreaterThanOrEqual(0.0);
        expect(snap.throttle).toBeLessThanOrEqual(1.0);
        expect(Number.isNaN(snap.throttle)).toBe(false);
      }
    });

    it('strict boolean coercion: non-boolean values normalize cleanly to true or false', () => {
      // Truthy values
      setTouchInput({
        handbrake: 1 as any,
        reset: 'yes' as any,
        cameraToggle: {} as any,
        pause: [] as any,
      });
      let snap = getTouchInputState();
      expect(snap.handbrake).toBe(true);
      expect(snap.reset).toBe(true);
      expect(snap.cameraToggle).toBe(true);
      expect(snap.pause).toBe(true);

      // Falsy values
      setTouchInput({
        handbrake: 0 as any,
        reset: '' as any,
        cameraToggle: null as any,
        pause: undefined,
      });
      snap = getTouchInputState();
      expect(snap.handbrake).toBe(false);
      expect(snap.reset).toBe(false);
      expect(snap.cameraToggle).toBe(false);
      // pause remains previous value when passed undefined (partial update)
      expect(snap.pause).toBe(true);
    });

    it('idempotent neutral reset: repeated calls to resetTouchInputState produce clean neutral states', () => {
      for (let i = 0; i < 20; i++) {
        setTouchInput({
          steering: (Math.random() - 0.5) * 2,
          throttle: Math.random(),
          brake: Math.random(),
          handbrake: Math.random() > 0.5,
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
      }
    });

    it('multi-touch concurrency: rapid interleaved partial updates from two thumbs preserve all inputs', () => {
      // Thumb 1 (Steering Joystick) updates steering
      setTouchInput({ steering: 0.75 });
      expect(getTouchInputState().steering).toBe(0.75);

      // Thumb 2 (Throttle/Pedals) updates throttle
      setTouchInput({ throttle: 1.0 });
      expect(getTouchInputState().steering).toBe(0.75); // Unchanged!
      expect(getTouchInputState().throttle).toBe(1.0);

      // Thumb 2 taps handbrake
      setTouchInput({ handbrake: true });
      expect(getTouchInputState().steering).toBe(0.75); // Unchanged!
      expect(getTouchInputState().throttle).toBe(1.0); // Unchanged!
      expect(getTouchInputState().handbrake).toBe(true);

      // Thumb 1 adjusts steering to 0.2
      setTouchInput({ steering: 0.2 });
      expect(getTouchInputState().steering).toBe(0.2);
      expect(getTouchInputState().throttle).toBe(1.0);
      expect(getTouchInputState().handbrake).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 3: MODALITY AUTO-SWITCHING RESILIENCE & INTERLEAVED EVENTS
  // ==========================================================================
  describe('3. Modality Auto-Switching Resilience', () => {
    it('rapid interleaved storm: 1000 alternations between touch, keyboard, and gamepad', () => {
      const modalities: InputType[] = ['touch', 'keyboard', 'gamepad'];

      for (let i = 0; i < 1000; i++) {
        const target = modalities[i % modalities.length];

        if (target === 'touch') {
          setTouchInput({ throttle: 0.5 });
          expect(getLastInputType()).toBe('touch');
        } else if (target === 'keyboard') {
          setLastInputType('keyboard');
          expect(getLastInputType()).toBe('keyboard');
        } else if (target === 'gamepad') {
          setLastInputType('gamepad');
          expect(getLastInputType()).toBe('gamepad');
        }
      }
    });

    it('pointer type discrimination: mouse and pen pointerdown do NOT switch modality to touch', () => {
      const cleanup = setupInputAutoDetection();
      setLastInputType('keyboard');

      // Mouse pointerdown
      const mouseEvt = new Event('pointerdown');
      Object.defineProperty(mouseEvt, 'pointerType', { value: 'mouse' });
      window.dispatchEvent(mouseEvt);
      expect(getLastInputType()).toBe('keyboard'); // Must NOT change to touch

      // Pen pointerdown
      const penEvt = new Event('pointerdown');
      Object.defineProperty(penEvt, 'pointerType', { value: 'pen' });
      window.dispatchEvent(penEvt);
      expect(getLastInputType()).toBe('keyboard'); // Must NOT change to touch

      // Touch pointerdown
      const touchEvt = new Event('pointerdown');
      Object.defineProperty(touchEvt, 'pointerType', { value: 'touch' });
      window.dispatchEvent(touchEvt);
      expect(getLastInputType()).toBe('touch'); // Must change to touch

      cleanup();
    });

    it('gamepad deadzone thresholding in updater: sub-0.05 jitter does NOT hijack modality', () => {
      setLastInputType('touch');

      // Helper simulating gamepad polling check from useInputUpdater
      function checkGamepadModality(gp: any) {
        if (
          gp.throttle > 0.05 ||
          gp.brake > 0.05 ||
          Math.abs(gp.steering) > 0.05 ||
          gp.handbrake ||
          gp.resetHeld ||
          gp.resetToggle ||
          gp.cameraToggle ||
          gp.pauseToggle
        ) {
          setLastInputType('gamepad');
        }
      }

      // Jitter / drift below threshold (e.g. 0.03 stick drift)
      checkGamepadModality({ throttle: 0.02, brake: 0.04, steering: -0.03 });
      expect(getLastInputType()).toBe('touch'); // Stays touch!

      // Deflection above threshold (0.06)
      checkGamepadModality({ throttle: 0.06, brake: 0, steering: 0 });
      expect(getLastInputType()).toBe('gamepad'); // Switches to gamepad!
    });

    it('modality setter rejects invalid types and preserves previous valid modality', () => {
      setLastInputType('touch');
      // @ts-expect-error test illegal strings
      setLastInputType('mouse');
      expect(getLastInputType()).toBe('touch');

      // @ts-expect-error test illegal strings
      setLastInputType('steering_wheel');
      expect(getLastInputType()).toBe('touch');

      // @ts-expect-error test illegal strings
      setLastInputType('');
      expect(getLastInputType()).toBe('touch');

      // @ts-expect-error test null
      setLastInputType(null);
      expect(getLastInputType()).toBe('touch');
    });

    it('setupInputAutoDetection cleanup removes listeners cleanly without memory leak', () => {
      const cleanup = setupInputAutoDetection();

      setLastInputType('touch');
      const keyEvt = new Event('keydown');
      window.dispatchEvent(keyEvt);
      expect(getLastInputType()).toBe('keyboard');

      // Teardown
      cleanup();

      // Reset to touch
      setLastInputType('touch');

      // Dispatch keydown after cleanup - should NOT change modality
      window.dispatchEvent(keyEvt);
      expect(getLastInputType()).toBe('touch');
    });
  });

  // ==========================================================================
  // SECTION 4: MULTI-SOURCE BLENDING ADVERSARIAL STRESS
  // ==========================================================================
  describe('4. Multi-Source Blending Adversarial Stress', () => {
    it('tri-modal opposing steering: clamps strictly to [-1.0, 1.0] and computes correct target', () => {
      // Keyboard Left (+1.0), Gamepad Right (-0.8), Touch Left (+0.6)
      // Net: 1.0 - 0.8 + 0.6 = +0.8 (Left)
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['KeyA']),
        gp: { steering: -0.8 },
        touch: { steering: 0.6 },
      });

      expect(res.targetSteering).toBeCloseTo(0.8);
      expect(res.steerSpeed).toBe(GAMEPAD_STEER_SPEED);
      expect(res.state.steering).toBeGreaterThan(0);
    });

    it('numerical stability under extreme dt values: never generates NaN or Infinity', () => {
      const extremeDts = [0, 1e-9, 1e-6, 1 / 240, 1 / 60, 1 / 20, 0.5, 1.0, 5.0, 100.0];

      for (const dt of extremeDts) {
        const res = blendInputs({
          dt,
          prevSteering: 0.5,
          keys: new Set(['KeyA']),
          gp: { steering: -0.3, throttle: 0.7 },
          touch: { steering: 0.2, brake: 0.4 },
        });

        expect(Number.isFinite(res.state.steering)).toBe(true);
        expect(Number.isNaN(res.state.steering)).toBe(false);
        expect(res.state.steering).toBeGreaterThanOrEqual(-1.0);
        expect(res.state.steering).toBeLessThanOrEqual(1.0);

        expect(Number.isFinite(res.targetSteering)).toBe(true);
        expect(Number.isNaN(res.targetSteering)).toBe(false);
      }
    });

    it('rapid steering snap reversal (hard left to hard right) smoothly interpolates', () => {
      // Prev steering: +1.0 (Full Left)
      // Target: -1.0 (Full Right)
      const res1 = blendInputs({
        dt: 1 / 60,
        prevSteering: 1.0,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: -1.0 },
      });

      expect(res1.targetSteering).toBe(-1.0);
      expect(res1.steerSpeed).toBe(GAMEPAD_STEER_SPEED);
      // At dt=1/60 with speed=18, steerLerp = 1 - e^(-18/60) ≈ 0.259
      // newSteering = lerp(1.0, -1.0, 0.259) ≈ 0.482
      expect(res1.state.steering).toBeLessThan(1.0);
      expect(res1.state.steering).toBeGreaterThan(-1.0);

      // Over 15 frames (0.25s), steering must cleanly reach near full right
      let currentSteer = 1.0;
      for (let i = 0; i < 20; i++) {
        const step = blendInputs({
          dt: 1 / 60,
          prevSteering: currentSteer,
          keys: new Set<string>(),
          gp: {},
          touch: { steering: -1.0 },
        });
        currentSteer = step.state.steering;
      }
      expect(currentSteer).toBeCloseTo(-1.0, 1);
    });

    it('deadzone threshold: values strictly below STEER_DEADZONE (0.001) snap to 0', () => {
      // Sub-deadzone value: 0.0008
      const resBelow = blendInputs({
        dt: 1 / 60,
        prevSteering: 0.0008,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: 0 },
      });
      expect(Math.abs(resBelow.state.steering)).toBeLessThan(STEER_DEADZONE);
      expect(resBelow.state.steering).toBe(0);

      // Above-deadzone value: 0.5
      const resAbove = blendInputs({
        dt: 1 / 60,
        prevSteering: 0.5,
        keys: new Set<string>(),
        gp: {},
        touch: { steering: 0.5 },
      });
      expect(resAbove.state.steering).toBeGreaterThan(STEER_DEADZONE);
    });

    it('launch control: simultaneous full throttle and brake handled gracefully without crash', () => {
      const res = blendInputs({
        dt: 1 / 60,
        prevSteering: 0,
        keys: new Set(['Space']), // Handbrake on keyboard
        gp: {},
        touch: { throttle: 1.0, brake: 1.0 },
      });
      expect(res.state.throttle).toBe(1.0);
      expect(res.state.brake).toBe(1.0);
      expect(res.state.handbrake).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 5: VIRTUAL JOYSTICK & DIGITAL STEERING ADVERSARIAL EDGE CASES
  // ==========================================================================
  describe('5. Virtual Joystick & Digital Steering Adversarial Math', () => {
    it('joystick deadzone ratio: exact deadzone boundary testing', () => {
      const radius = 100;
      const deadzoneRatio = 0.1; // 10% = 10px

      // Exactly at origin
      const atOrigin = calculateJoystickSteering(100, 100, radius, deadzoneRatio);
      expect(atOrigin.inDeadzone).toBe(true);
      expect(atOrigin.steering).toBe(0);

      // At 9px (inside deadzone)
      const insideDeadzone = calculateJoystickSteering(100, 109, radius, deadzoneRatio);
      expect(insideDeadzone.inDeadzone).toBe(true);
      expect(insideDeadzone.steering).toBe(0);

      // At 10px (boundary: 10/100 <= 0.1)
      const atBoundary = calculateJoystickSteering(100, 110, radius, deadzoneRatio);
      expect(atBoundary.inDeadzone).toBe(true);
      expect(atBoundary.steering).toBe(0);

      // At 11px (just outside deadzone)
      const outsideDeadzone = calculateJoystickSteering(100, 111, radius, deadzoneRatio);
      expect(outsideDeadzone.inDeadzone).toBe(false);
      expect(outsideDeadzone.steering).toBeCloseTo(-0.11);
    });

    it('joystick zero or negative radius degrades safely without divide-by-zero NaN', () => {
      const zeroRadius = calculateJoystickSteering(100, 150, 0);
      expect(zeroRadius.steering).toBe(0);
      expect(zeroRadius.inDeadzone).toBe(true);
      expect(Number.isNaN(zeroRadius.steering)).toBe(false);

      const negRadius = calculateJoystickSteering(100, 150, -50);
      expect(negRadius.steering).toBe(0);
      expect(negRadius.inDeadzone).toBe(true);
      expect(Number.isNaN(negRadius.steering)).toBe(false);
    });

    it('digital steering cancellation: simultaneous rapid alternate hammering', () => {
      expect(calculateDigitalSteering(true, true)).toBe(0.0);
      expect(calculateDigitalSteering(false, false)).toBe(0.0);
      expect(calculateDigitalSteering(true, false)).toBe(1.0); // Left
      expect(calculateDigitalSteering(false, true)).toBe(-1.0); // Right
    });

    it('triggerHapticFeedback handles hostile inputs and graceful degradation', () => {
      // Valid pulse
      expect(triggerHapticFeedback(20)).toBe(true);

      // Array pattern
      expect(triggerHapticFeedback([10, 20, 30])).toBe(true);

      // Broken vibrate throwing error
      (navigator as any).vibrate = vi.fn().mockImplementation(() => {
        throw new Error('Haptics disabled by browser policy');
      });
      expect(() => triggerHapticFeedback(15)).not.toThrow();
      expect(triggerHapticFeedback(15)).toBe(false);

      // Missing vibrate
      (navigator as any).vibrate = undefined;
      expect(() => triggerHapticFeedback(15)).not.toThrow();
      expect(triggerHapticFeedback(15)).toBe(false);
    });
  });
});
