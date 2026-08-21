import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';
import type { Mesh, Group } from 'three';
import type { CheckpointData } from '@/types/racing';

interface CheckpointGateProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
  readonly isPassed?: boolean;
}

/**
 * Intermediate Rally Sector Checkpoint Gate.
 * Features illuminated aerodynamic arch, directional holographic chevrons,
 * sky beacon pillar, and pulsing ground capture trigger aura.
 */
export function CheckpointGate({ data, isTarget, isPassed = false }: CheckpointGateProps) {
  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const gateHeight = 5.8;

  const glowColor = isTarget ? '#00ff88' : isPassed ? '#4fc3f7' : '#00d4ff';
  const pillarColor = isTarget ? '#ffffff' : '#2c3437';
  const pulseScale = isTarget ? 1.03 : 1.0;

  const chevronGroupRef = useRef<Group>(null);
  const beaconMeshRef = useRef<Mesh>(null);
  const ringMeshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Directional chevron animation
    if (chevronGroupRef.current && isTarget) {
      // Subtle pulse and gentle forward floating motion
      const zOffset = Math.sin(t * 5) * 0.25;
      chevronGroupRef.current.position.z = zOffset;
    }

    // Sky beacon subtle breathing effect
    if (beaconMeshRef.current && isTarget) {
      const scale = 1 + Math.sin(t * 3.5) * 0.08;
      beaconMeshRef.current.scale.set(scale, 1, scale);
    }

    // Ground aura slow rotation & pulsing
    if (ringMeshRef.current && isTarget) {
      ringMeshRef.current.rotation.z = t * 0.6;
      const ringScale = 1 + Math.sin(t * 4) * 0.05;
      ringMeshRef.current.scale.set(ringScale, ringScale, ringScale);
    }
  });

  return (
    <group
      position={[x, y, z]}
      rotation={[0, data.rotationY, 0]}
    >
      {/* ─── 0. SOLID PHYSICS COLLIDERS ─── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Left Pillar */}
        <CylinderCollider
          args={[gateHeight / 2, 0.45]}
          position={[-halfWidth, gateHeight / 2, 0]}
          friction={0.8}
        />
        {/* Right Pillar */}
        <CylinderCollider
          args={[gateHeight / 2, 0.45]}
          position={[halfWidth, gateHeight / 2, 0]}
          friction={0.8}
        />
        {/* Top Overhead Crossbeam */}
        <CuboidCollider
          args={[(width + 0.9) / 2, 0.35, 0.35]}
          position={[0, gateHeight, 0]}
          friction={0.8}
        />
      </RigidBody>

      {/* Visual Gate Architecture with Target Pulsing */}
      <group scale={[pulseScale, pulseScale, pulseScale]}>
        {/* ─── 1. LEFT PILLAR ─── */}
        <group position={[-halfWidth, 0, 0]}>
          {/* Sub-ground Foundation Anchor (prevents floating on slopes) */}
          <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.5, 0.6, 2.5, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        {/* Main Upright Column */}
        <mesh position={[0, gateHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.38, gateHeight, 8]} />
          <meshStandardMaterial
            color={pillarColor}
            roughness={0.35}
            metalness={0.75}
          />
        </mesh>
        {/* Neon Energy Band */}
        <mesh position={[0, gateHeight * 0.75, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
          <meshBasicMaterial color={glowColor} />
        </mesh>
        {/* Lower Warning Band */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 8]} />
          <meshStandardMaterial color="#ffb700" roughness={0.4} />
        </mesh>
      </group>

      {/* ─── 2. RIGHT PILLAR ─── */}
      <group position={[halfWidth, 0, 0]}>
        {/* Sub-ground Foundation Anchor */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 2.5, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        {/* Main Upright Column */}
        <mesh position={[0, gateHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.38, gateHeight, 8]} />
          <meshStandardMaterial
            color={pillarColor}
            roughness={0.35}
            metalness={0.75}
          />
        </mesh>
        {/* Neon Energy Band */}
        <mesh position={[0, gateHeight * 0.75, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
          <meshBasicMaterial color={glowColor} />
        </mesh>
        {/* Lower Warning Band */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 8]} />
          <meshStandardMaterial color="#ffb700" roughness={0.4} />
        </mesh>
      </group>

      {/* ─── 3. TOP OVERHEAD CROSSBEAM ─── */}
      <mesh position={[0, gateHeight, 0]} castShadow>
        <boxGeometry args={[width + 0.9, 0.5, 0.5]} />
        <meshStandardMaterial color={pillarColor} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Top Neon Glow Edge Strip */}
      <mesh position={[0, gateHeight + 0.28, 0]}>
        <boxGeometry args={[width + 0.6, 0.08, 0.1]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>

      {/* ─── 4. HOLOGRAPHIC SECTOR BANNER & DIRECTIONAL CHEVRONS ─── */}
      {/* Upper Translucent Sector Plate */}
      <mesh position={[0, gateHeight - 0.55, 0]}>
        <planeGeometry args={[width * 0.85, 0.8]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isTarget ? 0.6 : 0.2}
          side={2}
        />
      </mesh>

      {/* Floating Directional Chevrons (Guides driving line) */}
      <group ref={chevronGroupRef} position={[0, gateHeight * 0.55, 0]}>
        {([-2.5, 0, 2.5] as const).map((cx, i) => (
          <group key={i} position={[cx, 0, 0]}>
            {/* Left wing of chevron */}
            <mesh position={[-0.3, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.65, 0.12, 0.05]} />
              <meshBasicMaterial color={glowColor} transparent opacity={isTarget ? 0.9 : 0.4} />
            </mesh>
            {/* Right wing of chevron */}
            <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.65, 0.12, 0.05]} />
              <meshBasicMaterial color={glowColor} transparent opacity={isTarget ? 0.9 : 0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── 5. SKY BEACON & GROUND TRIGGER AURA (ACTIVE TARGET ONLY) ─── */}
      {isTarget && (
        <>
          {/* Vertical Sky Beacon Cylinder */}
          <mesh ref={beaconMeshRef} position={[0, 22, 0]}>
            <cylinderGeometry args={[halfWidth * 0.3, halfWidth * 0.6, 44, 16, 1, true]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.16}
              side={2}
              depthWrite={false}
            />
          </mesh>

          {/* Ground Trigger Aura Ring */}
          <mesh ref={ringMeshRef} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, halfWidth * 0.9, 32]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.35}
              side={2}
            />
          </mesh>

          {/* Inner Pulsing Core Spot */}
          <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.0, 16]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.25}
              side={2}
            />
          </mesh>
        </>
      )}
      </group>
    </group>
  );
}
