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
  /** Lateral slip angle in radians */
  readonly slipAngle?: number;
  /** Steering input magnitude (-1.0 to 1.0) */
  readonly steering?: number;
  /** Loose surface traction loss (e.g. 0.45 for sand, 0.25 for mud) */
  readonly looseSurfaceTractionLoss?: number;
}

/**
 * Configuration mapping for baseline mechanical engine speeds per gear.
 */
interface GearSpeedBand {
  readonly minSpeed: number;
  readonly maxSpeed: number;
  readonly minRpm: number;
  readonly maxRpm: number;
}

const GEAR_SPEED_BANDS: readonly GearSpeedBand[] = [
  { minSpeed: 0, maxSpeed: 0, minRpm: IDLE_RPM, maxRpm: IDLE_RPM },   // 0: Neutral
  { minSpeed: 0, maxSpeed: 40, minRpm: IDLE_RPM, maxRpm: 7500 },      // 1st gear
  { minSpeed: 25, maxSpeed: 80, minRpm: 3400, maxRpm: 7500 },        // 2nd gear
  { minSpeed: 55, maxSpeed: 130, minRpm: 4000, maxRpm: 7600 },       // 3rd gear
  { minSpeed: 95, maxSpeed: 180, minRpm: 4600, maxRpm: 7600 },       // 4th gear
  { minSpeed: 145, maxSpeed: 240, minRpm: 5000, maxRpm: 7800 },      // 5th gear
];

/**
 * Updates the automatic gearbox based on speed and input.
 * Implements kickdown / sport downshifting under full throttle or heavy cornering load.
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
    else if (newGear > 1) {
      // Kickdown margin under heavy throttle or cornering load to keep engine in powerband
      const kickdownMargin =
        (input.throttle > 0.65 || (input.steering && Math.abs(input.steering) > 0.4)) ? 10 : 0;
      if (speedKmh < SHIFT_DOWN_SPEEDS[newGear] + kickdownMargin) {
        newGear--;
      }
    }
  }

  return newGear;
}

/**
 * Calculates engine RPM based on speed, gear, input, ground contact, and dynamic rally powerband.
 *
 * - When grounded with throttle: Engine operates dynamically in its high-rev powerband.
 *   Cornering slip, loose surface traction loss (sand, mud), and steering load produce
 *   authentic wheelspin rev flare (6,500 – 7,800 RPM) with rev-limiter flutter.
 * - When grounded off-throttle: Engine RPM smoothly follows mechanical gear speed down to idle.
 * - When airborne with throttle: Free revving rapidly to redline (8000 RPM).
 * - When landing: Integrates smoothly to match transmission speed on touchdown.
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

  // ─── 1. Ground Target RPM (Mechanical + Dynamic Throttle / Wheelspin) ──
  let targetRpmGround = IDLE_RPM;

  if (currentGear === -1) {
    // Reverse gear
    targetRpmGround = IDLE_RPM + (Math.min(safeSpeed, 40) / 40) * 4000;
    if (brake > 0) {
      targetRpmGround += brake * 2500 * (1 - Math.min(1, safeSpeed / 25));
    }
  } else if (currentGear >= 1 && currentGear <= 5) {
    // Forward gears (1 to 5)
    const band = GEAR_SPEED_BANDS[currentGear];
    let mechanicalRpm = IDLE_RPM;

    if (safeSpeed >= band.minSpeed) {
      const range = Math.max(1, band.maxSpeed - band.minSpeed);
      const ratio = Math.min(1.0, (safeSpeed - band.minSpeed) / range);
      mechanicalRpm = band.minRpm + ratio * (band.maxRpm - band.minRpm);
    } else {
      // Speed below minimum engaged gear speed (before downshift)
      const ratio = band.minSpeed > 0 ? safeSpeed / band.minSpeed : 0;
      mechanicalRpm = IDLE_RPM + ratio * (band.minRpm - IDLE_RPM);
    }

    if (throttle > 0) {
      // Dynamic Rally Powerband floor under throttle (engine revs high to deliver peak torque)
      const powerbandFloor = IDLE_RPM + throttle * 4800;

      // Wheelspin rev flare from steering scrub, lateral slip, and loose surface traction loss
      const steerFactor = Math.abs(options?.steering ?? input.steering ?? 0);
      const slipAngle = Math.abs(options?.slipAngle ?? 0);
      const slipRatio = Math.min(1.0, slipAngle / 0.5);
      const surfaceLoss = options?.looseSurfaceTractionLoss ?? 0;

      const wheelspinBoost = throttle * (steerFactor * 1000 + slipRatio * 1400 + surfaceLoss * 2200);

      // Standstill launch rev boost
      const launchBoost = safeSpeed < 10 ? throttle * 2200 * (1.0 - safeSpeed / 10) : 0;

      targetRpmGround = Math.max(mechanicalRpm, powerbandFloor) + wheelspinBoost + launchBoost;
    } else {
      // Off-throttle: mechanical engine braking speed
      targetRpmGround = mechanicalRpm;
    }
  } else {
    // Neutral (0)
    targetRpmGround = IDLE_RPM + throttle * (MAX_RPM - IDLE_RPM);
  }

  // ─── 2. Airborne Target RPM (free-spinning unloaded drivetrain) ─────────
  let targetRpmAir = IDLE_RPM;
  if (currentGear === -1) {
    if (brake > 0) {
      targetRpmAir = IDLE_RPM + brake * (MAX_RPM - IDLE_RPM);
    } else {
      targetRpmAir = IDLE_RPM;
    }
  } else {
    if (throttle > 0) {
      targetRpmAir = IDLE_RPM + throttle * (MAX_RPM - IDLE_RPM);
    } else {
      targetRpmAir = IDLE_RPM;
    }
  }

  // ─── 3. Blend based on ground contact ───────────────────────────────────
  let blendedTarget = grounded * targetRpmGround + (1.0 - grounded) * targetRpmAir;

  // ─── 4. Rev Limiter Flutter (Odcinka / Limiter Bounce) ───────────────────
  if (blendedTarget >= REV_LIMITER_THRESHOLD && (throttle > 0.65 || (currentGear === -1 && brake > 0.65))) {
    const timeMs = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const flutter = Math.sin(timeMs * 0.06) * 140;
    blendedTarget += flutter;
  }

  // Add small random engine vibration noise
  blendedTarget += (Math.random() - 0.5) * 20;

  // ─── 5. Inertia Integration over dt (if provided) ──────────────────────
  if (options?.dt !== undefined && options?.currentRpm !== undefined) {
    const dt = Math.max(0, Math.min(0.1, options.dt));
    const prevRpm = options.currentRpm;
    const isAir = grounded < 0.4;
    const isRevvingUp = blendedTarget > prevRpm;

    // Fast, responsive throttle rev-up (lightweight flywheel), smooth off-throttle engine braking
    const rate = isAir
      ? (isRevvingUp ? 22000 : 7500)
      : (isRevvingUp ? 18000 : 11000);

    const maxStep = rate * dt;
    const diff = blendedTarget - prevRpm;
    const nextRpm = prevRpm + Math.sign(diff) * Math.min(Math.abs(diff), maxStep);

    return Math.min(MAX_RPM, Math.max(800, nextRpm));
  }

  // Direct clamped return for non-integrated callers
  return Math.min(MAX_RPM, Math.max(800, blendedTarget));
}
