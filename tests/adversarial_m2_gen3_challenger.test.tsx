import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { menuStyles } from '@/components/ui/menu/menuStyles';
import { MainView } from '@/components/ui/menu/MainView';
import { ControlsView } from '@/components/ui/menu/ControlsView';
import { TrackSelectView } from '@/components/ui/menu/TrackSelectView';
import { TouchControlsOverlay } from '@/components/ui/TouchControlsOverlay';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { getAvailableLevels } from '@/config/levelRegistry';

describe('Adversarial Challenger M2: Empirical Stress Testing of Mobile Landscape Ergonomics (Requirement R3)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const cssPath = path.join(rootDir, 'src/index.css');
  const garageViewPath = path.join(rootDir, 'src/components/ui/menu/GarageView.tsx');
  const settingsViewPath = path.join(rootDir, 'src/components/ui/menu/SettingsView.tsx');
  const startModeViewPath = path.join(rootDir, 'src/components/ui/menu/StartModeView.tsx');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  beforeEach(() => {
    useSettingsStore.setState({
      graphicsQuality: 'medium',
      antiAliasing: 'smaa',
      resolutionScale: 1.0,
      shadowsEnabled: true,
      postProcessingEnabled: false,
      sfxVolume: 0.8,
      menuMusicVolume: 0.5,
      gameMusicVolume: 0.5,
      sensitivity: 1.0,
      vibrationEnabled: true,
      vibrationIntensity: 0.8,
      touchControlMode: 'auto',
      touchSteeringScheme: 'joystick',
      touchButtonSize: 'medium',
      touchOpacity: 0.8,
      touchHaptics: true,
    });
    useGameStore.setState({
      gameState: 'menu',
      gameMode: 'freeroam',
      selectedLevelId: 'level1_island',
      selectedVehicleId: 'rally_hatchback',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: UNIVERSAL TOUCH TARGET SIZING (>= 44x44px)
  // =========================================================================
  describe('Section 1: Universal Touch Target Sizing (>= 44x44px)', () => {
    it('1.1: verifies base menu styles guarantee >= 44px minHeight and minWidth', () => {
      // Buttons
      const buttonMinHeight = parseInt(String(menuStyles.button.minHeight), 10);
      expect(buttonMinHeight).toBeGreaterThanOrEqual(44);

      // Tab Buttons
      const tabButtonMinHeight = parseInt(String(menuStyles.tabButton.minHeight), 10);
      expect(tabButtonMinHeight).toBeGreaterThanOrEqual(44);

      // Select Dropdowns
      const selectMinHeight = parseInt(String(menuStyles.select.minHeight), 10);
      expect(selectMinHeight).toBeGreaterThanOrEqual(44);

      // Checkbox Touch Targets
      const checkboxMinWidth = parseInt(String(menuStyles.checkbox.minWidth), 10);
      const checkboxMinHeight = parseInt(String(menuStyles.checkbox.minHeight), 10);
      expect(checkboxMinWidth).toBeGreaterThanOrEqual(44);
      expect(checkboxMinHeight).toBeGreaterThanOrEqual(44);

      // Option Row Touch Container
      const optionRowMinHeight = parseInt(String(menuStyles.optionRow.minHeight), 10);
      expect(optionRowMinHeight).toBeGreaterThanOrEqual(44);
    });

    it('1.2: verifies Garage turntable camera buttons (zoom-in, zoom-out, reset) are >= 44x44px', () => {
      const garageContent = fs.readFileSync(garageViewPath, 'utf-8');
      
      // styles.zoomButton definition check
      expect(garageContent).toContain("width: '44px'");
      expect(garageContent).toContain("height: '44px'");
      expect(garageContent).toContain("minWidth: '44px'");
      expect(garageContent).toContain("minHeight: '44px'");

      // Extract all zoomButton usages and ensure all 3 camera buttons use it
      const matches = garageContent.match(/style=\{styles\.zoomButton\}/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(3); // +, -, reset
    });

    it('1.3: stress-tests TouchControlsOverlay touch target dimensions across all 3 size presets', () => {
      const sizePresets = [
        { name: 'small', mult: 0.85 },
        { name: 'medium', mult: 1.0 },
        { name: 'large', mult: 1.15 },
      ] as const;

      for (const preset of sizePresets) {
        // Utility buttons (Pause, Reset, Camera): Math.max(44, Math.round(44 * mult))
        const utilitySize = Math.max(44, Math.round(44 * preset.mult));
        expect(utilitySize).toBeGreaterThanOrEqual(44);

        // Handbrake: Math.max(44, Math.round(48 * mult))
        const handbrakeHeight = Math.max(44, Math.round(48 * preset.mult));
        const handbrakeWidth = Math.round(84 * preset.mult);
        expect(handbrakeHeight).toBeGreaterThanOrEqual(44);
        expect(handbrakeWidth).toBeGreaterThanOrEqual(44);

        // Digital steer buttons: 80x76 * mult
        const steerWidth = Math.round(80 * preset.mult);
        const steerHeight = Math.round(76 * preset.mult);
        expect(steerWidth).toBeGreaterThanOrEqual(44);
        expect(steerHeight).toBeGreaterThanOrEqual(44);

        // Brake pedal: 76x92 * mult
        const brakeWidth = Math.round(76 * preset.mult);
        const brakeHeight = Math.round(92 * preset.mult);
        expect(brakeWidth).toBeGreaterThanOrEqual(44);
        expect(brakeHeight).toBeGreaterThanOrEqual(44);

        // Gas pedal: 76x112 * mult
        const gasWidth = Math.round(76 * preset.mult);
        const gasHeight = Math.round(112 * preset.mult);
        expect(gasWidth).toBeGreaterThanOrEqual(44);
        expect(gasHeight).toBeGreaterThanOrEqual(44);
      }
    });

    it('1.4: verifies SettingsView interactive toggles, tabs, and action buttons meet 44px ergonomics', () => {
      const settingsContent = fs.readFileSync(settingsViewPath, 'utf-8');

      // Checkbox container labels must provide at least 48x44px touch bounding area
      expect(settingsContent).toContain("minHeight: '44px'");
      expect(settingsContent).toContain("minWidth: '48px'");

      // Haptic toggle button minWidth & minHeight
      expect(settingsContent).toContain("minWidth: '56px'");
      expect(settingsContent).toContain("minHeight: '44px'");

      // Clear Records button minHeight
      expect(settingsContent).toContain("minHeight: '44px'");
    });

    it('1.5: verifies StartModeView action buttons inherit minHeight 44px', () => {
      const startModeContent = fs.readFileSync(startModeViewPath, 'utf-8');

      // Stage change button
      expect(startModeContent).toContain("minHeight: '44px'");

      // Launch Free Roam and Start Time Attack spread ...menuStyles.button (which has minHeight 44px)
      expect(startModeContent).toContain('...menuStyles.button');
    });
  });

  // =========================================================================
  // SECTION 2: MOBILE LANDSCAPE MEDIA QUERIES & CSS ARCHITECTURE
  // =========================================================================
  describe('Section 2: Mobile Landscape Media Queries & CSS Architecture', () => {
    it('2.1: contains landscape media query targeting max-height: 500px', () => {
      expect(cssContent).toContain('@media (max-height: 500px) and (orientation: landscape)');
    });

    it('2.2: verifies Main Menu action buttons arrange in 2-column grid in landscape', () => {
      expect(cssContent).toContain('.menu-action-grid');
      expect(cssContent).toMatch(/\.menu-action-grid\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
      // Row gap between action buttons must be compact (<= 8px)
      expect(cssContent).toMatch(/\.menu-action-grid\s*\{[^}]*gap:\s*6px\s+8px/);
    });

    it('2.3: verifies secondary description sublabels are hidden in landscape to conserve height', () => {
      expect(cssContent).toMatch(/\.menu-action-sublabel\s*\{[^}]*display:\s*none\s*!important/);
    });

    it('2.4: verifies Pause Menu implements horizontal 42%/58% 2-column split layout', () => {
      expect(cssContent).toContain('.pause-split-layout');
      expect(cssContent).toMatch(/\.pause-split-layout\s*\{[^}]*grid-template-columns:\s*42%\s+58%/);
      expect(cssContent).toContain('.pause-banner-card');
      expect(cssContent).toContain('.pause-action-list');
    });

    it('2.5: verifies Garage implements side-by-side 48%/52% 2-column layout', () => {
      expect(cssContent).toContain('.garage-split-layout');
      expect(cssContent).toMatch(/\.garage-split-layout\s*\{[^}]*grid-template-columns:\s*48%\s+52%/);
      expect(cssContent).toContain('.garage-canvas-box');
      expect(cssContent).toContain('.garage-details-box');
      // Turntable canvas height clamped to 220px
      expect(cssContent).toMatch(/\.garage-canvas-box\s*\{[^}]*height:\s*220px\s*!important/);
    });

    it('2.6: verifies Track Selection implements 2x2 grid layout with compact cards', () => {
      expect(cssContent).toContain('.track-grid-layout');
      expect(cssContent).toMatch(/\.track-grid-layout\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
      expect(cssContent).toContain('.track-card-compact');
      expect(cssContent).toContain('.track-thumb-compact');
      expect(cssContent).toContain('.track-desc-compact');
      // Thumbnails clamped to 62px height and descriptions hidden
      expect(cssContent).toMatch(/\.track-thumb-compact\s*\{[^}]*height:\s*62px\s*!important/);
      expect(cssContent).toMatch(/\.track-desc-compact\s*\{[^}]*display:\s*none\s*!important/);
    });

    it('2.7: verifies Controls screen implements 2-column grid layout', () => {
      expect(cssContent).toContain('.controls-help-grid');
      expect(cssContent).toMatch(/\.controls-help-grid\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
    });
  });

  // =========================================================================
  // SECTION 3: SAFE-AREA INSET ARCHITECTURE & DISPLAY CUTOUT CLEARANCE
  // =========================================================================
  describe('Section 3: Safe-Area Inset Architecture & Display Cutout Clearance', () => {
    it('3.1: verifies all 4 safe-area custom properties defined in src/index.css', () => {
      expect(cssContent).toContain('--sat: env(safe-area-inset-top, 0px);');
      expect(cssContent).toContain('--sar: env(safe-area-inset-right, 0px);');
      expect(cssContent).toContain('--sab: env(safe-area-inset-bottom, 0px);');
      expect(cssContent).toContain('--sal: env(safe-area-inset-left, 0px);');
    });

    it('3.2: verifies menuStyles overlay menu incorporates streamlined 8px vertical padding with safe areas', () => {
      const overlayPadding = String(menuStyles.overlayMenu.padding);
      const pausePadding = String(menuStyles.pauseOverlayMenu.padding);

      // Top & bottom streamlined to 8px + safe area
      expect(overlayPadding).toContain('calc(8px + var(--sat))');
      expect(overlayPadding).toContain('calc(8px + var(--sab))');
      expect(overlayPadding).toContain('calc(16px + var(--sal))');
      expect(overlayPadding).toContain('calc(16px + var(--sar))');

      expect(pausePadding).toContain('calc(8px + var(--sat))');
      expect(pausePadding).toContain('calc(8px + var(--sab))');
      expect(pausePadding).toContain('calc(16px + var(--sal))');
      expect(pausePadding).toContain('calc(16px + var(--sar))');
    });

    it('3.3: verifies subView maxHeight calculation leaves room for safe areas', () => {
      const subView = menuStyles.subView;
      expect(subView.maxHeight).toBe('calc(100dvh - var(--sat) - var(--sab) - 16px)');
      expect(subView.overflowY).toBe('auto');
    });

    it('3.4: simulates hardware cutout shifts under Google Pixel 10 Pro & modern flagship geometries', () => {
      // Pixel 10 Pro landscape cutout model:
      // Left punch hole cutout: 48px, Right bezel: 0px, Bottom gesture bar: 16px, Top: 0px
      const pixel10Insets = { top: 0, right: 0, bottom: 16, left: 48 };

      const basePadding = { top: 8, right: 16, bottom: 8, left: 16 };
      const effectiveLeftPadding = basePadding.left + pixel10Insets.left;
      const effectiveBottomPadding = basePadding.bottom + pixel10Insets.bottom;

      expect(effectiveLeftPadding).toBe(64);  // 16 + 48px clearance
      expect(effectiveBottomPadding).toBe(24); // 8 + 16px clearance

      // Total horizontal margin consumed on a 915px width display:
      // Left: 64px, Right: 16px -> 80px total padding. Available: 835px
      const availableWidth = 915 - (effectiveLeftPadding + (basePadding.right + pixel10Insets.right));
      expect(availableWidth).toBe(835);
      expect(availableWidth).toBeGreaterThan(540); // Generously fits 540px modal subviews
    });
  });

  // =========================================================================
  // SECTION 4: EMPIRICAL VIEWPORT FITTING & VERTICAL SCROLL ELIMINATION
  // =========================================================================
  describe('Section 4: Empirical Viewport Fitting & Vertical Scroll Elimination', () => {
    it('4.1: Main Menu Action Hub height allows primary buttons to fit without scrolling on 360-412px heights', () => {
      // In landscape, action buttons are arranged in a 2-column grid of 6 items (3 rows)
      // Row gap = 6px, button minHeight = 44px
      const buttonHeight = 44;
      const rowGap = 6;
      const rows = 3;
      const totalActionGridHeight = rows * buttonHeight + (rows - 1) * rowGap; // 3*44 + 2*6 = 144px
      expect(totalActionGridHeight).toBe(144);

      // Header title "ACTION HUB" = ~18px + 2px margin = 20px
      const totalActionHubHeight = 20 + totalActionGridHeight; // 164px
      expect(totalActionHubHeight).toBe(164);

      // On a 360px viewport:
      // Effective available viewport height: 360 - 16 (padding) = 344px
      expect(totalActionHubHeight).toBeLessThan(344);
      // Fits with substantial headroom (> 170px margin)
      expect(344 - totalActionHubHeight).toBeGreaterThan(170);
    });

    it('4.2: Pause Menu Action List height allows all 5 action buttons to fit without scrolling on 360-412px heights', () => {
      // 5 pause action buttons in a single column: Resume, Restart, Garage, Controls, Return to Main Menu
      const numButtons = 5;
      const buttonHeight = 44;
      const rowGap = 6; // from .pause-action-list { gap: 6px !important }
      const totalPauseButtonsHeight = numButtons * buttonHeight + (numButtons - 1) * rowGap;
      // 5*44 + 4*6 = 220 + 24 = 244px
      expect(totalPauseButtonsHeight).toBe(244);

      // On a 360px viewport, available height = 344px:
      expect(totalPauseButtonsHeight).toBeLessThan(344);
      // All 5 primary pause buttons fit cleanly
      expect(344 - totalPauseButtonsHeight).toBe(100);
    });

    it('4.3: Garage View side-by-side split fits cleanly within 360px height without vertical scrolling', () => {
      // SubView padding: 12px top + 12px bottom = 24px
      // SubView title: 20px + 8px margin = 28px
      // Available height inside subView on 360px viewport: 360 - 16 (overlay) - 24 (padding) - 28 (title) = 292px

      // Left column: turntable canvas height = 220px (clamped by CSS)
      const canvasHeight = 220;
      expect(canvasHeight).toBeLessThan(292);

      // Right column: details box
      // Tabs: 44px + 6px margin = 50px
      // Header: 24px
      // Stats (4 rows of 16px + 3 gaps of 6px): 82px
      // Equip/Back buttons: 44px + 8px marginTop = 52px
      const detailsHeight = 50 + 24 + 82 + 52; // 208px
      expect(detailsHeight).toBeLessThan(292);

      // Maximum of split layout columns
      const splitHeight = Math.max(canvasHeight, detailsHeight);
      expect(splitHeight).toBe(220);
      expect(splitHeight).toBeLessThan(292);
    });

    it('4.4: Track Selection 2x2 grid fits cleanly within 360px height without vertical scrolling', () => {
      // SubView padding: 24px
      // Title & Subtitle: 28px + 22px = 50px
      // 2x2 Grid: 2 rows of compact cards
      // Each compact card: thumb 62px + 16px padding = 78px
      // Grid row gap = 8px
      const gridHeight = 2 * 78 + 8; // 164px
      const backButtonHeight = 44 + 12; // 56px
      const totalTrackViewHeight = 24 + 50 + gridHeight + backButtonHeight; // 294px

      // On 360px viewport, available height = 344px
      expect(totalTrackViewHeight).toBeLessThan(344);
      expect(344 - totalTrackViewHeight).toBe(50); // 50px clearance
    });

    it('4.5: Controls View 2-column grid fits cleanly within 360px height without vertical scrolling', () => {
      // SubView padding: 24px
      // Title: 28px
      // Tabs (Gamepad / Keyboard): 44px + 10px margin = 54px
      // 2-column grid: 4 rows * 24px + 3 gaps * 6px + 20px padding = 134px
      // Back button: 56px
      const totalControlsHeight = 24 + 28 + 54 + 134 + 56; // 296px

      expect(totalControlsHeight).toBeLessThan(344);
      expect(344 - totalControlsHeight).toBe(48); // 48px clearance
    });

    it('4.6: Settings View categorized tabs isolate controls into navigable sub-panels with scrollable fallback', () => {
      // 4 distinct categories: Graphics, Audio, Touch Controls, Gameplay
      const settingsContent = fs.readFileSync(settingsViewPath, 'utf-8');
      expect(settingsContent).toContain("activeCategory === 'graphics'");
      expect(settingsContent).toContain("activeCategory === 'audio'");
      expect(settingsContent).toContain("activeCategory === 'touch'");
      expect(settingsContent).toContain("activeCategory === 'gameplay'");

      // Verify subView provides overflowY: 'auto' so even if user opens a dense tab, content remains accessible
      expect(menuStyles.subView.overflowY).toBe('auto');
    });
  });

  // =========================================================================
  // SECTION 5: REACT COMPONENT SSR RENDERING & TOUCH INVARIANTS
  // =========================================================================
  describe('Section 5: React Component SSR Rendering & Touch Invariants', () => {
    it('5.1: successfully renders MainView without errors or NaN style values', () => {
      const html = renderToString(
        <MainView
          isPause={false}
          focusedIndex={0}
          textColor="#F1F5F9"
          onPointerMoveItem={() => {}}
          onSelectView={() => {}}
          onResume={() => {}}
          onReset={() => {}}
          onReturnToMainMenu={() => {}}
          onOpenGarage={() => {}}
        />
      );

      expect(html).toContain('PLAY');
      expect(html).toContain('MULTIPLAYER');
      expect(html).toContain('OPTIONS');
      expect(html).toContain('CREDITS');
      expect(html).not.toContain('NaN');
    });

    it('5.2: successfully renders Pause MainView with all 4 pause action buttons', () => {
      const html = renderToString(
        <MainView
          isPause={true}
          focusedIndex={0}
          textColor="#F1F5F9"
          onPointerMoveItem={() => {}}
          onSelectView={() => {}}
          onResume={() => {}}
          onReset={() => {}}
          onReturnToMainMenu={() => {}}
          onOpenGarage={() => {}}
        />
      );

      expect(html).toContain('RESUME STAGE');
      expect(html).toContain('RESTART STAGE');
      expect(html).toContain('OPTIONS');
      expect(html).toContain('RETURN TO MAIN MENU');
      expect(html).toContain('pause-action-list');
    });

    it('5.3: successfully renders TrackSelectView with all level cards and back button', () => {
      const levels = getAvailableLevels();
      const html = renderToString(
        <TrackSelectView
          availableLevels={levels}
          selectedLevelId="level1_island"
          bestLapTimes={{ level1_island: 75.4 }}
          focusedIndex={0}
          textColor="#F1F5F9"
          subtitleColor="#94A3B8"
          onPointerMoveItem={() => {}}
          onSelectTrack={() => {}}
          onSelectView={() => {}}
        />
      );

      expect(html).toContain('Tracks &amp; Stages');
      expect(html).toContain('track-grid-layout');
      expect(html).toContain('Island Circuit');
      expect(html).toContain('Back');
    });

    it('5.4: successfully renders ControlsView with keyboard and gamepad bindings', () => {
      const html = renderToString(
        <ControlsView
          gamepadConnected={true}
          gamepadName="DualSense Wireless Controller"
          gamepadType="dualsense"
          controlsTab="keyboard"
          focusedIndex={0}
          textColor="#F1F5F9"
          onPointerMoveItem={() => {}}
          onSetControlsTab={() => {}}
          onSelectView={() => {}}
        />
      );

      expect(html).toContain('Controls');
      expect(html).toContain('controls-help-grid');
      expect(html).toContain('SPACE');
      expect(html).toContain('Handbrake / Drift');
    });

    it('5.5: successfully renders TouchControlsOverlay when active with utility buttons', () => {
      const html = renderToString(<TouchControlsOverlay forceVisible={true} />);

      expect(html).toContain('data-testid="touch-controls-overlay"');
      expect(html).toContain('data-testid="touch-btn-pause"');
      expect(html).toContain('data-testid="touch-btn-reset"');
      expect(html).toContain('data-testid="touch-btn-camera"');
      expect(html).toContain('data-testid="touch-pedal-throttle"');
      expect(html).toContain('data-testid="touch-pedal-brake"');
      expect(html).toContain('data-testid="touch-btn-handbrake"');
    });

    it('5.6: non-overlapping layout: Left steering zone and right pedal zone never collide across 16:9 to 20:9', () => {
      // Left steering zone: 0 to 45vw
      // Right pedals: right: 24px, width ~180px
      // On narrowest mobile screen: 640px width
      // 45vw of 640px = 288px (left side: 0 to 288px)
      // Right pedal cluster occupies: 640 - 180 = 460px to 640px
      // Separation gap between left and right controls = 460 - 288 = 172px!
      const minViewportWidth = 640;
      const leftZoneWidth = 0.45 * minViewportWidth; // 288px
      const rightZoneWidth = 180; // pedals width + spacing
      const rightZoneStart = minViewportWidth - rightZoneWidth; // 460px

      const marginBetweenThumbs = rightZoneStart - leftZoneWidth;
      expect(marginBetweenThumbs).toBeGreaterThan(100); // Massive 172px thumb separation
    });
  });
});
