import { create } from 'zustand';
import type { CameraMode, GameMode, GameState, GamepadType } from '@/types/game';
import type { SurfaceType } from '@/types/vehicle';
import { DEFAULT_VEHICLE_ID } from '@/config/vehicleRegistry';
import { DEFAULT_LEVEL_ID } from '@/config/levelRegistry';

/**
 * Core game state store — vehicle telemetry, game phase, camera mode,
 * selected vehicle and active level.
 */
interface GameStore {
  /** Current game state */
  gameState: GameState;
  /** Active game mode: Free Roam or Time Attack */
  gameMode: GameMode;
  /** Active camera mode */
  cameraMode: CameraMode;
  /** ID of the selected vehicle preset */
  selectedVehicleId: string;
  /** ID of the active level preset */
  selectedLevelId: string;
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
  /** Current surface under the vehicle */
  surface: SurfaceType;
  /** Whether a gamepad / Xbox / DualSense controller is currently connected */
  gamepadConnected: boolean;
  /** Name / identifier of the connected gamepad */
  gamepadName: string;
  /** Detected gamepad hardware type */
  gamepadType: GamepadType;

  // Actions
  setGameState: (state: GameState) => void;
  setGameMode: (mode: GameMode) => void;
  setSelectedVehicleId: (id: string) => void;
  setSelectedLevelId: (id: string) => void;
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
  setSurface: (val: SurfaceType) => void;
  setGamepadConnected: (connected: boolean, name?: string, type?: GamepadType) => void;
}

const CAMERA_MODES: CameraMode[] = ['chase_close', 'chase', 'bumper', 'free'];

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'title',
  gameMode: 'timeattack',
  cameraMode: 'chase_close',
  selectedVehicleId: DEFAULT_VEHICLE_ID,
  selectedLevelId: DEFAULT_LEVEL_ID,
  speed: 0,
  lateralSpeed: 0,
  slipAngle: 0,
  rpm: 1000,
  gear: 1,
  heading: 0,
  position: [0, 0.5, 0],
  pendingReset: false,
  telemetryEnabled: false,
  tireGrips: [0, 0, 0, 0],
  surface: 'mud',
  gamepadConnected: false,
  gamepadName: '',
  gamepadType: null,

  setGameState: (gameState) => set({ gameState }),
  setGameMode: (gameMode) => set({ gameMode }),
  setSelectedVehicleId: (selectedVehicleId) => set({ selectedVehicleId }),
  setSelectedLevelId: (selectedLevelId) => set({ selectedLevelId }),
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
  setSurface: (val) => set({ surface: val }),
  setGamepadConnected: (connected, name = '', type = null) =>
    set({ gamepadConnected: connected, gamepadName: name, gamepadType: type }),
}));


