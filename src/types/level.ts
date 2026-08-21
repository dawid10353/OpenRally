import type { TrackConfig } from './terrain';

/**
 * Represents a single instance of a prop (tree, rock) in the level.
 */
export interface PropData {
  id: string;
  type: 'tree' | 'rock';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/**
 * Base configuration for the procedural noise generator.
 * This ensures that even if we don't save a huge heightmap,
 * we have a deterministic base terrain.
 */
export interface TerrainBaseConfig {
  width: number;
  depth: number;
  subdivisions: number;
  amplitude: number;
  frequency: number;
  octaves: number;
  lacunarity: number;
  persistence: number;
  seed: number;
}

/**
 * A localized modification to the heightmap, representing
 * a brush stroke from a Map Editor.
 */
export interface HeightmapModification {
  x: number; // World X
  z: number; // World Z
  radius: number;
  heightDelta?: number; // For additive brushes
  absoluteHeight?: number; // For flatten brushes
  shape: 'sphere' | 'flat' | 'smooth';
}

/**
 * The root structure of a serialized Map/Level.
 */
export interface LevelData {
  id: string;
  name: string;
  terrainBase: TerrainBaseConfig;
  track: TrackConfig;
  heightModifiers: HeightmapModification[];
  props: PropData[];
}

/**
 * Complete level preset definition including gameplay metadata,
 * spawn positioning, reset bounds, and environmental styling.
 */
export interface LevelPreset {
  /** Unique level identifier */
  readonly id: string;
  /** Display title */
  readonly name: string;
  /** Description / subtitle */
  readonly description: string;
  /** Track difficulty label */
  readonly difficulty: 'easy' | 'medium' | 'hard';
  /** Primary surface type description for UI */
  readonly surfaceDescription: string;
  /** Underlying terrain, track, and props dataset */
  readonly data: LevelData;
  /** Vehicle spawn coordinates [x, y, z] */
  readonly spawnPosition: [number, number, number];
  /** Vehicle spawn heading (radians around Y axis) */
  readonly spawnRotationY: number;
  /** Y elevation threshold below which vehicle resets */
  readonly fallResetY: number;
  /** Optional custom environment styling */
  readonly environment?: {
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
  };
}

