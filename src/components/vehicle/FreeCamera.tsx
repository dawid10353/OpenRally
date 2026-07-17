import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Object3D, Vector3 } from 'three';
import { useGameStore } from '@/store/gameStore';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface FreeCameraProps {
  targetRef: React.RefObject<Object3D | null>;
}

const _bodyPos = new Vector3();

/**
 * Free Camera component.
 * Allows the user to rotate the camera freely around the vehicle using OrbitControls.
 * The center of the orbit automatically follows the vehicle's position.
 */
export function FreeCamera({ targetRef }: FreeCameraProps) {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Fix: When switching to 'free' camera (especially from 'bumper' which is inside the car),
  // we must move the camera OUTSIDE the OrbitControls minDistance boundary immediately.
  useEffect(() => {
    if (cameraMode === 'free' && targetRef.current) {
      targetRef.current.getWorldPosition(_bodyPos);
      camera.position.set(_bodyPos.x - 10, _bodyPos.y + 5, _bodyPos.z + 10);
      camera.lookAt(_bodyPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(_bodyPos);
        controlsRef.current.update();
      }
    }
  }, [cameraMode, camera, targetRef]);

  useFrame(() => {
    if (!targetRef.current || cameraMode !== 'free' || !controlsRef.current) return;

    // Get the vehicle's current world position
    targetRef.current.getWorldPosition(_bodyPos);

    // Update the center of the orbit to be the vehicle's position
    controlsRef.current.target.copy(_bodyPos);
  });

  // Only render and enable OrbitControls when in 'free' mode
  if (cameraMode !== 'free') return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going strictly below the ground
    />
  );
}
