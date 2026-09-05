/**
 * Vehicle Physics & Simulation Loop Harness for E2E Testing
 */

import { TouchInputState } from './contracts';

export interface VehicleSimState {
  speedKmh: number;
  engineRpm: number;
  gear: number;
  steeringAngle: number;
  lateralG: number;
  longitudinalG: number;
  isDrifting: boolean;
  distanceTraveledMeters: number;
  stageTimeSeconds: number;
  isUpsideDown: boolean;
  lapCompleted: boolean;
}

export class RallyStageSimulator {
  private state: VehicleSimState;
  private readonly maxSpeedKmh = 180;
  private readonly maxRpm = 7500;
  private readonly idleRpm = 950;

  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState(): VehicleSimState {
    return {
      speedKmh: 0,
      engineRpm: 950,
      gear: 1,
      steeringAngle: 0,
      lateralG: 0,
      longitudinalG: 0,
      isDrifting: false,
      distanceTraveledMeters: 0,
      stageTimeSeconds: 0,
      isUpsideDown: false,
      lapCompleted: false,
    };
  }

  reset(): void {
    this.state = this.getInitialState();
  }

  getState(): VehicleSimState {
    return { ...this.state };
  }

  triggerRollover(): void {
    this.state.isUpsideDown = true;
    this.state.speedKmh = 0;
    this.state.engineRpm = this.idleRpm;
  }

  step(dt: number, input: TouchInputState): VehicleSimState {
    if (input.reset) {
      this.state.isUpsideDown = false;
      this.state.steeringAngle = 0;
      this.state.speedKmh = Math.max(0, this.state.speedKmh * 0.1);
      return this.getState();
    }

    if (this.state.isUpsideDown) {
      return this.getState();
    }

    this.state.stageTimeSeconds += dt;

    // Steering rate interpolation
    const steerSpeed = 6.0;
    const targetSteer = input.steering;
    this.state.steeringAngle += (targetSteer - this.state.steeringAngle) * (1 - Math.exp(-steerSpeed * dt));

    // Throttle & Brake integration
    const throttle = Math.max(0, Math.min(1, input.throttle));
    const brake = Math.max(0, Math.min(1, input.brake));
    const handbrake = input.handbrake;

    let accelForce = 0;
    if (throttle > 0 && brake === 0) {
      accelForce = throttle * 8.5; // m/s^2 equivalent
    } else if (brake > 0) {
      accelForce = -brake * 14.0; // braking force
    }

    if (handbrake) {
      accelForce -= 6.0;
      if (Math.abs(this.state.steeringAngle) > 0.25 && this.state.speedKmh > 30) {
        this.state.isDrifting = true;
      }
    } else if (Math.abs(this.state.steeringAngle) < 0.15) {
      this.state.isDrifting = false;
    }

    // Convert speed km/h to m/s
    let speedMs = (this.state.speedKmh / 3.6) + (accelForce * dt);
    speedMs = Math.max(0, Math.min(this.maxSpeedKmh / 3.6, speedMs));
    this.state.speedKmh = speedMs * 3.6;

    // Lateral G estimation
    const turnRadius = Math.max(5, 50 * (1.1 - Math.abs(this.state.steeringAngle)));
    this.state.lateralG = (speedMs * speedMs) / (turnRadius * 9.81) * (this.state.steeringAngle > 0 ? 1 : -1);
    this.state.longitudinalG = accelForce / 9.81;

    // RPM & Gear calculation
    if (this.state.speedKmh < 30) this.state.gear = 1;
    else if (this.state.speedKmh < 65) this.state.gear = 2;
    else if (this.state.speedKmh < 105) this.state.gear = 3;
    else if (this.state.speedKmh < 145) this.state.gear = 4;
    else this.state.gear = 5;

    const gearRatio = [3.4, 2.1, 1.5, 1.1, 0.85][this.state.gear - 1];
    const computedRpm = Math.min(this.maxRpm, Math.max(this.idleRpm, this.state.speedKmh * 38 * gearRatio));
    this.state.engineRpm = computedRpm;

    this.state.distanceTraveledMeters += speedMs * dt;
    if (this.state.distanceTraveledMeters >= 2000) {
      this.state.lapCompleted = true;
    }

    return this.getState();
  }
}
