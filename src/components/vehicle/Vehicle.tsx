import { useRef } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Group, Object3D } from 'three';
import { Wheel } from '@/components/vehicle/Wheel';
import { useVehiclePhysics } from '@/hooks/useVehiclePhysics';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import { useChaseCamera } from '@/hooks/useChaseCamera';
import { useBumperCamera } from '@/hooks/useBumperCamera';
import { FreeCamera } from '@/components/vehicle/FreeCamera';
import { useEngineSound } from '@/hooks/useEngineSound';
import { useSurfaceSound } from '@/hooks/useSurfaceSound';
import { DustParticles } from '@/components/vehicle/DustParticles';
import { TireTracks } from '@/components/vehicle/TireTracks';
import { WaterSplashes } from '@/components/vehicle/WaterSplashes';
import { useGLTF, Clone, Detailed } from '@react-three/drei';
import { VEHICLE_MODEL_PATH } from '@/config/assets';

/**
 * Main Vehicle component — procedural car from Three.js primitives.
 * Integrates physics (Rapier raycast vehicle) + camera follow.
 * Stage 1 placeholder: will be swapped for GLB model in Stage 3.
 */
export function Vehicle() {
  const { scene } = useGLTF(VEHICLE_MODEL_PATH);
  const chassisRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<Group>(null);
  const wheelObjectsRef = useRef<(Object3D | null)[]>([null, null, null, null]);

  // Usunięto: Włączanie cieni dla całego modelu w useEffect, 
  // ponieważ modele ważą po ~80-90MB (kilka milionów trójkątów).
  // Renderowanie map cieni dla tak ogromnej geometrii powoduje drastyczne spadki FPS.

  // Attach vehicle physics
  useVehiclePhysics(chassisRef, wheelObjectsRef, DEFAULT_VEHICLE_CONFIG);

  // Attach cameras to the INTERPOLATED visual mesh, not the physics body
  useChaseCamera(visualRef);
  useBumperCamera(visualRef);

  // Attach engine sound
  useEngineSound();
  
  // Attach surface sound
  useSurfaceSound(wheelObjectsRef);

  const config = DEFAULT_VEHICLE_CONFIG;

  return (
    <group>
      <RigidBody
        ref={chassisRef}
        type="dynamic"
        colliders={false}
        mass={config.chassisMass}
        position={[0, 0.5, 0]}
        linearDamping={0.1}
        angularDamping={0.5}
        canSleep={false}
      >
        {/* Chassis collider */}
        <CuboidCollider
          args={[
            config.chassisSize[0] / 2,
            config.chassisSize[1] / 2,
            config.chassisSize[2] / 2,
          ]}
          mass={config.chassisMass}
        />

        <group ref={visualRef}>
          <Detailed distances={[0, 50, 150]}>
            {/* LOD 0: Pełny model GLB pojazdu */}
            <Clone 
              object={scene} 
              position={[0, 0.2, 0.1]} 
              scale={[4.5, 4.5, 4.5]} 
              rotation={[0, 0, 0]} 
              castShadow={false}
              receiveShadow={false}
            />
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
            {/* LOD 2: Jeszcze prostsze pudełko (daleki dystans, brak świateł) */}
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
          {/* Niewidzialny proxy mesh rzucający cień (znacznie lżejszy dla GPU) */}
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry
              args={[
                config.chassisSize[0],
                config.chassisSize[1],
                config.chassisSize[2],
              ]}
            />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
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
