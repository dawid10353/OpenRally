import { create } from 'zustand';

/**
 * Settings store — graphics quality, controls sensitivity, toggles.
 */
interface SettingsStore {
  /** Graphics quality preset */
  graphicsQuality: 'low' | 'medium' | 'high';
  /** Whether real-time shadows are enabled */
  shadowsEnabled: boolean;
  /** Whether post-processing effects are enabled */
  postProcessingEnabled: boolean;
  /** Steering sensitivity multiplier */
  sensitivity: number;
  /** Whether physics debug wireframes are shown */
  debugPhysics: boolean;
  /** Global sound effects volume (0.0 to 1.0) */
  sfxVolume: number;
  /** Menu music volume (0.0 to 1.0) */
  menuMusicVolume: number;
  /** Game music volume (0.0 to 1.0) */
  gameMusicVolume: number;

  // Actions
  setGraphicsQuality: (quality: 'low' | 'medium' | 'high') => void;
  toggleShadows: () => void;
  togglePostProcessing: () => void;
  setSensitivity: (sensitivity: number) => void;
  toggleDebugPhysics: () => void;
  setSfxVolume: (vol: number) => void;
  setMenuMusicVolume: (vol: number) => void;
  setGameMusicVolume: (vol: number) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  graphicsQuality: 'medium',
  shadowsEnabled: true,
  postProcessingEnabled: false,
  sensitivity: 1.0,
  debugPhysics: false,
  sfxVolume: 1.0,
  menuMusicVolume: 0.5,
  gameMusicVolume: 0.5,

  setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
  toggleShadows: () => set((s) => ({ shadowsEnabled: !s.shadowsEnabled })),
  togglePostProcessing: () =>
    set((s) => ({ postProcessingEnabled: !s.postProcessingEnabled })),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  toggleDebugPhysics: () =>
    set((s) => ({ debugPhysics: !s.debugPhysics })),
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),
  setMenuMusicVolume: (menuMusicVolume) => set({ menuMusicVolume }),
  setGameMusicVolume: (gameMusicVolume) => set({ gameMusicVolume }),
}));
