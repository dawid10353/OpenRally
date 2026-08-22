import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3, Quaternion, MathUtils, Object3D, Euler } from 'three';
import { useGameStore } from '@/store/gameStore';
import { isLookBackActive, getCameraLook } from '@/hooks/useInput';
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
  PITCH_SMOOTH_RATE,
  PITCH_INFLUENCE,
} from '@/config/camera';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _bodyPos = new Vector3();
const _worldQuat = new Quaternion();
const _euler = new Euler();
const _yawQuat = new Quaternion();
const _offset = new Vector3();
const _idealPos = new Vector3();
const _lookOffset = new Vector3();
const _idealLook = new Vector3();
const _forward = new Vector3();

/**
 * Chase camera hook — follows the vehicle with smooth interpolation,
 * dynamic speed-based FOV, and Forza Horizon style Right Stick 360° Free Look
 * with elastic spring return when released.
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
  const smoothedPitchRef = useRef(0);
  const orbitYawRef = useRef(0);
  const orbitPitchRef = useRef(0);
  const cameraMode = useGameStore((s) => s.cameraMode);

  useFrame((_, delta) => {
    // Read speed dynamically without causing React re-renders
    const speed = useGameStore.getState().speed;

    if (!targetRef.current || (cameraMode !== 'chase' && cameraMode !== 'chase_close')) return;

    const target = targetRef.current;

    // Get interpolated world position and rotation of the visual mesh
    target.getWorldPosition(_bodyPos);
    target.getWorldQuaternion(_worldQuat);

    // Extract pitch from forward vector
    _forward.set(0, 0, 1).applyQuaternion(_worldQuat);
    const targetPitch = Math.asin(MathUtils.clamp(_forward.y, -0.99, 0.99));
    
    // Smooth the vehicle pitch
    const pitchSmoothFactor = 1 - Math.exp(-PITCH_SMOOTH_RATE * delta);
    if (idealPosRef.current.lengthSq() === 0) {
      smoothedPitchRef.current = targetPitch;
    } else {
      smoothedPitchRef.current = MathUtils.lerp(smoothedPitchRef.current, targetPitch, pitchSmoothFactor);
    }

    // ─── Forza Horizon Style Free Look Orbit (Right Analog Stick) ───
    const cameraLook = getCameraLook();
    const lookBack = isLookBackActive();
    const stickMagnitude = Math.hypot(cameraLook.x, cameraLook.y);

    let targetOrbitYaw = 0;
    let targetOrbitPitch = 0;
    let orbitLerpSpeed = 8.5; // Elastic spring return speed

    if (lookBack) {
      // Instant 180° rear look
      targetOrbitYaw = Math.PI;
      targetOrbitPitch = 0;
      orbitLerpSpeed = 20.0;
    } else if (stickMagnitude > 0.05) {
      // Active right-stick deflection: rotate around car
      targetOrbitYaw = cameraLook.x * Math.PI * 0.95;
      targetOrbitPitch = -cameraLook.y * 0.45; // Stick up = look from higher above, Stick down = look low
      orbitLerpSpeed = 14.0; // Responsive stick tracking
    }

    // Framerate-independent exponential smoothing for orbit angles
    const orbitFactor = 1 - Math.exp(-orbitLerpSpeed * delta);
    orbitYawRef.current = MathUtils.lerp(orbitYawRef.current, targetOrbitYaw, orbitFactor);
    orbitPitchRef.current = MathUtils.lerp(orbitPitchRef.current, targetOrbitPitch, orbitFactor);

    // Extract vehicle yaw and combine with smoothed pitch + orbit offsets
    _euler.setFromQuaternion(_worldQuat, 'YXZ');
    const totalPitch = -smoothedPitchRef.current * PITCH_INFLUENCE + orbitPitchRef.current;
    const totalYaw = _euler.y + orbitYawRef.current;
    _euler.set(totalPitch, totalYaw, 0, 'YXZ');
    _yawQuat.setFromEuler(_euler);

    // Calculate ideal camera position (behind and above vehicle)
    const activeOffset = cameraMode === 'chase_close' ? CHASE_CLOSE_OFFSET : CHASE_OFFSET;
    _offset.copy(activeOffset);
    _offset.applyQuaternion(_yawQuat);
    _idealPos.copy(_bodyPos).add(_offset);

    // Calculate look-at target (ahead of vehicle / centered when orbiting)
    _lookOffset.copy(LOOK_AHEAD_OFFSET);
    const orbitInfluence = Math.min(1.0, Math.abs(orbitYawRef.current) / (Math.PI * 0.5));
    _lookOffset.z = MathUtils.lerp(LOOK_AHEAD_OFFSET.z, 0, orbitInfluence);
    _lookOffset.applyQuaternion(_yawQuat);
    _idealLook.copy(_bodyPos).add(_lookOffset);

    // Smooth follow with framerate-independent lerp
    // Increase follow rate when actively orbiting for snappy responsive camera control
    const dynamicPosRate = stickMagnitude > 0.05 ? POSITION_SMOOTH_RATE * 2.0 : POSITION_SMOOTH_RATE;
    const posSmoothFactor = 1 - Math.exp(-dynamicPosRate * delta);
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
