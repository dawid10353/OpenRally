import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      graphicsQuality: 'medium',
      shadowsEnabled: true,
      postProcessingEnabled: false,
      sensitivity: 1.0,
      debugPhysics: false,
      sfxVolume: 1.0,
      menuMusicVolume: 0.5,
      gameMusicVolume: 0.5,
    });
  });

  it('updates graphics quality preset', () => {
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
    expect(useSettingsStore.getState().postProcessingEnabled).toBe(true);

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
});
