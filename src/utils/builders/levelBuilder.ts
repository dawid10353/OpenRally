import type {
  LevelPreset,
  LevelData,
  TerrainBaseConfig,
  HeightmapModification,
  PropData,
} from '@/types/level';
import type { TrackPoint, TrackConfig } from '@/types/terrain';

/**
 * Environment archetypes with predefined procedural noise & atmosphere styles.
 */
export type EnvironmentArchetype = 'island' | 'desert' | 'alpine' | 'tundra' | 'canyon';

export interface EnvironmentAtmosphere {
  sky?: {
    sunPosition?: [number, number, number];
    inclination?: number;
    azimuth?: number;
  };
  fog?: {
    color?: string;
    near?: number;
    far?: number;
  };
}

/**
 * Standard terrain bases for environments.
 */
export const ARCHETYPE_TERRAINS: Record<
  EnvironmentArchetype,
  {
    terrainBase: Omit<TerrainBaseConfig, 'seed'>;
    atmosphere: EnvironmentAtmosphere;
    defaultSurfaceDescription: string;
  }
> = {
  island: {
    terrainBase: {
      width: 600,
      depth: 600,
      subdivisions: 180,
      amplitude: 25,
      frequency: 0.005,
      octaves: 4,
      lacunarity: 2.0,
      persistence: 0.5,
    },
    atmosphere: {
      sky: {
        sunPosition: [100, 40, 100],
        inclination: 0.5,
        azimuth: 0.25,
      },
      fog: {
        color: '#cce0ff',
        near: 200,
        far: 1000,
      },
    },
    defaultSurfaceDescription: 'Mud & Grass',
  },
  desert: {
    terrainBase: {
      width: 700,
      depth: 700,
      subdivisions: 200,
      amplitude: 35,
      frequency: 0.003,
      octaves: 4,
      lacunarity: 2.0,
      persistence: 0.45,
    },
    atmosphere: {
      sky: {
        sunPosition: [100, 30, -50],
        inclination: 0.6,
        azimuth: 0.3,
      },
      fog: {
        color: '#d4b483',
        near: 150,
        far: 1400,
      },
    },
    defaultSurfaceDescription: 'Sand & Gravel',
  },
  alpine: {
    terrainBase: {
      width: 800,
      depth: 800,
      subdivisions: 220,
      amplitude: 55,
      frequency: 0.004,
      octaves: 5,
      lacunarity: 2.1,
      persistence: 0.48,
    },
    atmosphere: {
      sky: {
        sunPosition: [50, 60, 80],
        inclination: 0.4,
        azimuth: 0.15,
      },
      fog: {
        color: '#e0e7ff',
        near: 250,
        far: 1600,
      },
    },
    defaultSurfaceDescription: 'Tarmac & Snow',
  },
  tundra: {
    terrainBase: {
      width: 700,
      depth: 700,
      subdivisions: 190,
      amplitude: 28,
      frequency: 0.004,
      octaves: 4,
      lacunarity: 2.0,
      persistence: 0.4,
    },
    atmosphere: {
      sky: {
        sunPosition: [80, 20, -100],
        inclination: 0.75,
        azimuth: 0.5,
      },
      fog: {
        color: '#dbeafe',
        near: 100,
        far: 900,
      },
    },
    defaultSurfaceDescription: 'Snow & Ice',
  },
  canyon: {
    terrainBase: {
      width: 750,
      depth: 750,
      subdivisions: 210,
      amplitude: 48,
      frequency: 0.0035,
      octaves: 5,
      lacunarity: 2.2,
      persistence: 0.46,
    },
    atmosphere: {
      sky: {
        sunPosition: [120, 25, 40],
        inclination: 0.65,
        azimuth: 0.4,
      },
      fog: {
        color: '#fed7aa',
        near: 120,
        far: 1200,
      },
    },
    defaultSurfaceDescription: 'Gravel & Dirt',
  },
};

/**
 * Options for creating a level preset.
 */
export interface CreateLevelOptions {
  /** Unique level ID */
  readonly id: string;
  /** Display title */
  readonly name: string;
  /** Description / subtitle */
  readonly description: string;
  /** Difficulty rating */
  readonly difficulty?: 'easy' | 'medium' | 'hard';
  /** Primary surface description for UI */
  readonly surfaceDescription?: string;
  /** Environmental archetype */
  readonly archetype?: EnvironmentArchetype;
  /** Deterministic PRNG seed */
  readonly seed?: number;
  /** Custom track spline points */
  readonly trackPoints: readonly TrackPoint[];
  /** Track width (default 20) */
  readonly trackWidth?: number;
  /** Track elevation blending falloff distance (default 30) */
  readonly trackFalloff?: number;
  /** Base track elevation Y (default 0.0) */
  readonly targetHeight?: number;
  /** Heightmap brush modifications */
  readonly heightModifiers?: readonly HeightmapModification[];
  /** Placed trees, rocks, buildings */
  readonly props?: readonly PropData[];
  /** Custom vehicle spawn position (defaults to slightly above first track point) */
  readonly spawnPosition?: [number, number, number];
  /** Custom vehicle spawn heading rotation Y (defaults to track tangent) */
  readonly spawnRotationY?: number;
  /** Fall reset threshold Y (defaults to -10.0) */
  readonly fallResetY?: number;
  /** Environment overrides (sky, fog) */
  readonly environment?: EnvironmentAtmosphere;
  /** Specific terrain base overrides */
  readonly terrainOverrides?: Partial<TerrainBaseConfig>;
}

/**
 * Factory function to create a complete, type-safe LevelPreset.
 * Automatically computes safe spawn positions and headings aligned with the track spline.
 */
export function createLevelPreset(options: CreateLevelOptions): LevelPreset {
  const archetype = options.archetype ?? 'island';
  const archetypeSpec = ARCHETYPE_TERRAINS[archetype];

  const terrainBase: TerrainBaseConfig = {
    ...archetypeSpec.terrainBase,
    seed: options.seed ?? 42,
    ...options.terrainOverrides,
  };

  const track: TrackConfig = {
    points: [...options.trackPoints],
    width: options.trackWidth ?? 20,
    falloff: options.trackFalloff ?? 30,
    targetHeight: options.targetHeight ?? 0.0,
  };

  const data: LevelData = {
    id: options.id,
    name: options.name,
    terrainBase,
    track,
    heightModifiers: options.heightModifiers ? [...options.heightModifiers] : [],
    props: options.props ? [...options.props] : [],
  };

  // Compute smart spawn position and orientation if not provided
  let spawnPos: [number, number, number] = options.spawnPosition ?? [0, 1.0, 0];
  let spawnRot: number = options.spawnRotationY ?? 0;

  if (!options.spawnPosition && options.trackPoints.length >= 2) {
    const p0 = options.trackPoints[0];
    const p1 = options.trackPoints[1];
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    // Align heading along track forward vector (+Z is forward in Three.js)
    spawnRot = Math.atan2(dx, dz);
    spawnPos = [p0.x, (options.targetHeight ?? 0) + 1.2, p0.z];
  }

  const fallResetY = options.fallResetY ?? -12.0;

  return {
    id: options.id,
    name: options.name,
    description: options.description,
    difficulty: options.difficulty ?? 'medium',
    surfaceDescription: options.surfaceDescription ?? archetypeSpec.defaultSurfaceDescription,
    data,
    spawnPosition: spawnPos,
    spawnRotationY: spawnRot,
    fallResetY,
    environment: {
      ...archetypeSpec.atmosphere,
      ...options.environment,
    },
  };
}
