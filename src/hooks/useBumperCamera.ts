import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3, Quaternion, MathUtils, Object3D } from 'three';
import { useGameStore } from '@/store/gameStore';
import { lerp } from '@/utils/math';
import { MIN_FOV, MAX_FOV, MAX_SPEED_FOR_FOV, FOV_SMOOTH_BASE } from '@/config/camera';

const _bodyPos = new Vector3();
const _worldQuat = new Quaternion();
const _offset = new Vector3();

// Offset for the hood view (moved back and up to see the hood)
const BUMPER_OFFSET = new Vector3(0, 1.1, 0.5); 

/**
 * Bumper/Hood camera hook — attaches firmly to the vehicle
 * and rotates exactly with the car's pitch, yaw, and roll.
 *
 * @param targetRef - Ref to the vehicle's visual mesh
 */
export function useBumperCamera(targetRef: React.RefObject<Object3D | null>): void {
  const { camera } = useThree();
  const currentFovRef = useRef(MIN_FOV);
  const cameraMode = useGameStore((s) => s.cameraMode);

  useFrame((_, delta) => {
    if (!targetRef.current || cameraMode !== 'bumper') return;

    const target = targetRef.current;
    const speed = useGameStore.getState().speed;

    // Get interpolated world position and full rotation of the visual mesh
    target.getWorldPosition(_bodyPos);
    target.getWorldQuaternion(_worldQuat);

    // Calculate exact camera position based on car's orientation
    _offset.copy(BUMPER_OFFSET).applyQuaternion(_worldQuat);
    camera.position.copy(_bodyPos).add(_offset);

    // For bumper/hood, we want the camera to also roll with the car.
    // Three.js cameras look down their local -Z axis, but the car's forward is +Z.
    // Therefore, we must rotate the camera 180 degrees around the Y axis relative to the car.
    const _y180 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
    // Slight downward pitch (approx 4 degrees) so the hood is visible
    const _pitchDown = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.07);
    
    camera.quaternion.copy(_worldQuat).multiply(_y180).multiply(_pitchDown);

    // Dynamic FOV based on speed (higher sense of speed in bumper mode)
    // We increase max FOV slightly for bumper to enhance speed sensation
    const bumperMaxFov = MAX_FOV + 10;
    
    const targetFov = lerp(
      MIN_FOV,
      bumperMaxFov,
      Math.min(speed / MAX_SPEED_FOR_FOV, 1),
    );
    
    currentFovRef.current = MathUtils.lerp(
      currentFovRef.current,
      targetFov,
      1 - Math.pow(FOV_SMOOTH_BASE, delta * 60),
    );

    // Apply FOV
    if ('fov' in camera) {
      (camera as PerspectiveCamera).fov = currentFovRef.current;
      (camera as PerspectiveCamera).updateProjectionMatrix();
    }
  });
}
