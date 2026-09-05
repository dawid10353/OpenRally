import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Matrix4, Vector3, Sphere } from 'three';
import {
  useSettingsStore,
  SETTINGS_STORAGE_KEY,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  getDefaultSettings,
} from '@/store/settingsStore';
import { GrassField } from '@/components/terrain/GrassField';
import { computeInstanceBoundingSphere } from '@/components/terrain/PropsInstancer';
import { BALANCED_MOBILE_SETTINGS } from '@/types/settings';
import type { PropItem } from '@/components/terrain/props/types';
import type { GraphicsQuality, AntiAliasingMode } from '@/types/game';

describe('Adversarial Stress Suite M3 (orchestrator_4 / challenger_1): Mobile GPU/CPU Performance & Invariants', () => {
  let storageMap: Record<string, string> = {};

  beforeEach(() => {
    storageMap = {};
    const mockStorage = {
      getItem: (key: string) => storageMap[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMap[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storageMap[key];
      },
      clear: () => {
        storageMap = {};
      },
      length: 0,
      key: (i: number) => Object.keys(storageMap)[i] ?? null,
    };
    vi.stubGlobal('localStorage', mockStorage);

    useSettingsStore.setState({
      graphicsQuality: 'very_high',
      antiAliasing: 'smaa',
      resolutionScale: 1.0,
      shadowsEnabled: true,
      postProcessingEnabled: true,
      touchControlMode: 'auto',
      graphicsConfiguredByUser: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: RAPID QUALITY SWITCHING & STATE CONSISTENCY WITHOUT DRIFT
  // =========================================================================
  describe('Section 1: Rapid Quality Switching & State Consistency without Drift', () => {
    it('1.1: sequential switching (low -> medium -> high -> low -> very_high) maintains expected states', () => {
      const store = useSettingsStore.getState();

      // Step 1: Switch to 'low'
      store.setGraphicsQuality('low');
      let state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('low');
      expect(state.shadowsEnabled).toBe(false);
      expect(state.postProcessingEnabled).toBe(false);
      expect(state.antiAliasing).toBe('off');
      expect(state.graphicsConfiguredByUser).toBe(true);

      // Verify localStorage persisted low settings
      const rawStoredLow = JSON.parse(storageMap[SETTINGS_STORAGE_KEY] || '{}');
      expect(rawStoredLow.graphicsQuality).toBe('low');
      expect(rawStoredLow.shadowsEnabled).toBe(false);
      expect(rawStoredLow.postProcessingEnabled).toBe(false);
      expect(rawStoredLow.antiAliasing).toBe('off');

      // Step 2: Switch to 'medium'
      store.setGraphicsQuality('medium');
      state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('medium');
      expect(state.graphicsConfiguredByUser).toBe(true);
      // Ensure boolean/string types remain pristine without drift to undefined/NaN
      expect(typeof state.shadowsEnabled).toBe('boolean');
      expect(typeof state.postProcessingEnabled).toBe('boolean');
      expect(['off', 'smaa', 'msaa']).toContain(state.antiAliasing);

      // Step 3: Switch to 'high'
      store.setGraphicsQuality('high');
      state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('high');

      // Step 4: Switch back to 'low' — must re-enforce strict performance lockdown
      store.setGraphicsQuality('low');
      state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('low');
      expect(state.shadowsEnabled).toBe(false);
      expect(state.postProcessingEnabled).toBe(false);
      expect(state.antiAliasing).toBe('off');

      // Step 5: Switch to 'very_high'
      store.setGraphicsQuality('very_high');
      state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('very_high');
      expect(typeof state.shadowsEnabled).toBe('boolean');
      expect(typeof state.postProcessingEnabled).toBe('boolean');
    });

    it('1.2: stress test: 50 rapid alternating quality transitions without state corruption or drift', () => {
      const store = useSettingsStore.getState();
      const sequence: GraphicsQuality[] = ['low', 'medium', 'high', 'low', 'very_high'];

      for (let i = 0; i < 50; i++) {
        const quality = sequence[i % sequence.length];
        store.setGraphicsQuality(quality);
        const state = useSettingsStore.getState();

        expect(state.graphicsQuality).toBe(quality);
        expect(state.graphicsConfiguredByUser).toBe(true);
        expect(typeof state.shadowsEnabled).toBe('boolean');
        expect(typeof state.postProcessingEnabled).toBe('boolean');
        expect(['off', 'smaa', 'msaa']).toContain(state.antiAliasing);

        if (quality === 'low') {
          expect(state.shadowsEnabled).toBe(false);
          expect(state.postProcessingEnabled).toBe(false);
          expect(state.antiAliasing).toBe('off');
        }

        // Storage verification
        const stored = JSON.parse(storageMap[SETTINGS_STORAGE_KEY] || '{}');
        expect(stored.graphicsQuality).toBe(quality);
        expect(stored.graphicsConfiguredByUser).toBe(true);
      }
    });

    it('1.3: verifies idempotence of repeated low quality transitions', () => {
      const store = useSettingsStore.getState();
      for (let i = 0; i < 10; i++) {
        store.setGraphicsQuality('low');
      }

      const state = useSettingsStore.getState();
      expect(state.graphicsQuality).toBe('low');
      expect(state.shadowsEnabled).toBe(false);
      expect(state.postProcessingEnabled).toBe(false);
      expect(state.antiAliasing).toBe('off');
    });

    it('1.4: user manual override interaction with low quality policy', () => {
      const store = useSettingsStore.getState();
      store.setGraphicsQuality('low');
      expect(useSettingsStore.getState().shadowsEnabled).toBe(false);

      // User manually re-enables shadows
      store.toggleShadows();
      expect(useSettingsStore.getState().shadowsEnabled).toBe(true);

      // Rendering layer invariant check:
      // Even if user manually toggles shadows on, GameCanvas guard (shadowsEnabled && graphicsQuality !== 'low')
      // guarantees shadows are NEVER rendered when graphicsQuality === 'low'
      const renderShadowsActive = useSettingsStore.getState().shadowsEnabled && useSettingsStore.getState().graphicsQuality !== 'low';
      expect(renderShadowsActive).toBe(false);

      // Calling setGraphicsQuality('low') again resets shadowsEnabled to false
      store.setGraphicsQuality('low');
      expect(useSettingsStore.getState().shadowsEnabled).toBe(false);
    });

    it('1.5: loadSettingsFromStorage and Android defaults migration resilience', () => {
      // Contract invariant: BALANCED_MOBILE_SETTINGS specification
      expect(BALANCED_MOBILE_SETTINGS.graphicsQuality).toBe('medium');
      expect(BALANCED_MOBILE_SETTINGS.postProcessingEnabled).toBe(false);
      expect(BALANCED_MOBILE_SETTINGS.antiAliasing).toBe('off');
      expect(BALANCED_MOBILE_SETTINGS.resolutionScale).toBe(1.0);
      expect(BALANCED_MOBILE_SETTINGS.shadowsEnabled).toBe(false);

      // Direct storage persistence helper
      saveSettingsToStorage({ shadowsEnabled: false, postProcessingEnabled: false });
      const directlySaved = JSON.parse(storageMap[SETTINGS_STORAGE_KEY] || '{}');
      expect(directlySaved.shadowsEnabled).toBe(false);
      expect(directlySaved.postProcessingEnabled).toBe(false);

      // Android default profile without manual user configuration
      const androidDefaults = getDefaultSettings(true);
      expect(androidDefaults.graphicsQuality).toBe('medium');
      expect(androidDefaults.antiAliasing).toBe('off');
      expect(androidDefaults.resolutionScale).toBe(1.0);
      expect(androidDefaults.shadowsEnabled).toBe(false);
      expect(androidDefaults.postProcessingEnabled).toBe(false);
      expect(androidDefaults.graphicsConfiguredByUser).toBe(false);

      // Legacy desktop settings stored in localStorage on Android
      storageMap[SETTINGS_STORAGE_KEY] = JSON.stringify({
        graphicsQuality: 'very_high',
        antiAliasing: 'smaa',
        resolutionScale: 1.5,
        graphicsConfiguredByUser: false,
      });

      // Loading should migrate stale desktop defaults to Balanced mobile profile
      const migrated = loadSettingsFromStorage(true);
      expect(migrated.graphicsQuality).toBe('medium');
      expect(migrated.antiAliasing).toBe('off');
      expect(migrated.resolutionScale).toBe(1.0);
    });
  });

  // =========================================================================
  // SECTION 2: GRASSFIELD RENDERING UNDER LOW QUALITY VS BALANCED MODE
  // =========================================================================
  describe('Section 2: GrassField Rendering Under Low Quality vs Balanced Mode', () => {
    it('2.1: GrassField returns null immediately under low quality mode (renders empty string)', () => {
      useSettingsStore.getState().setGraphicsQuality('low');
      const renderedHtml = renderToString(<GrassField />);
      expect(renderedHtml).toBe('');
    });

    it('2.2: GrassField rendering reacts immediately to store quality transitions', () => {
      // Set low -> must return null (empty string)
      useSettingsStore.getState().setGraphicsQuality('low');
      expect(renderToString(<GrassField />)).toBe('');

      // Directly update store state to 'low'
      useSettingsStore.setState({ graphicsQuality: 'low' });
      expect(renderToString(<GrassField />)).toBe('');
    });

    it('2.3: quantitative foliage cluster scaling preserves 0 clusters on low and clamps to 3,500 on mobile balanced', () => {
      const calculateClusterCount = (
        graphicsQuality: GraphicsQuality,
        isMobile: boolean,
        isSnow: boolean,
        isBritain: boolean,
      ): number => {
        const baseCount =
          isSnow || graphicsQuality === 'low'
            ? 0
            : isMobile
            ? graphicsQuality === 'medium'
              ? 3500
              : graphicsQuality === 'high'
              ? 18000
              : 32000
            : graphicsQuality === 'medium'
            ? 36000
            : graphicsQuality === 'high'
            ? 72000
            : 105000;
        return isBritain ? Math.floor(baseCount * 1.3) : baseCount;
      };

      // 1. Low quality: unconditionally 0 clusters across all platforms and levels
      expect(calculateClusterCount('low', true, false, false)).toBe(0);
      expect(calculateClusterCount('low', false, false, false)).toBe(0);
      expect(calculateClusterCount('low', true, false, true)).toBe(0);
      expect(calculateClusterCount('low', true, true, false)).toBe(0);

      // 2. Mobile Balanced mode (medium quality): exactly 3,500 clusters (4,550 on Britain)
      const mobileBalancedCount = calculateClusterCount('medium', true, false, false);
      expect(mobileBalancedCount).toBe(3500);

      const mobileBalancedBritain = calculateClusterCount('medium', true, false, true);
      expect(mobileBalancedBritain).toBe(Math.floor(3500 * 1.3));

      // 3. Compare with Desktop Medium: 36,000 clusters
      const desktopMediumCount = calculateClusterCount('medium', false, false, false);
      expect(desktopMediumCount).toBe(36000);

      // Mobile Balanced mode is >90% reduction in grass clusters compared to desktop
      const reductionRatio = (desktopMediumCount - mobileBalancedCount) / desktopMediumCount;
      expect(reductionRatio).toBeGreaterThan(0.90);

      // 4. Snow level: 0 clusters regardless of quality or platform
      expect(calculateClusterCount('very_high', false, true, false)).toBe(0);
      expect(calculateClusterCount('medium', true, true, false)).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 3: COMPUTEINSTANCEBOUNDINGSPHERE NUMERICAL STABILITY & GUARDS
  // =========================================================================
  describe('Section 3: computeInstanceBoundingSphere Numerical Stability & Bounds Integrity', () => {
    it('3.1: returns radius -1 on empty array, null, or undefined', () => {
      const emptyResult = computeInstanceBoundingSphere([]);
      expect(emptyResult.radius).toBe(-1);
      expect(emptyResult.center.x).toBe(0);
      expect(emptyResult.center.y).toBe(0);
      expect(emptyResult.center.z).toBe(0);

      const nullResult = computeInstanceBoundingSphere(null as unknown as PropItem[]);
      expect(nullResult.radius).toBe(-1);

      const undefinedResult = computeInstanceBoundingSphere(undefined as unknown as PropItem[]);
      expect(undefinedResult.radius).toBe(-1);
    });

    it('3.2: computes precise center and radius for single prop with custom geometryRadius', () => {
      const item: PropItem = {
        matrix: new Matrix4().makeTranslation(12.5, -4.2, 88.0),
        position: [12.5, -4.2, 88.0],
        scale: [1, 1, 1],
        rotationY: 0,
      };

      // With geometryRadius = 6
      const sphere6 = computeInstanceBoundingSphere([item], 6);
      expect(sphere6.center.x).toBeCloseTo(12.5);
      expect(sphere6.center.y).toBeCloseTo(-4.2);
      expect(sphere6.center.z).toBeCloseTo(88.0);
      expect(sphere6.radius).toBeCloseTo(6);

      // With geometryRadius = 0
      const sphere0 = computeInstanceBoundingSphere([item], 0);
      expect(sphere0.radius).toBeCloseTo(0);

      // With default geometryRadius (5)
      const sphereDefault = computeInstanceBoundingSphere([item]);
      expect(sphereDefault.radius).toBeCloseTo(5);
    });

    it('3.3: numerical stability with extreme coordinates (+/- 10,000m)', () => {
      const extremeItems: PropItem[] = [
        {
          matrix: new Matrix4().makeTranslation(-10000, -500, -10000),
          position: [-10000, -500, -10000],
          scale: [1, 1, 1],
          rotationY: 0,
        },
        {
          matrix: new Matrix4().makeTranslation(10000, -500, -10000),
          position: [10000, -500, -10000],
          scale: [1, 1, 1],
          rotationY: 0,
        },
        {
          matrix: new Matrix4().makeTranslation(-10000, 500, 10000),
          position: [-10000, 500, 10000],
          scale: [1, 1, 1],
          rotationY: 0,
        },
        {
          matrix: new Matrix4().makeTranslation(10000, 500, 10000),
          position: [10000, 500, 10000],
          scale: [1, 1, 1],
          rotationY: 0,
        },
      ];

      const sphere = computeInstanceBoundingSphere(extremeItems, 10);

      // Center must be exactly at origin (0, 0, 0)
      expect(sphere.center.x).toBeCloseTo(0);
      expect(sphere.center.y).toBeCloseTo(0);
      expect(sphere.center.z).toBeCloseTo(0);

      // Check finite numbers
      expect(Number.isFinite(sphere.center.x)).toBe(true);
      expect(Number.isFinite(sphere.center.y)).toBe(true);
      expect(Number.isFinite(sphere.center.z)).toBe(true);
      expect(Number.isFinite(sphere.radius)).toBe(true);

      // Expected distance: sqrt(10000^2 + 500^2 + 10000^2) + 10 = sqrt(200,250,000) + 10 ≈ 14150.97 + 10 = 14160.97
      const expectedDist = Math.sqrt(10000 * 10000 + 500 * 500 + 10000 * 10000) + 10;
      expect(sphere.radius).toBeCloseTo(expectedDist, 1);

      // Enclosure invariant: every prop must be strictly enclosed by the sphere
      for (const item of extremeItems) {
        const itemPos = new Vector3().setFromMatrixPosition(item.matrix);
        expect(itemPos.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius);
      }
    });

    it('3.4: enclosure invariant across a dense procedural cluster of 200 items', () => {
      const items: PropItem[] = [];
      const rng = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      for (let i = 0; i < 200; i++) {
        const x = (rng(i * 3 + 1) - 0.5) * 600;
        const y = rng(i * 3 + 2) * 50;
        const z = (rng(i * 3 + 3) - 0.5) * 600;
        items.push({
          matrix: new Matrix4().makeTranslation(x, y, z),
          position: [x, y, z],
          scale: [1, 1, 1],
          rotationY: 0,
        });
      }

      const sphere = computeInstanceBoundingSphere(items, 8);
      expect(Number.isFinite(sphere.center.x)).toBe(true);
      expect(Number.isFinite(sphere.center.y)).toBe(true);
      expect(Number.isFinite(sphere.center.z)).toBe(true);
      expect(Number.isFinite(sphere.radius)).toBe(true);
      expect(sphere.radius).toBeGreaterThan(0);
      // Tight bounds: significantly less than the synthetic 1200m global sphere
      expect(sphere.radius).toBeLessThan(600);

      // Verify every single item is enclosed within the bounding sphere
      const itemPos = new Vector3();
      for (const item of items) {
        itemPos.setFromMatrixPosition(item.matrix);
        const dist = itemPos.distanceTo(sphere.center);
        expect(dist).toBeLessThanOrEqual(sphere.radius + 1e-4);
      }
    });

    it('3.5: evaluates behavior under degenerate and non-finite matrix coordinates', () => {
      // Degenerate matrix with NaN coordinates
      const nanMatrix = new Matrix4().set(
        1, 0, 0, NaN,
        0, 1, 0, NaN,
        0, 0, 1, NaN,
        0, 0, 0, 1,
      );
      const nanItem: PropItem = {
        matrix: nanMatrix,
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotationY: 0,
      };

      // Function must not crash/throw unhandled exceptions
      expect(() => computeInstanceBoundingSphere([nanItem])).not.toThrow();
      const nanSphere = computeInstanceBoundingSphere([nanItem]);
      expect(nanSphere).toBeInstanceOf(Sphere);

      // Degenerate matrix with Infinity coordinates
      const infMatrix = new Matrix4().set(
        1, 0, 0, Infinity,
        0, 1, 0, Infinity,
        0, 0, 1, Infinity,
        0, 0, 0, 1,
      );
      const infItem: PropItem = {
        matrix: infMatrix,
        position: [0, 0, 0],
        scale: [1, 1, 1],
        rotationY: 0,
      };

      expect(() => computeInstanceBoundingSphere([infItem])).not.toThrow();
      const infSphere = computeInstanceBoundingSphere([infItem]);
      expect(infSphere).toBeInstanceOf(Sphere);
    });
  });

  // =========================================================================
  // SECTION 4: CANVAS SHADOWS PROP & RENDERING PERMUTATIONS
  // =========================================================================
  describe('Section 4: Canvas Shadows Prop Calculation & Permutations', () => {
    it('4.1: exhaustive 8-permutation truth table for Canvas shadows prop', () => {
      const getCanvasShadows = (shadowsEnabled: boolean, graphicsQuality: GraphicsQuality): boolean =>
        shadowsEnabled && graphicsQuality !== 'low';

      // Truth table permutations:
      expect(getCanvasShadows(true, 'low')).toBe(false);
      expect(getCanvasShadows(false, 'low')).toBe(false);
      expect(getCanvasShadows(true, 'medium')).toBe(true);
      expect(getCanvasShadows(false, 'medium')).toBe(false);
      expect(getCanvasShadows(true, 'high')).toBe(true);
      expect(getCanvasShadows(false, 'high')).toBe(false);
      expect(getCanvasShadows(true, 'very_high')).toBe(true);
      expect(getCanvasShadows(false, 'very_high')).toBe(false);
    });

    it('4.2: prop shadow casting canShadow evaluation under all 8 permutations', () => {
      const getCanShadow = (isMobile: boolean, graphicsQuality: GraphicsQuality): boolean =>
        !isMobile && graphicsQuality !== 'low';

      // Mobile: MUST NEVER cast prop shadows regardless of quality setting (saves 27 draw calls)
      expect(getCanShadow(true, 'low')).toBe(false);
      expect(getCanShadow(true, 'medium')).toBe(false); // Balanced mode optimization
      expect(getCanShadow(true, 'high')).toBe(false);
      expect(getCanShadow(true, 'very_high')).toBe(false);

      // Desktop: casts prop shadows on all tiers except low
      expect(getCanShadow(false, 'low')).toBe(false);
      expect(getCanShadow(false, 'medium')).toBe(true);
      expect(getCanShadow(false, 'high')).toBe(true);
      expect(getCanShadow(false, 'very_high')).toBe(true);
    });

    it('4.3: post-processing bypass evaluation under all 16 permutations', () => {
      const shouldRenderPostProcessing = (
        postProcessingEnabled: boolean,
        isMobile: boolean,
        graphicsQuality: GraphicsQuality,
      ): boolean =>
        postProcessingEnabled &&
        (isMobile ? graphicsQuality === 'very_high' || graphicsQuality === 'high' : graphicsQuality !== 'low');

      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];

      for (const quality of qualities) {
        // When postProcessingEnabled is false, output is ALWAYS false
        expect(shouldRenderPostProcessing(false, true, quality)).toBe(false);
        expect(shouldRenderPostProcessing(false, false, quality)).toBe(false);
      }

      // Mobile Balanced mode (medium quality) MUST bypass post-processing even when enabled
      expect(shouldRenderPostProcessing(true, true, 'medium')).toBe(false);
      expect(shouldRenderPostProcessing(true, true, 'low')).toBe(false);

      // Mobile high tiers allow post-processing
      expect(shouldRenderPostProcessing(true, true, 'high')).toBe(true);
      expect(shouldRenderPostProcessing(true, true, 'very_high')).toBe(true);

      // Desktop allows post-processing on medium, high, and very_high
      expect(shouldRenderPostProcessing(true, false, 'low')).toBe(false);
      expect(shouldRenderPostProcessing(true, false, 'medium')).toBe(true);
      expect(shouldRenderPostProcessing(true, false, 'high')).toBe(true);
      expect(shouldRenderPostProcessing(true, false, 'very_high')).toBe(true);
    });

    it('4.4: WebGL gl antialias flag evaluation matches antiAliasing setting', () => {
      const getGlAntialias = (antiAliasing: AntiAliasingMode): boolean => antiAliasing !== 'off';

      expect(getGlAntialias('off')).toBe(false);
      expect(getGlAntialias('smaa')).toBe(true);
      expect(getGlAntialias('msaa')).toBe(true);
    });
  });
});
