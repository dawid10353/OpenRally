import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useSettingsStore,
  getDefaultSettings,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  SETTINGS_STORAGE_KEY,
} from '../src/store/settingsStore';
import { BALANCED_MOBILE_SETTINGS, DEFAULT_SETTINGS } from '../src/types/settings';
import {
  isAndroid,
  calculateDprConfig,
  calculateTargetDpr,
  MOBILE_MAX_DPR,
  DESKTOP_MAX_DPR,
} from '../src/utils/device';
import { shouldAdvanceFrame, startFramePacingLoop } from '../src/components/canvas/GameCanvas';

describe('Adversarial Challenge M6 (Challenger 2): Edge Cases, Pacing & Purity', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  const originalNow = performance.now;
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  let storageStore: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storageStore[key] ?? null,
    setItem: (key: string, val: string) => {
      storageStore[key] = String(val);
    },
    removeItem: (key: string) => {
      delete storageStore[key];
    },
    clear: () => {
      storageStore = {};
    },
  };

  let rafQueue: Array<{ id: number; callback: (now: number) => void }> = [];
  let nextRafId = 1;

  beforeEach(() => {
    storageStore = {};
    rafQueue = [];
    nextRafId = 1;
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: (now: number) => void) => {
        const id = nextRafId++;
        rafQueue.push({ id, callback });
        return id;
      })
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        rafQueue = rafQueue.filter((item) => item.id !== id);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
    performance.now = originalNow;
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

  // =========================================================================
  // SUITE 1: Malformed and Corrupted localStorage Data
  // =========================================================================
  describe('Suite 1: Malformed and Corrupted localStorage Payloads', () => {
    it('gracefully handles syntactically invalid JSON strings without crashing', () => {
      const corruptions = [
        '{ invalid json',
        '[1, 2,',
        'undefined',
        '<<xml-node></xml-node>>',
        '{"graphicsQuality": }',
        '\0\0\0\0',
        'NaN',
        '{"nested": {"too": {"deep":',
      ];

      for (const corrupt of corruptions) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, corrupt);
        expect(() => loadSettingsFromStorage(true)).not.toThrow();
        expect(loadSettingsFromStorage(true)).toEqual({});
        expect(() => loadSettingsFromStorage(false)).not.toThrow();
        expect(loadSettingsFromStorage(false)).toEqual({});
      }
    });

    it('gracefully handles JSON valid primitive non-object types (null, booleans, numbers, strings)', () => {
      const primitives = ['null', 'true', 'false', '12345', '3.14159', '"just_a_string"'];

      for (const prim of primitives) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, prim);
        expect(() => loadSettingsFromStorage(true)).not.toThrow();
        expect(loadSettingsFromStorage(true)).toEqual({});
        expect(() => loadSettingsFromStorage(false)).not.toThrow();
        expect(loadSettingsFromStorage(false)).toEqual({});
      }
    });

    it('EMPIRICAL FINDING: Array payload in localStorage bypasses typeof parsed !== object check', () => {
      // In JS, typeof [] === 'object' and [] !== null are both true.
      // Array.isArray(parsed) is NOT checked in loadSettingsFromStorage.
      const arrayPayloads = ['[]', '[1, 2, 3]', '["graphicsQuality", "very_high"]'];

      for (const arr of arrayPayloads) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, arr);

        // On desktop, validated is empty object {}
        expect(loadSettingsFromStorage(false)).toEqual({});

        // On Android, because !validated.graphicsQuality is true, it triggers migration to Balanced:
        const androidLoaded = loadSettingsFromStorage(true);
        expect(androidLoaded.graphicsQuality).toBe('medium');
        expect(androidLoaded.antiAliasing).toBe('off');
        expect(androidLoaded.resolutionScale).toBe(1.0);
        expect(androidLoaded.graphicsConfiguredByUser).toBe(false);
      }
    });

    it('rejects invalid enum values and out-of-bounds types in settings payload', () => {
      const malformedPayload = {
        graphicsQuality: 'ultra_extreme_4k', // invalid enum
        antiAliasing: 'fxaa_super',          // invalid enum
        resolutionScale: NaN,                // invalid number
        shadowsEnabled: 'true',              // string instead of boolean
        postProcessingEnabled: 1,            // number instead of boolean
        sensitivity: Infinity,               // invalid finite number
        touchOpacity: 99.0,                  // out of [0.2, 1.0] bounds
        touchButtonSize: 'massive',          // invalid enum
        touchControlMode: 'hidden',          // invalid enum
        touchSteeringScheme: 'accelerometer',// invalid enum
        graphicsConfiguredByUser: 'yes',     // string instead of boolean
      };

      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(malformedPayload));
      const loaded = loadSettingsFromStorage(false);

      expect(loaded.graphicsQuality).toBeUndefined();
      expect(loaded.antiAliasing).toBeUndefined();
      expect(loaded.resolutionScale).toBeUndefined();
      expect(loaded.shadowsEnabled).toBeUndefined();
      expect(loaded.postProcessingEnabled).toBeUndefined();
      expect(loaded.sensitivity).toBeUndefined();
      expect(loaded.touchButtonSize).toBeUndefined();
      expect(loaded.touchControlMode).toBeUndefined();
      expect(loaded.touchSteeringScheme).toBeUndefined();
      expect(loaded.graphicsConfiguredByUser).toBeUndefined();
      // touchOpacity gets clamped if finite number:
      expect(loaded.touchOpacity).toBe(1.0); // clamped from 99.0 to 1.0
    });

    it('clamps touchOpacity boundary extremes (negative, zero, extreme high)', () => {
      const testCases = [
        { input: -10.0, expected: 0.2 },
        { input: 0.0, expected: 0.2 },
        { input: 0.19, expected: 0.2 },
        { input: 0.2, expected: 0.2 },
        { input: 0.75, expected: 0.75 },
        { input: 1.0, expected: 1.0 },
        { input: 1.01, expected: 1.0 },
        { input: 100.0, expected: 1.0 },
      ];

      for (const tc of testCases) {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ touchOpacity: tc.input })
        );
        const loaded = loadSettingsFromStorage(false);
        expect(loaded.touchOpacity).toBe(tc.expected);
      }
    });

    it('EMPIRICAL FINDING: saveSettingsToStorage fails to overwrite corrupted JSON due to monolithic try-catch', () => {
      // When storage holds syntactically invalid JSON:
      localStorage.setItem(SETTINGS_STORAGE_KEY, 'corrupted-payload{');

      // Attempting to save new valid settings
      saveSettingsToStorage({ graphicsQuality: 'medium' });

      // Because JSON.parse(raw) throws inside the main try block before setItem,
      // the existing corrupted string is NEVER overwritten!
      const currentStored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(currentStored).toBe('corrupted-payload{');
    });
  });

  // =========================================================================
  // SUITE 2: Rapid Successive Settings Mutations & State Consistency
  // =========================================================================
  describe('Suite 2: Rapid Store Mutations & Synchronization Invariants', () => {
    it('accurately preserves state and persists across 500 rapid successive mutations', () => {
      useSettingsStore.setState({ ...DEFAULT_SETTINGS, graphicsConfiguredByUser: false });

      const qualities: Array<'low' | 'medium' | 'high' | 'very_high'> = ['low', 'medium', 'high', 'very_high'];
      const aaModes: Array<'off' | 'smaa' | 'msaa'> = ['off', 'smaa', 'msaa'];
      const schemes: Array<'joystick' | 'buttons'> = ['joystick', 'buttons'];
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

      for (let i = 0; i < 500; i++) {
        const q = qualities[i % qualities.length];
        const aa = aaModes[i % aaModes.length];
        const scheme = schemes[i % schemes.length];
        const size = sizes[i % sizes.length];
        const scale = 0.5 + (i % 15) * 0.1;
        const opacity = 0.2 + ((i % 8) * 0.1);

        const store = useSettingsStore.getState();
        store.setGraphicsQuality(q);
        store.setAntiAliasing(aa);
        store.setResolutionScale(scale);
        store.setTouchSteeringScheme(scheme);
        store.setTouchButtonSize(size);
        store.setTouchOpacity(opacity);
      }

      const finalState = useSettingsStore.getState();
      expect(finalState.graphicsConfiguredByUser).toBe(true);

      // Verify that localStorage contains matching serialized state for all keys
      const storedRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(storedRaw).toBeTruthy();
      const parsed = JSON.parse(storedRaw!);

      expect(parsed.graphicsQuality).toBe(finalState.graphicsQuality);
      expect(parsed.antiAliasing).toBe(finalState.antiAliasing);
      expect(parsed.resolutionScale).toBe(finalState.resolutionScale);
      expect(parsed.touchSteeringScheme).toBe(finalState.touchSteeringScheme);
      expect(parsed.touchButtonSize).toBe(finalState.touchButtonSize);
      expect(parsed.touchOpacity).toBe(finalState.touchOpacity);
      expect(parsed.graphicsConfiguredByUser).toBe(true);
    });

    it('setting graphics settings sets graphicsConfiguredByUser to true, non-graphics do not reset it', () => {
      useSettingsStore.setState({ graphicsConfiguredByUser: false });

      // Non-graphics mutations should keep it false
      useSettingsStore.getState().setSfxVolume(0.3);
      useSettingsStore.getState().setMenuMusicVolume(0.4);
      useSettingsStore.getState().setSensitivity(1.2);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(false);

      // Graphics mutation sets it to true
      useSettingsStore.getState().setResolutionScale(0.85);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);

      // Subsequent non-graphics mutation must NOT overwrite it back to false
      useSettingsStore.getState().setGameMusicVolume(0.9);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 3: Frame Pacing Jitter, Cadence & Convergence Under Stress
  // =========================================================================
  describe('Suite 3: Jittered rAF Stress Simulation & Convergence', () => {
    it('converges to exactly 60 FPS under symmetric 120Hz alternating jitter [7.0ms, 9.67ms]', () => {
      // Mean tick interval = (7.0 + 9.667) / 2 = 8.333ms (exactly 120Hz)
      const totalDurationMs = 5000;
      let currentTime = 0;
      let lastRenderedTime = 0;
      let renderedCount = 0;
      let tick = 0;

      while (currentTime < totalDurationMs) {
        const dt = (tick % 2 === 0) ? 7.0 : 9.667;
        currentTime += dt;
        tick++;
        if (shouldAdvanceFrame(currentTime, lastRenderedTime, 60, 1.5)) {
          renderedCount++;
          lastRenderedTime = currentTime;
        }
      }

      const effectiveFps = renderedCount / (currentTime / 1000);
      expect(effectiveFps).toBeCloseTo(60.0, 0);
      expect(renderedCount).toBe(300); // 300 frames in 5.0 seconds
    });

    it('EMPIRICAL FINDING: Stochastic vsync jitter causes frame drops due to lastTime = now drift', () => {
      // Linear congruential generator for deterministic pseudo-random jitter
      let seed = 12345;
      function pseudoRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      let currentTime = 0;
      let lastRenderedTime = 0;
      let renderedCount = 0;
      const nominal120Hz = 1000 / 120; // 8.333ms

      // Simulate 10 seconds of 120Hz display with realistic +/- 1.5ms vsync jitter
      for (let i = 0; i < 1200; i++) {
        const jitter = (pseudoRandom() - 0.5) * 3.0; // [-1.5ms, +1.5ms]
        const dt = nominal120Hz + jitter;
        currentTime += dt;
        if (shouldAdvanceFrame(currentTime, lastRenderedTime, 60, 1.5)) {
          renderedCount++;
          lastRenderedTime = currentTime;
        }
      }

      const totalSeconds = currentTime / 1000;
      const achievedFps = renderedCount / totalSeconds;

      // Because shouldAdvanceFrame drops pairs of ticks that dip below 15.17ms (e.g. 7.0ms + 8.0ms = 15.0ms)
      // and lastRenderedTime resets to now (losing phase), the achieved FPS drops below 60.0.
      expect(achievedFps).toBeLessThan(60.0);
      expect(achievedFps).toBeGreaterThan(54.0);
    });

    it('stress-tests irregular tick cadence [7ms, 9ms, 8.3ms, 16.6ms, 33ms]', () => {
      const pattern = [7.0, 9.0, 8.333, 16.667, 33.333];
      let currentTime = 0;
      let lastRenderedTime = 0;
      let renderedCount = 0;
      const frameIntervals: number[] = [];

      for (let cycle = 0; cycle < 100; cycle++) {
        for (const dt of pattern) {
          currentTime += dt;
          if (shouldAdvanceFrame(currentTime, lastRenderedTime, 60, 1.5)) {
            renderedCount++;
            if (lastRenderedTime > 0) {
              frameIntervals.push(currentTime - lastRenderedTime);
            }
            lastRenderedTime = currentTime;
          }
        }
      }

      // 100 cycles * 3 rendered frames per cycle = 300 rendered frames
      expect(renderedCount).toBe(300);
      // Verify all rendered intervals are at least the pacing threshold (>= 15.17ms)
      for (const interval of frameIntervals) {
        expect(interval).toBeGreaterThanOrEqual(15.16);
      }
    });

    it('EMPIRICAL FINDING: 60Hz native mobile displays drop frames if vsync arrives < 15.17ms', () => {
      let currentTime = 0;
      let lastRenderedTime = 0;
      let renderedCount = 0;

      // If a native 60Hz display has a tick that arrives 1.6ms early (15.067ms elapsed):
      for (let i = 0; i < 60; i++) {
        // Alternate between slightly fast (15.0ms) and slightly slow (18.33ms) ticks
        const dt = (i % 2 === 0) ? 15.0 : 18.334;
        currentTime += dt;
        if (shouldAdvanceFrame(currentTime, lastRenderedTime, 60, 1.5)) {
          renderedCount++;
          lastRenderedTime = currentTime;
        }
      }

      // Fast ticks (< 15.17ms) are dropped, halving frame rate on those cycles
      expect(renderedCount).toBeLessThan(60);
      expect(renderedCount).toBe(30); // Exactly 30 frames rendered instead of 60!
    });
  });

  // =========================================================================
  // SUITE 4: Rapier Timestep Alignment & Clock Delta Analysis
  // =========================================================================
  describe('Suite 4: Rapier Timestep Alignment & Clock Delta Analysis', () => {
    it('EMPIRICAL FINDING: Initial frame advance passes performance.now()/1000 delta to R3F update', () => {
      const advanceSpy = vi.fn();
      let capturedDelta = -1;

      // Simulate R3F update behavior in frameloop='never'
      const mockState = {
        frameloop: 'never' as const,
        clock: { elapsedTime: 0, oldTime: 0 },
      };

      const customAdvance = (timestamp: number) => {
        advanceSpy(timestamp);
        // R3F core update delta calculation:
        capturedDelta = timestamp - mockState.clock.elapsedTime;
        mockState.clock.oldTime = mockState.clock.elapsedTime;
        mockState.clock.elapsedTime = timestamp;
      };

      // Page load took 2,800ms before GameCanvas mounted
      vi.spyOn(performance, 'now').mockReturnValue(2800.0);

      const stop = startFramePacingLoop({
        advance: customAdvance,
        clock: mockState.clock,
        targetFps: 60,
        enabled: true,
      });

      // Frame 1 is advanced immediately
      expect(advanceSpy).toHaveBeenCalledWith(2.8);
      // Because clock.elapsedTime was 0, delta on frame 1 is 2.8 seconds!
      expect(capturedDelta).toBe(2.8);

      stop();
    });

    it('verifies 1:1 timestep alignment with Rapier physics timeStep (1/60) under nominal pacing', () => {
      // Simulate Rapier's accumulator stepper logic from @react-three/rapier
      const rapierTimestep = 1 / 60; // 0.0166667s
      let rapierAccumulator = 0;
      let physicsSteps = 0;

      function simulateRapierFrame(dt: number) {
        const clampedDelta = Math.min(Math.max(dt, 0), 0.5);
        rapierAccumulator += clampedDelta;
        let stepsThisFrame = 0;
        while (rapierAccumulator >= rapierTimestep) {
          stepsThisFrame++;
          physicsSteps++;
          rapierAccumulator -= rapierTimestep;
        }
        return stepsThisFrame;
      }

      // When visual frames render at 60 FPS (dt = 16.667ms = 1/60s):
      for (let f = 0; f < 60; f++) {
        const steps = simulateRapierFrame(1 / 60);
        expect(steps).toBe(1); // Exactly 1 physics step per visual frame
      }

      expect(physicsSteps).toBe(60);
      expect(rapierAccumulator).toBeCloseTo(0, 5);
    });

    it('verifies Rapier accumulator recovers without drift when jitter produces alternating dt', () => {
      const rapierTimestep = 1 / 60;
      let rapierAccumulator = 0;
      let physicsSteps = 0;

      function simulateRapierFrame(dt: number) {
        const clampedDelta = Math.min(Math.max(dt, 0), 0.5);
        rapierAccumulator += clampedDelta;
        while (rapierAccumulator >= rapierTimestep) {
          physicsSteps++;
          rapierAccumulator -= rapierTimestep;
        }
      }

      // Over 1 second with alternating 2-tick (16.67ms) and 3-tick (25.0ms) presentations:
      const presentationDts = [0.01667, 0.02500, 0.01667, 0.02500];
      for (let i = 0; i < 20; i++) {
        for (const dt of presentationDts) {
          simulateRapierFrame(dt);
        }
      }

      // Total simulated time: 20 * (0.01667*2 + 0.025*2) = 20 * 0.08334 = 1.6668s
      // Expected physics steps: ~1.6668 * 60 = 100 steps
      expect(physicsSteps).toBe(100);
    });
  });

  // =========================================================================
  // SUITE 5: Android vs Desktop Migration & Platform Contract Matrix
  // =========================================================================
  describe('Suite 5: Platform Migration Matrix & Contract Boundaries', () => {
    it('validates entire migration matrix across Android vs Desktop and user configuration states', () => {
      const testMatrix = [
        // [isAndroid, legacyQuality, configuredByUser, expectedQuality, expectedAA, expectedConfigured]
        { isAndroid: true, legacy: 'very_high', userSet: false, expQ: 'medium', expAA: 'off', expUser: false },
        { isAndroid: true, legacy: 'very_high', userSet: undefined, expQ: 'medium', expAA: 'off', expUser: false },
        { isAndroid: true, legacy: 'very_high', userSet: true, expQ: 'very_high', expAA: 'smaa', expUser: true },
        { isAndroid: true, legacy: 'high', userSet: true, expQ: 'high', expAA: 'smaa', expUser: true },
        { isAndroid: true, legacy: 'low', userSet: true, expQ: 'low', expAA: 'off', expUser: true },
        { isAndroid: false, legacy: 'very_high', userSet: false, expQ: 'very_high', expAA: 'smaa', expUser: false },
        { isAndroid: false, legacy: 'very_high', userSet: undefined, expQ: 'very_high', expAA: 'smaa', expUser: undefined },
        { isAndroid: false, legacy: 'medium', userSet: true, expQ: 'medium', expAA: 'off', expUser: true },
      ];

      for (const item of testMatrix) {
        localStorage.clear();
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({
            graphicsQuality: item.legacy,
            antiAliasing: item.expAA,
            graphicsConfiguredByUser: item.userSet,
          })
        );

        const loaded = loadSettingsFromStorage(item.isAndroid);
        expect(loaded.graphicsQuality).toBe(item.expQ);
        expect(loaded.antiAliasing).toBe(item.expAA);
        expect(loaded.graphicsConfiguredByUser).toBe(item.expUser);
      }
    });

    it('evaluates Capacitor platform casing and environment detection boundaries', () => {
      // 1. Lowercase android
      Object.defineProperty(globalThis, 'window', {
        value: { Capacitor: { getPlatform: () => 'android' } },
        configurable: true,
        writable: true,
      });
      expect(isAndroid()).toBe(true);

      // 2. Uppercase / mismatched casing (isAndroid uses exact 'android')
      Object.defineProperty(globalThis, 'window', {
        value: { Capacitor: { getPlatform: () => 'Android' } },
        configurable: true,
        writable: true,
      });
      // Falls through to navigator check
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'SomeBrowser' },
        configurable: true,
        writable: true,
      });
      expect(isAndroid()).toBe(false);

      // 3. UserAgent regex handles case-insensitive /Android/i
      Object.defineProperty(globalThis, 'window', {
        value: {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; u; ANDROID 15; en-US)' },
        configurable: true,
        writable: true,
      });
      expect(isAndroid()).toBe(true);
    });

    it('verifies Balanced mobile settings match required specification constants', () => {
      expect(BALANCED_MOBILE_SETTINGS.graphicsQuality).toBe('medium');
      expect(BALANCED_MOBILE_SETTINGS.antiAliasing).toBe('off');
      expect(BALANCED_MOBILE_SETTINGS.resolutionScale).toBe(1.0);
      expect(BALANCED_MOBILE_SETTINGS.shadowsEnabled).toBe(false);
      expect(BALANCED_MOBILE_SETTINGS.postProcessingEnabled).toBe(false);

      const androidDefaults = getDefaultSettings(true);
      expect(androidDefaults.graphicsQuality).toBe('medium');
      expect(androidDefaults.antiAliasing).toBe('off');
      expect(androidDefaults.resolutionScale).toBe(1.0);
      expect(androidDefaults.graphicsConfiguredByUser).toBe(false);

      const desktopDefaults = getDefaultSettings(false);
      expect(desktopDefaults.graphicsQuality).toBe('very_high');
      expect(desktopDefaults.antiAliasing).toBe('smaa');
      expect(desktopDefaults.graphicsConfiguredByUser).toBe(false);
    });

    it('verifies calculateDprConfig and calculateTargetDpr bounds and DPR ceilings', () => {
      // Google Pixel 10 Pro DPR is ~3.0 - 3.5
      const mobileHighDpr = calculateDprConfig({
        windowDpr: 3.5,
        graphicsQuality: 'very_high',
        resolutionScale: 2.0,
        isMobile: true,
      });
      expect(mobileHighDpr.targetDpr).toBeLessThanOrEqual(MOBILE_MAX_DPR);
      expect(mobileHighDpr.targetDpr).toBe(1.75);

      const desktopHighDpr = calculateDprConfig({
        windowDpr: 3.5,
        graphicsQuality: 'very_high',
        resolutionScale: 1.0,
        isMobile: false,
      });
      expect(desktopHighDpr.targetDpr).toBe(DESKTOP_MAX_DPR);
      expect(desktopHighDpr.targetDpr).toBe(2.0);

      const helperRes = calculateTargetDpr(3.0, 'medium', 1.0, true);
      expect(helperRes.targetDpr).toBe(1.0);
      expect(helperRes.dprRange).toEqual([0.5, 1.0]);
    });
  });
});
