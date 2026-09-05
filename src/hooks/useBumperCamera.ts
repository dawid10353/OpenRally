import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3, Quaternion, MathUtils, Object3D } from 'three';
import { useGameStore } from '@/store/gameStore';
import { isLookBackActive } from '@/hooks/useInput';
import { lerp } from '@/utils/math';
import { MIN_FOV, MAX_FOV, MAX_SPEED_FOR_FOV, FOV_SMOOTH_BASE } from '@/config/camera';

const _bodyPos = new Vector3();
const _worldQuat = new Quaternion();
const _offset = new Vector3();

// Pre-allocated rotation constants to eliminate per-frame GC allocations
const _pitchDownQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.07);
const _y180Quat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

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

    const lookBack = isLookBackActive();

    if (lookBack) {
      // Move camera to front of car, slightly higher, and look backwards (down local -Z)
      _offset.set(0, 1.1, 3.5).applyQuaternion(_worldQuat);
      camera.position.copy(_bodyPos).add(_offset);
      
      // Zero allocations: use module-level constant
      camera.quaternion.copy(_worldQuat).multiply(_pitchDownQuat);
    } else {
      // Normal bumper camera
      _offset.copy(BUMPER_OFFSET).applyQuaternion(_worldQuat);
      camera.position.copy(_bodyPos).add(_offset);

      // Zero allocations: use module-level constants
      camera.quaternion.copy(_worldQuat).multiply(_y180Quat).multiply(_pitchDownQuat);
    }

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

    // Apply FOV and update projection matrix only when delta is significant to avoid scene graph churn
    if ('fov' in camera) {
      const persCamera = camera as PerspectiveCamera;
      if (Math.abs(persCamera.fov - currentFovRef.current) > 0.02) {
        persCamera.fov = currentFovRef.current;
        persCamera.updateProjectionMatrix();
      }
    }
  });
}
