import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DirectionalLight, Object3D, PCFShadowMap, PCFSoftShadowMap } from 'three';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { LIGHTING_CONFIG, SKY_CONFIG } from '@/config/environment';
import { getLevelPreset } from '@/config/levelRegistry';
import { isMobileDevice } from '@/utils/device';

/**
 * Scene lighting setup — ambient + directional sun + hemisphere.
 * Shadows are controlled by settings store and graphics quality.
 * The directional light target follows the camera/player to ensure shadows
 * are focused tightly around the vehicle, maximizing texel density and eliminating acne.
 */
export function Lights() {
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const lightRef = useRef<DirectionalLight>(null);
  const targetRef = useRef<Object3D>(new Object3D());
  const gl = useThree((s) => s.gl);

  const isMobile = isMobileDevice();

  // Enforce hardware-accelerated PCF shadows on mobile and soft shadows on desktop
  useEffect(() => {
    if (gl.shadowMap) {
      gl.shadowMap.type = isMobile ? PCFShadowMap : PCFSoftShadowMap;
      gl.shadowMap.needsUpdate = true;
    }
  }, [gl, isMobile]);
  const levelPreset = getLevelPreset(selectedLevelId);
  const sunPos = levelPreset.environment?.sky?.sunPosition ?? SKY_CONFIG.sunPosition;

  // Dynamic shadow map size and range
  const shadowMapSize =
    graphicsQuality === 'low'
      ? 256
      : graphicsQuality === 'medium'
      ? 512
      : graphicsQuality === 'high'
      ? 1024
      : (isMobile ? 1024 : 2048);

  const shadowRange = isMobile
    ? (graphicsQuality === 'very_high' ? 45 : 35)
    : (graphicsQuality === 'very_high'
        ? LIGHTING_CONFIG.directional.shadowCameraRange * 1.3
        : LIGHTING_CONFIG.directional.shadowCameraRange);

  const shadowCameraNear = isMobile ? 5 : LIGHTING_CONFIG.directional.shadowCameraNear;
  const shadowCameraFar = isMobile ? 180 : LIGHTING_CONFIG.directional.shadowCameraFar;
  const shadowBias = isMobile ? -0.0002 : LIGHTING_CONFIG.directional.shadowBias;
  const shadowNormalBias = isMobile ? 0.025 : LIGHTING_CONFIG.directional.shadowNormalBias;

  // Safely adjust shadow map render target size and lifecycle without nulling out active targets
  useEffect(() => {
    if (lightRef.current?.shadow?.map) {
      if (!shadowsEnabled) {
        lightRef.current.shadow.map.dispose();
        lightRef.current.shadow.map = null;
      } else {
        lightRef.current.shadow.map.setSize(shadowMapSize, shadowMapSize);
        lightRef.current.shadow.needsUpdate = true;
      }
    }
  }, [shadowMapSize, shadowsEnabled]);

  // Ensure directional shadow camera projection matrix updates when frustum parameters change
  useEffect(() => {
    if (lightRef.current?.shadow?.camera) {
      lightRef.current.shadow.camera.updateProjectionMatrix();
    }
  }, [shadowRange, shadowCameraNear, shadowCameraFar]);

  useFrame((state) => {
    if (lightRef.current && targetRef.current) {
      const camPos = state.camera.position;

      // Update the light target to ground focus point under the camera
      targetRef.current.position.set(camPos.x, Math.max(0, camPos.y - 3), camPos.z);
      targetRef.current.updateMatrixWorld();

      // Rigid directional light offset maintains constant sun direction angle
      lightRef.current.position.set(
        camPos.x + sunPos[0],
        camPos.y + sunPos[1],
        camPos.z + sunPos[2]
      );
      lightRef.current.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Ambient fill light */}
      <ambientLight 
        intensity={LIGHTING_CONFIG.ambient.intensity} 
        color={LIGHTING_CONFIG.ambient.color} 
      />

      {/* Target object added to scene graph so matrixWorld updates properly */}
      <primitive object={targetRef.current} />

      {/* Sun — directional light with shadows */}
      <directionalLight
        ref={lightRef}
        target={targetRef.current}
        intensity={LIGHTING_CONFIG.directional.intensity}
        color={LIGHTING_CONFIG.directional.color}
        castShadow={shadowsEnabled && graphicsQuality !== 'low'}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-shadowRange}
        shadow-camera-right={shadowRange}
        shadow-camera-top={shadowRange}
        shadow-camera-bottom={-shadowRange}
        shadow-camera-near={shadowCameraNear}
        shadow-camera-far={shadowCameraFar}
        shadow-bias={shadowBias}
        shadow-normalBias={shadowNormalBias}
      />

      {/* Hemisphere light — sky/ground color bounce */}
      <hemisphereLight
        args={[
          LIGHTING_CONFIG.hemisphere.skyColor, 
          LIGHTING_CONFIG.hemisphere.groundColor, 
          LIGHTING_CONFIG.hemisphere.intensity
        ]}
      />
    </>
  );
}
