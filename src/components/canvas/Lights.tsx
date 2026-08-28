import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight } from 'three';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { LIGHTING_CONFIG, SKY_CONFIG } from '@/config/environment';

import { getLevelPreset } from '@/config/levelRegistry';

/**
 * Scene lighting setup — ambient + directional sun + hemisphere.
 * Shadows are controlled by settings store.
 * The directional light follows the camera to ensure shadows are always visible
 * around the player and to maximize shadow map resolution/performance.
 */
export function Lights() {
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const lightRef = useRef<DirectionalLight>(null);

  const levelPreset = getLevelPreset(selectedLevelId);
  const sunPos = levelPreset.environment?.sky?.sunPosition ?? SKY_CONFIG.sunPosition;

  // Dynamiczne dostosowanie rozdzielczości i zasięgu mapy cieni
  const shadowMapSize =
    graphicsQuality === 'low'
      ? 256
      : graphicsQuality === 'medium'
      ? 512
      : graphicsQuality === 'high'
      ? 1024
      : 2048;

  const shadowRange =
    graphicsQuality === 'very_high'
      ? LIGHTING_CONFIG.directional.shadowCameraRange * 1.4
      : LIGHTING_CONFIG.directional.shadowCameraRange;

  useFrame((state) => {
    if (lightRef.current) {
      const camPos = state.camera.position;
      
      // Texel snapping: align light target with shadow map texel size to eliminate shadow edge shimmering
      const worldUnitsPerTexel = (shadowRange * 2) / Math.max(256, shadowMapSize);
      const snappedX = Math.round(camPos.x / worldUnitsPerTexel) * worldUnitsPerTexel;
      const snappedZ = Math.round(camPos.z / worldUnitsPerTexel) * worldUnitsPerTexel;
      const targetY = camPos.y * 0.2;

      // Słońce podąża za kamerą w krokach siatki tekseli mapy cieni
      lightRef.current.position.set(
        snappedX + sunPos[0],
        camPos.y + sunPos[1],
        snappedZ + sunPos[2]
      );
      
      // Cel światła (target) to punkt na ziemi bezpośrednio pod kamerą
      lightRef.current.target.position.set(snappedX, targetY, snappedZ);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Ambient fill light */}
      <ambientLight 
        intensity={LIGHTING_CONFIG.ambient.intensity} 
        color={LIGHTING_CONFIG.ambient.color} 
      />

      {/* Sun — directional light with shadows */}
      <directionalLight
        ref={lightRef}
        intensity={LIGHTING_CONFIG.directional.intensity}
        color={LIGHTING_CONFIG.directional.color}
        castShadow={shadowsEnabled}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-shadowRange}
        shadow-camera-right={shadowRange}
        shadow-camera-top={shadowRange}
        shadow-camera-bottom={-shadowRange}
        shadow-camera-near={LIGHTING_CONFIG.directional.shadowCameraNear}
        shadow-camera-far={LIGHTING_CONFIG.directional.shadowCameraFar}
        shadow-bias={LIGHTING_CONFIG.directional.shadowBias}
        shadow-normalBias={LIGHTING_CONFIG.directional.shadowNormalBias}
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
