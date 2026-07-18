import { Object3D } from 'three';
import type { VehicleConfig } from '@/types/vehicle';

export function syncWheelVisuals(
  controller: any,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
  config: VehicleConfig,
  forwardSpeed: number,
  dt: number
) {
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

      // Spin rotation (X axis) based on speed
      const spinSpeed = (forwardSpeed / wheelConfig.radius) * dt;
      wheelObj.children[0]?.rotateX(spinSpeed);
    }
  }
}
