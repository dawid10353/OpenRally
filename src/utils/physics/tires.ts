import type { VehicleConfig } from '@/types/vehicle';
import { TIRE_MODELS, BRAKE_SPEED_THRESHOLD, SAND_ELEVATION_THRESHOLD } from '@/config/vehicle';

export function getInterpolatedSteeringAngle(speedKmh: number, curve: readonly [number, number][]): number {
  if (!curve || curve.length === 0) return 0;
  if (speedKmh <= curve[0][0]) return curve[0][1];
  if (speedKmh >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

  for (let i = 0; i < curve.length - 1; i++) {
    if (speedKmh >= curve[i][0] && speedKmh <= curve[i + 1][0]) {
      const t = (speedKmh - curve[i][0]) / (curve[i + 1][0] - curve[i][0]);
      return curve[i][1] + t * (curve[i + 1][1] - curve[i][1]);
    }
  }
  return curve[0][1];
}

export function applyTireFrictionAndBrakes(
  controller: any,
  config: VehicleConfig,
  input: any,
  speedKmh: number,
  forwardSpeed: number,
  posY: number,
  slipAngle: number
): number[] {
  const isSand = posY < SAND_ELEVATION_THRESHOLD;
  const tireModel = isSand ? TIRE_MODELS.sand : TIRE_MODELS.tarmac;
  const grips: number[] = [];

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];

    // Braking
    let brakeForce = 0;
    if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
      // Brake Bias
      const frontBias = config.brakes.frontBias;
      const rearBias = 1.0 - frontBias;
      // Multiplier ensures the total braking power remains consistent
      const brakeMultiplier = wheel.steerable ? (frontBias * 2) : (rearBias * 2);
      brakeForce = config.brakes.maxForce * input.brake * brakeMultiplier;
    }

    // Base friction with simplified slip curve (Pacejka-lite)
    const gripCurve = wheel.steerable ? tireModel.front : tireModel.rear;
    let currentFriction = gripCurve.baseGrip;
    
    // Decrease grip if we exceed peak slip angle
    const absSlipAngle = Math.abs(slipAngle);
    if (absSlipAngle > gripCurve.peakSlipAngle) {
      // Simple linear drop-off to slideGrip (can be replaced with non-linear curve later)
      const overSlip = Math.min(1.0, (absSlipAngle - gripCurve.peakSlipAngle) / (Math.PI / 4)); // drop over 45 degrees
      currentFriction = gripCurve.baseGrip - (gripCurve.baseGrip - gripCurve.slideGrip) * overSlip;
    }

    // Handbrake — drift assist grip multiplier
    if (input.handbrake && !wheel.steerable) {
      brakeForce = config.brakes.handbrakeForce;
      currentFriction *= config.handling.assists.driftGripMultiplier;
    }

    controller.setWheelFrictionSlip(i, currentFriction);
    controller.setWheelBrake(i, brakeForce);
    grips.push(currentFriction);

    // Steering
    if (wheel.steerable) {
      const maxSteerAngle = getInterpolatedSteeringAngle(speedKmh, config.handling.steeringCurve);
      const steerAngle = input.steering * maxSteerAngle;
      controller.setWheelSteering(i, steerAngle);
    }
  }
  
  return grips;
}
