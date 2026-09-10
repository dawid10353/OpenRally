import { useRef, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, Clone, Detailed, Html } from '@react-three/drei';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { networkClient } from '@/network/networkClient';
import { Wheel } from '@/components/vehicle/Wheel';
import { VehicleModelErrorBoundary } from '@/components/vehicle/Vehicle';
import { useSettingsStore } from '@/store/settingsStore';
import { useTagStore } from '@/store/tagStore';
import { isMobileDevice } from '@/utils/device';
import {
  registerRemoteVehicleMesh,
  unregisterRemoteVehicleMesh,
  getRemoteVehicleMesh,
} from './remoteVehicleRegistry';
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
    <Detailed distances={[0, 250, 600]}>
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
  const [hasFirstSample, setHasFirstSample] = useState(false);

  const wheelRefs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ];

  const preset = getVehiclePreset(player.vehicleId);
  const { chassisSize, wheels } = preset.config;
  const buffer = networkClient.getEntityBuffer(player.id);

  const isMobile = isMobileDevice();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const useOptimized = isMobile || graphicsQuality !== 'very_high';
  const effectiveModelPath = useOptimized
    ? (preset.optimizedModelPath ?? (preset.modelPath.endsWith('.glb') ? preset.modelPath.replace(/\.glb$/, '_opt.glb') : preset.modelPath))
    : preset.modelPath;

  const modelScale = preset.modelScale ?? [4.5, 4.5, 4.5];
  const modelOffset = preset.modelPositionOffset ?? [0, 0.2, 0.1];
  const modelRotationOffset = preset.modelRotationOffset ?? [0, 0, 0];

  useEffect(() => {
    if (groupRef.current) {
      registerRemoteVehicleMesh(player.id, groupRef.current);
    }
    return () => {
      unregisterRemoteVehicleMesh(player.id);
    };
  }, [player.id]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (!getRemoteVehicleMesh(player.id)) {
      registerRemoteVehicleMesh(player.id, groupRef.current);
    }

    const renderTime = Date.now() - INTERPOLATION_DELAY_MS;
    const sample = buffer.sample(renderTime, scratchTargetPos, scratchTargetRot);

    if (sample) {
      if (!hasFirstSample) {
        setHasFirstSample(true);
      }
      groupRef.current.visible = true;
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
    } else if (!hasFirstSample) {
      // Hide until first telemetry snapshot is received to avoid rendering at [0,0,0]
      groupRef.current.visible = false;
    }
  });

  const isTagger = useTagStore((s) => s.taggerId === player.id);

  return (
    <group ref={groupRef} visible={hasFirstSample}>
      {/* Floating 3D Nameplate */}
      {hasFirstSample && (
        <Html
          position={[0, chassisSize[1] + 1.2, 0]}
          center
          distanceFactor={18}
          zIndexRange={[100, 0]}
        >
          <div
            style={{
              background: isTagger
                ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95))'
                : 'rgba(15, 23, 42, 0.85)',
              border: isTagger ? '2px solid #EF4444' : '1px solid rgba(56, 189, 248, 0.5)',
              padding: isTagger ? '4px 10px' : '3px 8px',
              borderRadius: '6px',
              color: '#F8FAFC',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isTagger
                ? '0 0 16px rgba(239, 68, 68, 0.85), 0 4px 12px rgba(0,0,0,0.6)'
                : '0 4px 12px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isTagger ? '#EF4444' : '#38BDF8',
                boxShadow: isTagger ? '0 0 8px #FF0000' : '0 0 6px #38BDF8',
              }}
            />
            <span>{player.nickname}</span>
            <span style={{ fontSize: '9px', color: isTagger ? '#FCA5A5' : '#94A3B8' }}>
              {preset.name}
            </span>
          </div>
        </Html>
      )}

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
            modelPath={effectiveModelPath}
            positionOffset={modelOffset}
            rotationOffset={modelRotationOffset}
            scale={modelScale}
            chassisSize={chassisSize}
          />
        </Suspense>
      </VehicleModelErrorBoundary>

      {/* Wheels with realistic suspension rest offset */}
      {wheels.map((w, index) => (
        <Wheel
          key={index}
          ref={wheelRefs[index]}
          radius={w.radius}
          isRightSide={index % 2 === 1}
          position={[
            w.position[0],
            w.position[1] - w.suspensionRestLength * 0.5,
            w.position[2],
          ]}
        />
      ))}
    </group>
  );
}
