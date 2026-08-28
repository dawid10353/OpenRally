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

  it('validates atmospheric scattering parameters in level environments', () => {
    const levels = getAvailableLevels();
    for (const level of levels) {
      if (level.environment?.sky) {
        const { turbidity, rayleigh, mieCoefficient, mieDirectionalG } = level.environment.sky;
        if (turbidity !== undefined) expect(turbidity).toBeGreaterThan(0);
        if (rayleigh !== undefined) expect(rayleigh).toBeGreaterThan(0);
        if (mieCoefficient !== undefined) expect(mieCoefficient).toBeGreaterThan(0);
        if (mieDirectionalG !== undefined) expect(mieDirectionalG).toBeGreaterThan(0);
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
