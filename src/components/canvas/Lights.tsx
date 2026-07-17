import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight } from 'three';
import { useSettingsStore } from '@/store/settingsStore';
import { LIGHTING_CONFIG, SKY_CONFIG } from '@/config/environment';

/**
 * Scene lighting setup — ambient + directional sun + hemisphere.
 * Shadows are controlled by settings store.
 * The directional light follows the camera to ensure shadows are always visible
 * around the player and to maximize shadow map resolution/performance.
 */
export function Lights() {
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const lightRef = useRef<DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const camPos = state.camera.position;
      
      // Słońce podąża za kamerą zachowując swój wektor kierunkowy
      lightRef.current.position.set(
        camPos.x + SKY_CONFIG.sunPosition[0],
        camPos.y + SKY_CONFIG.sunPosition[1],
        camPos.z + SKY_CONFIG.sunPosition[2]
      );
      
      // Cel światła (target) to punkt na ziemi bezpośrednio pod/przed kamerą
      lightRef.current.target.position.set(camPos.x, 0, camPos.z);
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
        shadow-mapSize-width={LIGHTING_CONFIG.directional.shadowMapSize}
        shadow-mapSize-height={LIGHTING_CONFIG.directional.shadowMapSize}
        // Znacznie mniejszy zasięg kamery cieni (tylko wokół gracza) daje lepsze FPS i ostrzejsze cienie
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
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
