import { Object3D } from 'three';
import type { VehicleConfig, IRapierVehicleController } from '@/types/vehicle';
import { SHIFT_UP_SPEEDS } from '@/config/vehicle';

export function syncWheelVisuals(
  controller: IRapierVehicleController,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
  config: VehicleConfig,
  forwardSpeed: number,
  dt: number,
  rpm: number = 1000,
  currentGear: number = 1,
): void {
  const wheels = wheelRefs.current;
  if (!wheels) return;

  for (let i = 0; i < config.wheels.length; i++) {
    const wheelObj = wheels[i];
    if (!wheelObj) continue;

    const connection = controller.wheelChassisConnectionPointCs(i);
    const suspension = controller.wheelSuspensionLength(i);
    const steer = controller.wheelSteering(i);
    const wheelConfig = config.wheels[i];

    if (connection != null && suspension != null) {
      // Position: connection point - suspension compression
      wheelObj.position.set(
        connection.x,
        connection.y - suspension,
        connection.z,
      );

      // Steering rotation (Y axis)
      if (steer != null) {
        wheelObj.rotation.y = steer;
      }

      // Check if wheel has ground contact
      const isContact = controller.wheelIsInContact ? controller.wheelIsInContact(i) : true;

      let effectiveSpeed = forwardSpeed;
      if (!isContact && wheelConfig.powered) {
        // When airborne and powered, wheel spin speed reflects engine RPM in current gear
        const sign = currentGear === -1 ? -1 : 1;
        const maxGearSpeed = currentGear === -1 ? 40 : (SHIFT_UP_SPEEDS[currentGear] ?? 240);
        const effectiveMaxSpeed = maxGearSpeed === 999 ? 240 : maxGearSpeed;
        const rpmFraction = Math.max(0, (rpm - 1000) / 7000);
        const freeWheelSpeedMps = (sign * (rpmFraction * effectiveMaxSpeed)) / 3.6;
        effectiveSpeed = Math.abs(freeWheelSpeedMps) > Math.abs(forwardSpeed) ? freeWheelSpeedMps : forwardSpeed;
      }

      // Spin rotation (X axis) based on speed
      const spinSpeed = (effectiveSpeed / wheelConfig.radius) * dt;
      wheelObj.children[0]?.rotateX(spinSpeed);
    }
  }
}
