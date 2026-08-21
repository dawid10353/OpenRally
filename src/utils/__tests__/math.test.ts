import { describe, it, expect } from 'vitest';
import { lerp, clamp, mapRange, smoothDamp, toDegrees, toRadians } from '../math';

describe('math utilities', () => {
  describe('lerp', () => {
    it('interpolates correctly at t=0, t=0.5, t=1', () => {
      expect(lerp(10, 20, 0)).toBe(10);
      expect(lerp(10, 20, 0.5)).toBe(15);
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('handles negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-20, -10, 0.5)).toBe(-15);
    });
  });

  describe('clamp', () => {
    it('clamps values below min and above max', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('handles equal min and max', () => {
      expect(clamp(10, 5, 5)).toBe(5);
    });
  });

  describe('mapRange', () => {
    it('maps values proportionally from one range to another', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });

    it('clamps mapped value when input is out of source range', () => {
      expect(mapRange(-5, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(15, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe('smoothDamp', () => {
    it('progresses smoothly towards the target value', () => {
      let current = 0;
      let velocity = 0;
      const target = 100;
      const smoothTime = 0.2;
      const dt = 0.016;

      for (let i = 0; i < 30; i++) {
        [current, velocity] = smoothDamp(current, target, velocity, smoothTime, dt);
      }

      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThanOrEqual(target);
    });

    it('handles zero smoothTime gracefully without NaN or infinite loops', () => {
      const [val, vel] = smoothDamp(0, 10, 0, 0, 0.016);
      expect(Number.isFinite(val)).toBe(true);
      expect(Number.isFinite(vel)).toBe(true);
    });
  });

  describe('toDegrees and toRadians', () => {
    it('converts radians to degrees accurately', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI)).toBeCloseTo(180, 5);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 5);
      expect(toDegrees(2 * Math.PI)).toBeCloseTo(360, 5);
    });

    it('converts degrees to radians accurately', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI, 5);
    });
  });
});
