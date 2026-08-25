import { describe, it, expect } from 'vitest';
import { Vector3, Color } from 'three';
import {
  computeRibbonEdges,
  sampleTerrainHeightAndNormal,
  TireRibbonBuffer,
  SURFACE_TRACK_PROFILES,
} from '@/utils/physics/tireRibbon';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';

describe('Tire Ribbon System', () => {
  describe('computeRibbonEdges', () => {
    it('computes symmetric left and right vertices perpendicular to forward direction', () => {
      const contact = new Vector3(10, 0, 20);
      const forward = new Vector3(0, 0, 1); // Moving along +Z
      const normal = new Vector3(0, 1, 0);  // Flat up
      const halfWidth = 0.2;
      const left = new Vector3();
      const right = new Vector3();

      computeRibbonEdges(contact, forward, normal, halfWidth, left, right);

      expect(left.distanceTo(right)).toBeCloseTo(0.4, 4);
      expect(left.y).toBeCloseTo(0, 4);
      expect(right.y).toBeCloseTo(0, 4);
      expect(left.z).toBeCloseTo(20, 4);
      expect(right.z).toBeCloseTo(20, 4);
    });

    it('safely handles zero-length direction vectors without NaN', () => {
      const contact = new Vector3(5, 1, 5);
      const forward = new Vector3(0, 0, 0);
      const normal = new Vector3(0, 1, 0);
      const left = new Vector3();
      const right = new Vector3();

      computeRibbonEdges(contact, forward, normal, 0.15, left, right);

      expect(Number.isNaN(left.x)).toBe(false);
      expect(Number.isNaN(right.x)).toBe(false);
      expect(left.distanceTo(right)).toBeCloseTo(0.3, 4);
    });
  });

  describe('sampleTerrainHeightAndNormal', () => {
    it('falls back gracefully when heightmap data is missing', () => {
      const outPos = new Vector3();
      const outNormal = new Vector3();

      sampleTerrainHeightAndNormal(15, 25, undefined, undefined, outPos, outNormal, 0.025);

      expect(outPos.x).toBeCloseTo(15, 4);
      expect(outPos.y).toBeCloseTo(0.025, 4);
      expect(outPos.z).toBeCloseTo(25, 4);
      expect(outNormal.y).toBeCloseTo(1.0, 4);
    });

    it('samples height and normal with heightmap data', () => {
      const mockHeightmap: HeightmapData = {
        heights: new Float32Array(9).fill(5.0), // 3x3 flat terrain at elevation 5.0
        trackMasks: new Float32Array(9).fill(0),
        cols: 3,
        rows: 3,
        minHeight: 5.0,
        maxHeight: 5.0,
      };

      const mockLevelData: LevelData = {
        id: 'test_level',
        name: 'Test Level',
        heightModifiers: [],
        props: [],
        terrainBase: {
          width: 100,
          depth: 100,
          subdivisions: 2,
          amplitude: 10,
          frequency: 0.01,
          octaves: 1,
          lacunarity: 2,
          persistence: 0.5,
          seed: 12345,
        },
        track: {
          points: [{ x: 0, z: 0 }],
          width: 10,
          falloff: 5,
          targetHeight: 5,
        },
      };

      const outPos = new Vector3();
      const outNormal = new Vector3();

      sampleTerrainHeightAndNormal(0, 0, mockHeightmap, mockLevelData, outPos, outNormal, 0.025);

      expect(outPos.y).toBeCloseTo(5.025, 2);
      expect(outNormal.y).toBeCloseTo(1.0, 2);
    });
  });

  describe('TireRibbonBuffer', () => {
    it('initializes with zero segments and empty draw range', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10 });
      expect(buffer.getSegmentCount()).toBe(0);
      expect(buffer.getActiveIndicesCount()).toBe(0);
      expect(buffer.positions.length).toBe(10 * 2 * 3);
      expect(buffer.indices.length).toBe(9 * 6);
    });

    it('pushes segments and updates active indices correctly', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 5, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      // First point sets initial anchor (returns false, count = 0)
      const p1 = new Vector3(0, 0, 0);
      const added1 = buffer.addContactPoint(p1, normal, 'mud', 5, 0, true, 1.0);
      expect(added1).toBe(false);
      expect(buffer.getSegmentCount()).toBe(0);

      // Second point travels 1 meter -> emits 1 segment
      const p2 = new Vector3(0, 0, 1.0);
      const added2 = buffer.addContactPoint(p2, normal, 'mud', 5, 0, true, 1.1);
      expect(added2).toBe(true);
      expect(buffer.getSegmentCount()).toBe(1);

      // Third point travels another 1 meter -> emits 2nd segment
      const p3 = new Vector3(0, 0, 2.0);
      const added3 = buffer.addContactPoint(p3, normal, 'mud', 5, 0, true, 1.2);
      expect(added3).toBe(true);
      expect(buffer.getSegmentCount()).toBe(2);

      buffer.updateLifetime(1.2);
      expect(buffer.getActiveIndicesCount()).toBe(6);
    });

    it('scales slip opacity on tarmac for subtle rolling and dark skid marks', () => {
      const buffer = new TireRibbonBuffer({ minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 10, 0.0, true, 1.0);

      // Low slip on tarmac -> subtle rolling mark emitted with baseOpacity (0.35)
      const addedLowSlip = buffer.addContactPoint(new Vector3(0, 0, 1.0), normal, 'tarmac', 10, 0.2, true, 1.1);
      expect(addedLowSlip).toBe(true);
      expect(buffer.getSegmentCount()).toBe(1);

      buffer.updateLifetime(1.1);
      expect(buffer.alphas[0]).toBeCloseTo(0.35, 1);

      // High slip on tarmac (slip 3.0 > threshold 0.6) -> intense skidmark emitted with high opacity
      buffer.addContactPoint(new Vector3(0, 0, 2.0), normal, 'tarmac', 10, 3.0, true, 1.2);
      expect(buffer.getSegmentCount()).toBe(2);

      buffer.updateLifetime(1.2);
      expect(buffer.alphas[2]).toBeGreaterThan(0.7);
    });

    it('fades out segments over their lifetime and prunes expired points', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10, lifetime: 2.0, minDistance: 0.1 });
      const color = new Color('#382618');

      buffer.pushPoint(
        new Vector3(0, 0, 0),
        new Vector3(0.3, 0, 0),
        0,
        color,
        1.0,
        0.0,
        false,
      );

      buffer.updateLifetime(0.0);
      expect(buffer.alphas[0]).toBe(1.0);

      // Halfway through lifetime (1.0s)
      buffer.updateLifetime(1.0);
      expect(buffer.alphas[0]).toBeGreaterThan(0.7);
      expect(buffer.alphas[0]).toBeLessThan(0.8); // 1.0 - (0.5)^2 = 0.75

      // Expired (> 2.0s) -> pruned from buffer
      buffer.updateLifetime(2.5);
      expect(buffer.getSegmentCount()).toBe(0);
      expect(buffer.getActiveIndicesCount()).toBe(0);
    });

    it('handles airborne jumps and decouples disconnected segments without ghost lines', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'mud', 10, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'mud', 10, 0, true, 1.1);
      expect(buffer.getSegmentCount()).toBe(1);

      // Car takes off into the air
      const addedAir = buffer.addContactPoint(new Vector3(0, 5, 2), normal, 'mud', 10, 0, false, 1.2);
      expect(addedAir).toBe(false);

      // Car lands on ground (distance 1.0m from air point)
      buffer.addContactPoint(new Vector3(0, 0, 2), normal, 'mud', 10, 0, true, 1.3);
      buffer.addContactPoint(new Vector3(0, 0, 3), normal, 'mud', 10, 0, true, 1.4);
      expect(buffer.getSegmentCount()).toBe(3);

      buffer.updateLifetime(1.4);
      // Only 1 quad (6 indices) between pt 2 and pt 3 (pt 2 was disconnected from pt 1, so no bridge)
      expect(buffer.getActiveIndicesCount()).toBe(6);

      // Continuing to drive on ground -> connects to pt 3
      buffer.addContactPoint(new Vector3(0, 0, 4), normal, 'mud', 10, 0, true, 1.5);
      expect(buffer.getSegmentCount()).toBe(4);

      buffer.updateLifetime(1.5);
      // Now 2 quads (12 indices)
      expect(buffer.getActiveIndicesCount()).toBe(12);
    });

    it('wraps around circular buffer cleanly when exceeding maxSegments', () => {
      const maxSegs = 4;
      const buffer = new TireRibbonBuffer({ maxSegments: maxSegs, minDistance: 0.05 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'mud', 5, 0, true, 1.0);

      for (let i = 1; i <= 10; i++) {
        buffer.addContactPoint(new Vector3(0, 0, i * 0.2), normal, 'mud', 5, 0, true, 1.0 + i * 0.1);
      }

      // Segment count caps at maxSegments
      expect(buffer.getSegmentCount()).toBe(maxSegs);
      buffer.updateLifetime(2.0);
      expect(buffer.getActiveIndicesCount()).toBe((maxSegs - 1) * 6);
    });

    it('resets buffer completely', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 5, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'mud', 5, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'mud', 5, 0, true, 1.1);
      expect(buffer.getSegmentCount()).toBe(1);

      buffer.reset();
      expect(buffer.getSegmentCount()).toBe(0);
      expect(buffer.getActiveIndicesCount()).toBe(0);
    });
  });

  describe('Surface Track Profiles', () => {
    it('has valid configuration for all standard surfaces', () => {
      const surfaces = ['tarmac', 'mud', 'sand', 'grass', 'gravel', 'snow'] as const;
      for (const s of surfaces) {
        const prof = SURFACE_TRACK_PROFILES[s];
        expect(prof).toBeDefined();
        expect(prof.baseOpacity).toBeGreaterThan(0);
        expect(prof.colorHex.startsWith('#')).toBe(true);
      }
    });
  });
});
