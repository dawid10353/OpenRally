/**
 * Linear interpolation between two values.
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor [0, 1]
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max.
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a value from one range to another.
 * @param value - Input value
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * t;
}

/**
 * Smooth damp — spring-damper style smooth follow.
 * Based on Game Programming Gems 4, adapted for frame-rate independence.
 * @param current - Current value
 * @param target - Target value
 * @param velocity - Current velocity (mutated in-place via returned value)
 * @param smoothTime - Approximate time to reach target (seconds)
 * @param deltaTime - Frame delta time (seconds)
 * @param maxSpeed - Maximum speed clamp
 * @returns [newValue, newVelocity]
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaTime: number,
  maxSpeed: number = Infinity,
): [number, number] {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2.0 / st;
  const x = omega * deltaTime;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const maxChange = maxSpeed * st;
  change = clamp(change, -maxChange, maxChange);

  const adjustedTarget = current - change;
  const temp = (velocity + omega * change) * deltaTime;
  let newVelocity = (velocity - omega * temp) * exp;
  let newValue = adjustedTarget + (change + temp) * exp;

  // Prevent overshooting
  if (adjustedTarget - current > 0.0 === newValue > adjustedTarget) {
    newValue = adjustedTarget;
    newVelocity = (newValue - adjustedTarget) / deltaTime;
  }

  return [newValue, newVelocity];
}

/**
 * Convert radians to degrees.
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Convert degrees to radians.
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
