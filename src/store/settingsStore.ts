import { create } from 'zustand';
import type { GraphicsQuality, AntiAliasingMode } from '@/types';

/**
 * Settings store — graphics quality, controls sensitivity, toggles.
 */
interface SettingsStore {
  /** Graphics quality preset */
  graphicsQuality: GraphicsQuality;
  /** Anti-Aliasing technique */
  antiAliasing: AntiAliasingMode;
  /** Internal render resolution scale multiplier (0.5 to 1.5) */
  resolutionScale: number;
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
  /** Whether controller haptic vibration / rumble is enabled */
  vibrationEnabled: boolean;
  /** Controller vibration intensity multiplier (0.0 to 1.0) */
  vibrationIntensity: number;

  // Actions
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setAntiAliasing: (antiAliasing: AntiAliasingMode) => void;
  setResolutionScale: (scale: number) => void;
  toggleShadows: () => void;
  togglePostProcessing: () => void;
  setSensitivity: (sensitivity: number) => void;
  toggleDebugPhysics: () => void;
  setSfxVolume: (vol: number) => void;
  setMenuMusicVolume: (vol: number) => void;
  setGameMusicVolume: (vol: number) => void;
  toggleVibration: () => void;
  setVibrationIntensity: (intensity: number) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  graphicsQuality: 'very_high',
  antiAliasing: 'smaa',
  resolutionScale: 1.0,
  shadowsEnabled: true,
  postProcessingEnabled: true,
  sensitivity: 1.0,
  debugPhysics: false,
  sfxVolume: 1.0,
  menuMusicVolume: 0.5,
  gameMusicVolume: 0.5,
  vibrationEnabled: true,
  vibrationIntensity: 1.0,

  setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
  setAntiAliasing: (antiAliasing) => set({ antiAliasing }),
  setResolutionScale: (resolutionScale) => set({ resolutionScale }),
  toggleShadows: () => set((s) => ({ shadowsEnabled: !s.shadowsEnabled })),
  togglePostProcessing: () =>
    set((s) => ({ postProcessingEnabled: !s.postProcessingEnabled })),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  toggleDebugPhysics: () =>
    set((s) => ({ debugPhysics: !s.debugPhysics })),
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),
  setMenuMusicVolume: (menuMusicVolume) => set({ menuMusicVolume }),
  setGameMusicVolume: (gameMusicVolume) => set({ gameMusicVolume }),
  toggleVibration: () =>
    set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
  setVibrationIntensity: (vibrationIntensity) =>
    set({ vibrationIntensity }),
}));

