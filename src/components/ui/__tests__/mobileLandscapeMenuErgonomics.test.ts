import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { menuStyles } from '../menu/menuStyles';

describe('Milestone M2: Mobile-First Landscape Menu & Ergonomics Verification', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const cssPath = path.join(rootDir, 'src/index.css');
  const settingsViewPath = path.join(rootDir, 'src/components/ui/menu/SettingsView.tsx');
  const garageViewPath = path.join(rootDir, 'src/components/ui/menu/GarageView.tsx');
  const mainViewPath = path.join(rootDir, 'src/components/ui/menu/MainView.tsx');
  const menuOverlayPath = path.join(rootDir, 'src/components/ui/MenuOverlay.tsx');
  const trackSelectViewPath = path.join(rootDir, 'src/components/ui/menu/TrackSelectView.tsx');
  const controlsViewPath = path.join(rootDir, 'src/components/ui/menu/ControlsView.tsx');
  const touchControlsOverlayPath = path.join(rootDir, 'src/components/ui/TouchControlsOverlay.tsx');

  describe('1. Universal Touch Target Sizing (>= 44x44px)', () => {
    it('verifies menuStyles defines interactive elements with >= 44px height/width', () => {
      // Buttons
      expect(menuStyles.button.minHeight).toBe('44px');
      expect(menuStyles.tabButton.minHeight).toBe('44px');
      expect(menuStyles.select.minHeight).toBe('44px');

      // Checkbox touch target
      expect(menuStyles.checkbox.minWidth).toBe('44px');
      expect(menuStyles.checkbox.minHeight).toBe('44px');
    });

    it('verifies GarageView turntable zoom and reset buttons are >= 44x44px', () => {
      const garageContent = fs.readFileSync(garageViewPath, 'utf-8');
      expect(garageContent).toMatch(/width:\s*['"]44px['"]/);
      expect(garageContent).toMatch(/height:\s*['"]44px['"]/);
      expect(garageContent).toMatch(/minWidth:\s*['"]44px['"]/);
      expect(garageContent).toMatch(/minHeight:\s*['"]44px['"]/);
    });

    it('verifies TouchControlsOverlay clamps minimum button size to 44px in all modes', () => {
      const touchContent = fs.readFileSync(touchControlsOverlayPath, 'utf-8');
      // Verify utility buttons clamp to 44px
      expect(touchContent).toContain('Math.max(44, Math.round(44 * sizeMultiplier))');
      // Verify handbrake clamp to 44px
      expect(touchContent).toContain('Math.max(44, Math.round(48 * sizeMultiplier))');
    });

    it('verifies SettingsView interactive toggles and buttons meet 44px ergonomics', () => {
      const settingsContent = fs.readFileSync(settingsViewPath, 'utf-8');
      // Checkbox container touch targets
      expect(settingsContent).toMatch(/minHeight:\s*['"]44px['"]/);
      expect(settingsContent).toMatch(/minWidth:\s*['"]48px['"]/);
      // Haptics and Clear records buttons
      expect(settingsContent).toContain("minHeight: '44px'");
    });

    it('verifies ControlsView tab buttons meet 44px ergonomics', () => {
      const controlsContent = fs.readFileSync(controlsViewPath, 'utf-8');
      expect(controlsContent).toMatch(/minHeight:\s*['"]44px['"]/);
    });
  });

  describe('2. Safe-Area Inset Architecture and Streamlined Padding', () => {
    it('verifies menuStyles provides streamlined 8px vertical padding with all 4 safe-area insets', () => {
      const overlayPadding = String(menuStyles.overlayMenu.padding);
      const pausePadding = String(menuStyles.pauseOverlayMenu.padding);

      // Verify streamlined 8px top/bottom padding with safe-area variables
      expect(overlayPadding).toContain('calc(8px + var(--sat))');
      expect(overlayPadding).toContain('calc(16px + var(--sar))');
      expect(overlayPadding).toContain('calc(8px + var(--sab))');
      expect(overlayPadding).toContain('calc(16px + var(--sal))');

      expect(pausePadding).toContain('calc(8px + var(--sat))');
      expect(pausePadding).toContain('calc(16px + var(--sar))');
      expect(pausePadding).toContain('calc(8px + var(--sab))');
      expect(pausePadding).toContain('calc(16px + var(--sal))');
    });

    it('verifies subView constrains maxHeight to dynamic viewport minus safe areas', () => {
      const subView = menuStyles.subView;
      expect(subView.maxHeight).toBe('calc(100dvh - var(--sat) - var(--sab) - 16px)');
      expect(subView.overflowY).toBe('auto');
    });
  });

  describe('3. Mobile Landscape Layouts in CSS', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('contains mobile landscape media query targetting viewport height <= 500px', () => {
      expect(cssContent).toContain('@media (max-height: 500px) and (orientation: landscape)');
    });

    it('defines responsive 2x3 grid for Main Menu', () => {
      expect(cssContent).toContain('.menu-action-grid');
      expect(cssContent).toMatch(/\.menu-action-grid\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
    });

    it('defines 2-column horizontal split for Pause Menu', () => {
      expect(cssContent).toContain('.pause-split-layout');
      expect(cssContent).toMatch(/\.pause-split-layout\s*\{[^}]*grid-template-columns:\s*42%\s+58%/);
      expect(cssContent).toContain('.pause-banner-card');
    });

    it('defines 2-column side-by-side layout for Garage turntable and specs', () => {
      expect(cssContent).toContain('.garage-split-layout');
      expect(cssContent).toMatch(/\.garage-split-layout\s*\{[^}]*grid-template-columns:\s*48%\s+52%/);
      expect(cssContent).toContain('.garage-canvas-box');
      expect(cssContent).toContain('.garage-details-box');
    });

    it('defines 2x2 grid layout for Track Select screen', () => {
      expect(cssContent).toContain('.track-grid-layout');
      expect(cssContent).toMatch(/\.track-grid-layout\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
      expect(cssContent).toContain('.track-card-compact');
      expect(cssContent).toContain('.track-thumb-compact');
      expect(cssContent).toContain('.track-desc-compact');
    });

    it('defines 2-column layout for Controls screen', () => {
      expect(cssContent).toContain('.controls-help-grid');
      expect(cssContent).toMatch(/\.controls-help-grid\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
    });
  });

  describe('4. Component Structure and Tab Categorization', () => {
    it('verifies SettingsView has 4 categorized tabs: Graphics, Audio, Touch Controls, Gameplay', () => {
      const settingsContent = fs.readFileSync(settingsViewPath, 'utf-8');
      expect(settingsContent).toContain("'graphics'");
      expect(settingsContent).toContain("'audio'");
      expect(settingsContent).toContain("'touch'");
      expect(settingsContent).toContain("'gameplay'");
      expect(settingsContent).toContain('activeTab');
    });

    it('verifies MainView renders menu-action-grid container and action sublabels', () => {
      const mainContent = fs.readFileSync(mainViewPath, 'utf-8');
      expect(mainContent).toContain('menu-action-grid');
      expect(mainContent).toContain('pause-action-list');
      expect(mainContent).toContain('menu-action-sublabel');
    });

    it('verifies MenuOverlay renders pause-split-layout and pause-banner-card', () => {
      const overlayContent = fs.readFileSync(menuOverlayPath, 'utf-8');
      expect(overlayContent).toContain('pause-split-layout');
      expect(overlayContent).toContain('pause-banner-card');
    });

    it('verifies TrackSelectView renders track-grid-layout and compact cards', () => {
      const trackContent = fs.readFileSync(trackSelectViewPath, 'utf-8');
      expect(trackContent).toContain('track-grid-layout');
      expect(trackContent).toContain('track-card-compact');
    });
  });
});
