import type { GraphicsQuality, AntiAliasingMode } from './game';

export type TouchControlMode = 'auto' | 'always' | 'off';
export type TouchSteeringScheme = 'joystick' | 'buttons';
export type TouchButtonSize = 'small' | 'medium' | 'large';

export interface TouchSettings {
  touchControlMode: TouchControlMode;
  touchSteeringScheme: TouchSteeringScheme;
  touchOpacity: number; // 0.2 to 1.0 (default 0.7)
  touchButtonSize: TouchButtonSize;
  touchHaptics: boolean;
}

export const DEFAULT_TOUCH_SETTINGS: TouchSettings = {
  touchControlMode: 'auto',
  touchSteeringScheme: 'joystick',
  touchOpacity: 0.7,
  touchButtonSize: 'medium',
  touchHaptics: true,
};

export type TargetFps = 30 | 60 | 120;
export type DrawDistance = 'short' | 'medium' | 'far' | 'ultra';

export interface GameSettings extends TouchSettings {
  graphicsQuality: GraphicsQuality;
  targetFps: TargetFps;
  drawDistance: DrawDistance;
  antiAliasing: AntiAliasingMode;
  resolutionScale: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  sensitivity: number;
  debugPhysics: boolean;
  sfxVolume: number;
  menuMusicVolume: number;
  gameMusicVolume: number;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  /** Flag tracking whether the user has explicitly manually configured graphics preferences */
  graphicsConfiguredByUser?: boolean;
}

export const BALANCED_MOBILE_SETTINGS: Partial<GameSettings> = {
  graphicsQuality: 'medium',
  targetFps: 60,
  drawDistance: 'medium',
  antiAliasing: 'off',
  resolutionScale: 1.0,
  shadowsEnabled: false,
  postProcessingEnabled: false,
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'very_high',
  targetFps: 60,
  drawDistance: 'far',
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
  graphicsConfiguredByUser: false,
  ...DEFAULT_TOUCH_SETTINGS,
};
