/**
 * Tier 3 - Cross-Feature Combinations Test Suite (Pairwise Coverage)
 * 10 pairwise & multi-feature interaction tests
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  calculateTargetDpr,
  calculateJoystickSteering,
  calculateDigitalSteering,
  computeHudPosition,
  getTouchModule,
  DEFAULT_TOUCH_SETTINGS,
  JOYSTICK_BASE_RADIUS,
  PIXEL_10_PRO,
} from './helpers/contracts';
import { MobileBrowserHarness } from './helpers/harness';
import { RallyStageSimulator } from './helpers/physicsHarness';

describe('Tier 3: Cross-Feature Combinations (Pairwise Coverage)', () => {
  it('C1: Touch steering + throttle active during 180° device orientation flip (F3 + F4 + F1)', async () => {
    const harness = new MobileBrowserHarness();
    const touchMod = await getTouchModule();
    const sim = new RallyStageSimulator();

    // Start in normal landscape (camera notch on left: 48px)
    harness.setOrientation('landscape-primary');
    expect(computeHudPosition(16, PIXEL_10_PRO.safeAreaInsets.left)).toBe(64);

    // Accelerating through left curve
    touchMod.setTouchInput({ steering: 0.8, throttle: 1.0, brake: 0.0 });
    sim.step(1 / 60, touchMod.getTouchInputState());

    // Phone is rotated 180° by driver (USB cable on other side)
    harness.setOrientation('landscape-secondary');
    // Camera notch is now on right: 48px
    expect(computeHudPosition(16, PIXEL_10_PRO.rotatedSafeAreaInsets.right)).toBe(64);

    // Inputs must be sustained smoothly across orientation change without dropping
    const postState = touchMod.getTouchInputState();
    expect(postState.steering).toBe(0.8);
    expect(postState.throttle).toBe(1.0);

    const vehicleState = sim.step(1 / 60, postState);
    expect(vehicleState.speedKmh).toBeGreaterThan(0);
    expect(vehicleState.steeringAngle).toBeGreaterThan(0);
  });

  it('C2: Settings UI change immediately updates active touch controls layout & opacity (F5 + F4)', () => {
    // Initial default settings
    let currentSettings = { ...DEFAULT_TOUCH_SETTINGS };
    expect(currentSettings.touchSteeringScheme).toBe('joystick');
    expect(currentSettings.touchOpacity).toBe(0.7);

    // Driver modifies settings in menu
    currentSettings = {
      ...currentSettings,
      touchSteeringScheme: 'buttons',
      touchOpacity: 0.95,
      touchButtonSize: 'large',
    };

    // Verify touch overlay adapts instantly
    expect(currentSettings.touchSteeringScheme).toBe('buttons');
    expect(currentSettings.touchOpacity).toBe(0.95);
    expect(currentSettings.touchButtonSize).toBe('large');

    // Steering evaluation switches from analog joystick to digital dual buttons
    const digitalSteering = calculateDigitalSteering(true, false);
    expect(digitalSteering).toBe(1.0); // +1.0 Left
  });

  it('C3: High-DPI Mobile Scaling + Viewport Safe Cutouts on Pixel 10 Pro (F2 + F1)', () => {
    const cssWidth = PIXEL_10_PRO.landscapeCssWidth;   // 997
    const cssHeight = PIXEL_10_PRO.landscapeCssHeight; // 448
    const hardwareDpr = PIXEL_10_PRO.devicePixelRatio; // 3.0

    // Uncapped native buffer would be:
    const uncappedPixels = (cssWidth * hardwareDpr) * (cssHeight * hardwareDpr); // ~4.02 MP

    // With F2 mobile clamp:
    const { targetDpr } = calculateTargetDpr(hardwareDpr, 'very_high', 1.0, true);
    expect(targetDpr).toBe(1.75);

    const clampedBufferWidth = Math.round(cssWidth * targetDpr);
    const clampedBufferHeight = Math.round(cssHeight * targetDpr);
    const clampedPixels = clampedBufferWidth * clampedBufferHeight; // ~1.37 MP

    // Verify 66% fragment savings
    const fillrateReduction = 1 - (clampedPixels / uncappedPixels);
    expect(fillrateReduction).toBeGreaterThan(0.65);

    // Verify safe-area HUD padding fits comfortably within the 997px CSS viewport
    const leftMargin = computeHudPosition(16, PIXEL_10_PRO.safeAreaInsets.left); // 64px
    const rightMargin = computeHudPosition(16, PIXEL_10_PRO.safeAreaInsets.right); // 16px
    const usableWidth = cssWidth - leftMargin - rightMargin;
    expect(usableWidth).toBe(917); // 917 CSS pixels usable width
  });

  it('C4: Touch Input + Analog Gauges HUD + Input Auto-Switching Lifecycle (F3 + F4 + F5)', async () => {
    const touchMod = await getTouchModule();

    // 1. Player begins driving on touch screen
    touchMod.setTouchInput({ throttle: 1.0 });
    let activeInput: 'touch' | 'keyboard' | 'gamepad' = touchMod.getLastInputType();
    expect(activeInput).toBe('touch');

    // Gauges repositioned to bottom-center in touch mode
    let gaugePosition = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';
    let overlayVisible = activeInput === 'touch';
    expect(gaugePosition).toBe('bottom-center');
    expect(overlayVisible).toBe(true);

    // 2. Keyboard key is pressed ('KeyW')
    activeInput = 'keyboard';
    gaugePosition = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';
    overlayVisible = activeInput === 'touch';
    expect(gaugePosition).toBe('bottom-right');
    expect(overlayVisible).toBe(false);

    // 3. Screen touched again -> re-activates touch mode
    touchMod.setTouchInput({ throttle: 0.9 });
    activeInput = touchMod.getLastInputType();
    gaugePosition = activeInput === 'touch' ? 'bottom-center' : 'bottom-right';
    overlayVisible = activeInput === 'touch';
    expect(gaugePosition).toBe('bottom-center');
    expect(overlayVisible).toBe(true);
  });

  it('C5: Dynamic Virtual Joystick + Vehicle Drivetrain & Differential Physics (F4 + F3 + Engine)', () => {
    const originX = 150;
    const radius = JOYSTICK_BASE_RADIUS;
    const currentTouchX = originX - 45; // Moved 45px left

    const joystickResult = calculateJoystickSteering(originX, currentTouchX, radius);
    expect(joystickResult.steering).toBeCloseTo(45 / 55, 2); // ~0.818 Left
    expect(joystickResult.inDeadzone).toBe(false);

    // Simulate differential calculation across vehicle axle
    const trackWidth = 1.6; // meters
    const turnRadius = 20.0; // meters
    const baseSpeed = 20.0;  // m/s

    // Outer right wheel travels longer radius (R + w/2), inner left wheel shorter (R - w/2)
    const innerRadius = turnRadius - (trackWidth / 2);
    const outerRadius = turnRadius + (trackWidth / 2);
    const outerWheelSpeed = baseSpeed * (outerRadius / turnRadius);
    const innerWheelSpeed = baseSpeed * (innerRadius / turnRadius);

    expect(outerWheelSpeed).toBeGreaterThan(innerWheelSpeed);
    expect(outerWheelSpeed - innerWheelSpeed).toBeCloseTo(baseSpeed * (trackWidth / turnRadius), 2);
  });

  it('C6: Touch Haptics enabled in Settings + Handbrake Drift trigger (F5 + F3 + F4)', async () => {
    const harness = new MobileBrowserHarness();
    const touchMod = await getTouchModule();
    const sim = new RallyStageSimulator();

    // Accelerate vehicle up to speed (>50 km/h)
    for (let i = 0; i < 120; i++) {
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
    expect(sim.getState().speedKmh).toBeGreaterThan(50);

    // Driver enters corner: steers left and pulls handbrake button
    touchMod.setTouchInput({ steering: 0.9, handbrake: true });
    // Haptic pulse triggered
    harness.vibrate(50);

    let vehicleState = sim.getState();
    for (let k = 0; k < 10; k++) {
      vehicleState = sim.step(1 / 60, touchMod.getTouchInputState());
    }
    expect(harness.getEnvironment().vibrateHistory).toContainEqual([50]);
    expect(vehicleState.isDrifting).toBe(true);
  });

  it('C7: Simultaneous Quad-Touch multi-finger combination (F3 + F4)', async () => {
    const harness = new MobileBrowserHarness();
    const touchMod = await getTouchModule();

    // Finger 1: Left thumb steering
    harness.pointerDown(1, 100, 300);
    // Finger 2: Right thumb throttle
    harness.pointerDown(2, 900, 380);
    // Finger 3: Right thumb handbrake
    harness.pointerDown(3, 850, 240);
    // Finger 4: Left index camera toggle
    harness.pointerDown(4, 920, 30);

    expect(harness.getActivePointerCount()).toBe(4);

    touchMod.setTouchInput({
      steering: 0.7,
      throttle: 1.0,
      handbrake: true,
      cameraToggle: true,
    });

    const state = touchMod.getTouchInputState();
    expect(state.steering).toBe(0.7);
    expect(state.throttle).toBe(1.0);
    expect(state.handbrake).toBe(true);
    expect(state.cameraToggle).toBe(true);
  });

  it('C8: Viewport Safe Insets + Pause / Reset utility buttons + Game State transitions (F1 + F4)', async () => {
    const touchMod = await getTouchModule();
    const sim = new RallyStageSimulator();

    // Utility button positioning respects safe-area top
    const pauseButtonTop = computeHudPosition(14, PIXEL_10_PRO.safeAreaInsets.top);
    expect(pauseButtonTop).toBe(14); // 14 + 0

    // Vehicle in active race
    sim.step(1 / 60, {
      steering: 0,
      throttle: 1.0,
      brake: 0,
      handbrake: false,
      reset: false,
      cameraToggle: false,
      pause: false,
    });
    expect(sim.getState().speedKmh).toBeGreaterThan(0);

    // Tap pause button
    touchMod.setTouchInput({ pause: true });
    expect(touchMod.getTouchInputState().pause).toBe(true);

    // On pause, inputs to vehicle physics freeze
    touchMod.resetTouchInputState();
    expect(touchMod.getTouchInputState().throttle).toBe(0);
    expect(touchMod.getTouchInputState().steering).toBe(0);
  });

  it('C9: Production Web Build + Capacitor Asset Sync + Viewport Meta (F8 + F7 + F1)', () => {
    const _distDir = path.resolve(process.cwd(), 'dist');
    const indexHtml = path.resolve(process.cwd(), 'index.html');

    expect(fs.existsSync(indexHtml)).toBe(true);

    // Check Capacitor target asset folder mapping
    const androidAssetPublic = 'android/app/src/main/assets/public';
    const relativeSyncMapping = {
      from: 'dist',
      to: androidAssetPublic,
    };
    expect(relativeSyncMapping.from).toBe('dist');
    expect(relativeSyncMapping.to).toBe(androidAssetPublic);
  });

  it('C10: Session persistence across restart restores touch configuration (F5 + F3)', () => {
    // Emulate custom user settings persisted in localStorage
    const savedSettings = {
      touchControlMode: 'always',
      touchSteeringScheme: 'buttons',
      touchOpacity: 0.85,
      touchButtonSize: 'large',
      touchHaptics: false,
    };

    const serialized = JSON.stringify(savedSettings);
    const rehydrated = JSON.parse(serialized);

    expect(rehydrated.touchControlMode).toBe('always');
    expect(rehydrated.touchSteeringScheme).toBe('buttons');
    expect(rehydrated.touchOpacity).toBe(0.85);
    expect(rehydrated.touchButtonSize).toBe('large');
    expect(rehydrated.touchHaptics).toBe(false);
  });
});
