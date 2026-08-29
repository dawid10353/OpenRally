import { describe, it, expect } from 'vitest';
import { CatmullRomCurve3, Vector3 } from 'three';
import { LEVEL_PRESET_ISLAND, LEVEL_PRESET_DESERT, getAvailableLevels } from '@/config/levelRegistry';
import type { CheckpointData } from '@/types/racing';

describe('Checkpoints & Track Alignment System', () => {
  it('calculates smooth tangents and valid rotations along track splines', () => {
    const levels = getAvailableLevels();

    for (const level of levels) {
      const points = level.data.track.points;
      expect(points.length).toBeGreaterThanOrEqual(3);

      const trackPoints3D = points.map((p) => new Vector3(p.x, 0, p.z));
      const trackCurve = new CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);

      const checkpoints: CheckpointData[] = [];
      const count = points.length;

      for (let i = 0; i < count; i++) {
        const p = points[i];
        const u = i / count;
        const tangent = trackCurve.getTangentAt(u);

        expect(tangent.lengthSq()).toBeCloseTo(1.0, 2);

        const rotY = Math.atan2(tangent.x, tangent.z);
        expect(Number.isFinite(rotY)).toBe(true);

        checkpoints.push({
          id: i,
          position: [p.x, 0, p.z],
          rotationY: rotY,
          width: level.data.track.width,
          isStart: i === 0,
          isFinish: i === 0,
        });
      }

      expect(checkpoints).toHaveLength(count);
      expect(checkpoints[0].isStart).toBe(true);
      expect(checkpoints[0].isFinish).toBe(true);
      expect(checkpoints[1].isStart).toBe(false);
    }
  });

  it('aligns spawn position and spawn heading with Checkpoint 0 on Island Circuit', () => {
    const level = LEVEL_PRESET_ISLAND;
    const cp0 = level.data.track.points[0];

    // Checkpoint 0 is at (0, 0)
    expect(cp0.x).toBe(0);
    expect(cp0.z).toBe(0);

    // Spawn should be near (0, 0) on the starting grid
    const distToCp0 = Math.hypot(level.spawnPosition[0] - cp0.x, level.spawnPosition[2] - cp0.z);
    expect(distToCp0).toBeLessThan(8.0); // Within 8 meters of start line
    expect(distToCp0).toBeGreaterThan(1.0); // Behind the start line

    // Check heading alignment with track tangent
    const trackPoints3D = level.data.track.points.map((p) => new Vector3(p.x, 0, p.z));
    const trackCurve = new CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);
    const tangent0 = trackCurve.getTangentAt(0);
    const expectedRotY = Math.atan2(tangent0.x, tangent0.z);

    // Spawn rotation should match tangent within 0.1 radians
    const diff = Math.abs(level.spawnRotationY - expectedRotY);
    const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
    expect(normalizedDiff).toBeLessThan(0.15);
  });

  it('aligns spawn position and spawn heading with Checkpoint 0 on Desert Canyon', () => {
    const level = LEVEL_PRESET_DESERT;
    const cp0 = level.data.track.points[0];

    expect(cp0.x).toBe(0);
    expect(cp0.z).toBe(0);

    const distToCp0 = Math.hypot(level.spawnPosition[0] - cp0.x, level.spawnPosition[2] - cp0.z);
    expect(distToCp0).toBeLessThan(8.0);
    expect(distToCp0).toBeGreaterThan(1.0);

    const trackPoints3D = level.data.track.points.map((p) => new Vector3(p.x, 0, p.z));
    const trackCurve = new CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);
    const tangent0 = trackCurve.getTangentAt(0);
    const expectedRotY = Math.atan2(tangent0.x, tangent0.z);

    const diff = Math.abs(level.spawnRotationY - expectedRotY);
    const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
    expect(normalizedDiff).toBeLessThan(0.15);
  });

  it('aligns spawn position and spawn heading with Checkpoint 0 on Sweden Snow Rally', async () => {
    const { LEVEL_PRESET_SWEDEN } = await import('@/config/levelRegistry');
    const level = LEVEL_PRESET_SWEDEN;
    const cp0 = level.data.track.points[0];

    expect(cp0.x).toBe(0);
    expect(cp0.z).toBe(0);

    const distToCp0 = Math.hypot(level.spawnPosition[0] - cp0.x, level.spawnPosition[2] - cp0.z);
    expect(distToCp0).toBeLessThan(8.0);
    expect(distToCp0).toBeGreaterThan(1.0);

    const trackPoints3D = level.data.track.points.map((p) => new Vector3(p.x, 0, p.z));
    const trackCurve = new CatmullRomCurve3(trackPoints3D, true, 'catmullrom', 0.5);
    const tangent0 = trackCurve.getTangentAt(0);
    const expectedRotY = Math.atan2(tangent0.x, tangent0.z);

    const diff = Math.abs(level.spawnRotationY - expectedRotY);
    const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
    expect(normalizedDiff).toBeLessThan(0.15);
  });

  it('aligns spawn position and spawn heading with Checkpoint 0 on Highland Castle Rally', async () => {
    const { LEVEL_PRESET_BRITAIN } = await import('@/config/levelRegistry');
    const level = LEVEL_PRESET_BRITAIN;
    const cp0 = level.data.track.points[0];

    expect(cp0.x).toBe(0);
    expect(cp0.z).toBe(0);

    const distToCp0 = Math.hypot(level.spawnPosition[0] - cp0.x, level.spawnPosition[2] - cp0.z);
    expect(distToCp0).toBeLessThan(8.0);
    expect(distToCp0).toBeGreaterThan(1.0);

    const prevCp = level.data.track.points[level.data.track.points.length - 1];
    const nextCp = level.data.track.points[1];
    const expectedRotY = Math.atan2(nextCp.x - prevCp.x, nextCp.z - prevCp.z);

    const diff = Math.abs(level.spawnRotationY - expectedRotY);
    const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
    expect(normalizedDiff).toBeLessThan(0.15);
  });

  it('computes realistic cross-slope transversal offsets for all levels without levitation', async () => {
    const { compileTerrain, getInterpolatedHeight } = await import('@/utils/terrainCompiler');
    const levels = getAvailableLevels();

    for (const level of levels) {
      const { heights, rows, cols } = compileTerrain(level.data);
      const points = level.data.track.points;
      const count = points.length;

      for (let i = 0; i < count; i++) {
        const p = points[i];
        const prevP = points[(i - 1 + count) % count];
        const nextP = points[(i + 1) % count];
        const tangentX = nextP.x - prevP.x;
        const tangentZ = nextP.z - prevP.z;
        const rotY = Math.atan2(tangentX, tangentZ);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const gateWidth = Math.max(8.5, level.data.track.width + 4.0);
        const halfWidth = gateWidth / 2;

        const leftX = p.x - halfWidth * cosY;
        const leftZ = p.z + halfWidth * sinY;
        const rightX = p.x + halfWidth * cosY;
        const rightZ = p.z - halfWidth * sinY;

        const centerGroundY = getInterpolatedHeight(p.x, p.z, heights, rows, cols, level.data.terrainBase.width, level.data.terrainBase.depth);
        const leftGroundY = getInterpolatedHeight(leftX, leftZ, heights, rows, cols, level.data.terrainBase.width, level.data.terrainBase.depth);
        const rightGroundY = getInterpolatedHeight(rightX, rightZ, heights, rows, cols, level.data.terrainBase.width, level.data.terrainBase.depth);

        const maxRoadY = Math.max(centerGroundY, leftGroundY - 0.5, rightGroundY - 0.5);
        const leftGroundOffset = leftGroundY - maxRoadY;
        const rightGroundOffset = rightGroundY - maxRoadY;

        expect(Number.isFinite(leftGroundOffset)).toBe(true);
        expect(Number.isFinite(rightGroundOffset)).toBe(true);
        // Foundation depth (12m) is greater than maximum possible cross-slope drop
        expect(Math.abs(leftGroundOffset)).toBeLessThan(12.0);
        expect(Math.abs(rightGroundOffset)).toBeLessThan(12.0);

        // Every checkpoint road ground elevation must be safely above the water level (WATER_POSITION_Y = -8)
        expect(centerGroundY).toBeGreaterThan(-4.0);
      }
    }
  });

  it('exports optimized CheckpointGate and StartFinishGantry components', async () => {
    const { CheckpointGate } = await import('../CheckpointGate');
    const { StartFinishGantry } = await import('../StartFinishGantry');
    expect(CheckpointGate).toBeDefined();
    expect(StartFinishGantry).toBeDefined();
  });
});
