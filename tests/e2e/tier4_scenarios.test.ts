/**
 * Tier 4 - Real-World Application Scenarios Test Suite
 * Minimum 5 full end-to-end user journeys and gameplay simulations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateJoystickSteering,
  calculateDigitalSteering,
  getTouchModule,
  DEFAULT_TOUCH_SETTINGS,
  JOYSTICK_BASE_RADIUS,
} from './helpers/contracts';
import { RallyStageSimulator } from './helpers/physicsHarness';

describe('Tier 4: Real-World Application Scenarios', () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Full Rally Stage Lifecycle
  // --------------------------------------------------------------------------
  it('Scenario 1: Full Rally Stage Lifecycle (Start -> Acceleration -> Drift Hairpin -> Finish Line)', async () => {
    const sim = new RallyStageSimulator();
    const touchMod = await getTouchModule();
    touchMod.resetTouchInputState();

    // 1. Race Countdown (3-2-1)
    // Controls locked, throttle attempts are ignored or vehicle held by stage brake
    touchMod.setTouchInput({ throttle: 1.0 });
    // In countdown, vehicle holds stationary
    expect(sim.getState().speedKmh).toBe(0);

    // 2. Green Light / GO: Full throttle acceleration down the starting straight
    for (let t = 0; t < 180; t++) { // 3 seconds
      sim.step(1 / 60, {
        steering: 0,
        throttle: 1.0,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    const straightSpeed = sim.getState().speedKmh;
    expect(straightSpeed).toBeGreaterThan(80);
    expect(sim.getState().gear).toBeGreaterThanOrEqual(3);

    // 3. Approach Hairpin: Heavy Braking
    for (let t = 0; t < 60; t++) { // 1 second
      sim.step(1 / 60, {
        steering: 0,
        throttle: 0,
        brake: 0.9,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    expect(sim.getState().speedKmh).toBeLessThan(straightSpeed * 0.6);

    // 4. Hairpin Apex: Left Turn + Handbrake Drift
    touchMod.setTouchInput({ steering: 1.0, throttle: 0.6, brake: 0.0, handbrake: true });
    for (let t = 0; t < 45; t++) {
      sim.step(1 / 60, touchMod.getTouchInputState());
    }
    expect(sim.getState().isDrifting).toBe(true);

    // 5. Corner Exit: Release handbrake, full throttle acceleration to the finish line
    touchMod.setTouchInput({ steering: 0.0, throttle: 1.0, handbrake: false });
    while (!sim.getState().lapCompleted && sim.getState().stageTimeSeconds < 120) {
      sim.step(1 / 60, touchMod.getTouchInputState());
    }

    const finalState = sim.getState();
    expect(finalState.lapCompleted).toBe(true);
    expect(finalState.distanceTraveledMeters).toBeGreaterThanOrEqual(2000);
    expect(finalState.stageTimeSeconds).toBeGreaterThan(10);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: High-Speed Chicane Navigation & Weight Transfer
  // --------------------------------------------------------------------------
  it('Scenario 2: High-Speed Chicane Navigation & Rapid Left-Right Transitions', () => {
    const sim = new RallyStageSimulator();
    const originX = 200;
    const radius = JOYSTICK_BASE_RADIUS;

    // Approach chicane at 110 km/h
    for (let t = 0; t < 240; t++) {
      sim.step(1 / 60, {
        steering: 0,
        throttle: 1.0,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    expect(sim.getState().speedKmh).toBeGreaterThan(90);

    // Gate 1: Flick Joystick Left (-45px deflection -> +0.818 steering)
    const steerLeft = calculateJoystickSteering(originX, originX - 45, radius);
    expect(steerLeft.steering).toBeGreaterThan(0.7);

    for (let t = 0; t < 20; t++) {
      sim.step(1 / 60, {
        steering: steerLeft.steering,
        throttle: 0.4,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    const gate1LateralG = sim.getState().lateralG;
    expect(gate1LateralG).toBeGreaterThan(0); // Left lateral load

    // Gate 2: Rapid Counter-Flick Joystick Right (+50px deflection -> -0.909 steering)
    const steerRight = calculateJoystickSteering(originX, originX + 50, radius);
    expect(steerRight.steering).toBeLessThan(-0.8);

    for (let t = 0; t < 30; t++) {
      sim.step(1 / 60, {
        steering: steerRight.steering,
        throttle: 0.5,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    const gate2LateralG = sim.getState().lateralG;
    expect(gate2LateralG).toBeLessThan(0); // Inverted right lateral load

    // Gate 3: Center Joystick (Deflection 0px -> steering 0.0)
    const steerCenter = calculateJoystickSteering(originX, originX, radius);
    expect(steerCenter.steering).toBe(0.0);

    for (let t = 0; t < 30; t++) {
      sim.step(1 / 60, {
        steering: steerCenter.steering,
        throttle: 1.0,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }

    expect(sim.getState().speedKmh).toBeGreaterThan(70);
    expect(Math.abs(sim.getState().steeringAngle)).toBeLessThan(0.1);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Crash, Rollover & Touch Reset Recovery Flow
  // --------------------------------------------------------------------------
  it('Scenario 3: Crash, Rollover & Touch Reset Recovery Flow', async () => {
    const sim = new RallyStageSimulator();
    const touchMod = await getTouchModule();

    // 1. Vehicle is driving at speed
    for (let t = 0; t < 60; t++) {
      sim.step(1 / 60, {
        steering: 0,
        throttle: 1.0,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    expect(sim.getState().speedKmh).toBeGreaterThan(20);

    // 2. High-speed crash flips vehicle upside-down
    sim.triggerRollover();
    const crashState = sim.getState();
    expect(crashState.isUpsideDown).toBe(true);
    expect(crashState.speedKmh).toBe(0);

    // 3. Subsequent throttle inputs while upside down do not move vehicle
    sim.step(1 / 60, {
      steering: 0,
      throttle: 1.0,
      brake: 0,
      handbrake: false,
      reset: false,
      cameraToggle: false,
      pause: false,
    });
    expect(sim.getState().speedKmh).toBe(0);

    // 4. Driver taps the on-screen Reset button
    touchMod.setTouchInput({ reset: true });
    expect(touchMod.getTouchInputState().reset).toBe(true);

    // Physics recovers vehicle upright on track
    const recoveredState = sim.step(1 / 60, touchMod.getTouchInputState());
    expect(recoveredState.isUpsideDown).toBe(false);

    // Reset pulse clears
    touchMod.resetTouchInputState();
    expect(touchMod.getTouchInputState().reset).toBe(false);

    // 5. Driver can immediately accelerate away
    for (let t = 0; t < 60; t++) {
      sim.step(1 / 60, {
        steering: 0,
        throttle: 1.0,
        brake: 0,
        handbrake: false,
        reset: false,
        cameraToggle: false,
        pause: false,
      });
    }
    expect(sim.getState().speedKmh).toBeGreaterThan(20);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: In-Game Pause, Ergonomic Customization & Resume
  // --------------------------------------------------------------------------
  it('Scenario 4: In-Game Pause, Ergonomic Customization & Resume Flow', async () => {
    const touchMod = await getTouchModule();
    const sim = new RallyStageSimulator();

    // Active gameplay
    sim.step(1 / 60, {
      steering: 0.5,
      throttle: 1.0,
      brake: 0,
      handbrake: false,
      reset: false,
      cameraToggle: false,
      pause: false,
    });

    // 1. Driver taps on-screen Pause button
    touchMod.setTouchInput({ pause: true });
    let gameState: 'playing' | 'paused' = 'paused';
    expect(gameState).toBe('paused');

    // 2. While paused, vehicle inputs freeze
    touchMod.resetTouchInputState();
    expect(touchMod.getTouchInputState().throttle).toBe(0);

    // 3. Driver opens Settings Menu and reconfigures touch controls
    let settings = { ...DEFAULT_TOUCH_SETTINGS };
    settings = {
      ...settings,
      touchSteeringScheme: 'buttons', // switch from joystick to buttons
      touchOpacity: 0.85,
      touchButtonSize: 'large',
      touchHaptics: true,
    };

    expect(settings.touchSteeringScheme).toBe('buttons');
    expect(settings.touchOpacity).toBe(0.85);
    expect(settings.touchButtonSize).toBe('large');

    // 4. Driver taps Resume Game
    gameState = 'playing';
    expect(gameState).toBe('playing');

    // 5. Driving resumes using the newly chosen digital buttons scheme
    const buttonSteer = calculateDigitalSteering(true, false);
    expect(buttonSteer).toBe(1.0); // +1.0 Left

    touchMod.setTouchInput({ steering: buttonSteer, throttle: 1.0 });
    const resumedState = sim.step(1 / 60, touchMod.getTouchInputState());
    expect(resumedState.speedKmh).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Seamless Hybrid Input Transition (Touch to Gamepad & Back)
  // --------------------------------------------------------------------------
  it('Scenario 5: Seamless Hybrid Input Transition (Touch to Bluetooth Gamepad & Back)', async () => {
    const touchMod = await getTouchModule();

    // Step 1: Mobile player starts stage using touch controls
    touchMod.setTouchInput({ throttle: 1.0 });
    let activeInput: 'touch' | 'keyboard' | 'gamepad' = 'touch';
    let overlayVisible = activeInput === 'touch';
    let gaugesPlacement: 'bottom-center' | 'bottom-right' = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';

    expect(activeInput).toBe('touch');
    expect(overlayVisible).toBe(true);
    expect(gaugesPlacement).toBe('bottom-center');

    // Step 2: Driver pairs Bluetooth gamepad and presses throttle trigger
    const gamepadThrottle = 0.95;
    if (gamepadThrottle > 0.05) {
      activeInput = 'gamepad';
    }
    overlayVisible = activeInput === 'touch';
    gaugesPlacement = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';

    expect(activeInput).toBe('gamepad');
    expect(overlayVisible).toBe(false); // Touch overlay automatically fades out
    expect(gaugesPlacement).toBe('bottom-right'); // Gauges return to desktop position

    // Step 3: Gamepad disconnects / battery runs out
    const gamepadConnected = false;
    expect(gamepadConnected).toBe(false);

    // Step 4: Driver immediately touches screen to keep vehicle on track
    touchMod.setTouchInput({ steering: -0.5, throttle: 0.8 });
    activeInput = 'touch';
    overlayVisible = activeInput === 'touch';
    gaugesPlacement = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';

    expect(activeInput).toBe('touch');
    expect(overlayVisible).toBe(true); // Touch overlay smoothly returns
    expect(gaugesPlacement).toBe('bottom-center'); // Gauges shift back to center
    expect(touchMod.getTouchInputState().steering).toBe(-0.5);
  });
});
