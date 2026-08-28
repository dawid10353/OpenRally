import type { VehicleConfig, IRapierVehicleController, SurfaceType } from '@/types/vehicle';
import type { InputState } from '@/types/game';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';
import { BRAKE_SPEED_THRESHOLD, SAND_ELEVATION_THRESHOLD } from '@/config/vehicle';
import { getSurfaceDefinition } from '@/config/surfaceRegistry';

export type { SurfaceType };

/**
 * Determines the surface type under a given world position.
 */
export function getSurfaceAtPosition(
  x: number,
  y: number,
  z: number,
  heightmapData?: HeightmapData,
  levelData?: LevelData,
): SurfaceType {
  // Low elevation near the water level is sand
  if (y < SAND_ELEVATION_THRESHOLD) {
    return 'sand';
  }

  if (heightmapData && levelData) {
    const { trackMasks, cols, rows } = heightmapData;
    const mapWidth = levelData.terrainBase.width;
    const mapDepth = levelData.terrainBase.depth;

    const nx = (x + mapWidth / 2) / mapWidth;
    const nz = (z + mapDepth / 2) / mapDepth;
    const col = Math.floor(nx * (cols - 1));
    const row = Math.floor(nz * (rows - 1));

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const mask = trackMasks[row * cols + col];
      if (mask > 0.35) {
        return 'mud';
      }
    }
  }

  // Off the muddy track, driving on grass/dirt
  return 'grass';
}

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

// Preallocated reusable grips array to avoid per-frame GC pressure
const _gripsBuffer: number[] = [0, 0, 0, 0];

export function applyTireFrictionAndBrakes(
  controller: IRapierVehicleController,
  config: VehicleConfig,
  input: Pick<InputState, 'brake' | 'handbrake' | 'steering'> & { throttle?: number },
  speedKmh: number,
  forwardSpeed: number,
  posX: number,
  posY: number,
  posZ: number,
  slipAngle: number,
  heightmapData?: HeightmapData,
  levelData?: LevelData,
): { grips: number[]; surface: SurfaceType } {
  const surface = getSurfaceAtPosition(posX, posY, posZ, heightmapData, levelData);
  const surfaceDef = getSurfaceDefinition(surface);
  const tireModel = surfaceDef.tireModel;

  // Ensure buffer matches wheel count
  if (_gripsBuffer.length !== config.wheels.length) {
    _gripsBuffer.length = config.wheels.length;
  }

  const throttle = input.throttle ?? 0;

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
      // Linear drop-off to slideGrip over 45 degrees
      const overSlip = Math.min(1.0, (absSlipAngle - gripCurve.peakSlipAngle) / (Math.PI / 4));
      currentFriction = gripCurve.baseGrip - (gripCurve.baseGrip - gripCurve.slideGrip) * overSlip;
    }

    // Dynamic loose surface traction loss under throttle (power oversteer / wheelspin)
    if (throttle > 0.15 && surfaceDef.looseSurfaceTractionLoss && wheel.powered) {
      // Rear/steerable power delivery breaks traction on loose surfaces (mud, grass, sand)
      const axleSlipFactor = !wheel.steerable ? 1.0 : 0.45;
      const tractionLoss = axleSlipFactor * surfaceDef.looseSurfaceTractionLoss * throttle;
      currentFriction *= Math.max(0.35, 1.0 - tractionLoss);
    }

    // Handbrake — drift assist grip multiplier
    if (input.handbrake && !wheel.steerable) {
      brakeForce = config.brakes.handbrakeForce;
      currentFriction *= config.handling.assists.driftGripMultiplier;
    }

    controller.setWheelFrictionSlip(i, currentFriction);
    controller.setWheelBrake(i, brakeForce);
    _gripsBuffer[i] = currentFriction;

    // Steering
    if (wheel.steerable) {
      const maxSteerAngle = getInterpolatedSteeringAngle(speedKmh, config.handling.steeringCurve);
      const steerAngle = input.steering * maxSteerAngle;
      controller.setWheelSteering(i, steerAngle);
    }
  }
  
  return { grips: _gripsBuffer, surface };
}
