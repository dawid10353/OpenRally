import { Vector3, Color } from 'three';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';
import type { SurfaceType } from '@/types/vehicle';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';

/**
 * Configuration options for a single tire track ribbon stream.
 */
export interface TireRibbonConfig {
  /** Maximum number of segments in the buffer */
  maxSegments: number;
  /** Lifetime in seconds before a segment completely fades out */
  lifetime: number;
  /** Minimum distance in meters between consecutive ribbon points */
  minDistance: number;
  /** Width of the tire track ribbon in meters */
  tireWidth: number;
  /** Physical distance in meters corresponding to 1 full UV cycle of tread */
  treadTileLength: number;
  /** Vertical elevation offset along the surface normal (meters) to eliminate z-fighting */
  normalOffset: number;
}

/**
 * Default ribbon configuration.
 */
export const DEFAULT_RIBBON_CONFIG: TireRibbonConfig = {
  maxSegments: 600,
  lifetime: 15,
  minDistance: 0.18,
  tireWidth: 0.34,
  treadTileLength: 0.45,
  normalOffset: 0.015,
};

/**
 * Surface profile specifying mark color, opacity, and slip requirements.
 */
export interface SurfaceTrackProfile {
  /** Minimum lateral/longitudinal slip required to emit skid marks */
  slipThreshold: number;
  /** Base track color hex */
  colorHex: string;
  /** Base opacity under normal rolling contact */
  baseOpacity: number;
  /** Maximum opacity under intense slip/drift */
  maxSlipOpacity: number;
}

/**
 * Per-surface track profiles.
 */
export const SURFACE_TRACK_PROFILES: Record<SurfaceType, SurfaceTrackProfile> = {
  tarmac: {
    slipThreshold: 0.6,
    colorHex: '#141414',
    baseOpacity: 0.35,
    maxSlipOpacity: 0.95,
  },
  mud: {
    slipThreshold: 0.0,
    colorHex: '#2b1a0e',
    baseOpacity: 0.85,
    maxSlipOpacity: 0.95,
  },
  sand: {
    slipThreshold: 0.0,
    colorHex: '#7a5a32',
    baseOpacity: 0.8,
    maxSlipOpacity: 0.92,
  },
  grass: {
    slipThreshold: 0.35,
    colorHex: '#1e3312',
    baseOpacity: 0.2,
    maxSlipOpacity: 0.6,
  },
  gravel: {
    slipThreshold: 0.0,
    colorHex: '#3a3835',
    baseOpacity: 0.75,
    maxSlipOpacity: 0.9,
  },
  snow: {
    slipThreshold: 0.0,
    colorHex: '#99b3cc',
    baseOpacity: 0.7,
    maxSlipOpacity: 0.88,
  },
};

/**
 * Internal pre-allocated segment point data.
 */
export interface RibbonPoint {
  leftX: number;
  leftY: number;
  leftZ: number;
  rightX: number;
  rightY: number;
  rightZ: number;
  uvV: number;
  colorR: number;
  colorG: number;
  colorB: number;
  alpha: number;
  baseAlpha: number;
  time: number;
  disconnected: boolean;
}

// Reusable scratch objects to prevent garbage collection inside hot frame loops
const _scratchForward = new Vector3();
const _scratchTangent = new Vector3();
const _scratchRight = new Vector3();
const _scratchNormal = new Vector3(0, 1, 0);
const _scratchUp = new Vector3(0, 1, 0);
const _tempColor = new Color();

/**
 * Computes left and right ribbon vertex positions perpendicular to forward travel direction
 * and aligned with the surface contact normal.
 */
export function computeRibbonEdges(
  contactPoint: Vector3,
  forwardDir: Vector3,
  surfaceNormal: Vector3,
  halfWidth: number,
  outLeft: Vector3,
  outRight: Vector3,
): void {
  // Tangent in movement direction
  if (forwardDir.lengthSq() < 0.0001) {
    _scratchTangent.set(0, 0, 1);
  } else {
    _scratchTangent.copy(forwardDir).normalize();
  }

  // Surface normal safety check
  if (surfaceNormal.lengthSq() < 0.0001) {
    _scratchNormal.copy(_scratchUp);
  } else {
    _scratchNormal.copy(surfaceNormal).normalize();
  }

  // Right vector: cross product of tangent and surface normal
  _scratchRight.crossVectors(_scratchTangent, _scratchNormal);
  if (_scratchRight.lengthSq() < 0.0001) {
    _scratchRight.set(1, 0, 0);
  } else {
    _scratchRight.normalize();
  }

  outLeft.copy(contactPoint).addScaledVector(_scratchRight, -halfWidth);
  outRight.copy(contactPoint).addScaledVector(_scratchRight, halfWidth);
}

