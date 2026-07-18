import type { VehicleConfig } from '@/types/vehicle';
import { GEAR_RATIOS, BRAKE_SPEED_THRESHOLD, REVERSE_FORCE_MULTIPLIER } from '@/config/vehicle';

export function applyDrivetrain(
  controller: any,
  config: VehicleConfig,
  input: any,
  forwardSpeed: number,
  currentGear: number
) {
  const gearRatio = currentGear > 0 ? GEAR_RATIOS[currentGear] : 1;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];
    if (wheel.powered) {
      let engineForce = 0;
      
      const frontBias = config.drivetrain.frontBias;
      const rearBias = 1.0 - frontBias;
      const torqueMultiplier = wheel.steerable ? (frontBias * 2) : (rearBias * 2);

      if (input.throttle > 0) {
        engineForce = config.engine.maxForce * input.throttle * gearRatio * torqueMultiplier;
      } else if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
        // Braking when moving forward
        engineForce = 0;
      } else if (input.brake > 0) {
        // Reverse
        engineForce = -config.engine.maxForce * input.brake * REVERSE_FORCE_MULTIPLIER * torqueMultiplier;
      }
      controller.setWheelEngineForce(i, engineForce);
    } else {
      controller.setWheelEngineForce(i, 0);
    }
  }
}
