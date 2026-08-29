import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';
import type { InputState } from '@/types/game';
import { GEAR_RATIOS, BRAKE_SPEED_THRESHOLD, REVERSE_FORCE_MULTIPLIER } from '@/config/vehicle';

export function applyDrivetrain(
  controller: IRapierVehicleController,
  config: VehicleConfig,
  input: Pick<InputState, 'throttle' | 'brake'> & { steering?: number },
  forwardSpeed: number,
  currentGear: number,
  slipAngle?: number
): void {
  const gearRatio = currentGear > 0 ? GEAR_RATIOS[currentGear] : 1;
  const steerAmount = input.steering ? Math.abs(input.steering) : 0;
  const slipAmount = slipAngle ? Math.min(1.0, Math.abs(slipAngle) / (Math.PI / 4)) : 0;

  // Active AWD Differential & Drift Power Compensation:
  // When cornering or holding a high-angle drift under throttle, compensate for lateral scrub drag
  // and maintain full AWD propulsion so the car accelerates and glides dynamically through slides.
  const driftPowerBoost = 1.0 + steerAmount * 0.25 + slipAmount * 0.45;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];
    if (wheel.powered) {
      let engineForce = 0;
      
      const frontBias = config.drivetrain.frontBias;
      const rearBias = 1.0 - frontBias;
      const torqueMultiplier = wheel.steerable ? (frontBias * 2) : (rearBias * 2);

      if (input.throttle > 0) {
        engineForce = config.engine.maxForce * input.throttle * gearRatio * torqueMultiplier * driftPowerBoost;
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
