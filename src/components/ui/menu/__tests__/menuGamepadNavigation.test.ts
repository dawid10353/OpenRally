import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { SETTINGS_CATEGORIES } from '../useMenuGamepadNavigation';
import type { SettingsCategory } from '../types';

describe('Settings & Menu Gamepad Navigation Invariants', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: 'menu', selectedVehicleId: 'apex_rally_awd' });
    useSettingsStore.setState({
      graphicsQuality: 'high',
      targetFps: 60,
      drawDistance: 'far',
      antiAliasing: 'smaa',
      resolutionScale: 1.0,
      transmissionMode: 'automatic',
      sensitivity: 1.0,
      vibrationEnabled: true,
      vibrationIntensity: 0.8,
      menuMusicVolume: 0.5,
      gameMusicVolume: 0.5,
      sfxVolume: 0.7,
      touchControlMode: 'auto',
      touchSteeringScheme: 'joystick',
      touchButtonSize: 'medium',
      touchOpacity: 0.8,
      touchHaptics: true,
    });
  });

  describe('Category cycling with Bumper controls (LB / RB)', () => {
    it('contains all 5 standard categories in expected order', () => {
      expect(SETTINGS_CATEGORIES).toEqual([
        'graphics',
        'audio',
        'controls',
        'touch',
        'gameplay',
      ]);
    });

    it('cycles forward through categories seamlessly with wrap-around', () => {
      let curCat: SettingsCategory = 'graphics';
      const cycleRight = () => {
        const idx = SETTINGS_CATEGORIES.indexOf(curCat);
        curCat = SETTINGS_CATEGORIES[(idx + 1) % SETTINGS_CATEGORIES.length];
      };

      cycleRight();
      expect(curCat).toBe('audio');
      cycleRight();
      expect(curCat).toBe('controls');
      cycleRight();
      expect(curCat).toBe('touch');
      cycleRight();
      expect(curCat).toBe('gameplay');
      cycleRight();
      expect(curCat).toBe('graphics'); // wraps back to first
    });

    it('cycles backward through categories seamlessly with wrap-around', () => {
      let curCat: SettingsCategory = 'graphics';
      const cycleLeft = () => {
        const idx = SETTINGS_CATEGORIES.indexOf(curCat);
        curCat = SETTINGS_CATEGORIES[(idx - 1 + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length];
      };

      cycleLeft();
      expect(curCat).toBe('gameplay'); // wraps back to last
      cycleLeft();
      expect(curCat).toBe('touch');
      cycleLeft();
      expect(curCat).toBe('controls');
      cycleLeft();
      expect(curCat).toBe('audio');
      cycleLeft();
      expect(curCat).toBe('graphics');
    });
  });

  describe('Gameplay options gamepad modification', () => {
    it('toggles transmission mode between automatic and manual', () => {
      const store = useSettingsStore.getState();
      expect(store.transmissionMode).toBe('automatic');

      // Toggle to manual
      store.setTransmissionMode(store.transmissionMode === 'manual' ? 'automatic' : 'manual');
      expect(useSettingsStore.getState().transmissionMode).toBe('manual');

      // Toggle back to automatic
      store.setTransmissionMode(useSettingsStore.getState().transmissionMode === 'manual' ? 'automatic' : 'manual');
      expect(useSettingsStore.getState().transmissionMode).toBe('automatic');
    });

    it('modifies steering sensitivity within [0.5, 2.0] bounds', () => {
      const store = useSettingsStore.getState();
      expect(store.sensitivity).toBe(1.0);

      // Increase
      store.setSensitivity(Math.min(2.0, store.sensitivity + 0.1));
      expect(useSettingsStore.getState().sensitivity).toBeCloseTo(1.1);

      // Decrease
      store.setSensitivity(Math.max(0.5, useSettingsStore.getState().sensitivity - 0.2));
      expect(useSettingsStore.getState().sensitivity).toBeCloseTo(0.9);
    });

    it('toggles controller vibration and steps vibration intensity', () => {
      const store = useSettingsStore.getState();
      expect(store.vibrationEnabled).toBe(true);

      store.toggleVibration();
      expect(useSettingsStore.getState().vibrationEnabled).toBe(false);

      store.toggleVibration();
      expect(useSettingsStore.getState().vibrationEnabled).toBe(true);

      store.setVibrationIntensity(0.9);
      expect(useSettingsStore.getState().vibrationIntensity).toBe(0.9);
    });
  });

  describe('Graphics options gamepad modification', () => {
    it('cycles target frame rate options (30, 60, 120)', () => {
      const fpsOptions = [30, 60, 120] as const;
      const store = useSettingsStore.getState();

      const nextFps = (cur: typeof fpsOptions[number]) => {
        const idx = fpsOptions.indexOf(cur);
        return fpsOptions[(idx + 1) % fpsOptions.length];
      };

      expect(store.targetFps).toBe(60);
      store.setTargetFps(nextFps(store.targetFps));
      expect(useSettingsStore.getState().targetFps).toBe(120);
      store.setTargetFps(nextFps(useSettingsStore.getState().targetFps));
      expect(useSettingsStore.getState().targetFps).toBe(30);
    });

    it('cycles draw distance options (short, medium, far, ultra)', () => {
      const distOptions = ['short', 'medium', 'far', 'ultra'] as const;
      const store = useSettingsStore.getState();

      const nextDist = (cur: typeof distOptions[number]) => {
        const idx = distOptions.indexOf(cur);
        return distOptions[(idx + 1) % distOptions.length];
      };

      expect(store.drawDistance).toBe('far');
      store.setDrawDistance(nextDist(store.drawDistance));
      expect(useSettingsStore.getState().drawDistance).toBe('ultra');
      store.setDrawDistance(nextDist(useSettingsStore.getState().drawDistance));
      expect(useSettingsStore.getState().drawDistance).toBe('short');
    });
  });

  describe('Touch controls options gamepad modification', () => {
    it('updates touch overlay mode, steering scheme, and button size', () => {
      const store = useSettingsStore.getState();

      store.setTouchControlMode('always');
      expect(useSettingsStore.getState().touchControlMode).toBe('always');

      store.setTouchSteeringScheme('buttons');
      expect(useSettingsStore.getState().touchSteeringScheme).toBe('buttons');

      store.setTouchButtonSize('large');
      expect(useSettingsStore.getState().touchButtonSize).toBe('large');
    });
  });
});
