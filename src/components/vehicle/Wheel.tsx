import { forwardRef } from 'react';
import type { Object3D } from 'three';
import { useGLTF, Clone, Detailed } from '@react-three/drei';
import { isMobileDevice } from '@/utils/device';
import { useSettingsStore } from '@/store/settingsStore';

interface WheelProps {
  radius?: number;
  width?: number;
  isRightSide?: boolean;
  position?: [number, number, number];
}

/**
 * Visual wheel component — a loaded 3D model with LOD.
 * The outer group handles position + steering (Y rotation).
 * The inner group handles spin (X rotation) — animated by the physics hook.
 */
export const Wheel = forwardRef<Object3D, WheelProps>(function Wheel(
  { isRightSide = false, position, radius = 0.32 },
  ref,
) {
  const isMobile = isMobileDevice();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const useOptimized = isMobile || graphicsQuality !== 'very_high';
  const modelUrl = useOptimized ? '/models/vehicles/wheel_opt.glb' : '/models/vehicles/wheel.glb';

  // Wczytujemy model koła (zoptymalizowany dla urządzeń mobilnych / balanced)
  const { scene } = useGLTF(modelUrl);

  // Dynamiczne skalowanie modelu dopasowane do proporcji koła (surowy promień w GLB to 0.0375m)
  const visualScale = radius / 0.0375;

  return (
    <group ref={ref} position={position}>
      {/* Inner group for spin rotation */}
      <group>
        <Detailed distances={[0, 30, 80]}>
          {/* LOD 0: Pełny model GLB */}
          <Clone
            object={scene}
            scale={visualScale}
            // Wyśrodkowanie piasty na osi [0, 0, 0] oraz rotacja felgi na zewnątrz pojazdu
            position={[0, -radius, 0]}
            rotation={[0, isRightSide ? 0 : Math.PI, 0]}
            castShadow
            receiveShadow
          />
          {/* LOD 1: Prosty cylinder (16 segmentów) */}
          <mesh rotation={[0, 0, Math.PI / 2]} scale={1}>
            <cylinderGeometry args={[radius, radius, 0.28, 16]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          {/* LOD 2: Bardzo uproszczony cylinder (8 segmentów, brak światłocieni) */}
          <mesh rotation={[0, 0, Math.PI / 2]} scale={1}>
            <cylinderGeometry args={[radius, radius, 0.28, 8]} />
            <meshBasicMaterial color="#0a0a0a" />
          </mesh>
        </Detailed>
      </group>
    </group>
  );
});

// Preload, aby zapobiec opóźnieniom w renderowaniu
useGLTF.preload('/models/vehicles/wheel.glb');
useGLTF.preload('/models/vehicles/wheel_opt.glb');
