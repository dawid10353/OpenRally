import { SHIFT_UP_SPEEDS, SHIFT_DOWN_SPEEDS, BRAKE_SPEED_THRESHOLD } from '@/config/vehicle';

export const IDLE_RPM = 1000;
export const MAX_RPM = 8000;
export const REV_LIMITER_THRESHOLD = 7650;

/**
 * Options for engine RPM calculation and inertia integration.
 */
export interface RPMCalculationOptions {
  /** Current smoothed RPM from previous simulation frame */
  readonly currentRpm?: number;
  /** Simulation delta time in seconds */
  readonly dt?: number;
  /** Ratio of wheels in contact with the ground (0.0 = fully airborne, 1.0 = fully grounded) */
  readonly groundedRatio?: number;
  /** Whether the vehicle is airborne (no wheels touching ground) */
  readonly isAirborne?: boolean;
}

/**
 * Updates the automatic gearbox based on speed and input.
 * When airborne, locks the current gear to prevent erratic mid-air shifting.
 */
export function updateGearbox(
  speedKmh: number,
  forwardSpeed: number,
  input: { throttle: number; brake: number; reset?: boolean; steering?: number; handbrake?: boolean },
  currentGear: number,
  isAirborne: boolean = false
): number {
  if (isAirborne) {
    // Hold gear during jump to avoid erratic shifting in mid-air
    return currentGear;
  }

  let newGear = currentGear;

  if (input.brake > 0 && forwardSpeed < BRAKE_SPEED_THRESHOLD) {
    newGear = -1; // Reverse
  } else if (speedKmh < 1 && input.throttle === 0 && input.brake === 0) {
    newGear = 1; // Idle in 1st gear
  } else {
    if (newGear < 1) newGear = 1; // Ensure forward gear

    // Shift up
    if (newGear < 5 && speedKmh > SHIFT_UP_SPEEDS[newGear]) {
      newGear++;
    } 
    // Shift down
    else if (newGear > 1 && speedKmh < SHIFT_DOWN_SPEEDS[newGear]) {
      newGear--;
    }
  }

  return newGear;
}

/**
 * Calculates engine RPM based on speed, gear, input, and ground contact dynamics.
 *
 * - When grounded: RPM mechanically follows vehicle speed on the active gear.
 * - When airborne with throttle pressed: Engine revs up rapidly to redline (8000 RPM)
 *   with realistic rev-limiter bounce/flutter.
 * - When airborne off-throttle: Engine RPM drops naturally down to idle (~1000 RPM).
 * - When landing: Integrates smoothly to match the transmission speed on touchdown.
 */
export function calculateRPM(
  speedKmh: number,
  currentGear: number,
  input: { throttle: number; brake: number; reset?: boolean; steering?: number; handbrake?: boolean },
  options?: RPMCalculationOptions
): number {
  const safeSpeed = Number.isFinite(speedKmh) ? Math.max(0, speedKmh) : 0;
  const throttle = Number.isFinite(input.throttle) ? Math.max(0, Math.min(1, input.throttle)) : 0;
  const brake = Number.isFinite(input.brake) ? Math.max(0, Math.min(1, input.brake)) : 0;

  // Determine ground contact ratio (0.0 = completely airborne, 1.0 = fully grounded)
  let grounded = 1.0;
  if (options?.isAirborne !== undefined) {
    grounded = options.isAirborne ? 0.0 : (options.groundedRatio ?? 1.0);
  } else if (options?.groundedRatio !== undefined) {
    grounded = Math.max(0, Math.min(1, options.groundedRatio));
  }

  // ─── 1. Ground Target RPM (mechanically coupled to wheel/chassis speed) ──
  let targetRpmGround = IDLE_RPM;
  if (currentGear === -1) {
    // Reverse gear
    targetRpmGround = IDLE_RPM + (Math.min(safeSpeed, 40) / 40) * 4000;
    if (brake > 0 && safeSpeed < 10) {
      targetRpmGround += brake * 1500 * (1 - safeSpeed / 10);
    }
  } else if (currentGear > 0) {
    // Forward gears (1 to 5)
    const minSpeed = currentGear === 1 ? 0 : SHIFT_UP_SPEEDS[currentGear - 1];
    const maxSpeed = SHIFT_UP_SPEEDS[currentGear] === 999 ? 240 : SHIFT_UP_SPEEDS[currentGear];
    const speedInRange = Math.max(0, safeSpeed - minSpeed);
    const range = Math.max(1, maxSpeed - minSpeed);
    targetRpmGround = IDLE_RPM + (speedInRange / range) * (MAX_RPM - IDLE_RPM - 1000);
    
    // Rev blip when launching or holding throttle at very low speed
    if (throttle > 0 && safeSpeed < 10) {
      targetRpmGround += throttle * 1500 * (1 - safeSpeed / 10);
    }
  } else {
    // Neutral (0)
    targetRpmGround = IDLE_RPM + throttle * (MAX_RPM - IDLE_RPM);
  }

  // ─── 2. Airborne Target RPM (free-spinning unloaded drivetrain) ─────────
  let targetRpmAir = IDLE_RPM;
  if (currentGear === -1) {
    if (brake > 0) {
      // In reverse, brake acts as reverse throttle -> free rev
      targetRpmAir = IDLE_RPM + brake * (MAX_RPM - IDLE_RPM);
    } else {
      targetRpmAir = IDLE_RPM;
    }
  } else {
    if (throttle > 0) {
      // Free revving with throttle up to redline
      targetRpmAir = IDLE_RPM + throttle * (MAX_RPM - IDLE_RPM);
    } else {
      targetRpmAir = IDLE_RPM;
    }
  }

  // ─── 3. Blend based on ground contact ───────────────────────────────────
  let blendedTarget = grounded * targetRpmGround + (1.0 - grounded) * targetRpmAir;

  // ─── 4. Rev Limiter Flutter (Odcinka / Limiter Bounce) ───────────────────
  if (blendedTarget >= REV_LIMITER_THRESHOLD && (throttle > 0.7 || (currentGear === -1 && brake > 0.7))) {
    const timeMs = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    // Rapid oscillation simulating ignition cut & fuel limiter bounce
    const flutter = Math.sin(timeMs * 0.05) * 140;
    blendedTarget += flutter;
  }

  // Add small random engine vibration noise
  blendedTarget += (Math.random() - 0.5) * 30;

  // ─── 5. Inertia Integration over dt (if provided) ──────────────────────
  if (options?.dt !== undefined && options?.currentRpm !== undefined) {
    const dt = Math.max(0, Math.min(0.1, options.dt));
    const prevRpm = options.currentRpm;
    const isAir = grounded < 0.4;
    const isRevvingUp = blendedTarget > prevRpm;

    // Fast rev acceleration in air (unloaded inertia), natural falloff off-throttle
    const rate = isAir
      ? (isRevvingUp ? 18000 : 7000)
      : (isRevvingUp ? 15000 : 12000);

    const maxStep = rate * dt;
    const diff = blendedTarget - prevRpm;
    const nextRpm = prevRpm + Math.sign(diff) * Math.min(Math.abs(diff), maxStep);

    return Math.min(MAX_RPM, Math.max(800, nextRpm));
  }

  // Direct clamped return for non-integrated callers
  return Math.min(MAX_RPM, Math.max(800, blendedTarget));
}
