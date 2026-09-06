import { useRef, Suspense } from 'react';
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
import { VEHICLE_MODEL_PATH, VEHICLE_WRC_MODEL_PATH } from '@/config/assets';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { isMobileDevice } from '@/utils/device';

interface VehicleVisualModelProps {
  modelPath: string;
  positionOffset: [number, number, number];
  scale: [number, number, number];
  chassisSize: [number, number, number];
}

/**
 * Isolated visual 3D model component wrapped in Suspense so that loading new GLB assets
 * never unmounts or suspends the physics RigidBody.
 */
function VehicleVisualModel({
  modelPath,
  positionOffset,
  scale,
  chassisSize,
}: VehicleVisualModelProps) {
  const { scene } = useGLTF(modelPath);

  return (
    <Detailed distances={[0, 50, 150]}>
      {/* LOD 0: Dedicated 3D GLB vehicle model */}
      <Clone 
        object={scene} 
        position={positionOffset} 
        scale={scale} 
        rotation={[0, 0, 0]} 
        castShadow
        receiveShadow
      />
      {/* LOD 1: Simplified box proxy (medium distance) */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry
          args={[
            chassisSize[0],
            chassisSize[1],
            chassisSize[2],
          ]}
        />
        <meshStandardMaterial color="#888" roughness={0.6} />
      </mesh>
      {/* LOD 2: Far distance box proxy */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry
          args={[
            chassisSize[0],
            chassisSize[1],
            chassisSize[2],
          ]}
        />
        <meshBasicMaterial color="#555" />
      </mesh>
    </Detailed>
  );
}

/**
 * Main Vehicle component — procedural car from Three.js primitives + GLB models.
 * Integrates physics (Rapier raycast vehicle), camera follow, audio, particles,
 * and dynamic preset selection from VehicleRegistry.
 */
export function Vehicle() {
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const vehiclePreset = getVehiclePreset(selectedVehicleId);
  const { levelPreset } = useTerrainData();

  const isMobile = isMobileDevice();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const useOptimized = isMobile || graphicsQuality !== 'very_high';
  const effectiveModelPath = useOptimized && vehiclePreset.modelPath.endsWith('.glb')
    ? vehiclePreset.modelPath.replace(/\.glb$/, '_opt.glb')
    : vehiclePreset.modelPath;

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
    <group>
      <RigidBody
        ref={chassisRef}
        type="dynamic"
        colliders={false}
        mass={config.chassisMass}
        position={spawnPos}
        rotation={[0, spawnRotY, 0]}
        linearDamping={0.15}
        angularDamping={2.2}
        canSleep={false}
        ccd={true}
      >
        {/* Chassis collider — keyed so geometry reconfigures on vehicle switch without unmounting the RigidBody */}
        <CuboidCollider
          key={selectedVehicleId}
          position={[0, -0.12, 0]}
          args={[
            config.chassisSize[0] / 2,
            config.chassisSize[1] / 2,
            config.chassisSize[2] / 2,
          ]}
          mass={config.chassisMass}
        />

        <group ref={visualRef}>
          <Suspense
            fallback={
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
            }
          >
            <VehicleVisualModel
              modelPath={effectiveModelPath}
              positionOffset={vehiclePreset.modelPositionOffset ?? [0, 0.2, 0.1]}
              scale={vehiclePreset.modelScale ?? [4.5, 4.5, 4.5]}
              chassisSize={config.chassisSize}
            />
          </Suspense>

          {/* Soft contact ambient occlusion shadow directly beneath the chassis */}
          <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[config.chassisSize[0] * 1.3, config.chassisSize[2] * 1.15]} />
            <meshBasicMaterial
              transparent
              opacity={0.42}
              depthWrite={false}
              color="#000000"
              onBeforeCompile={(shader) => {
                shader.vertexShader = shader.vertexShader.replace(
                  '#include <common>',
                  /* glsl */ `
                  #include <common>
                  varying vec2 vShadowUv;
                  `,
                );
                shader.vertexShader = shader.vertexShader.replace(
                  '#include <uv_vertex>',
                  /* glsl */ `
                  #include <uv_vertex>
                  vShadowUv = uv;
                  `,
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <common>',
                  /* glsl */ `
                  #include <common>
                  varying vec2 vShadowUv;
                  `,
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <color_fragment>',
                  /* glsl */ `
                  #include <color_fragment>
                  vec2 uvC = vShadowUv * 2.0 - 1.0;
                  float d = length(uvC * vec2(1.15, 0.85));
                  float alpha = smoothstep(1.0, 0.15, d) * 0.45;
                  diffuseColor.a *= alpha;
                  `,
                );
              }}
            />
          </mesh>
        </group>

        {/* Wheels — inside RigidBody so their local transform is relative to the chassis */}
        {config.wheels.map((wheel, index) => (
          <Wheel
            key={`${selectedVehicleId}-${index}`}
            ref={(el) => {
              if (wheelObjectsRef.current) {
                wheelObjectsRef.current[index] = el;
              }
            }}
            radius={wheel.radius}
            isRightSide={wheel.position[0] > 0}
            position={[
              wheel.position[0],
              wheel.position[1] - wheel.suspensionRestLength * 0.5,
              wheel.position[2],
            ]}
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
useGLTF.preload(VEHICLE_WRC_MODEL_PATH);
useGLTF.preload('/models/vehicles/car_opt.glb');
useGLTF.preload('/models/vehicles/rally_wrc_opt.glb');