/**
 * Samples terrain height and estimates terrain normal at a world (x, z) location.
 */
export function sampleTerrainHeightAndNormal(
  x: number,
  z: number,
  heightmapData: HeightmapData | undefined,
  levelData: LevelData | undefined,
  outPos: Vector3,
  outNormal: Vector3,
  bias = 0.015,
): void {
  if (!heightmapData || !levelData) {
    outPos.set(x, 0 + bias, z);
    outNormal.set(0, 1, 0);
    return;
  }

  const { heights, cols, rows } = heightmapData;
  const { width, depth } = levelData.terrainBase;

  const hCenter = getInterpolatedHeight(x, z, heights, rows, cols, width, depth);
  
  // Sample adjacent points (0.5m delta) to compute surface normal gradient
  const delta = 0.5;
  const hX1 = getInterpolatedHeight(x + delta, z, heights, rows, cols, width, depth);
  const hX0 = getInterpolatedHeight(x - delta, z, heights, rows, cols, width, depth);
  const hZ1 = getInterpolatedHeight(x, z + delta, heights, rows, cols, width, depth);
  const hZ0 = getInterpolatedHeight(x, z - delta, heights, rows, cols, width, depth);

  const dX = (hX1 - hX0) / (2 * delta);
  const dZ = (hZ1 - hZ0) / (2 * delta);

  outNormal.set(-dX, 1.0, -dZ).normalize();
  
  // Elevate along normal to eliminate z-fighting
  outPos.set(
    x + outNormal.x * bias,
    hCenter + outNormal.y * bias,
    z + outNormal.z * bias,
  );
}

/**
 * High-performance, zero-allocation ring buffer managing continuous triangle-strip
 * ribbon geometry without any wrapping or long-distance bridging artifacts.
 */
export class TireRibbonBuffer {
  public readonly config: TireRibbonConfig;
  public readonly maxSegments: number;

  // Geometry typed buffers directly mapped to Three.js BufferGeometry attributes
  public readonly positions: Float32Array; // maxSegments * 2 * 3
  public readonly uvs: Float32Array;       // maxSegments * 2 * 2
  public readonly colors: Float32Array;    // maxSegments * 2 * 3
  public readonly alphas: Float32Array;    // maxSegments * 2 * 1
  public readonly indices: Uint32Array;    // (maxSegments - 1) * 6

  /** Flag indicating whether ribbon geometry topology (vertices, UVs, colors, indices) changed */
  public topologyDirty: boolean = true;

  // Pre-allocated object pool for segments
  private readonly points: RibbonPoint[];
  private start = 0;
  private count = 0;
  private activeIndicesCount = 0;
  private accumulatedDistance = 0;
  private lastPosition = new Vector3();
  private hasLastPosition = false;
  private wasAirborne = true;

  constructor(config: Partial<TireRibbonConfig> = {}) {
    this.config = { ...DEFAULT_RIBBON_CONFIG, ...config };
    this.maxSegments = this.config.maxSegments;

    const numVerts = this.maxSegments * 2;
    this.positions = new Float32Array(numVerts * 3);
    this.uvs = new Float32Array(numVerts * 2);
    this.colors = new Float32Array(numVerts * 3);
    this.alphas = new Float32Array(numVerts * 1);
    this.indices = new Uint32Array((this.maxSegments - 1) * 6);
    this.topologyDirty = true;

    this.points = Array.from({ length: this.maxSegments }, () => ({
      leftX: 0,
      leftY: 0,
      leftZ: 0,
      rightX: 0,
      rightY: 0,
      rightZ: 0,
      uvV: 0,
      colorR: 0,
      colorG: 0,
      colorB: 0,
      alpha: 0,
      baseAlpha: 0,
      time: 0,
      disconnected: false,
    }));
  }

  /**
   * Clears and resets all active segments in the buffer.
   */
  public reset(): void {
    this.start = 0;
    this.count = 0;
    this.activeIndicesCount = 0;
    this.accumulatedDistance = 0;
    this.hasLastPosition = false;
    this.wasAirborne = true;
    this.alphas.fill(0);
    this.topologyDirty = true;
  }

