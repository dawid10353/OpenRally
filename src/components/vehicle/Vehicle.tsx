import { useRef } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Group, Object3D } from 'three';
import { Wheel } from '@/components/vehicle/Wheel';
import { useVehiclePhysics } from '@/hooks/useVehiclePhysics';
import { useChaseCamera } from '@/hooks/useChaseCamera';
import { useBumperCamera } from '@/hooks/useBumperCamera';
import { FreeCamera } from '@/components/vehicle/FreeCamera';
import { useEngineSound } from '@/hooks/useEngineSound';
import { useSurfaceSound } from '@/hooks/useSurfaceSound';
import { useSkidSound } from '@/hooks/useSkidSound';
import { DustParticles } from '@/components/vehicle/DustParticles';
import { TireTracks } from '@/components/vehicle/TireTracks';
import { WaterSplashes } from '@/components/vehicle/WaterSplashes';
import { useGLTF, Clone, Detailed } from '@react-three/drei';
import { VEHICLE_MODEL_PATH } from '@/config/assets';
import { useGameStore } from '@/store/gameStore';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { VeloceSportModel } from '@/components/vehicle/models/VeloceSportModel';
import { BajaTruckModel } from '@/components/vehicle/models/BajaTruckModel';

/**
 * Main Vehicle component — procedural car from Three.js primitives + GLB models.
 * Integrates physics (Rapier raycast vehicle), camera follow, audio, particles,
 * and dynamic preset selection from VehicleRegistry.
 */
export function Vehicle() {
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const vehiclePreset = getVehiclePreset(selectedVehicleId);
  const { levelPreset } = useTerrainData();

  const { scene } = useGLTF(vehiclePreset.modelPath);
  const chassisRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<Group>(null);
  const wheelObjectsRef = useRef<(Object3D | null)[]>([null, null, null, null]);

  const config = vehiclePreset.config;

  // Attach vehicle physics
  useVehiclePhysics(chassisRef, wheelObjectsRef, config);

  // Attach cameras to the INTERPOLATED visual mesh, not the physics body
  useChaseCamera(visualRef);
  useBumperCamera(visualRef);

  // Attach engine, surface, and skid sounds
  useEngineSound();
  useSurfaceSound(wheelObjectsRef);
  useSkidSound();

  const spawnPos = levelPreset.spawnPosition;
  const spawnRotY = levelPreset.spawnRotationY;

  return (
    <group key={selectedVehicleId}>
      <RigidBody
        ref={chassisRef}
        type="dynamic"
        colliders={false}
        mass={config.chassisMass}
        position={spawnPos}
        rotation={[0, spawnRotY, 0]}
        linearDamping={0.15}
        angularDamping={1.5}
        canSleep={false}
        ccd={true}
      >
        {/* Chassis collider — calibrated to protect underbody from ground penetration */}
        <CuboidCollider
          position={[0, 0.05, 0]}
          args={[
            config.chassisSize[0] / 2,
            config.chassisSize[1] / 2,
            config.chassisSize[2] / 2,
          ]}
          mass={config.chassisMass}
        />

        <group ref={visualRef}>
          <Detailed distances={[0, 50, 150]}>
            {/* LOD 0: Pełny dedykowany model pojazdu */}
            {vehiclePreset.id === 'rally_coupe' ? (
              <VeloceSportModel
                position={vehiclePreset.modelPositionOffset ?? [0, 0, 0]}
                scale={vehiclePreset.modelScale ?? [1, 1, 1]}
              />
            ) : vehiclePreset.id === 'desert_truck' ? (
              <BajaTruckModel
                position={vehiclePreset.modelPositionOffset ?? [0, 0, 0]}
                scale={vehiclePreset.modelScale ?? [1, 1, 1]}
              />
            ) : (
              <Clone 
                object={scene} 
                position={vehiclePreset.modelPositionOffset ?? [0, 0.2, 0.1]} 
                scale={vehiclePreset.modelScale ?? [4.5, 4.5, 4.5]} 
                rotation={[0, 0, 0]} 
                castShadow
                receiveShadow
              />
            )}
            {/* LOD 1: Uproszczone pudełko udające pojazd (średni dystans) */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry
                args={[
                  config.chassisSize[0],
                  config.chassisSize[1],
                  config.chassisSize[2],
                ]}
              />
              <meshStandardMaterial color="#888" roughness={0.6} />
            </mesh>
            {/* LOD 2: Daleki dystans */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry
                args={[
                  config.chassisSize[0],
                  config.chassisSize[1],
                  config.chassisSize[2],
                ]}
              />
              <meshBasicMaterial color="#555" />
            </mesh>
          </Detailed>
        </group>

        {/* Wheels — inside RigidBody so their local transform is relative to the chassis */}
        {config.wheels.map((wheel, index) => (
          <Wheel
            key={index}
            ref={(el) => {
              if (wheelObjectsRef.current) {
                wheelObjectsRef.current[index] = el;
              }
            }}
            radius={wheel.radius}
            isRightSide={wheel.position[0] > 0}
          />
        ))}
      </RigidBody>

      {/* Visual Particle Effects */}
      <DustParticles chassisRef={chassisRef} wheelsRef={wheelObjectsRef} />
      <TireTracks chassisRef={chassisRef} wheelsRef={wheelObjectsRef} />
      <WaterSplashes chassisRef={chassisRef} wheelsRef={wheelObjectsRef} />

      {/* Free Camera Controls (enabled only when cameraMode === 'free') */}
      <FreeCamera targetRef={visualRef} />
    </group>
  );
}

useGLTF.preload(VEHICLE_MODEL_PATH);
