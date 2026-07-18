import type { RapierRigidBody } from '@react-three/rapier';
import type { VehicleConfig } from '@/types/vehicle';
import { Vector3, Quaternion } from 'three';

const _localPoint = new Vector3();
const _worldPoint = new Vector3();
const _impulse = new Vector3();
const _bodyPos = new Vector3();
const _bodyQuat = new Quaternion();

export function applyAntiRollBars(
  body: RapierRigidBody,
  controller: any,
  config: VehicleConfig,
  dt: number
) {
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
}

function applyAxleARB(
  body: RapierRigidBody,
  controller: any,
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

function applyWheelForce(body: RapierRigidBody, controller: any, wheelIndex: number, forceY: number) {
  const conn = controller.wheelChassisConnectionPointCs(wheelIndex);
  if (!conn) return;
  
  _localPoint.set(conn.x, conn.y, conn.z);
  _worldPoint.copy(_localPoint).applyQuaternion(_bodyQuat).add(_bodyPos);
  
  // Apply force along the local Y axis
  _impulse.set(0, forceY, 0).applyQuaternion(_bodyQuat);
  
  body.applyImpulseAtPoint(_impulse, _worldPoint, true);
}
