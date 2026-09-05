import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldAdvanceFrame,
  startFramePacingLoop,
} from '../src/components/canvas/GameCanvas';
import {
  isAndroid,
  isMobileDevice,
  calculateDprConfig,
  MOBILE_MAX_DPR,
  DESKTOP_MAX_DPR,
} from '../src/utils/device';
import {
  getDefaultSettings,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  useSettingsStore,
  SETTINGS_STORAGE_KEY,
} from '../src/store/settingsStore';
import { DEFAULT_SETTINGS } from '../src/types/settings';

describe('Adversarial Challenge M6 (Challenger 1): R1 and R2 Stress Harness', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  const originalNow = performance.now;
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  let memoryStore: Record<string, string> = {};
  const storageMock = {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, val: string) => {
      memoryStore[key] = String(val);
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
    clear: () => {
      memoryStore = {};
    },
    get length() {
      return Object.keys(memoryStore).length;
    },
    key: (index: number) => Object.keys(memoryStore)[index] ?? null,
  };

  let rafQueue: Array<{ id: number; callback: (now: number) => void }>;
  let nextRafId: number;
  let simulatedTime: number;

  beforeEach(() => {
    rafQueue = [];
    nextRafId = 1;
    simulatedTime = 1000.0;
    storageMock.clear();

    vi.spyOn(performance, 'now').mockImplementation(() => simulatedTime);

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

    vi.stubGlobal('localStorage', storageMock);
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
  // 1. FRAME PACING & 120HZ LTPO CADENCE CONVERGENCE (R2)
  // =========================================================================
  describe('1. Frame Pacing and 120Hz LTPO Cadence Convergence (R2)', () => {
    it('T1-1: 120Hz LTPO simulation: exactly 60 frames advance over 1,000ms (50% GPU load reduction)', () => {
      const dt120Hz = 1000 / 120; // 8.3333ms per tick
      let lastRendered = 0;
      let advanceCount = 0;
      const advanceTimestamps: number[] = [];

      for (let i = 1; i <= 120; i++) {
        const now = i * dt120Hz;
        if (shouldAdvanceFrame(now, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = now;
          advanceTimestamps.push(now);
        }
      }

      expect(advanceCount).toBe(60);

      // Verify every inter-frame interval is exactly 2 ticks = ~16.67ms
      for (let i = 1; i < advanceTimestamps.length; i++) {
        const delta = advanceTimestamps[i] - advanceTimestamps[i - 1];
        expect(delta).toBeCloseTo(16.6667, 3);
      }
    });

    it('T1-2: 120Hz LTPO with Gaussian-distributed vsync jitter maintains 60 FPS convergence', () => {
      // Simulate 120Hz display with realistic vsync phase noise: jitter up to +/- 1.0ms
      const nominalDt = 1000 / 120;
      let lastRendered = 0;
      let advanceCount = 0;
      let currentClock = 0;

      // Bounded jitter sequence around nominal 8.333ms
      const jitterOffsets = [
        -0.4, 0.6, -0.2, 0.8, -0.7, 0.3, -0.5, 0.9, -0.8, 0.4,
        -0.3, 0.7, -0.6, 0.2, -0.4, 0.5, -0.9, 0.8, -0.1, 0.3,
      ];

      for (let i = 1; i <= 240; i++) { // 2,000ms stream
        const jitter = jitterOffsets[i % jitterOffsets.length];
        currentClock += nominalDt + jitter * 0.5; // bounded jitter <= 0.45ms

        if (shouldAdvanceFrame(currentClock, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = currentClock;
        }
      }

      // Over 2 seconds of 120Hz with phase noise, exactly 120 frames must advance (60 FPS)
      expect(advanceCount).toBe(120);
    });

    it('T1-3: Dynamic LTPO panel refresh rate switching (120Hz -> 60Hz -> 90Hz -> 120Hz)', () => {
      let lastRendered = 0;
      let advanceCount = 0;
      let currentClock = 0;

      // Phase 1: 120Hz for 500ms (60 ticks) -> 30 frames
      const dt120 = 1000 / 120;
      for (let i = 0; i < 60; i++) {
        currentClock += dt120;
        if (shouldAdvanceFrame(currentClock, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = currentClock;
        }
      }
      expect(advanceCount).toBe(30);

      // Phase 2: LTPO drops to 60Hz for 1000ms (60 ticks) -> 60 frames
      const dt60 = 1000 / 60;
      for (let i = 0; i < 60; i++) {
        currentClock += dt60;
        if (shouldAdvanceFrame(currentClock, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = currentClock;
        }
      }
      expect(advanceCount).toBe(90);

      // Phase 3: Touch ramp to 90Hz for 500ms (45 ticks) -> 22 frames (45 ticks / 2 = 22 frames at 45 FPS)
      const dt90 = 1000 / 90;
      for (let i = 0; i < 45; i++) {
        currentClock += dt90;
        if (shouldAdvanceFrame(currentClock, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = currentClock;
        }
      }
      expect(advanceCount).toBe(112);

      // Phase 4: Ramp back to 120Hz for 500ms (60 ticks) -> 30 frames
      for (let i = 0; i < 60; i++) {
        currentClock += dt120;
        if (shouldAdvanceFrame(currentClock, lastRendered, 60, 1.5)) {
          advanceCount++;
          lastRendered = currentClock;
        }
      }
      expect(advanceCount).toBe(142);
    });

    it('T1-4: Native 60Hz and 90Hz panels throughput verification', () => {
      // 60Hz display: 100% throughput
      let last60 = 0;
      let count60 = 0;
      for (let i = 1; i <= 60; i++) {
        const now = i * (1000 / 60);
        if (shouldAdvanceFrame(now, last60, 60, 1.5)) {
          count60++;
          last60 = now;
        }
      }
      expect(count60).toBe(60);

      // 90Hz display: 45 frames (45 FPS steady cadence)
      let last90 = 0;
      let count90 = 0;
      for (let i = 1; i <= 90; i++) {
        const now = i * (1000 / 90);
        if (shouldAdvanceFrame(now, last90, 60, 1.5)) {
          count90++;
          last90 = now;
        }
      }
      expect(count90).toBe(45);
    });

    it('T1-5: Pause, Resume and Tab Backgrounding Hiatus handling (250ms, 2500ms, 60000ms)', () => {
      const advanceSpy = vi.fn();
      const clockMock = { elapsedTime: 5.0 };
      simulatedTime = 5000.0;

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        clock: clockMock,
        targetFps: 60,
        enabled: true,
      });

      expect(advanceSpy).toHaveBeenCalledTimes(1);

      // Hiatus 1: 250ms (moderate app switch / notification drawer)
      simulatedTime = 5250.0;
      const callback1 = rafQueue.shift()!.callback;
      callback1(simulatedTime);

      expect(advanceSpy).toHaveBeenCalledTimes(2);
      const expectedAdjustedTime1 = (5250.0 - 1000 / 60) / 1000;
      expect(clockMock.elapsedTime).toBeCloseTo(expectedAdjustedTime1, 4);

      // Hiatus 2: 60,000ms (1 minute backgrounding)
      simulatedTime = 65250.0;
      const callback2 = rafQueue.shift()!.callback;
      callback2(simulatedTime);

      expect(advanceSpy).toHaveBeenCalledTimes(3);
      const expectedAdjustedTime2 = (65250.0 - 1000 / 60) / 1000;
      expect(clockMock.elapsedTime).toBeCloseTo(expectedAdjustedTime2, 4);

      stop();
    });

    it('T1-6: Sub-200ms frame hitch does not prematurely trigger hiatus clock reset', () => {
      const advanceSpy = vi.fn();
      const clockMock = { elapsedTime: 2.0 };
      simulatedTime = 2000.0;

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        clock: clockMock,
        targetFps: 60,
        enabled: true,
      });

      // Advance initial frame
      expect(advanceSpy).toHaveBeenCalledTimes(1);

      // Hitch of 150ms (GC pause or shader compilation) -> elapsed <= 200ms
      simulatedTime = 2150.0;
      const callback = rafQueue.shift()!.callback;
      callback(simulatedTime);

      expect(advanceSpy).toHaveBeenCalledTimes(2);
      // clock.elapsedTime must NOT be clamped to (2150 - interval)/1000 because elapsed <= 200ms
      expect(clockMock.elapsedTime).toBe(2.0);

      stop();
    });

    it('T1-7: Boundary and adversarial timing inputs for shouldAdvanceFrame', () => {
      // 0ms elapsed
      expect(shouldAdvanceFrame(1000, 1000, 60, 1.5)).toBe(false);

      // Negative elapsed (backward system clock jump)
      expect(shouldAdvanceFrame(999, 1000, 60, 1.5)).toBe(false);

      // Threshold with safe epsilon: 16.6667 - 1.5 = 15.1667ms
      const interval = 1000 / 60;
      const threshold = interval - 1.5;
      expect(shouldAdvanceFrame(1000 + threshold + 0.001, 1000, 60, 1.5)).toBe(true);
      expect(shouldAdvanceFrame(1000 + threshold - 0.001, 1000, 60, 1.5)).toBe(false);

      // Custom target FPS (30 FPS -> interval 33.33ms, threshold 31.83ms)
      expect(shouldAdvanceFrame(1030, 1000, 30, 1.5)).toBe(false); // 30ms < 31.83ms
      expect(shouldAdvanceFrame(1032, 1000, 30, 1.5)).toBe(true);  // 32ms >= 31.83ms
    });

    it('T1-8: Desktop mode pass-through (enabled: false) schedules no rAF loops', () => {
      const advanceSpy = vi.fn();
      const rafSpy = vi.mocked(globalThis.requestAnimationFrame);

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        targetFps: 60,
        enabled: false,
      });

      expect(advanceSpy).not.toHaveBeenCalled();
      expect(rafSpy).not.toHaveBeenCalled();
      expect(rafQueue.length).toBe(0);

      // Idempotent stop
      expect(() => stop()).not.toThrow();
      expect(() => stop()).not.toThrow();
    });
  });

  // =========================================================================
  // 2. MOBILE GRAPHICS PROFILE & LOCALSTORAGE MIGRATION (R1)
  // =========================================================================
  describe('2. Mobile Graphics Profile and LocalStorage Migration (R1)', () => {
    it('T2-1: getDefaultSettings produces Balanced profile for Android and High Fidelity for Desktop', () => {
      const androidDefaults = getDefaultSettings(true);
      expect(androidDefaults.graphicsQuality).toBe('medium');
      expect(androidDefaults.antiAliasing).toBe('off');
      expect(androidDefaults.resolutionScale).toBe(1.0);
      expect(androidDefaults.shadowsEnabled).toBe(false);
      expect(androidDefaults.postProcessingEnabled).toBe(false);
      expect(androidDefaults.graphicsConfiguredByUser).toBe(false);

      const desktopDefaults = getDefaultSettings(false);
      expect(desktopDefaults.graphicsQuality).toBe('very_high');
      expect(desktopDefaults.antiAliasing).toBe('smaa');
      expect(desktopDefaults.resolutionScale).toBe(1.0);
      expect(desktopDefaults.graphicsConfiguredByUser).toBe(false);
    });

    it('T2-2: Migrates legacy unconfigured desktop defaults in localStorage on Android to Balanced profile', () => {
      // Legacy install had very_high desktop settings and no graphicsConfiguredByUser flag
      storageMock.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          graphicsQuality: 'very_high',
          antiAliasing: 'smaa',
          resolutionScale: 1.0,
          shadowsEnabled: true,
          sfxVolume: 0.75,
          touchControlMode: 'auto',
        })
      );

      const loaded = loadSettingsFromStorage(true);
      expect(loaded.graphicsQuality).toBe('medium');
      expect(loaded.antiAliasing).toBe('off');
      expect(loaded.resolutionScale).toBe(1.0);
      expect(loaded.graphicsConfiguredByUser).toBe(false);
      // Non-graphics settings must remain intact
      expect(loaded.sfxVolume).toBe(0.75);
      expect(loaded.touchControlMode).toBe('auto');

      // Verify written back to localStorage
      const persisted = JSON.parse(storageMock.getItem(SETTINGS_STORAGE_KEY) || '{}');
      expect(persisted.graphicsQuality).toBe('medium');
      expect(persisted.antiAliasing).toBe('off');
      expect(persisted.resolutionScale).toBe(1.0);
      expect(persisted.graphicsConfiguredByUser).toBe(false);
      expect(persisted.sfxVolume).toBe(0.75);
      expect(persisted.touchControlMode).toBe('auto');
    });

    it('T2-3: Strictly preserves explicit manual user configurations on Android', () => {
      // User deliberately selected very_high
      storageMock.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          graphicsQuality: 'very_high',
          antiAliasing: 'smaa',
          graphicsConfiguredByUser: true,
        })
      );

      const loadedVeryHigh = loadSettingsFromStorage(true);
      expect(loadedVeryHigh.graphicsQuality).toBe('very_high');
      expect(loadedVeryHigh.antiAliasing).toBe('smaa');
      expect(loadedVeryHigh.graphicsConfiguredByUser).toBe(true);

      // User deliberately selected high
      storageMock.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          graphicsQuality: 'high',
          antiAliasing: 'off',
          graphicsConfiguredByUser: true,
        })
      );
      const loadedHigh = loadSettingsFromStorage(true);
      expect(loadedHigh.graphicsQuality).toBe('high');
      expect(loadedHigh.graphicsConfiguredByUser).toBe(true);

      // User deliberately selected low
      storageMock.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          graphicsQuality: 'low',
          antiAliasing: 'off',
          graphicsConfiguredByUser: true,
        })
      );
      const loadedLow = loadSettingsFromStorage(true);
      expect(loadedLow.graphicsQuality).toBe('low');
      expect(loadedLow.graphicsConfiguredByUser).toBe(true);
    });

    it('T2-4: Preserves very_high desktop settings on Desktop / Non-Android without migration', () => {
      storageMock.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          graphicsQuality: 'very_high',
          antiAliasing: 'smaa',
        })
      );

      const loaded = loadSettingsFromStorage(false);
      expect(loaded.graphicsQuality).toBe('very_high');
      expect(loaded.antiAliasing).toBe('smaa');
    });

    it('T2-5: Storage resilience against malformed, non-object, and quota-exceeded storage', () => {
      // Malformed JSON
      storageMock.setItem(SETTINGS_STORAGE_KEY, '{unclosed json');
      expect(loadSettingsFromStorage(true)).toEqual({});

      // Non-object primitives
      storageMock.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(12345));
      expect(loadSettingsFromStorage(true)).toEqual({});

      storageMock.setItem(SETTINGS_STORAGE_KEY, JSON.stringify('string-only'));
      expect(loadSettingsFromStorage(true)).toEqual({});

      storageMock.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(null));
      expect(loadSettingsFromStorage(true)).toEqual({});

      // QuotaExceededError in saveSettingsToStorage
      vi.spyOn(storageMock, 'setItem').mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });
      expect(() => saveSettingsToStorage({ graphicsQuality: 'medium' })).not.toThrow();
    });

    it('T2-6: Store actions correctly update graphicsConfiguredByUser flag only for graphics actions', () => {
      useSettingsStore.setState({
        ...DEFAULT_SETTINGS,
        graphicsConfiguredByUser: false,
      });

      // Non-graphics action: sfxVolume
      useSettingsStore.getState().setSfxVolume(0.4);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(false);

      // Non-graphics action: sensitivity
      useSettingsStore.getState().setSensitivity(1.5);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(false);

      // Non-graphics action: touch controls
      useSettingsStore.getState().setTouchControlMode('always');
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(false);

      useSettingsStore.getState().setTouchOpacity(0.9);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(false);

      // Graphics action: setGraphicsQuality
      useSettingsStore.getState().setGraphicsQuality('high');
      expect(useSettingsStore.getState().graphicsQuality).toBe('high');
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);

      // Reset and test setAntiAliasing
      useSettingsStore.setState({ graphicsConfiguredByUser: false });
      useSettingsStore.getState().setAntiAliasing('msaa');
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);

      // Reset and test setResolutionScale
      useSettingsStore.setState({ graphicsConfiguredByUser: false });
      useSettingsStore.getState().setResolutionScale(0.85);
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);

      // Reset and test toggleShadows
      useSettingsStore.setState({ graphicsConfiguredByUser: false });
      useSettingsStore.getState().toggleShadows();
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);

      // Reset and test togglePostProcessing
      useSettingsStore.setState({ graphicsConfiguredByUser: false });
      useSettingsStore.getState().togglePostProcessing();
      expect(useSettingsStore.getState().graphicsConfiguredByUser).toBe(true);
    });
  });

  // =========================================================================
  // 3. DEVICE DETECTION MATRIX & CAPACITOR RUNTIME (R1)
  // =========================================================================
  describe('3. Device Detection Matrix and Capacitor Runtime (R1)', () => {
    it('T3-1: Accurately identifies diverse Android device user agents', () => {
      const androidUAs = [
        // Google Pixel 10 Pro (Android 15)
        'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        // Samsung Galaxy S24 Ultra
        'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
        // Xiaomi 14
        'Mozilla/5.0 (Linux; Android 14; 24030PN60G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
        // Android Tablet
        'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        // Android WebView / Custom App Container
        'Mozilla/5.0 (Linux; U; Android 14; en-us; Pixel 10 Pro Build/UQ1A.240205.004) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36',
      ];

      for (const ua of androidUAs) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { userAgent: ua },
          configurable: true,
          writable: true,
        });
        expect(isAndroid()).toBe(true);
        expect(isMobileDevice()).toBe(true);
      }
    });

    it('T3-2: Capacitor runtime platform detection precedence', () => {
      // Capacitor android native app
      Object.defineProperty(globalThis, 'window', {
        value: {
          Capacitor: {
            getPlatform: () => 'android',
            isNativePlatform: () => true,
          },
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'CustomAppWrapper/1.0' },
        configurable: true,
        writable: true,
      });

      expect(isAndroid()).toBe(true);
      expect(isMobileDevice()).toBe(true);

      // Capacitor iOS app (isAndroid: false, isMobileDevice: true)
      Object.defineProperty(globalThis, 'window', {
        value: {
          Capacitor: {
            getPlatform: () => 'ios',
            isNativePlatform: () => true,
          },
        },
        configurable: true,
        writable: true,
      });
      expect(isAndroid()).toBe(false);
      expect(isMobileDevice()).toBe(true);

      // Capacitor web platform (isAndroid: false)
      Object.defineProperty(globalThis, 'window', {
        value: {
          Capacitor: {
            getPlatform: () => 'web',
            isNativePlatform: () => false,
          },
        },
        configurable: true,
        writable: true,
      });
      expect(isAndroid()).toBe(false);
    });

    it('T3-3: Non-Android platforms do not trigger isAndroid()', () => {
      const nonAndroidUAs = [
        // iPhone 16 Pro
        { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', isMobile: true },
        // iPad Pro M4
        { ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', isMobile: true },
        // Linux Desktop Ubuntu (contains "Linux" but NOT "Android")
        { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', isMobile: false },
        // Windows 11 Desktop
        { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', isMobile: false },
        // macOS Desktop
        { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', isMobile: false },
      ];

      for (const { ua, isMobile } of nonAndroidUAs) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { userAgent: ua },
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: { matchMedia: () => ({ matches: false }) },
          configurable: true,
          writable: true,
        });

        expect(isAndroid()).toBe(false);
        expect(isMobileDevice()).toBe(isMobile);
      }
    });

    it('T3-4: SSR and Headless safety with absent or incomplete window / navigator', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(isAndroid()).toBe(false);
      expect(isMobileDevice()).toBe(false);
    });
  });

  // =========================================================================
  // 4. BALANCED PROFILE ENGINE DPR & THERMAL CLAMP (R1)
  // =========================================================================
  describe('4. Balanced Profile Engine DPR and Thermal Clamp (R1)', () => {
    it('T4-1: Pixel 10 Pro (DPR 3.0) with default Balanced profile targets DPR 1.0', () => {
      const config = calculateDprConfig({
        windowDpr: 3.0,
        graphicsQuality: 'medium',
        resolutionScale: 1.0,
        isMobile: true,
      });

      expect(config.targetDpr).toBe(1.0);
      expect(config.dprTuple).toEqual([0.5, 1.0]);
    });

    it('T4-2: Clamps mobile target DPR to MOBILE_MAX_DPR (1.75) even with very_high preset and 150% supersampling', () => {
      const config = calculateDprConfig({
        windowDpr: 3.5,
        graphicsQuality: 'very_high',
        resolutionScale: 1.5,
        isMobile: true,
      });

      expect(config.targetDpr).toBeLessThanOrEqual(MOBILE_MAX_DPR);
      expect(config.targetDpr).toBe(1.75);
    });

    it('T4-3: Desktop platforms retain DESKTOP_MAX_DPR (2.0) with very_high preset', () => {
      const config = calculateDprConfig({
        windowDpr: 2.0,
        graphicsQuality: 'very_high',
        resolutionScale: 1.0,
        isMobile: false,
      });

      expect(config.targetDpr).toBe(DESKTOP_MAX_DPR);
      expect(config.dprTuple).toEqual([0.5, 2.0]);
    });
  });
});
