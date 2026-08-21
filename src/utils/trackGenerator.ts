import { CatmullRomCurve3, Vector3 } from 'three';
import type { TrackPoint } from '@/types/terrain';

export interface CircuitGeneratorOptions {
  /** Average radius of the track loop in world units (default: 200) */
  readonly radius?: number;
  /** Number of generated control points along the loop (default: 12) */
  readonly pointsCount?: number;
  /** Irregularity factor [0.0 - 0.6] for organic bends and straights (default: 0.25) */
  readonly irregularity?: number;
  /** Center X coordinate (default: 0) */
  readonly centerX?: number;
  /** Center Z coordinate (default: 0) */
  readonly centerZ?: number;
  /** Seed for deterministic shape variation (default: 1337) */
  readonly seed?: number;
}

export interface SprintGeneratorOptions {
  /** Total approximate length of the stage (default: 500) */
  readonly length?: number;
  /** Number of waypoints along the route (default: 10) */
  readonly waypointsCount?: number;
  /** Curvature / winding factor [0.0 - 1.0] (default: 0.35) */
  readonly curvature?: number;
  /** Start X coordinate (default: 0) */
  readonly startX?: number;
  /** Start Z coordinate (default: 0) */
  readonly startZ?: number;
  /** Heading angle in radians (default: 0) */
  readonly headingAngle?: number;
  /** Seed for deterministic variation */
  readonly seed?: number;
}

export interface TrackStats {
  /** Total path length in world units */
  readonly totalLength: number;
  /** Bounding box [minX, maxX, minZ, maxZ] */
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Geometric center of the track */
  readonly center: { x: number; z: number };
  /** Average spacing between control points */
  readonly averagePointSpacing: number;
}

/** Simple deterministic PRNG */
function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates an organic, non-self-intersecting closed circuit track loop.
 */
export function generateProceduralCircuit(options: CircuitGeneratorOptions = {}): TrackPoint[] {
  const radius = options.radius ?? 200;
  const count = Math.max(6, options.pointsCount ?? 12);
  const irregularity = Math.min(0.6, Math.max(0, options.irregularity ?? 0.25));
  const cx = options.centerX ?? 0;
  const cz = options.centerZ ?? 0;
  const rng = pseudoRandom(options.seed ?? 1337);

  const harmonics = [
    { freq: 2, amp: rng() * 0.4 + 0.1, phase: rng() * Math.PI * 2 },
    { freq: 3, amp: rng() * 0.3 + 0.1, phase: rng() * Math.PI * 2 },
    { freq: 5, amp: rng() * 0.2 + 0.05, phase: rng() * Math.PI * 2 },
  ];

  const points: TrackPoint[] = [];

  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    // Add subtle jitter to angle
    const angleJitter = (rng() - 0.5) * (Math.PI / count) * 0.5;
    const angle = baseAngle + angleJitter;

    let rOffset = 0;
    for (const h of harmonics) {
      rOffset += Math.sin(angle * h.freq + h.phase) * h.amp;
    }

    const currentRadius = radius * (1.0 + rOffset * irregularity);
    const x = cx + Math.cos(angle) * currentRadius;
    const z = cz + Math.sin(angle) * currentRadius;

    points.push({
      x: Math.round(x * 10) / 10,
      z: Math.round(z * 10) / 10,
    });
  }

  return points;
}

/**
 * Generates a figure-8 / lemniscate track layout.
 */
export function generateFigure8Track(
  width = 300,
  height = 180,
  pointsCount = 16,
  cx = 0,
  cz = 0,
): TrackPoint[] {
  const count = Math.max(8, pointsCount);
  const points: TrackPoint[] = [];

  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const scale = 2 / (3 - Math.cos(2 * t));
    const x = cx + scale * Math.cos(t) * (width / 2);
    const z = cz + scale * (Math.sin(2 * t) / 2) * height;

    points.push({
      x: Math.round(x * 10) / 10,
      z: Math.round(z * 10) / 10,
    });
  }

  return points;
}

/**
 * Generates an open point-to-point rally stage sprint track.
 */
export function generateSprintTrack(options: SprintGeneratorOptions = {}): TrackPoint[] {
  const length = options.length ?? 500;
  const count = Math.max(4, options.waypointsCount ?? 10);
  const curvature = options.curvature ?? 0.35;
  const startX = options.startX ?? 0;
  const startZ = options.startZ ?? 0;
  const initialHeading = options.headingAngle ?? 0;
  const rng = pseudoRandom(options.seed ?? 2026);

  const segmentLength = length / (count - 1);
  const points: TrackPoint[] = [{ x: startX, z: startZ }];

  let currentX = startX;
  let currentZ = startZ;
  let heading = initialHeading;

  for (let i = 1; i < count; i++) {
    const turn = (rng() - 0.5) * 2 * (Math.PI / 3) * curvature;
    heading += turn;

    currentX += Math.sin(heading) * segmentLength;
    currentZ += Math.cos(heading) * segmentLength;

    points.push({
      x: Math.round(currentX * 10) / 10,
      z: Math.round(currentZ * 10) / 10,
    });
  }

  return points;
}

/**
 * Samples evenly spaced 3D points along a track spline.
 */
export function sampleTrackSpline(
  points: readonly TrackPoint[],
  samplesCount = 200,
  closed = true,
): Vector3[] {
  if (points.length < 2) return [];

  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p.x, 0, p.z)),
    closed,
    'catmullrom',
    0.5,
  );

  return curve.getSpacedPoints(samplesCount);
}

/**
 * Computes geometric stats, bounding box, and total length for a track.
 */
export function calculateTrackStats(points: readonly TrackPoint[], closed = true): TrackStats {
  if (points.length === 0) {
    return {
      totalLength: 0,
      bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      center: { x: 0, z: 0 },
      averagePointSpacing: 0,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let sumX = 0;
  let sumZ = 0;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
    sumX += p.x;
    sumZ += p.z;
  }

  let totalLength = 0;
  const count = points.length;
  const loopLimit = closed ? count : count - 1;

  for (let i = 0; i < loopLimit; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % count];
    const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    totalLength += dist;
  }

  return {
    totalLength: Math.round(totalLength * 10) / 10,
    bounds: { minX, maxX, minZ, maxZ },
    center: {
      x: Math.round((sumX / count) * 10) / 10,
      z: Math.round((sumZ / count) * 10) / 10,
    },
    averagePointSpacing: count > 0 ? Math.round((totalLength / count) * 10) / 10 : 0,
  };
}
