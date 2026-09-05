import type { RapierRigidBody } from '@react-three/rapier';
import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';
import { Vector3, Quaternion } from 'three';

const _localPoint = new Vector3();
const _worldPoint = new Vector3();
const _impulse = new Vector3();
const _bodyPos = new Vector3();
const _bodyQuat = new Quaternion();

const _angvel = new Vector3();
const _localAngvel = new Vector3();
const _pitchTorque = new Vector3();
const _invQuat = new Quaternion();

export function applyAntiRollBars(
  body: RapierRigidBody,
  controller: IRapierVehicleController,
  config: VehicleConfig,
  dt: number
): void {
  if (!config.suspension) return;

  const pos = body.translation();
  const quat = body.rotation();
  _bodyPos.set(pos.x, pos.y, pos.z);
  _bodyQuat.set(quat.x, quat.y, quat.z, quat.w);

  // Front Axle (Wheels 0 and 1 are FL and FR)
  if (config.suspension.frontAntiRollBarStiffness > 0) {
    applyAxleARB(body, controller, config, 0, 1, config.suspension.frontAntiRollBarStiffness, dt);
  }
  
  // Rear Axle (Wheels 2 and 3 are RL and RR)
  if (config.suspension.rearAntiRollBarStiffness > 0) {
    applyAxleARB(body, controller, config, 2, 3, config.suspension.rearAntiRollBarStiffness, dt);
  }

  // Active longitudinal pitch stabilization (Anti-Squat & Anti-Dive)
  applyPitchStabilization(body, controller, config, dt);
}

/**
 * Applies longitudinal pitch stabilization:
 * - Anti-Squat under acceleration (prevents tail dragging / front lifting)
 * - Anti-Dive under hard braking (prevents front flipping / rear lifting)
 * - Pitch oscillation damping
 */
export function applyPitchStabilization(
  body: RapierRigidBody,
  controller: IRapierVehicleController,
  config: VehicleConfig,
  dt: number,
): void {
  if (config.wheels.length < 4) return;

  // Front vs rear average suspension compression
  const flLength = controller.wheelSuspensionLength(0) ?? config.wheels[0].suspensionRestLength;
  const frLength = controller.wheelSuspensionLength(1) ?? config.wheels[1].suspensionRestLength;
  const rlLength = controller.wheelSuspensionLength(2) ?? config.wheels[2].suspensionRestLength;
  const rrLength = controller.wheelSuspensionLength(3) ?? config.wheels[3].suspensionRestLength;

  const frontAvgRest = (config.wheels[0].suspensionRestLength + config.wheels[1].suspensionRestLength) * 0.5;
  const rearAvgRest = (config.wheels[2].suspensionRestLength + config.wheels[3].suspensionRestLength) * 0.5;

  const frontAvgLen = (flLength + frLength) * 0.5;
  const rearAvgLen = (rlLength + rrLength) * 0.5;

  const frontCompression = frontAvgRest - frontAvgLen;
  const rearCompression = rearAvgRest - rearAvgLen;

  // Compression delta: > 0 means nose is dipping (dive), < 0 means tail is squatting (squat)
  const pitchCompressionDelta = frontCompression - rearCompression;
  const pitchStiffness = 38.0;
  const pitchRestoringTorque = -pitchCompressionDelta * pitchStiffness;

  // Angular pitch rate damping (around chassis local X axis)
  const angvel = typeof body.angvel === 'function' ? body.angvel() : { x: 0, y: 0, z: 0 };
  _angvel.set(angvel.x, angvel.y, angvel.z);
  _invQuat.copy(_bodyQuat).invert();
  _localAngvel.copy(_angvel).applyQuaternion(_invQuat);
  const pitchDamping = -_localAngvel.x * 22.0;

  // Apply restoring pitch torque in world space
  const totalPitchTorque = (pitchRestoringTorque + pitchDamping) * dt;
  _pitchTorque.set(totalPitchTorque, 0, 0).applyQuaternion(_bodyQuat);
  body.applyTorqueImpulse(_pitchTorque, true);
}

function applyAxleARB(
  body: RapierRigidBody,
  controller: IRapierVehicleController,
  config: VehicleConfig,
  leftIndex: number,
  rightIndex: number,
  stiffness: number,
  dt: number
) {
  const leftLength = controller.wheelSuspensionLength(leftIndex);
  const rightLength = controller.wheelSuspensionLength(rightIndex);
  
  if (leftLength == null || rightLength == null) return;

  const leftWheel = config.wheels[leftIndex];
  const rightWheel = config.wheels[rightIndex];
  
  const leftCompression = leftWheel.suspensionRestLength - leftLength;
  const rightCompression = rightWheel.suspensionRestLength - rightLength;
  
  // Force proportional to difference in compression
  // If left is more compressed than right, antiRollForce > 0
  const antiRollForce = (leftCompression - rightCompression) * stiffness;
  
  // We want to push the left side UP (positive local Y impulse)
  // and the right side DOWN (negative local Y impulse) to resist the roll.
  applyWheelForce(body, controller, leftIndex, antiRollForce * dt);
  applyWheelForce(body, controller, rightIndex, -antiRollForce * dt);
}

function applyWheelForce(body: RapierRigidBody, controller: IRapierVehicleController, wheelIndex: number, forceY: number) {
  const conn = controller.wheelChassisConnectionPointCs(wheelIndex);
  if (!conn) return;
  
  _localPoint.set(conn.x, conn.y, conn.z);
  _worldPoint.copy(_localPoint).applyQuaternion(_bodyQuat).add(_bodyPos);
  
  // Apply force along the local Y axis
  _impulse.set(0, forceY, 0).applyQuaternion(_bodyQuat);
  
  body.applyImpulseAtPoint(_impulse, _worldPoint, true);
}

