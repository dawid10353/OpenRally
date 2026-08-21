import type { SurfaceDefinition, SurfaceParticleConfig, SurfaceAudioConfig } from '@/types/surface';
import type { SurfaceType, TireConfig } from '@/types/vehicle';

export interface CreateSurfaceOptions {
  /** Surface identifier */
  readonly id: SurfaceType;
  /** Display name */
  readonly name: string;
  /** Front tire grip settings */
  readonly frontGrip?: {
    baseGrip?: number;
    peakSlipAngle?: number;
    slideGrip?: number;
  };
  /** Rear tire grip settings */
  readonly rearGrip?: {
    baseGrip?: number;
    peakSlipAngle?: number;
    slideGrip?: number;
  };
  /** Particle effects configuration */
  readonly particles?: Partial<SurfaceParticleConfig>;
  /** Audio characteristics */
  readonly audio?: Partial<SurfaceAudioConfig>;
  /** Skid mark opacity (0.0 to 1.0) */
  readonly skidMarkOpacity?: number;
}

/**
 * Factory function to create a validated, type-safe SurfaceDefinition.
 */
export function createSurfaceDefinition(options: CreateSurfaceOptions): SurfaceDefinition {
  const tireModel: TireConfig = {
    front: {
      baseGrip: options.frontGrip?.baseGrip ?? 2.5,
      peakSlipAngle: options.frontGrip?.peakSlipAngle ?? Math.PI / 7,
      slideGrip: options.frontGrip?.slideGrip ?? 2.0,
    },
    rear: {
      baseGrip: options.rearGrip?.baseGrip ?? 2.8,
      peakSlipAngle: options.rearGrip?.peakSlipAngle ?? Math.PI / 7,
      slideGrip: options.rearGrip?.slideGrip ?? 2.2,
    },
  };

  const particles: SurfaceParticleConfig = {
    color: options.particles?.color ?? '#8b6f4e',
    scale: options.particles?.scale ?? 1.0,
    lifetime: options.particles?.lifetime ?? 0.5,
    emitRateMultiplier: options.particles?.emitRateMultiplier ?? 1.0,
  };

  const audio: SurfaceAudioConfig = {
    soundType: options.audio?.soundType ?? 'gravel',
    basePitch: options.audio?.basePitch ?? 1.0,
    volumeMultiplier: options.audio?.volumeMultiplier ?? 1.0,
  };

  return {
    id: options.id,
    name: options.name,
    tireModel,
    particles,
    audio,
    skidMarkOpacity: options.skidMarkOpacity ?? 0.5,
  };
}
