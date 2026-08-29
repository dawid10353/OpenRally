import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import { ACESFilmicToneMapping } from 'three';
import { Terrain } from '@/components/terrain/Terrain';
import { GrassField } from '@/components/terrain/GrassField';
import { PropsInstancer } from '@/components/terrain/PropsInstancer';

import { TerrainProvider } from '@/components/terrain/TerrainContext';
import { Ocean } from '@/components/environment/Ocean';
import { Checkpoints } from '@/components/environment/Checkpoints';
import { Vehicle } from '@/components/vehicle/Vehicle';
import { Lights } from '@/components/canvas/Lights';
import { Environment, Sky, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { getLevelPreset } from '@/config/levelRegistry';
import { SKY_CONFIG, FOG_CONFIG, POSTPROCESSING_CONFIG } from '@/config/environment';

/**
 * Main game canvas — wraps the R3F Canvas with Physics, scene objects,
 * dynamic level environments, and post-processing effects.
 */
export function GameCanvas() {
  const postProcessingEnabled = useSettingsStore(
    (s) => s.postProcessingEnabled,
  );
  const shadowsEnabled = useSettingsStore((s) => s.shadowsEnabled);
  const debugPhysics = useSettingsStore((s) => s.debugPhysics);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const antiAliasing = useSettingsStore((s) => s.antiAliasing);
  const resolutionScale = useSettingsStore((s) => s.resolutionScale);
  const gameState = useGameStore((s) => s.gameState);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);

  const levelPreset = getLevelPreset(selectedLevelId);

  const baseFogColor = levelPreset.environment?.fog?.color ?? FOG_CONFIG.color;
  const baseFogNear = levelPreset.environment?.fog?.near ?? FOG_CONFIG.near;
  const baseFogFar = levelPreset.environment?.fog?.far ?? FOG_CONFIG.far;

  const fogColor = baseFogColor;
  const fogNear = graphicsQuality === 'very_high' ? baseFogNear * 1.5 : baseFogNear;
  const fogFar =
    graphicsQuality === 'very_high'
      ? baseFogFar * 2.2
      : graphicsQuality === 'low'
      ? baseFogFar * 0.75
      : baseFogFar;

  const cameraFar = graphicsQuality === 'very_high' ? 4000 : 2000;

  const sunPosition = (levelPreset.environment?.sky?.sunPosition ?? SKY_CONFIG.sunPosition) as [number, number, number];
  const inclination = levelPreset.environment?.sky?.inclination ?? SKY_CONFIG.inclination;
  const azimuth = levelPreset.environment?.sky?.azimuth ?? SKY_CONFIG.azimuth;

  const turbidity = levelPreset.environment?.sky?.turbidity ?? SKY_CONFIG.turbidity;
  const rayleigh = levelPreset.environment?.sky?.rayleigh ?? SKY_CONFIG.rayleigh;
  const mieCoefficient = levelPreset.environment?.sky?.mieCoefficient ?? SKY_CONFIG.mieCoefficient;
  const mieDirectionalG = levelPreset.environment?.sky?.mieDirectionalG ?? SKY_CONFIG.mieDirectionalG;

  const baseDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const qualityMaxDpr =
    graphicsQuality === 'very_high'
      ? 2.0
      : graphicsQuality === 'high'
      ? 1.5
      : graphicsQuality === 'medium'
      ? 1.0
      : 0.75;
  const targetDpr = Math.min(baseDpr, qualityMaxDpr) * resolutionScale;
  const dpr: [number, number] = [0.5 * resolutionScale, Math.max(0.5, targetDpr)];

  return (
    <Canvas
      dpr={dpr}
      shadows={shadowsEnabled}
      camera={{ fov: 60, near: 0.1, far: cameraFar, position: [0, 10, -15] }}
      gl={{
        antialias: antiAliasing !== 'off',
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 0.98,
      }}
      performance={{ min: 0.6 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <AdaptiveDpr />
        <AdaptiveEvents />
        {/* Fog for atmosphere and distance culling */}
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

        {/* Lighting */}
        <Lights />

        {/* Procedural Sky visible to player with realistic atmospheric scattering */}
        <Sky 
          distance={SKY_CONFIG.distance} 
          sunPosition={sunPosition}
          inclination={inclination} 
          azimuth={azimuth} 
          turbidity={turbidity}
          rayleigh={rayleigh}
          mieCoefficient={mieCoefficient}
          mieDirectionalG={mieDirectionalG}
        />
        {/* Environment captures the Sky for realistic reflections on water and car */}
        <Environment background={false} resolution={256} frames={1}>
          <Sky 
            distance={SKY_CONFIG.distance} 
            sunPosition={sunPosition} 
            inclination={inclination} 
            azimuth={azimuth} 
            turbidity={turbidity}
            rayleigh={rayleigh}
            mieCoefficient={mieCoefficient}
            mieDirectionalG={mieDirectionalG}
          />
        </Environment>

        {/* Terrain context wraps both physics terrain, visual grass, ocean, props, and checkpoints */}
        <TerrainProvider key={selectedLevelId} levelPreset={levelPreset}>
          {/* Ocean boundary */}
          <Ocean />

          {/* Physics world */}
          <Physics 
            gravity={[0, -9.81, 0]} 
            timeStep={1 / 60} 
            debug={debugPhysics} 
            paused={gameState !== 'playing'}
          >
            <Terrain />
            <PropsInstancer />
            
            {/* Rally Checkpoint Gates with physics colliders */}
            <Checkpoints />

            {/* Player vehicle */}
            <Vehicle />
          </Physics>

          {/* Instanced grass field — outside Physics (no collision needed) */}
          <GrassField />
        </TerrainProvider>

        {/* Post-processing effects */}
        {postProcessingEnabled && (
          <EffectComposer multisampling={antiAliasing === 'msaa' ? 4 : 0}>
            {antiAliasing === 'smaa' && <SMAA />}
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
