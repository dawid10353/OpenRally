import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('M1 Viewport & Meta Configuration Verification', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  it('verifies index.html has viewport-fit=cover, maximum-scale=1.0, user-scalable=no', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(html).toMatch(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*viewport-fit=cover/i);
    expect(html).toMatch(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*user-scalable=no/i);
    expect(html).toMatch(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*maximum-scale=1\.0/i);
  });

  it('verifies index.html has mobile app and landscape meta tags', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(html).toMatch(/<meta[^>]*name=["']mobile-web-app-capable["'][^>]*content=["']yes["']/i);
    expect(html).toMatch(/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i);
    expect(html).toMatch(/<meta[^>]*name=["']apple-mobile-web-app-status-bar-style["'][^>]*content=["']black-translucent["']/i);
    expect(html).toMatch(/<meta[^>]*name=["']screen-orientation["'][^>]*content=["']landscape["']/i);
    expect(html).toMatch(/<meta[^>]*name=["']format-detection["'][^>]*content=["']telephone=no["']/i);
  });

  it('verifies index.html contains portrait orientation guard element', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(html).toContain('id="portrait-guard"');
    expect(html).toContain('class="portrait-orientation-guard"');
    expect(html).toContain('PLEASE ROTATE YOUR DEVICE');
  });

  it('verifies src/index.css defines safe-area custom properties', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/--sat:\s*env\(safe-area-inset-top,\s*0px\);/);
    expect(css).toMatch(/--sar:\s*env\(safe-area-inset-right,\s*0px\);/);
    expect(css).toMatch(/--sab:\s*env\(safe-area-inset-bottom,\s*0px\);/);
    expect(css).toMatch(/--sal:\s*env\(safe-area-inset-left,\s*0px\);/);
  });

  it('verifies src/index.css locks down touch-action, user-select, and overscroll', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/touch-action:\s*none/);
    expect(css).toMatch(/-webkit-touch-callout:\s*none/);
    expect(css).toMatch(/user-select:\s*none/);
    expect(css).toMatch(/overscroll-behavior:\s*none/);
    expect(css).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });

  it('verifies src/index.css has media query for orientation portrait guard', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/@media\s+screen\s+and\s+\(orientation:\s*portrait\)/);
    expect(css).toMatch(/\.portrait-orientation-guard\s*\{[^}]*display:\s*flex/);
  });

  it('verifies src/index.css enforces dynamic viewport units and fixed positioning', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('min-height: 100dvh;');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('inset: 0;');
  });
});
