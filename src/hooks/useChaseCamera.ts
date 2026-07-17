import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3, Quaternion, MathUtils, Object3D, Euler } from 'three';
import { useGameStore } from '@/store/gameStore';
import { lerp } from '@/utils/math';
import {
  CHASE_OFFSET,
  CHASE_CLOSE_OFFSET,
  LOOK_AHEAD_OFFSET,
  MIN_FOV,
  MAX_FOV,
  MAX_SPEED_FOR_FOV,
  POSITION_SMOOTH_RATE,
  LOOK_SMOOTH_RATE,
  FOV_SMOOTH_BASE,
  MIN_CAM_Y_OFFSET,
} from '@/config/camera';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _bodyPos = new Vector3();
const _worldQuat = new Quaternion();
const _euler = new Euler();
const _yawQuat = new Quaternion();
const _yAxis = new Vector3(0, 1, 0);
const _offset = new Vector3();
const _idealPos = new Vector3();
const _lookOffset = new Vector3();
const _idealLook = new Vector3();

/**
 * Chase camera hook — follows the vehicle with smooth interpolation
 * and dynamic FOV that widens at high speed.
 *
 * @param targetRef - Ref to the vehicle's visual mesh (interpolated by R3F)
 */
export function useChaseCamera(
  targetRef: React.RefObject<Object3D | null>,
): void {
  const { camera } = useThree();
  const idealPosRef = useRef(new Vector3());
  const idealLookRef = useRef(new Vector3());
  const currentFovRef = useRef(MIN_FOV);
  const cameraMode = useGameStore((s) => s.cameraMode);

  useFrame((_, delta) => {
    // Read speed dynamically without causing React re-renders
    const speed = useGameStore.getState().speed;

    if (!targetRef.current || (cameraMode !== 'chase' && cameraMode !== 'chase_close')) return;

    const target = targetRef.current;

    // Get interpolated world position and rotation of the visual mesh
    target.getWorldPosition(_bodyPos);
    target.getWorldQuaternion(_worldQuat);

    // Extract yaw (rotation around Y axis) to prevent camera from pitching up/down on bumps
    _euler.setFromQuaternion(_worldQuat, 'YXZ');
    _yawQuat.setFromAxisAngle(_yAxis, _euler.y);

    // Calculate ideal camera position (behind and above vehicle)
    const activeOffset = cameraMode === 'chase_close' ? CHASE_CLOSE_OFFSET : CHASE_OFFSET;
    _offset.copy(activeOffset).applyQuaternion(_yawQuat);
    _idealPos.copy(_bodyPos).add(_offset);

    // Calculate look-at target (ahead of vehicle)
    _lookOffset.copy(LOOK_AHEAD_OFFSET).applyQuaternion(_yawQuat);
    _idealLook.copy(_bodyPos).add(_lookOffset);

    // Smooth follow with framerate-independent lerp
    const posSmoothFactor = 1 - Math.exp(-POSITION_SMOOTH_RATE * delta);
    const lookSmoothFactor = 1 - Math.exp(-LOOK_SMOOTH_RATE * delta);

    if (idealPosRef.current.lengthSq() === 0) {
      idealPosRef.current.copy(_idealPos);
      idealLookRef.current.copy(_idealLook);
    } else {
      idealPosRef.current.lerp(_idealPos, posSmoothFactor);
      idealLookRef.current.lerp(_idealLook, lookSmoothFactor);
    }

    // Prevent camera from going below terrain (minimum Y)
    idealPosRef.current.y = Math.max(idealPosRef.current.y, _bodyPos.y + MIN_CAM_Y_OFFSET);

    // Apply to camera
    camera.position.copy(idealPosRef.current);
    camera.lookAt(idealLookRef.current);

    // Dynamic FOV based on speed
    // The close camera should not zoom out (increase FOV) as much as the far camera
    const maxFovForMode = cameraMode === 'chase_close' ? MIN_FOV + 2 : MAX_FOV;

    const targetFov = lerp(
      MIN_FOV,
      maxFovForMode,
      Math.min(speed / MAX_SPEED_FOR_FOV, 1),
    );
    currentFovRef.current = MathUtils.lerp(
      currentFovRef.current,
      targetFov,
      1 - Math.pow(FOV_SMOOTH_BASE, delta * 60),
    );

    // Apply FOV if perspective camera
    if ('fov' in camera) {
      (camera as PerspectiveCamera).fov = currentFovRef.current;
      (camera as PerspectiveCamera).updateProjectionMatrix();
    }
  });
}
