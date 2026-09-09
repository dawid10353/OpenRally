import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGpuDiagnostics,
  getDeviceDiagnostics,
  recordCrash,
  formatCrashReport,
  copyCrashReportToClipboard,
  initGlobalCrashLogging,
} from '@/utils/diagnostics/crashLogger';
import { useGameStore } from '@/store/gameStore';

describe('In-App Crash Logger & Diagnostics Subsystem', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
      key: vi.fn((_index: number) => null),
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('GPU & Device Diagnostics Capture', () => {
    it('safely extracts GPU diagnostic details without throwing in any environment', () => {
      const gpu = getGpuDiagnostics();
      expect(gpu).toBeDefined();
      expect(typeof gpu.vendor).toBe('string');
      expect(typeof gpu.renderer).toBe('string');
      expect(typeof gpu.webglVersion).toBe('string');
    });

    it('assembles a full device diagnostics snapshot', () => {
      const diag = getDeviceDiagnostics();
      expect(diag).toBeDefined();
      expect(diag.userAgent).toBeDefined();
      expect(diag.screenResolution).toBeDefined();
      expect(diag.viewportSize).toBeDefined();
      expect(Number.isFinite(diag.devicePixelRatio)).toBe(true);
      expect(diag.gpuRenderer).toBeDefined();
    });
  });

  describe('Crash Recording & Local Persistence', () => {
    it('records an Error instance into localStorage with game telemetry', () => {
      useGameStore.setState({
        gameState: 'playing',
        selectedLevelId: 'level1_island',
        selectedVehicleId: 'vortex_b',
        speed: 120,
      });

      const testError = new Error('Test WebGL context loss simulation');
      const entry = recordCrash(testError, { componentStack: 'in GameCanvas\n in App' });

      expect(entry.id).toMatch(/^crash_/);
      expect(entry.errorMessage).toBe('Test WebGL context loss simulation');
      expect(entry.componentStack).toContain('in GameCanvas');
      expect(entry.gameStateSnapshot.gameState).toBe('playing');
      expect(entry.gameStateSnapshot.selectedLevelId).toBe('level1_island');
      expect(entry.gameStateSnapshot.selectedVehicleId).toBe('vortex_b');
      expect(entry.gameStateSnapshot.speedKmh).toBe(120);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'openrally_crash_log',
        expect.stringContaining('Test WebGL context loss simulation'),
      );
    });

    it('safely handles non-Error objects and string exceptions', () => {
      const entry = recordCrash('Primitive string error message');
      expect(entry.errorMessage).toBe('Primitive string error message');
      expect(entry.id).toBeDefined();
    });
  });

  describe('Crash Report Formatting & Markdown Export', () => {
    it('formats a structured markdown report suitable for developer triage', () => {
      const testError = new Error('Shader compilation failure');
      testError.stack = 'Error: Shader compilation failure\n    at compileShader (gl.ts:42:10)';
      const entry = recordCrash(testError);

      const report = formatCrashReport(entry);
      expect(report).toContain('# OpenRally Crash Diagnostics Report');
      expect(report).toContain('**Incident ID:**');
      expect(report).toContain('Shader compilation failure');
      expect(report).toContain('## Device & Graphics Environment');
      expect(report).toContain('## Game State Telemetry');
      expect(report).toContain('GPU Renderer:');
    });
  });

  describe('Clipboard Export & Global Listeners', () => {
    it('handles copyCrashReportToClipboard with navigator.clipboard.writeText', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      const originalNavigator = globalThis.navigator;

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          ...originalNavigator,
          clipboard: { writeText: writeTextMock },
        },
        writable: true,
        configurable: true,
      });

      const success = await copyCrashReportToClipboard('Sample Diagnostics');
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('Sample Diagnostics');

      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('registers and cleanly removes global crash logging window listeners', () => {
      const removeListeners = initGlobalCrashLogging();
      expect(typeof removeListeners).toBe('function');
      expect(() => removeListeners()).not.toThrow();
    });
  });
});
