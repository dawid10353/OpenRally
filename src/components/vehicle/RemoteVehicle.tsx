import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, Clone, Detailed, Html } from '@react-three/drei';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { networkClient } from '@/network/networkClient';
import { Wheel } from '@/components/vehicle/Wheel';
import { VehicleModelErrorBoundary } from '@/components/vehicle/Vehicle';
import type { RemotePlayerSummary } from '@/types/network';

interface RemoteVehicleProps {
  player: RemotePlayerSummary;
}

const INTERPOLATION_DELAY_MS = 60; // 60ms jitter buffer

// Module-level scratch instances for zero-allocation useFrame updates
const scratchTargetPos = new THREE.Vector3();
const scratchTargetRot = new THREE.Quaternion();

function RemoteVehicleVisualModel({
  modelPath,
  positionOffset,
  rotationOffset,
  scale,
  chassisSize,
}: {
  modelPath: string;
  positionOffset: [number, number, number];
  rotationOffset?: [number, number, number];
  scale: [number, number, number];
  chassisSize: [number, number, number];
}) {
  const { scene } = useGLTF(modelPath);

  return (
    <Detailed distances={[0, 45, 120]}>
      {/* LOD 0: GLB 3D Mesh */}
      <Clone
        object={scene}
        position={positionOffset}
        scale={scale}
        rotation={rotationOffset ?? [0, 0, 0]}
        castShadow
        receiveShadow
      />
      {/* LOD 1: Simplified Proxy Box */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[chassisSize[0], chassisSize[1], chassisSize[2]]} />
        <meshStandardMaterial color="#4A5568" roughness={0.6} />
      </mesh>
      {/* LOD 2: Minimal Box */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[chassisSize[0], chassisSize[1], chassisSize[2]]} />
        <meshBasicMaterial color="#2D3748" />
      </mesh>
    </Detailed>
  );
}

export function RemoteVehicle({ player }: RemoteVehicleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelRefs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ];

  const preset = getVehiclePreset(player.vehicleId);
  const { chassisSize, wheels } = preset.config;
  const buffer = networkClient.getEntityBuffer(player.id);

  useFrame(() => {
    if (!groupRef.current) return;

    const renderTime = Date.now() - INTERPOLATION_DELAY_MS;
    const sample = buffer.sample(renderTime, scratchTargetPos, scratchTargetRot);

    if (sample) {
      groupRef.current.position.copy(scratchTargetPos);
      groupRef.current.quaternion.copy(scratchTargetRot);

      // Animate wheels
      // FL (0)
      if (wheelRefs[0].current) {
        wheelRefs[0].current.rotation.y = sample.steer;
        const inner = wheelRefs[0].current.children[0];
        if (inner) inner.rotation.x = sample.wheelRots[0];
      }
      // FR (1)
      if (wheelRefs[1].current) {
        wheelRefs[1].current.rotation.y = sample.steer;
        const inner = wheelRefs[1].current.children[0];
        if (inner) inner.rotation.x = sample.wheelRots[1];
      }
      // RL (2)
      if (wheelRefs[2].current) {
        const inner = wheelRefs[2].current.children[0];
        if (inner) inner.rotation.x = sample.wheelRots[2];
      }
      // RR (3)
      if (wheelRefs[3].current) {
        const inner = wheelRefs[3].current.children[0];
        if (inner) inner.rotation.x = sample.wheelRots[3];
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Floating 3D Nameplate */}
      <Html
        position={[0, chassisSize[1] + 1.2, 0]}
        center
        distanceFactor={18}
        zIndexRange={[100, 0]}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            padding: '3px 8px',
            borderRadius: '6px',
            color: '#F8FAFC',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#38BDF8',
              boxShadow: '0 0 6px #38BDF8',
            }}
          />
          <span>{player.nickname}</span>
          <span style={{ fontSize: '9px', color: '#94A3B8' }}>{preset.name}</span>
        </div>
      </Html>

      {/* Visual Chassis Model */}
      <VehicleModelErrorBoundary
        fallback={
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={chassisSize} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
        }
      >
        <Suspense
          fallback={
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={chassisSize} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
          }
        >
          <RemoteVehicleVisualModel
            modelPath={preset.modelPath}
            positionOffset={preset.modelPositionOffset ?? [0, 0, 0]}
            rotationOffset={preset.modelRotationOffset}
            scale={preset.modelScale ?? [1, 1, 1]}
            chassisSize={chassisSize}
          />
        </Suspense>
      </VehicleModelErrorBoundary>

      {/* Wheels */}
      {wheels.map((w, index) => (
        <Wheel
          key={index}
          ref={wheelRefs[index]}
          radius={w.radius}
          isRightSide={index % 2 === 1}
          position={w.position}
        />
      ))}
    </group>
  );
}
