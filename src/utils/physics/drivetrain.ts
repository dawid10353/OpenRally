import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';
import type { InputState } from '@/types/game';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import {
  GEAR_RATIOS,
  GEAR_MAX_SPEEDS,
  REVERSE_MAX_SPEED,
  BRAKE_SPEED_THRESHOLD,
  REVERSE_FORCE_MULTIPLIER,
} from '@/config/vehicle';

const _thrustImpulse = new Vector3();

/**
 * Calculates and applies engine forces, AWD torque distribution, launch ramping,
 * and per-gear mechanical rev limiter governors across all driven wheels.
 */
export function applyDrivetrain(
  controller: IRapierVehicleController,
  config: VehicleConfig,
  input: Pick<InputState, 'throttle' | 'brake'> & { steering?: number },
  forwardSpeed: number,
  currentGear: number,
  slipAngle?: number,
  speedKmh?: number
): void {
  const gearRatio = currentGear > 0 && currentGear < GEAR_RATIOS.length ? GEAR_RATIOS[currentGear] : 1;
  const steerAmount = input.steering ? Math.abs(input.steering) : 0;
  const slipAmount = slipAngle ? Math.min(1.0, Math.abs(slipAngle) / (Math.PI / 4)) : 0;
  const effectiveSpeedKmh = speedKmh !== undefined ? speedKmh : Math.abs(forwardSpeed) * 3.6;

  // Mechanical Rev Limiter & Speed Governor per gear:
  // In manual mode (and automatic at redline), prevent driving beyond the mechanical ratio limit of the gear.
  let revLimiterGovernor = 1.0;
  if (currentGear > 0 && currentGear < GEAR_MAX_SPEEDS.length) {
    const maxSpeedForGear = GEAR_MAX_SPEEDS[currentGear];
    if (effectiveSpeedKmh >= maxSpeedForGear) {
      // Hard rev limiter cut when reaching gear top speed
      revLimiterGovernor = 0.0;
    } else if (effectiveSpeedKmh > maxSpeedForGear * 0.90) {
      // Progressive power reduction in the last 10% before redline
      revLimiterGovernor = Math.max(0, (maxSpeedForGear - effectiveSpeedKmh) / (maxSpeedForGear * 0.10));
    }
  } else if (currentGear === -1) {
    if (effectiveSpeedKmh >= REVERSE_MAX_SPEED) {
      revLimiterGovernor = 0.0;
    } else if (effectiveSpeedKmh > REVERSE_MAX_SPEED * 0.88) {
      revLimiterGovernor = Math.max(0, (REVERSE_MAX_SPEED - effectiveSpeedKmh) / (REVERSE_MAX_SPEED * 0.12));
    }
  }

  // Continuous Symmetrical AWD Differential & Drift Power Compensation:
  // When cornering or sliding under throttle, overcome lateral tire scrub drag
  // and deliver robust continuous 4-wheel pull so the car powers dynamically through slides.
  const driftPowerBoost = 1.0 + steerAmount * 0.35 + slipAmount * 0.75;

  // Progressive launch torque delivery in 1st gear from dead stop:
  // Smoothly ramps torque over 0 -> 3.5 m/s (~12.6 km/h) to prevent violent instantaneous
  // launch shock from levering the front axle up, simulating clutch engagement & turbo spool.
  const speedAbs = Math.abs(forwardSpeed);
  const launchRamp = currentGear === 1 && speedAbs < 3.5
    ? 0.72 + 0.28 * (speedAbs / 3.5)
    : 1.0;

  // Anti-wheelie power transfer:
  // If front wheels start unweighting (suspension expanding towards full rebound),
  // simulate active center differential / traction control by moderating rear wheel torque
  // while front wheels pull the car forward to keep tires firmly planted.
  let frontUnweightedRatio = 0;
  if (typeof controller.wheelSuspensionLength === 'function' && config.wheels.length >= 2) {
    const fl = controller.wheelSuspensionLength(0);
    const fr = controller.wheelSuspensionLength(1);
    if (fl !== undefined && fr !== undefined && fl !== null && fr !== null) {
      const flComp = config.wheels[0].suspensionRestLength - fl;
      const frComp = config.wheels[1].suspensionRestLength - fr;
      const avgFrontComp = (flComp + frComp) * 0.5;
      if (avgFrontComp < 0.03) {
        frontUnweightedRatio = Math.min(1.0, Math.max(0, (0.03 - avgFrontComp) / 0.05));
      }
    }
  }

  for (let i = 0; i < config.wheels.length; i++) {
    const wheel = config.wheels[i];
    if (wheel.powered) {
      let engineForce = 0;
      
      const frontBias = config.drivetrain.frontBias;
      const rearBias = 1.0 - frontBias;
      const baseTorqueMultiplier = wheel.steerable ? (frontBias * 2) : (rearBias * 2);
      const torqueMultiplier = wheel.steerable
        ? baseTorqueMultiplier
        : (baseTorqueMultiplier * (1.0 - frontUnweightedRatio * 0.45));

      if (currentGear === 0) {
        // Neutral: zero tractive drive force to wheels (engine revs freely in neutral)
        engineForce = 0;
      } else if (currentGear === -1) {
        // Reverse gear: Throttle powers car backward; in automatic mode, Brake also powers reverse
        const revDrive = input.throttle > 0 ? input.throttle : (input.brake > 0 && forwardSpeed < BRAKE_SPEED_THRESHOLD ? input.brake : 0);
        if (revDrive > 0) {
          engineForce = -config.engine.maxForce * revDrive * REVERSE_FORCE_MULTIPLIER * baseTorqueMultiplier * revLimiterGovernor;
        }
      } else if (input.throttle > 0) {
        engineForce = config.engine.maxForce * input.throttle * gearRatio * torqueMultiplier * driftPowerBoost * launchRamp * revLimiterGovernor;
      } else if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
        // Braking when moving forward
        engineForce = 0;
      } else if (input.brake > 0) {
        // Auto reverse trigger when stopped
        engineForce = -config.engine.maxForce * input.brake * REVERSE_FORCE_MULTIPLIER * baseTorqueMultiplier * revLimiterGovernor;
      }
      const safeEngineForce = Number.isFinite(engineForce) ? engineForce : 0;
      controller.setWheelEngineForce(i, safeEngineForce);
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
  dt: number,
  currentGear: number = 1
): void {
  if (input.throttle <= 0.05 || groundedRatio <= 0) return;

  const absSlip = Math.abs(slipAngle);
  if (absSlip < 0.05) return;

  const gearRatio = currentGear > 0 && currentGear < GEAR_RATIOS.length ? GEAR_RATIOS[currentGear] : 1.0;
  const maxGearSpeed = currentGear > 0 && currentGear < GEAR_MAX_SPEEDS.length
    ? GEAR_MAX_SPEEDS[currentGear]
    : config.engine.maxSpeed;

  // Slip engagement factor: ramps up as vehicle enters drift
  const slipFactor = Math.min(1.0, (absSlip - 0.04) / 0.35);
  // Engine power headroom relative to current gear's mechanical top speed
  const speedGovernor = Math.max(0, 1.0 - speedKmh / (maxGearSpeed * 1.02));
  
  // AWD directional propulsion impulse along chassis heading:
  // Delivers robust forward throttle thrust to counteract lateral scrub friction,
  // sustaining drift momentum and allowing the vehicle to power dynamically through slides.
  const thrustMagnitude =
    config.engine.maxForce *
    2.2 *
    gearRatio *
    input.throttle *
    slipFactor *
    speedGovernor *
    groundedRatio *
    dt;

  if (Number.isFinite(thrustMagnitude) && thrustMagnitude > 0) {
    _thrustImpulse.copy(forwardVector).multiplyScalar(thrustMagnitude);
    if (
      Number.isFinite(_thrustImpulse.x) &&
      Number.isFinite(_thrustImpulse.y) &&
      Number.isFinite(_thrustImpulse.z)
    ) {
      body.applyImpulse(_thrustImpulse, true);
    }
  }
}
