import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Terrain } from '@/components/terrain/Terrain';
import { GrassField } from '@/components/terrain/GrassField';

import { TerrainProvider } from '@/components/terrain/TerrainContext';
import { Ocean } from '@/components/environment/Ocean';
import { Vehicle } from '@/components/vehicle/Vehicle';
import { Lights } from '@/components/canvas/Lights';
import { Environment, Sky, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { SKY_CONFIG, FOG_CONFIG, POSTPROCESSING_CONFIG } from '@/config/environment';

/**
 * Main game canvas — wraps the R3F Canvas with Physics, scene objects,
 * and post-processing effects.
 */
export function GameCanvas() {
  const postProcessingEnabled = useSettingsStore(
    (s) => s.postProcessingEnabled,
  );
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const debugPhysics = useSettingsStore((s) => s.debugPhysics);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const gameState = useGameStore((s) => s.gameState);

  const dpr: [number, number] =
    graphicsQuality === 'low'
      ? [0.5, 0.75]
      : graphicsQuality === 'medium'
      ? [0.75, 1.0]
      : [1.0, 1.5];

  return (
    <Canvas
      dpr={dpr}
      shadows={shadowsEnabled}
      camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 10, -15] }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
      }}
      performance={{ min: 0.5 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        {/* Fog for atmosphere and distance culling */}
        <fog attach="fog" args={[FOG_CONFIG.color, FOG_CONFIG.near, FOG_CONFIG.far]} />

        {/* Lighting */}
        <Lights />

        {/* Procedural Sky visible to player */}
        <Sky 
          distance={SKY_CONFIG.distance} 
          sunPosition={SKY_CONFIG.sunPosition} // Matches DirectionalLight
          inclination={SKY_CONFIG.inclination} 
          azimuth={SKY_CONFIG.azimuth} 
        />
        {/* Environment captures the Sky for realistic reflections on water and car */}
        <Environment background={false} resolution={256} frames={1}>
          <Sky 
            distance={SKY_CONFIG.distance} 
            sunPosition={SKY_CONFIG.sunPosition} 
            inclination={SKY_CONFIG.inclination} 
            azimuth={SKY_CONFIG.azimuth} 
          />
        </Environment>

        {/* Terrain context wraps both physics terrain, visual grass, and ocean (for heightmap access) */}
        <TerrainProvider>
          {/* Ocean boundary */}
          <Ocean />

          {/* Physics world */}
          <Physics gravity={[0, -9.81, 0]} debug={debugPhysics} paused={gameState !== 'playing'}>
            <Terrain />
            
            {/* Player vehicle */}
            <Vehicle />
          </Physics>

          {/* Instanced grass field — outside Physics (no collision needed) */}
          <GrassField />
        </TerrainProvider>

        {/* Post-processing effects */}
        {postProcessingEnabled && (
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={POSTPROCESSING_CONFIG.bloom.luminanceThreshold}
              luminanceSmoothing={POSTPROCESSING_CONFIG.bloom.luminanceSmoothing}
              mipmapBlur
              intensity={POSTPROCESSING_CONFIG.bloom.intensity}
            />
            <Vignette
              offset={POSTPROCESSING_CONFIG.vignette.offset}
              darkness={POSTPROCESSING_CONFIG.vignette.darkness}
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
