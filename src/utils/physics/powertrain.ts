import { SHIFT_UP_SPEEDS, SHIFT_DOWN_SPEEDS, BRAKE_SPEED_THRESHOLD } from '@/config/vehicle';

/**
 * Updates the automatic gearbox based on speed and input.
 */
export function updateGearbox(
  speedKmh: number,
  forwardSpeed: number,
  input: { throttle: number; brake: number; reset: boolean; steering: number; handbrake: boolean },
  currentGear: number
): number {
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
 * Calculates engine RPM based on speed and gear.
 */
export function calculateRPM(
  speedKmh: number,
  currentGear: number,
  input: { throttle: number; brake: number; reset: boolean; steering: number; handbrake: boolean }
): number {
  let targetRpm = 1000;
  if (currentGear === -1) {
    // Realistic RPM for reverse gear
    targetRpm = 1000 + (Math.min(speedKmh, 40) / 40) * 4000;
    
    // Rev blip when starting in reverse
    if (input.brake > 0 && speedKmh < 10) {
      targetRpm += input.brake * 1500 * (1 - speedKmh / 10);
    }
  } else if (currentGear > 0) {
    const minSpeed = currentGear === 1 ? 0 : SHIFT_UP_SPEEDS[currentGear - 1];
    const maxSpeed = SHIFT_UP_SPEEDS[currentGear] === 999 ? 240 : SHIFT_UP_SPEEDS[currentGear];
    const speedInRange = Math.max(0, speedKmh - minSpeed);
    const range = Math.max(1, maxSpeed - minSpeed);
    targetRpm = 1000 + (speedInRange / range) * 7000;
    
    // Rev blip when starting or holding throttle at low speeds
    if (input.throttle > 0 && speedKmh < 10) {
      targetRpm += input.throttle * 1500 * (1 - speedKmh / 10);
    }
  }
  
  // Add small random fluctuation to RPM for realism
  targetRpm += (Math.random() - 0.5) * 50;
  
  // Clamp RPM
  return Math.min(8000, Math.max(800, targetRpm));
}