  /**
   * Flags that the tire is airborne or stopped, ensuring subsequent ground contacts
   * disconnect the ribbon geometry rather than drawing stretched bridges.
   */
  public notifyAirborne(): void {
    this.wasAirborne = true;
  }

  /**
   * Adds a new ground contact segment point.
   */
  public addContactPoint(
    contactPos: Vector3,
    surfaceNormal: Vector3,
    surfaceType: SurfaceType,
    speedMps: number,
    slipRatio: number,
    isGrounded: boolean,
    currentTime: number,
    heightmapData?: HeightmapData,
    levelData?: LevelData,
  ): boolean {
    if (!isGrounded || speedMps < 0.2) {
      this.wasAirborne = true;
      return false;
    }

    const profile = SURFACE_TRACK_PROFILES[surfaceType] ?? SURFACE_TRACK_PROFILES.grass;

    // Calculate dynamic opacity based on slip and surface
    let effectiveAlpha = profile.baseOpacity;
    if (slipRatio > profile.slipThreshold) {
      const slipFactor = Math.min(1.0, (slipRatio - profile.slipThreshold) / 2.0);
      effectiveAlpha = profile.baseOpacity + (profile.maxSlipOpacity - profile.baseOpacity) * slipFactor;
    }

    if (!this.hasLastPosition) {
      this.lastPosition.copy(contactPos);
      this.hasLastPosition = true;
      this.wasAirborne = false;
      return false;
    }

    const distance = contactPos.distanceTo(this.lastPosition);

    // Instantaneous warp/respawn safeguard -> decouple segment cleanly
    if (distance > 3.5) {
      this.lastPosition.copy(contactPos);
      this.wasAirborne = true;
      return false;
    }

    if (distance < this.config.minDistance) {
      return false;
    }

    // Direction of forward progression
    _scratchForward.subVectors(contactPos, this.lastPosition);

    const halfWidth = this.config.tireWidth / 2;
    const leftEdge = new Vector3();
    const rightEdge = new Vector3();

    computeRibbonEdges(
      contactPos,
      _scratchForward,
      surfaceNormal,
      halfWidth,
      leftEdge,
      rightEdge,
    );

    // Project both edges precisely onto the terrain
    const leftProjected = new Vector3();
    const leftNormal = new Vector3();
    sampleTerrainHeightAndNormal(
      leftEdge.x,
      leftEdge.z,
      heightmapData,
      levelData,
      leftProjected,
      leftNormal,
      this.config.normalOffset,
    );

    const rightProjected = new Vector3();
    const rightNormal = new Vector3();
    sampleTerrainHeightAndNormal(
      rightEdge.x,
      rightEdge.z,
      heightmapData,
      levelData,
      rightProjected,
      rightNormal,
      this.config.normalOffset,
    );

    // Advance UV V coordinate
    this.accumulatedDistance += distance;
    const vCoord = this.accumulatedDistance / this.config.treadTileLength;

    _tempColor.set(profile.colorHex);

    const isDisconnected = this.wasAirborne;
    this.pushPoint(
      leftProjected,
      rightProjected,
      vCoord,
      _tempColor,
      effectiveAlpha,
      currentTime,
      isDisconnected,
    );

    this.lastPosition.copy(contactPos);
    this.wasAirborne = false;
    return true;
  }

  /**
   * Pushes a new point to the circular segment list.
   */
  public pushPoint(
    left: Vector3,
    right: Vector3,
    vCoord: number,
    color: Color,
    baseAlpha: number,
    currentTime: number,
    disconnected: boolean,
  ): void {
    if (this.count >= this.maxSegments) {
      // Remove oldest segment at start
      this.start = (this.start + 1) % this.maxSegments;
      this.count--;
    }

    const insertIdx = (this.start + this.count) % this.maxSegments;
    const pt = this.points[insertIdx];

    pt.leftX = left.x;
    pt.leftY = left.y;
    pt.leftZ = left.z;

    pt.rightX = right.x;
    pt.rightY = right.y;
    pt.rightZ = right.z;

    pt.uvV = vCoord;
    pt.colorR = color.r;
    pt.colorG = color.g;
    pt.colorB = color.b;

    pt.baseAlpha = baseAlpha;
    pt.alpha = baseAlpha;
    pt.time = currentTime;
    pt.disconnected = disconnected;

    this.count++;
    this.topologyDirty = true;
  }

