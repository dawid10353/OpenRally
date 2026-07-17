/**
 * Possible game states.
 */
export type GameState = 'loading' | 'playing' | 'paused' | 'menu';

/**
 * Camera view modes.
 */
export type CameraMode = 'chase_close' | 'chase' | 'bumper' | 'free';

/**
 * Normalized input state from keyboard / gamepad.
 * All values are normalized: steering [-1, 1], throttle/brake [0, 1].
 */
export interface InputState {
  /** Steering input: -1 = full left, 0 = center, 1 = full right */
  steering: number;
  /** Throttle input: 0 = no gas, 1 = full gas */
  throttle: number;
  /** Brake input: 0 = no brake, 1 = full brake */
  brake: number;
  /** Whether the handbrake is pressed */
  handbrake: boolean;
  /** Whether camera toggle was pressed this frame */
  cameraToggle: boolean;
  /** Whether the reset button (R) is pressed */
  reset: boolean;
}
