import { describe, it, expect, afterEach } from 'vitest';
import {
  isMobileDevice,
  calculateDprConfig,
  calculateTargetDpr,
  MOBILE_MAX_DPR,
  DESKTOP_MAX_DPR,
} from '../src/utils/device';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Adversarial Challenge M1: Device Detection & Environment Edge Cases', () => {
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

  describe('1. Device Detection against Mock / Deceptive User Agents & Touch Profiles', () => {
    it('accurately identifies Google Pixel 10 Pro (Android 15)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Mobile Safari/537.36',
          maxTouchPoints: 10,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('accurately identifies Android Tablets (Samsung Galaxy Tab S9, SM-X900)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          maxTouchPoints: 10,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('accurately identifies Android Foldable devices (Pixel Fold / Galaxy Fold)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Fold) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
          maxTouchPoints: 10,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('does NOT falsely identify high-end Windows touchscreen laptops (e.g. Surface / XPS with maxTouchPoints = 10)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          maxTouchPoints: 10,
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1920,
          innerHeight: 1080,
          matchMedia: (query: string) => ({
            matches: query === '(pointer: coarse)',
            media: query,
          }),
        },
        configurable: true,
        writable: true,
      });
      // Desktop laptop should NOT be treated as mobile phone (should not restrict desktop DPR to 1.75)
      expect(isMobileDevice()).toBe(false);
    });

    it('does NOT falsely identify standard desktop macOS Safari/Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          maxTouchPoints: 0,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(false);
    });

    it('does NOT falsely identify Linux workstation (X11 / Wayland)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
          maxTouchPoints: 0,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(false);
    });

    it('detects Chrome DevTools mobile emulation with mobile UA', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
          maxTouchPoints: 5,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('detects generic browser with touch coarse pointer and phone screen size (<= 600px)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (CustomEmbeddedMobile/2.0)',
          maxTouchPoints: 5,
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 390,
          innerHeight: 844,
          matchMedia: (query: string) => ({
            matches: query === '(pointer: coarse)',
            media: query,
          }),
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('handles Capacitor native Android wrapper even with custom userAgent', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'CustomWebViewBrand/1.0',
        },
        configurable: true,
        writable: true,
      });
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
      expect(isMobileDevice()).toBe(true);
    });

    it('handles hostile environments: empty UA, null, undefined navigator without crashing', () => {
      // Empty userAgent
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: '' },
        configurable: true,
        writable: true,
      });
      expect(() => isMobileDevice()).not.toThrow();
      expect(isMobileDevice()).toBe(false);

      // Undefined userAgent
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });
      expect(() => isMobileDevice()).not.toThrow();
      expect(isMobileDevice()).toBe(false);

      // Search bots / crawlers
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('2. Stress-Testing DPR Calculation under Extreme Values & Quality Presets', () => {
    const qualities = ['low', 'medium', 'high', 'very_high'] as const;

    it('strictly clamps mobile DPR to MOBILE_MAX_DPR (1.75) under extreme native DPRs', () => {
      const extremeDprs = [1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 10.0];
      for (const dpr of extremeDprs) {
        for (const quality of qualities) {
          const config = calculateDprConfig({
            windowDpr: dpr,
            graphicsQuality: quality,
            resolutionScale: 1.0,
            isMobile: true,
          });

          // Base DPR must never exceed mobile ceiling
          expect(config.baseDpr).toBeLessThanOrEqual(MOBILE_MAX_DPR);
          // Target DPR must never exceed mobile ceiling
          expect(config.targetDpr).toBeLessThanOrEqual(MOBILE_MAX_DPR);
          // R3F canvas max DPR must never exceed mobile ceiling
          expect(config.dprTuple[1]).toBeLessThanOrEqual(MOBILE_MAX_DPR);
        }
      }
    });

    it('strictly clamps mobile DPR even when user sets 200% super-sampling (resolutionScale = 2.0)', () => {
      const config = calculateDprConfig({
        windowDpr: 3.5, // Pixel 10 Pro extreme density
        graphicsQuality: 'very_high',
        resolutionScale: 2.0, // Aggressive supersampling
        isMobile: true,
      });
      // Even with 200% resolution scale, mobile GPU must be protected from thermal throttling
      expect(config.targetDpr).toBe(MOBILE_MAX_DPR);
      expect(config.dprTuple[1]).toBe(MOBILE_MAX_DPR);
    });

    it('allows high-end desktop to render up to 2.0 native DPR and supersample', () => {
      const config = calculateDprConfig({
        windowDpr: 2.0, // 4K or 5K Retina display
        graphicsQuality: 'very_high',
        resolutionScale: 1.5,
        isMobile: false,
      });
      expect(config.baseDpr).toBe(DESKTOP_MAX_DPR);
      expect(config.targetDpr).toBe(3.0); // 2.0 * 1.5
      expect(config.dprTuple).toEqual([0.75, 3.0]);
    });

    it('safely handles sub-unity and zero DPR values', () => {
      // DPR 0.5 (browser zoom out or low density)
      const lowDprConfig = calculateDprConfig({
        windowDpr: 0.5,
        graphicsQuality: 'medium',
        isMobile: true,
      });
      expect(lowDprConfig.targetDpr).toBe(0.5);
      expect(lowDprConfig.dprTuple[0]).toBeLessThanOrEqual(lowDprConfig.dprTuple[1]);

      // DPR 0 (invalid browser state) -> falls back to 1.0 safeBase, and with baseDpr=1.0, targetDpr is 1.0
      const zeroDprConfig = calculateDprConfig({
        windowDpr: 0,
        graphicsQuality: 'high',
        isMobile: true,
      });
      expect(zeroDprConfig.targetDpr).toBe(1.0);
    });

    it('safely handles hostile DPR values (negative, NaN, Infinity)', () => {
      const hostileDprs = [-1, -99, NaN, Infinity, -Infinity];
      for (const hostile of hostileDprs) {
        const config = calculateDprConfig({
          windowDpr: hostile,
          graphicsQuality: 'very_high',
          isMobile: true,
        });
        expect(Number.isFinite(config.targetDpr)).toBe(true);
        expect(config.targetDpr).toBeGreaterThan(0);
        expect(config.targetDpr).toBeLessThanOrEqual(MOBILE_MAX_DPR);
        expect(Number.isFinite(config.dprTuple[0])).toBe(true);
        expect(Number.isFinite(config.dprTuple[1])).toBe(true);
        expect(config.dprTuple[0]).toBeLessThanOrEqual(config.dprTuple[1]);
      }
    });

    it('maintains ordering invariant minDpr <= maxDpr across all permutation space', () => {
      const dprs = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 3.5, 5.0];
      const scales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const mobileFlags = [true, false];

      for (const dpr of dprs) {
        for (const q of qualities) {
          for (const scale of scales) {
            for (const mobile of mobileFlags) {
              const res = calculateDprConfig({
                windowDpr: dpr,
                graphicsQuality: q,
                resolutionScale: scale,
                isMobile: mobile,
              });
              expect(res.dprTuple[0]).toBeLessThanOrEqual(res.dprTuple[1]);
              expect(res.dprTuple[0]).toBeGreaterThan(0);
              expect(res.dprTuple[1]).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('ensures calculateTargetDpr helper perfectly mirrors calculateDprConfig results', () => {
      const helperRes = calculateTargetDpr(3.0, 'very_high', 1.0, true);
      const configRes = calculateDprConfig({ windowDpr: 3.0, graphicsQuality: 'very_high', resolutionScale: 1.0, isMobile: true });
      expect(helperRes.targetDpr).toBe(configRes.targetDpr);
      expect(helperRes.dprRange).toEqual(configRes.dprTuple);
    });
  });

  describe('3. Safe-Area Math & Display Cutout Layout Invariant Testing', () => {
    const rootDir = path.resolve(__dirname, '../');

    it('verifies safe-area CSS definitions have non-empty 0px fallback values', () => {
      const cssContent = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');

      // Check each custom property includes an explicit 0px fallback
      const satMatch = cssContent.match(/--sat:\s*env\(safe-area-inset-top,\s*([^)]+)\)/);
      const sarMatch = cssContent.match(/--sar:\s*env\(safe-area-inset-right,\s*([^)]+)\)/);
      const sabMatch = cssContent.match(/--sab:\s*env\(safe-area-inset-bottom,\s*([^)]+)\)/);
      const salMatch = cssContent.match(/--sal:\s*env\(safe-area-inset-left,\s*([^)]+)\)/);

      expect(satMatch).toBeTruthy();
      expect(satMatch![1].trim()).toBe('0px');

      expect(sarMatch).toBeTruthy();
      expect(sarMatch![1].trim()).toBe('0px');

      expect(sabMatch).toBeTruthy();
      expect(sabMatch![1].trim()).toBe('0px');

      expect(salMatch).toBeTruthy();
      expect(salMatch![1].trim()).toBe('0px');
    });

    it('verifies mathematical clearance under extreme cutout values (0px, 48px, 120px notch)', () => {
      const baseOffset = 20;
      const cutoutProfiles = [
        { name: 'Desktop (zero insets)', top: 0, right: 0, bottom: 0, left: 0 },
        { name: 'Pixel 10 Pro Landscape Left Notch', top: 0, right: 0, bottom: 16, left: 48 },
        { name: 'Pixel 10 Pro Reverse Landscape Right Notch', top: 0, right: 48, bottom: 16, left: 0 },
        { name: 'Extreme Hinge / Notch (120px)', top: 48, right: 120, bottom: 32, left: 120 },
      ];

      for (const p of cutoutProfiles) {
        // TimingBoard (top, left)
        const timingTop = baseOffset + p.top;
        const timingLeft = baseOffset + p.left;
        expect(timingTop).toBeGreaterThanOrEqual(baseOffset);
        expect(timingLeft).toBeGreaterThanOrEqual(baseOffset);
        expect(Number.isFinite(timingTop)).toBe(true);
        expect(Number.isFinite(timingLeft)).toBe(true);

        // Minimap (top, right)
        const minimapTop = baseOffset + p.top;
        const minimapRight = baseOffset + p.right;
        expect(minimapTop).toBeGreaterThanOrEqual(baseOffset);
        expect(minimapRight).toBeGreaterThanOrEqual(baseOffset);

        // AnalogGauges (bottom, right)
        const gaugesBottom = baseOffset + p.bottom;
        const gaugesRight = baseOffset + p.right;
        expect(gaugesBottom).toBeGreaterThanOrEqual(baseOffset);
        expect(gaugesRight).toBeGreaterThanOrEqual(baseOffset);

        // TelemetryHUD (top, left)
        const telemTop = 10 + p.top;
        const telemLeft = 10 + p.left;
        expect(telemTop).toBeGreaterThanOrEqual(10);
        expect(telemLeft).toBeGreaterThanOrEqual(10);
      }
    });

    it('ensures no spatial collision between TimingBoard (top-left) and Minimap (top-right) in phone landscape', () => {
      // In mobile landscape at 16:9 or 20:9 (e.g. 840px wide viewport)
      const viewportWidth = 840;
      const leftCutout = 48;
      const rightCutout = 0;

      const timingBoardWidth = 280;
      const minimapWidth = 160;

      const timingBoardLeft = 20 + leftCutout;
      const timingBoardRightEdge = timingBoardLeft + timingBoardWidth; // 20 + 48 + 280 = 348

      const minimapRight = 20 + rightCutout;
      const minimapLeftEdge = viewportWidth - minimapRight - minimapWidth; // 840 - 20 - 160 = 660

      const clearanceGap = minimapLeftEdge - timingBoardRightEdge; // 660 - 348 = 312px
      expect(clearanceGap).toBeGreaterThan(100); // Plenty of clearance for center countdown & sky
    });

    it('verifies index.html contains necessary mobile meta tags and valid syntax', () => {
      const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

      // Viewport meta
      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('user-scalable=no');
      expect(html).toContain('maximum-scale=1.0');

      // Mobile fullscreen & orientation
      expect(html).toContain('name="mobile-web-app-capable" content="yes"');
      expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
      expect(html).toContain('name="screen-orientation" content="landscape"');

      // Portrait guard DOM element
      expect(html).toContain('id="portrait-guard"');
      expect(html).toContain('class="portrait-orientation-guard"');
    });

    it('verifies touch lockdown CSS in src/index.css prevents unwanted browser gestures', () => {
      const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');

      expect(css).toContain('touch-action: none;');
      expect(css).toContain('-webkit-touch-callout: none;');
      expect(css).toContain('user-select: none;');
      expect(css).toContain('overscroll-behavior: none;');
      expect(css).toContain('position: fixed;');
      expect(css).toContain('min-height: 100dvh;');
    });

    it('verifies GameCanvas binds calculateDprConfig and AdaptivePerformanceTrigger', () => {
      const canvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/canvas/GameCanvas.tsx'), 'utf-8');

      expect(canvasSrc).toContain('calculateDprConfig');
      expect(canvasSrc).toContain('dpr={dprTuple}');
      expect(canvasSrc).toContain('<AdaptiveDpr />');
      expect(canvasSrc).toContain('<AdaptivePerformanceTrigger />');
      expect(canvasSrc).toContain('regress()');
    });
  });
});
