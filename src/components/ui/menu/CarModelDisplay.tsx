import { useGLTF, Clone } from '@react-three/drei';
import { Wheel } from '@/components/vehicle/Wheel';
import type { VehiclePreset } from '@/types';
import { isMobileDevice } from '@/utils/device';
import { useSettingsStore } from '@/store/settingsStore';
import { menuStyles } from './menuStyles';

export function CarModelDisplay({ preset }: { preset: VehiclePreset }) {
  const isMobile = isMobileDevice();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const useOptimized = isMobile || graphicsQuality !== 'very_high';
  const effectiveModelPath = useOptimized && preset.modelPath.endsWith('.glb')
    ? preset.modelPath.replace(/\.glb$/, '_opt.glb')
    : preset.modelPath;

  const { scene } = useGLTF(effectiveModelPath);
  const offset = preset.modelPositionOffset ?? [0, 0.2, 0.1];
  const scale = preset.modelScale ?? [4.5, 4.5, 4.5];

  return (
    <group>
      <Clone 
        object={scene} 
        position={offset} 
        scale={scale} 
        castShadow 
        receiveShadow 
      />
      {preset.config.wheels.map((wheel, index) => {
        // Account for suspension rest length compression under vehicle weight
        // so wheels sit accurately inside the wheel arches without clipping into the body
        const restLength = wheel.suspensionRestLength ?? 0.32;
        const restSuspensionOffset = restLength * 0.75;
        const wheelY = wheel.position[1] - restSuspensionOffset;

        return (
          <group key={index} position={[wheel.position[0], wheelY, wheel.position[2]]}>
            <Wheel isRightSide={wheel.position[0] > 0} radius={wheel.radius} />
          </group>
        );
      })}
    </group>
  );
}

export function StatBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(Math.max((value / 10) * 100, 5), 100);
  return (
    <div style={menuStyles.statRow}>
      <span style={menuStyles.statLabel}>{label}</span>
      <div style={menuStyles.statTrack}>
        <div style={{ ...menuStyles.statFill, width: `${percent}%` }} />
      </div>
      <span style={menuStyles.statValue}>{value.toFixed(1)}</span>
    </div>
  );
}
