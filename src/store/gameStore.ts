import { create } from 'zustand';
import type { CameraMode, GameState } from '@/types/game';

/**
 * Core game state store — vehicle telemetry, game phase, camera mode.
 */
interface GameStore {
  /** Current game state */
  gameState: GameState;
  /** Active camera mode */
  cameraMode: CameraMode;
  /** Vehicle speed in km/h */
  speed: number;
  /** Lateral speed in m/s (used for drifting/sliding detection) */
  lateralSpeed: number;
  /** Slip angle in radians (difference between heading and velocity direction) */
  slipAngle: number;
  /** Engine RPM */
  rpm: number;
  /** Current transmission gear (-1: Reverse, 0: Neutral, 1-5: Forward) */
  gear: number;
  /** Vehicle heading in radians (0 = north / +Z) */
  heading: number;
  /** Vehicle world position [x, y, z] */
  position: [number, number, number];
  /** Flag to request a physics reset from UI */
  pendingReset: boolean;
  /** Whether the telemetry HUD is visible */
  telemetryEnabled: boolean;
  /** Current friction multiplier for each tire [FL, FR, RL, RR] */
  tireGrips: number[];

  // Actions
  setGameState: (state: GameState) => void;
  setSpeed: (speed: number) => void;
  setLateralSpeed: (lateralSpeed: number) => void;
  setSlipAngle: (slipAngle: number) => void;
  setRpm: (rpm: number) => void;
  setGear: (gear: number) => void;
  setHeading: (heading: number) => void;
  setPosition: (pos: [number, number, number]) => void;
  cycleCameraMode: () => void;
  togglePause: () => void;
  triggerReset: (val: boolean) => void;
  setTelemetryEnabled: (val: boolean) => void;
  setTireGrips: (val: number[]) => void;
}

const CAMERA_MODES: CameraMode[] = ['chase_close', 'chase', 'bumper', 'free'];

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'menu',
  cameraMode: 'chase_close',
  speed: 0,
  lateralSpeed: 0,
  slipAngle: 0,
  rpm: 1000,
  gear: 1, // Start in 1st gear (or 0 for neutral)
  heading: 0,
  position: [0, 0.5, 0],
  pendingReset: false,
  telemetryEnabled: false,
  tireGrips: [0, 0, 0, 0],

  setGameState: (gameState) => set({ gameState }),
  setSpeed: (speed) => set({ speed }),
  setLateralSpeed: (lateralSpeed) => set({ lateralSpeed }),
  setSlipAngle: (slipAngle) => set({ slipAngle }),
  setRpm: (rpm) => set({ rpm }),
  setGear: (gear) => set({ gear }),
  setHeading: (heading) => set({ heading }),
  setPosition: (position) => set({ position }),

  cycleCameraMode: () =>
    set((state) => {
      const idx = CAMERA_MODES.indexOf(state.cameraMode);
      const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
      return { cameraMode: next };
    }),

  togglePause: () =>
    set((state) => ({
      gameState: state.gameState === 'playing' ? 'paused' : 'playing',
    })),
  triggerReset: (val) => set({ pendingReset: val }),
  setTelemetryEnabled: (val) => set({ telemetryEnabled: val }),
  setTireGrips: (val) => set({ tireGrips: val }),
}));