  /**
   * Updates opacity decay over time and populates linear GPU buffers for rendering.
   * Guarantees zero phantom bridge lines or wrapping artifacts.
   */
  public updateLifetime(currentTime: number): boolean {
    if (this.count === 0) {
      if (this.activeIndicesCount > 0) {
        this.activeIndicesCount = 0;
        this.topologyDirty = true;
      }
      return false;
    }

    const lifetime = this.config.lifetime;

    // 1. Prune expired points from the head of the circular queue
    let pruned = false;
    while (this.count > 0) {
      const pt = this.points[this.start];
      if (currentTime - pt.time >= lifetime) {
        this.start = (this.start + 1) % this.maxSegments;
        this.count--;
        pruned = true;
      } else {
        break;
      }
    }

    if (pruned) {
      this.topologyDirty = true;
    }

    if (this.count === 0) {
      this.activeIndicesCount = 0;
      this.topologyDirty = true;
      return false;
    }

    // 2. If topology did not change, only update alpha channel (avoids updating positions, UVs, colors, indices)
    if (!this.topologyDirty) {
      for (let i = 0; i < this.count; i++) {
        const ptIdx = (this.start + i) % this.maxSegments;
        const pt = this.points[ptIdx];

        const age = currentTime - pt.time;
        const progress = Math.min(1.0, Math.max(0.0, age / lifetime));
        const fade = 1.0 - progress * progress;
        const curAlpha = pt.baseAlpha * fade;
        pt.alpha = curAlpha;

        const vIdx = i * 2;
        this.alphas[vIdx] = curAlpha;
        this.alphas[vIdx + 1] = curAlpha;
      }
      return true;
    }

    // 3. Topology changed: fully repopulate linear typed arrays in contiguous order
    let indexCount = 0;

    for (let i = 0; i < this.count; i++) {
      const ptIdx = (this.start + i) % this.maxSegments;
      const pt = this.points[ptIdx];

      // Calculate smooth fade
      const age = currentTime - pt.time;
      const progress = Math.min(1.0, Math.max(0.0, age / lifetime));
      const fade = 1.0 - progress * progress;
      const curAlpha = pt.baseAlpha * fade;
      pt.alpha = curAlpha;

      const vIdx = i * 2;
      const posOffset = vIdx * 3;
      const uvOffset = vIdx * 2;
      const colOffset = vIdx * 3;

      // Vertex 0: Left
      this.positions[posOffset] = pt.leftX;
      this.positions[posOffset + 1] = pt.leftY;
      this.positions[posOffset + 2] = pt.leftZ;

      this.uvs[uvOffset] = 0.0;
      this.uvs[uvOffset + 1] = pt.uvV;

      this.colors[colOffset] = pt.colorR;
      this.colors[colOffset + 1] = pt.colorG;
      this.colors[colOffset + 2] = pt.colorB;

      this.alphas[vIdx] = curAlpha;

      // Vertex 1: Right
      this.positions[posOffset + 3] = pt.rightX;
      this.positions[posOffset + 4] = pt.rightY;
      this.positions[posOffset + 5] = pt.rightZ;

      this.uvs[uvOffset + 2] = 1.0;
      this.uvs[uvOffset + 3] = pt.uvV;

      this.colors[colOffset + 3] = pt.colorR;
      this.colors[colOffset + 4] = pt.colorG;
      this.colors[colOffset + 5] = pt.colorB;

      this.alphas[vIdx + 1] = curAlpha;

      // Create quad triangles connecting previous point to current point (ONLY if not disconnected)
      if (i > 0 && !pt.disconnected) {
        const vPrevLeft = (i - 1) * 2;
        const vPrevRight = (i - 1) * 2 + 1;
        const vCurrLeft = i * 2;
        const vCurrRight = i * 2 + 1;

        // Triangle 1: PrevLeft -> CurrLeft -> PrevRight
        this.indices[indexCount++] = vPrevLeft;
        this.indices[indexCount++] = vCurrLeft;
        this.indices[indexCount++] = vPrevRight;

        // Triangle 2: PrevRight -> CurrLeft -> CurrRight
        this.indices[indexCount++] = vPrevRight;
        this.indices[indexCount++] = vCurrLeft;
        this.indices[indexCount++] = vCurrRight;
      }
    }

    this.activeIndicesCount = indexCount;
    return true;
  }

  /**
   * Number of active index elements to draw in Three.js BufferGeometry.
   */
  public getActiveIndicesCount(): number {
    return this.activeIndicesCount;
  }

  /**
   * Current number of populated segments.
   */
  public getSegmentCount(): number {
    return this.count;
  }
}
