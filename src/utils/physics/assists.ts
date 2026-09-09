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

  // 1. Agile Turn-In & Yaw Stability Assist (around local Y axis)
  // When handbrake is pressed, allow completely free rotation for handbrake slides
  if (!input.handbrake) {
    const absSpeed = Math.abs(forwardSpeed);

    if (Math.abs(input.steering) > 0.02 && absSpeed > 1.5) {
      const isCounterSteering =
        Math.sign(input.steering) !== Math.sign(_localAngVel.y) && Math.abs(_localAngVel.y) > 0.25;

      if (isCounterSteering) {
        // Active Countersteer Stability:
        // Smoothly assists driver to catch a slide without violently catapulting into snap-oversteer or tank-slappers
        const counterAuthority = Math.min(1.2, Math.abs(_localAngVel.y) * 0.5 + 0.4);
        const counterTorque =
          input.steering *
          counterAuthority *
          mass *
          dt *
          0.45;
        localTorqueY += counterTorque;
      } else {
        // Progressive Turn-In Assistance (sharp corner entry without twitchy snapping)
        const speedRamp = Math.min(1.0, absSpeed / 10.0);
        const turnInTorque = input.steering * speedRamp * 0.22 * mass * dt;
        localTorqueY += turnInTorque;

        // Dynamic yaw rate ceiling based on steering & speed
        const targetYawRate = input.steering * Math.min(3.2, (absSpeed / 12.0) + 1.6);
        const excessYaw = _localAngVel.y - targetYawRate;

        // Smoothly damp over-rotation beyond target yaw rate to prevent spin-outs
        if (Math.sign(_localAngVel.y) === Math.sign(input.steering) && Math.abs(_localAngVel.y) > Math.abs(targetYawRate) + 0.35) {
          localTorqueY -= excessYaw * Math.max(0.12, config.handling.assists.yawDamping) * mass * dt * 1.2;
        }
      }
    } else {
      // Centered / neutral steering — gentle straight-line stability without killing drift momentum
      const isPowerSliding = input.throttle > 0.15 && Math.abs(_localAngVel.y) < 2.5;
      if (!isPowerSliding && Math.abs(_localAngVel.y) > 0.3) {
        localTorqueY -= _localAngVel.y * Math.max(0.14, config.handling.assists.yawDamping * 1.5) * mass * dt * 0.9;
      }
    }
  }

  // 2. Pitch Stabilization (damps nose-dive & prevents wheelie/flipping around local X axis)
  // Pitch velocity damping:
  if (Math.abs(_localAngVel.x) > 0.04) {
    const isUnderThrottle = input.throttle > 0.1;
    const dampMultiplier = isUnderThrottle ? 4.2 : 2.4;
    localTorqueX = -_localAngVel.x * dampMultiplier * mass * dt;
  }

  // Pitch angle restoring: forwardVec.y is negative when nose is down, positive when nose is up.
  // In right-handed coordinates (+X right, +Y up, +Z forward):
  // When nose is down (forwardVec.y < 0), negative torque around X pulls nose UP.
  // When nose is up (forwardVec.y > 0), positive torque around X pulls nose DOWN.
  const pitchSin = _forwardVec.y;
  const isWheelie = pitchSin > 0.03 && input.throttle > 0.05;
  const pitchThreshold = isWheelie ? 0.03 : 0.07;
  if (Math.abs(pitchSin) > pitchThreshold) {
    const excessPitch = Math.sign(pitchSin) * (Math.abs(pitchSin) - pitchThreshold);
    // When wheelie is detected under throttle, apply authoritative anti-wheelie torque to plant the front engine down
    const pitchGain = isWheelie ? 18.0 : (pitchSin < 0 && input.brake > 0) ? 7.5 : 4.0;
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
    if (
      Number.isFinite(_worldTorque.x) &&
      Number.isFinite(_worldTorque.y) &&
      Number.isFinite(_worldTorque.z)
    ) {
      body.applyTorqueImpulse(_worldTorque, true);
    }
  }
}

