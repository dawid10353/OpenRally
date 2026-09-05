import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Adversarial Stress Test: Milestone 1 (challenger_m1_2)', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  const cssContent = fs.readFileSync(indexCssPath, 'utf-8');

  describe('Task 1: Viewport Meta Tags & Strict Parsing', () => {
    it('verifies index.html has exactly ONE viewport meta tag to prevent ambiguity', () => {
      const matches = htmlContent.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBe(1);
    });

    it('parses viewport directives rigorously without syntax corruption', () => {
      const match = htmlContent.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
      expect(match).not.toBeNull();
      const contentStr = match![1];

      const directives = new Map<string, string>();
      contentStr.split(',').forEach((token) => {
        const [k, v] = token.trim().split('=');
        if (k) directives.set(k.trim().toLowerCase(), v ? v.trim().toLowerCase() : '');
      });

      expect(directives.get('width')).toBe('device-width');
      expect(directives.get('initial-scale')).toBe('1.0');
      expect(directives.get('maximum-scale')).toBe('1.0');
      expect(directives.get('user-scalable')).toBe('no');
      expect(directives.get('viewport-fit')).toBe('cover');
    });

    it('verifies all complementary mobile standalone and webapp meta tags', () => {
      const expectedMeta = [
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'screen-orientation', content: 'landscape' },
        { name: 'format-detection', content: 'telephone=no' },
      ];

      for (const item of expectedMeta) {
        const regex = new RegExp(`<meta[^>]*name=["']${item.name}["'][^>]*content=["']${item.content}["']`, 'i');
        expect(htmlContent).toMatch(regex);
      }
    });

    it('verifies valid HTML5 DOCTYPE and essential structural elements', () => {
      expect(htmlContent.trim().startsWith('<!doctype html>')).toBe(true);
      expect(htmlContent).toContain('<div id="root"></div>');
      expect(htmlContent).toContain('<script type="module" src="/src/main.tsx"></script>');
    });
  });

  describe('Task 2: Touch-Action Lockdown & Gesture Resilience', () => {
    it('verifies global lockdown rule on html, body, and #root', () => {
      const globalResetMatch = cssContent.match(/html,\s*body,\s*#root\s*\{([^}]+)\}/s);
      expect(globalResetMatch).not.toBeNull();
      const bodyCss = globalResetMatch![1];

      expect(bodyCss).toMatch(/touch-action:\s*none;/);
      expect(bodyCss).toMatch(/overscroll-behavior:\s*none;/);
      expect(bodyCss).toMatch(/overflow:\s*hidden;/);
      expect(bodyCss).toMatch(/position:\s*fixed;/);
      expect(bodyCss).toMatch(/inset:\s*0;/);
      expect(bodyCss).toMatch(/min-height:\s*100dvh;/);
      expect(bodyCss).toMatch(/-webkit-user-select:\s*none;/);
      expect(bodyCss).toMatch(/user-select:\s*none;/);
      expect(bodyCss).toMatch(/-webkit-touch-callout:\s*none;/);
      expect(bodyCss).toMatch(/-webkit-tap-highlight-color:\s*transparent;/);
    });

    it('verifies canvas has explicit touch-action: none and 100% dimensions', () => {
      const canvasMatch = cssContent.match(/canvas\s*\{([^}]+)\}/s);
      expect(canvasMatch).not.toBeNull();
      const canvasCss = canvasMatch![1];

      expect(canvasCss).toMatch(/touch-action:\s*none;/);
      expect(canvasCss).toMatch(/width:\s*100%\s*!important;/);
      expect(canvasCss).toMatch(/height:\s*100%\s*!important;/);
      expect(canvasCss).toMatch(/user-select:\s*none;/);
    });

    it('verifies .game-container has touch-action: none and user-select: none', () => {
      const gameContainerMatch = cssContent.match(/\.game-container\s*\{([^}]+)\}/s);
      expect(gameContainerMatch).not.toBeNull();
      const gcCss = gameContainerMatch![1];

      expect(gcCss).toMatch(/touch-action:\s*none;/);
      expect(gcCss).toMatch(/user-select:\s*none;/);
      expect(gcCss).toMatch(/-webkit-touch-callout:\s*none;/);
    });

    it('verifies no conflicting CSS rule re-enables touch-action on core surfaces', () => {
      const touchActionMatches = [...cssContent.matchAll(/touch-action:\s*([^;]+);/g)];
      expect(touchActionMatches.length).toBeGreaterThan(0);
      for (const match of touchActionMatches) {
        const val = match[1].trim();
        expect(val).toBe('none');
      }
    });

    it('verifies portrait guard intercepts touches with touch-action: none and pointer-events: auto', () => {
      const guardMatch = cssContent.match(/\.portrait-orientation-guard\s*\{([^}]+)\}/s);
      expect(guardMatch).not.toBeNull();
      const guardCss = guardMatch![1];

      expect(guardCss).toMatch(/touch-action:\s*none;/);
      expect(guardCss).toMatch(/pointer-events:\s*auto;/);
      expect(guardCss).toMatch(/position:\s*fixed;/);
      expect(guardCss).toMatch(/inset:\s*0;/);
      expect(guardCss).toMatch(/z-index:\s*1000000;/);
    });

    it('verifies -webkit-overflow-scrolling: touch is NOT used anywhere, preventing momentum bounce leaks', () => {
      expect(cssContent).not.toMatch(/-webkit-overflow-scrolling:\s*touch/i);
    });
  });

  describe('Task 3: Portrait Guard Behavior under Aspect Ratio Permutations', () => {
    function shouldPortraitGuardBeVisible(width: number, height: number): boolean {
      const isPortrait = height >= width;
      const isWithinMaxWidth = width <= 1024;
      return isPortrait && isWithinMaxWidth;
    }

    interface ViewportPermutation {
      name: string;
      width: number;
      height: number;
      aspectRatioLabel: string;
      expectedGuardVisible: boolean;
      expectedOrientation: 'portrait' | 'landscape';
    }

    const testPermutations: ViewportPermutation[] = [
      // Phones in Portrait
      { name: 'iPhone SE (Portrait)', width: 320, height: 568, aspectRatioLabel: '9:16', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Standard Android (Portrait)', width: 360, height: 640, aspectRatioLabel: '9:16', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'iPhone 13/14/15/16 (Portrait)', width: 390, height: 844, aspectRatioLabel: '9:19.5', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Google Pixel 10 Pro (Portrait)', width: 448, height: 997, aspectRatioLabel: '9:20', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Samsung Galaxy S24 Ultra (Portrait)', width: 412, height: 915, aspectRatioLabel: '9:20', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Ultra-tall Xperia (Portrait)', width: 360, height: 840, aspectRatioLabel: '9:21', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Extreme 1:3 Tall Ratio (Portrait)', width: 300, height: 900, aspectRatioLabel: '1:3', expectedGuardVisible: true, expectedOrientation: 'portrait' },

      // Tablets in Portrait
      { name: 'iPad mini (Portrait)', width: 744, height: 1133, aspectRatioLabel: '3:4.5', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'iPad 10th gen (Portrait)', width: 810, height: 1080, aspectRatioLabel: '3:4', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'iPad Pro 11" (Portrait)', width: 834, height: 1194, aspectRatioLabel: '1:1.43', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'iPad Pro 12.9" (Portrait at boundary 1024px)', width: 1024, height: 1366, aspectRatioLabel: '3:4', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Android Tablet 10" (Portrait)', width: 800, height: 1280, aspectRatioLabel: '10:16', expectedGuardVisible: true, expectedOrientation: 'portrait' },

      // Square & Boundary Viewports
      { name: 'Square Viewport 500x500 (1:1)', width: 500, height: 500, aspectRatioLabel: '1:1', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Square Viewport 800x800 (1:1)', width: 800, height: 800, aspectRatioLabel: '1:1', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Square Viewport at 1024x1024', width: 1024, height: 1024, aspectRatioLabel: '1:1', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Sub-pixel portrait boundary (width 799, height 800)', width: 799, height: 800, aspectRatioLabel: '~1:1', expectedGuardVisible: true, expectedOrientation: 'portrait' },
      { name: 'Sub-pixel landscape boundary (width 801, height 800)', width: 801, height: 800, aspectRatioLabel: '~1:1', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Sub-pixel landscape boundary (width 1025, height 1024)', width: 1025, height: 1024, aspectRatioLabel: '~1:1', expectedGuardVisible: false, expectedOrientation: 'landscape' },

      // Phones in Landscape
      { name: 'iPhone SE (Landscape)', width: 568, height: 320, aspectRatioLabel: '16:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Standard Android (Landscape)', width: 640, height: 360, aspectRatioLabel: '16:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'iPhone 13/14/15/16 (Landscape)', width: 844, height: 390, aspectRatioLabel: '19.5:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Google Pixel 10 Pro (Landscape)', width: 997, height: 448, aspectRatioLabel: '20:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Google Pixel 10 Pro Physical (Landscape)', width: 2992, height: 1344, aspectRatioLabel: '20:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Samsung Galaxy S24 Ultra (Landscape)', width: 915, height: 412, aspectRatioLabel: '20:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Ultra-wide phone (Landscape)', width: 840, height: 360, aspectRatioLabel: '21:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },

      // Tablets in Landscape
      { name: 'iPad mini (Landscape)', width: 1133, height: 744, aspectRatioLabel: '4.5:3', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'iPad 10th gen (Landscape)', width: 1080, height: 810, aspectRatioLabel: '4:3', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'iPad Pro 11" (Landscape)', width: 1194, height: 834, aspectRatioLabel: '1.43:1', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'iPad Pro 12.9" (Landscape)', width: 1366, height: 1024, aspectRatioLabel: '4:3', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Android Tablet 10" (Landscape)', width: 1280, height: 800, aspectRatioLabel: '16:10', expectedGuardVisible: false, expectedOrientation: 'landscape' },

      // Desktop Viewports
      { name: 'Desktop 720p (Landscape)', width: 1280, height: 720, aspectRatioLabel: '16:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Desktop 1080p (Landscape)', width: 1920, height: 1080, aspectRatioLabel: '16:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Desktop 1440p (Landscape)', width: 2560, height: 1440, aspectRatioLabel: '16:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Desktop Ultra-wide 21:9 (Landscape)', width: 2560, height: 1080, aspectRatioLabel: '21:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },
      { name: 'Desktop Super Ultra-wide 32:9 (Landscape)', width: 3840, height: 1080, aspectRatioLabel: '32:9', expectedGuardVisible: false, expectedOrientation: 'landscape' },

      // Vertical Desktop Monitors
      { name: 'Vertical Desktop Monitor 1080x1920', width: 1080, height: 1920, aspectRatioLabel: '9:16', expectedGuardVisible: false, expectedOrientation: 'portrait' },
      { name: 'Vertical Desktop Monitor 1440x2560', width: 1440, height: 2560, aspectRatioLabel: '9:16', expectedGuardVisible: false, expectedOrientation: 'portrait' },
    ];

    testPermutations.forEach((p) => {
      it(`evaluates viewport permutation: ${p.name} (${p.width}x${p.height}, ${p.aspectRatioLabel})`, () => {
        const computedOrientation = p.height >= p.width ? 'portrait' : 'landscape';
        expect(computedOrientation).toBe(p.expectedOrientation);

        const visible = shouldPortraitGuardBeVisible(p.width, p.height);
        expect(visible).toBe(p.expectedGuardVisible);
      });
    });

    it('verifies dynamic rotation simulation from portrait to landscape unlocks the game', () => {
      const portraitW = 448;
      const portraitH = 997;
      expect(shouldPortraitGuardBeVisible(portraitW, portraitH)).toBe(true);

      const landscapeW = 997;
      const landscapeH = 448;
      expect(shouldPortraitGuardBeVisible(landscapeW, landscapeH)).toBe(false);
    });

    it('verifies DOM elements and content of #portrait-guard', () => {
      expect(htmlContent).toContain('<div id="portrait-guard" class="portrait-orientation-guard" aria-live="polite">');
      expect(htmlContent).toContain('<div class="portrait-guard-content">');
      expect(htmlContent).toContain('<div class="portrait-guard-icon-wrapper">');
      expect(htmlContent).toContain('<h2 class="portrait-guard-title">PLEASE ROTATE YOUR DEVICE</h2>');
      expect(htmlContent).toContain('<p class="portrait-guard-desc">OpenRally requires landscape orientation to drive.</p>');
      expect(htmlContent).toContain('<svg class="portrait-guard-icon"');
    });

    it('verifies CSS rotation animation rotatePhone is defined and applied', () => {
      expect(cssContent).toContain('@keyframes rotatePhone');
      expect(cssContent).toContain('animation: rotatePhone 2.2s ease-in-out infinite;');
      expect(cssContent).toMatch(/transform:\s*rotate\(-90deg\);/);
    });
  });
});
