import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';
import type { InputState } from '@/types/game';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import { GEAR_RATIOS, BRAKE_SPEED_THRESHOLD, REVERSE_FORCE_MULTIPLIER } from '@/config/vehicle';

const _thrustImpulse = new Vector3();

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

  // Continuous Symmetrical AWD Differential & Drift Power Compensation:
  // When cornering or sliding under throttle, overcome lateral tire scrub drag
  // and deliver robust continuous 4-wheel pull so the car powers dynamically through slides.
  const driftPowerBoost = 1.0 + steerAmount * 0.35 + slipAmount * 0.65;

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

/**
 * Applies active AWD directional tractive propulsion during power slides.
 * Overcomes Rapier's isotropic Coulomb friction circle clamping on sliding wheels,
 * ensuring all 4 driven wheels deliver authentic forward momentum and throttle pull.
 */
export function applyAwdDriftPropulsion(
  body: RapierRigidBody,
  config: VehicleConfig,
  input: Pick<InputState, 'throttle' | 'steering'>,
  forwardVector: Vector3,
  speedKmh: number,
  slipAngle: number,
  groundedRatio: number,
  dt: number
): void {
  if (input.throttle <= 0.05 || groundedRatio <= 0) return;

  const absSlip = Math.abs(slipAngle);
  if (absSlip < 0.05) return;

  // Slip engagement factor: ramps up as vehicle enters drift
  const slipFactor = Math.min(1.0, (absSlip - 0.04) / (Math.PI / 4.5));
  // Engine power headroom relative to top speed
  const speedGovernor = Math.max(0, 1.0 - speedKmh / (config.engine.maxSpeed * 1.05));
  
  // AWD directional propulsion impulse along chassis heading
  const thrustMagnitude =
    (config.engine.maxForce / Math.max(1, config.chassisMass)) *
    0.65 *
    input.throttle *
    slipFactor *
    speedGovernor *
    groundedRatio *
    body.mass() *
    dt;

  if (thrustMagnitude > 0) {
    _thrustImpulse.copy(forwardVector).multiplyScalar(thrustMagnitude);
    body.applyImpulse(_thrustImpulse, true);
  }
}
