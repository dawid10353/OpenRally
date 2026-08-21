import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion } from 'three';
import type { VehicleConfig } from '@/types/vehicle';
import type { InputState } from '@/types/game';

const _bodyQuat = new Quaternion();
const _invBodyQuat = new Quaternion();
const _worldAngVel = new Vector3();
const _localAngVel = new Vector3();
const _localTorque = new Vector3();
const _worldTorque = new Vector3();
const _forwardVec = new Vector3();
const _rightVec = new Vector3();

export function applyAssists(
  body: RapierRigidBody, 
  config: VehicleConfig, 
  input: InputState,
  forwardSpeed: number,
  dt: number
) {
  const angvel = body.angvel();
  const rot = body.rotation();

  _bodyQuat.set(rot.x, rot.y, rot.z, rot.w);
  _invBodyQuat.copy(_bodyQuat).invert();

  // Local angular velocity
  _worldAngVel.set(angvel.x, angvel.y, angvel.z);
  _localAngVel.copy(_worldAngVel).applyQuaternion(_invBodyQuat);

  // Local orientation vectors in world space
  _forwardVec.set(0, 0, 1).applyQuaternion(_bodyQuat);
  _rightVec.set(1, 0, 0).applyQuaternion(_bodyQuat);

  let localTorqueX = 0;
  let localTorqueY = 0;
  let localTorqueZ = 0;

  const mass = body.mass();

  // 1. Gentle Drift & Yaw Assist (around local Y axis)
  // When handbrake is pressed or player is drifting, allow free rotation for fun powerslides
  if (!input.handbrake) {
    const targetYawRate = input.steering * (Math.abs(forwardSpeed) / 2.85) * 0.55;
    const yawRateError = _localAngVel.y - targetYawRate;

    if (Math.abs(yawRateError) > 0.1) {
      // Subtle stabilization damping to keep driving responsive and fun
      localTorqueY = -yawRateError * config.handling.assists.yawDamping * mass * dt * 2.5;
    }
  }

  // 2. Pitch Stabilization (damps nose-dive & prevents endo/flipping around local X axis)
  // Pitch velocity damping:
  if (Math.abs(_localAngVel.x) > 0.1) {
    localTorqueX = -_localAngVel.x * 1.2 * mass * dt;
  }

  // Pitch angle restoring: forwardVec.y is negative when nose is down, positive when nose is up.
  // In right-handed coordinates (+X right, +Y up, +Z forward):
  // When nose is down (forwardVec.y < 0), negative torque around X pulls nose UP.
  // When nose is up (forwardVec.y > 0), positive torque around X pulls nose DOWN.
  const pitchSin = _forwardVec.y;
  if (Math.abs(pitchSin) > 0.08) {
    const excessPitch = Math.sign(pitchSin) * (Math.abs(pitchSin) - 0.08);
    const pitchGain = (pitchSin < 0 && input.brake > 0) ? 6.0 : 3.0;
    localTorqueX += excessPitch * pitchGain * mass * dt;
  }

  // 3. Roll Stabilization (allows fun body lean, prevents barrel rolls)
  if (Math.abs(_localAngVel.z) > 0.25) {
    localTorqueZ = -_localAngVel.z * 0.8 * mass * dt;
  }

  // Anti-Roll restoring: Kicks in if body rolls beyond 12 degrees
  const rollSin = _rightVec.y;
  if (Math.abs(rollSin) > 0.15) {
    const excessRoll = Math.sign(rollSin) * (Math.abs(rollSin) - 0.15);
    localTorqueZ -= excessRoll * 5.0 * mass * dt;
  }

  if (localTorqueX !== 0 || localTorqueY !== 0 || localTorqueZ !== 0) {
    _localTorque.set(localTorqueX, localTorqueY, localTorqueZ);
    _worldTorque.copy(_localTorque).applyQuaternion(_bodyQuat);
    body.applyTorqueImpulse(_worldTorque, true);
  }
}

