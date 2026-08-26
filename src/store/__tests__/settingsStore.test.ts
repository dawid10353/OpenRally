import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      graphicsQuality: 'very_high',
      shadowsEnabled: true,
      postProcessingEnabled: true,
      sensitivity: 1.0,
      debugPhysics: false,
      sfxVolume: 1.0,
      menuMusicVolume: 0.5,
      gameMusicVolume: 0.5,
    });
  });

  it('initializes with very_high graphics and post-processing enabled by default', () => {
    expect(useSettingsStore.getState().graphicsQuality).toBe('very_high');
    expect(useSettingsStore.getState().postProcessingEnabled).toBe(true);
  });

  it('updates graphics quality preset', () => {
    useSettingsStore.getState().setGraphicsQuality('very_high');
    expect(useSettingsStore.getState().graphicsQuality).toBe('very_high');

    useSettingsStore.getState().setGraphicsQuality('high');
    expect(useSettingsStore.getState().graphicsQuality).toBe('high');

    useSettingsStore.getState().setGraphicsQuality('low');
    expect(useSettingsStore.getState().graphicsQuality).toBe('low');
  });

  it('toggles settings boolean flags', () => {
    const { toggleShadows, togglePostProcessing, toggleDebugPhysics } = useSettingsStore.getState();

    toggleShadows();
    expect(useSettingsStore.getState().shadowsEnabled).toBe(false);

    togglePostProcessing();
    expect(useSettingsStore.getState().postProcessingEnabled).toBe(false);

    toggleDebugPhysics();
    expect(useSettingsStore.getState().debugPhysics).toBe(true);
  });

  it('updates volume sliders', () => {
    const { setSfxVolume, setMenuMusicVolume, setGameMusicVolume } = useSettingsStore.getState();

    setSfxVolume(0.8);
    setMenuMusicVolume(0.2);
    setGameMusicVolume(0.7);

    const state = useSettingsStore.getState();
    expect(state.sfxVolume).toBe(0.8);
    expect(state.menuMusicVolume).toBe(0.2);
    expect(state.gameMusicVolume).toBe(0.7);
  });

  it('updates vibration and sensitivity controls', () => {
    const { toggleVibration, setVibrationIntensity, setSensitivity } = useSettingsStore.getState();

    toggleVibration();
    expect(useSettingsStore.getState().vibrationEnabled).toBe(false);

    setVibrationIntensity(0.75);
    expect(useSettingsStore.getState().vibrationIntensity).toBe(0.75);

    setSensitivity(1.4);
    expect(useSettingsStore.getState().sensitivity).toBe(1.4);
  });
});

