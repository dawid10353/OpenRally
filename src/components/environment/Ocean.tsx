import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';

/**
 * Ocean plane acting as a visual boundary for the island map.
 */
export function Ocean() {
  const materialRef = useRef<MeshStandardMaterial>(null);

  // Subtle wave animation (just animating opacity slightly)
  useFrame((state) => {
    if (materialRef.current) {
      const t = state.clock.getElapsedTime();
      // Slight opacity wave for a breathing effect
      materialRef.current.opacity = 0.85 + Math.sin(t * 0.5) * 0.05;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
      <planeGeometry args={[5000, 5000, 32, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#084a6b"
        metalness={0.9}
        roughness={0.1}
        transparent={true}
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}
