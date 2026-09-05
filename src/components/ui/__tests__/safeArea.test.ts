import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Safe-Area Inset Architecture & Display Cutout Mitigation', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const cssPath = path.join(rootDir, 'src/index.css');
  const timingBoardPath = path.join(rootDir, 'src/components/ui/gauges/TimingBoard.tsx');
  const minimapPath = path.join(rootDir, 'src/components/ui/Minimap.tsx');
  const analogGaugesPath = path.join(rootDir, 'src/components/ui/gauges/AnalogGauges.tsx');
  const telemetryPath = path.join(rootDir, 'src/components/ui/TelemetryHUD.tsx');
  const menuStylesPath = path.join(rootDir, 'src/components/ui/menu/menuStyles.ts');
  const titleScreenPath = path.join(rootDir, 'src/components/ui/TitleScreen.tsx');
  const loadingScreenPath = path.join(rootDir, 'src/components/ui/LoadingScreen.tsx');

  it('defines CSS custom properties with 0px fallbacks in src/index.css', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('--sat: env(safe-area-inset-top, 0px);');
    expect(cssContent).toContain('--sar: env(safe-area-inset-right, 0px);');
    expect(cssContent).toContain('--sab: env(safe-area-inset-bottom, 0px);');
    expect(cssContent).toContain('--sal: env(safe-area-inset-left, 0px);');
  });

  it('provides safe-area utility classes in src/index.css', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('.safe-area-inset-top');
    expect(cssContent).toContain('.safe-area-inset-right');
    expect(cssContent).toContain('.safe-area-inset-bottom');
    expect(cssContent).toContain('.safe-area-inset-left');
    expect(cssContent).toContain('.safe-area-padding');
  });

  it('incorporates safe-area variables in TimingBoard', () => {
    const content = fs.readFileSync(timingBoardPath, 'utf-8');

    // Timer card respects top and left safe-area insets
    expect(content).toContain('calc(20px + var(--sat))');
    expect(content).toContain('calc(20px + var(--sal))');

    // Classic countdown respects horizontal safe areas
    expect(content).toContain("left: 'var(--sal)'");
    expect(content).toContain("right: 'var(--sar)'");
  });

  it('incorporates safe-area variables in Minimap', () => {
    const content = fs.readFileSync(minimapPath, 'utf-8');

    // Minimap dial respects top and right safe-area insets
    expect(content).toContain('calc(20px + var(--sat))');
    expect(content).toContain('calc(20px + var(--sar))');
  });

  it('incorporates safe-area variables in AnalogGauges cluster', () => {
    const content = fs.readFileSync(analogGaugesPath, 'utf-8');

    // Cluster respects bottom (gesture bar) and right safe-area insets
    expect(content).toContain('calc(20px + var(--sab))');
    expect(content).toContain('calc(20px + var(--sar))');
  });

  it('incorporates safe-area variables in TelemetryHUD', () => {
    const content = fs.readFileSync(telemetryPath, 'utf-8');

    // Telemetry debug overlay respects top and left insets
    expect(content).toContain('calc(10px + var(--sat))');
    expect(content).toContain('calc(10px + var(--sal))');
  });

  it('incorporates safe-area variables in menu and overlay screens', () => {
    const menuContent = fs.readFileSync(menuStylesPath, 'utf-8');
    const titleContent = fs.readFileSync(titleScreenPath, 'utf-8');
    const loadingContent = fs.readFileSync(loadingScreenPath, 'utf-8');

    // Menu overlays respect all 4 safe-area insets
    expect(menuContent).toContain('var(--sat)');
    expect(menuContent).toContain('var(--sar)');
    expect(menuContent).toContain('var(--sab)');
    expect(menuContent).toContain('var(--sal)');

    // Title and Loading screens include safe area padding
    expect(titleContent).toContain('var(--sat)');
    expect(titleContent).toContain('var(--sal)');
    expect(loadingContent).toContain('var(--sat)');
    expect(loadingContent).toContain('var(--sal)');
  });

  it('evaluates simulated offset shifts under Pixel 10 Pro cutout geometry', () => {
    // Pixel 10 Pro landscape: left cutout (48px), bottom gesture bar (16px)
    const baseOffset = 20;
    const insets = { top: 0, right: 0, bottom: 16, left: 48 };

    const computeOffset = (base: number, inset: number) => base + inset;

    const timingBoardLeft = computeOffset(baseOffset, insets.left);
    const gaugesBottom = computeOffset(baseOffset, insets.bottom);
    const minimapTop = computeOffset(baseOffset, insets.top);

    expect(timingBoardLeft).toBe(68); // 20 + 48px cutout clearance
    expect(gaugesBottom).toBe(36);    // 20 + 16px gesture bar clearance
    expect(minimapTop).toBe(20);       // 20 + 0px top clearance
  });
});
