import { describe, it, expect } from 'vitest';
import {
  generateProceduralCircuit,
  generateFigure8Track,
  generateSprintTrack,
  sampleTrackSpline,
  calculateTrackStats,
} from '@/utils/trackGenerator';

describe('TrackGenerator', () => {
  it('generates a procedural closed circuit with requested points count', () => {
    const points = generateProceduralCircuit({
      radius: 180,
      pointsCount: 14,
      seed: 42,
    });

    expect(points).toHaveLength(14);
    points.forEach((p) => {
      expect(typeof p.x).toBe('number');
      expect(typeof p.z).toBe('number');
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    });
  });

  it('generates a figure-8 track', () => {
    const points = generateFigure8Track(250, 150, 16);
    expect(points).toHaveLength(16);
  });

  it('generates a point-to-point sprint track', () => {
    const points = generateSprintTrack({
      length: 400,
      waypointsCount: 8,
      startX: 10,
      startZ: 20,
    });

    expect(points).toHaveLength(8);
    expect(points[0]).toEqual({ x: 10, z: 20 });
  });

  it('samples spline points smoothly', () => {
    const points = generateProceduralCircuit({ radius: 100, pointsCount: 8 });
    const samples = sampleTrackSpline(points, 50, true);

    expect(samples.length).toBeGreaterThan(40);
  });

  it('calculates track stats correctly', () => {
    const points = [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 100, z: 100 },
      { x: 0, z: 100 },
    ];

    const stats = calculateTrackStats(points, true);
    expect(stats.totalLength).toBe(400);
    expect(stats.bounds.minX).toBe(0);
    expect(stats.bounds.maxX).toBe(100);
    expect(stats.bounds.minZ).toBe(0);
    expect(stats.bounds.maxZ).toBe(100);
    expect(stats.center).toEqual({ x: 50, z: 50 });
  });
});
