// ─── Steering ────────────────────────────────────────────────────────
/** Exponential decay rate for steering interpolation (higher = snappier) */
export const STEER_SPEED = 5;

/** Deadzone threshold — steering values below this snap to 0 */
export const STEER_DEADZONE = 0.001;

// ─── Gamepad / Xbox Controller ─────────────────────────────────────────
/** Left stick deadzone threshold for Xbox controller (0.0 to 1.0) */
export const GAMEPAD_STICK_DEADZONE = 0.08;

/** Trigger deadzone threshold for LT / RT (0.0 to 1.0) */
export const GAMEPAD_TRIGGER_DEADZONE = 0.02;

/** Exponent for gamepad steering non-linearity (1.0 = linear, 1.4 = fine control near center) */
export const GAMEPAD_STEER_EXPONENT = 1.35;

/** Gamepad analog steering interpolation speed (high value for instant crisp feel) */
export const GAMEPAD_STEER_SPEED = 18;

/** Default vibration / rumble intensity multiplier */
export const DEFAULT_VIBRATION_INTENSITY = 1.0;
