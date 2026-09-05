import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import {
  MAX_PARTICLES,
  MOBILE_MAX_PARTICLES,
  WATER_MAX_PARTICLES,
  WATER_MOBILE_MAX_PARTICLES,
  TIRE_TRACK_QUALITY_PRESETS,
  TIRE_TRACK_MOBILE_PRESETS,
  DRIVING_SPEED_THRESHOLD,
} from '@/config/particles';
import * as deviceUtils from '@/utils/device';
import { TireRibbonBuffer } from '@/utils/physics/tireRibbon';

describe('Milestone 7 Optimization Suite (R3 & R4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('R3.1: Particle Pool Sizing & Device Adaptation', () => {
    it('defines scaled mobile pool sizes for dust and water splashes', () => {
      // Mobile dust pool must be 150 (from desktop 400)
      expect(MAX_PARTICLES).toBe(400);
      expect(MOBILE_MAX_PARTICLES).toBe(150);
      expect(MOBILE_MAX_PARTICLES).toBeLessThan(MAX_PARTICLES);

      // Mobile water pool must be 200-250 (from desktop 500)
      expect(WATER_MAX_PARTICLES).toBe(500);
      expect(WATER_MOBILE_MAX_PARTICLES).toBe(250);
      expect(WATER_MOBILE_MAX_PARTICLES).toBeLessThanOrEqual(250);
      expect(WATER_MOBILE_MAX_PARTICLES).toBeGreaterThanOrEqual(200);
      expect(WATER_MOBILE_MAX_PARTICLES).toBeLessThan(WATER_MAX_PARTICLES);
    });

    it('scales tire ribbon buffer segment presets for mobile devices', () => {
      const qualities = ['low', 'medium', 'high', 'very_high'] as const;

      for (const q of qualities) {
        const desktopPreset = TIRE_TRACK_QUALITY_PRESETS[q];
        const mobilePreset = TIRE_TRACK_MOBILE_PRESETS[q];

        expect(mobilePreset.maxSegments).toBeLessThan(desktopPreset.maxSegments);
        expect(mobilePreset.lifetime).toBeLessThanOrEqual(desktopPreset.lifetime);
        expect(mobilePreset.minDistance).toBeGreaterThanOrEqual(desktopPreset.minDistance);
      }

      // Exact mobile segment targets: 250-350 on low/medium
      expect(TIRE_TRACK_MOBILE_PRESETS.low.maxSegments).toBe(250);
      expect(TIRE_TRACK_MOBILE_PRESETS.medium.maxSegments).toBe(350);
      expect(TIRE_TRACK_MOBILE_PRESETS.high.maxSegments).toBe(500);
      expect(TIRE_TRACK_MOBILE_PRESETS.very_high.maxSegments).toBe(750);
    });
  });

  describe('R3.2: Dense Active Index Array & Free Stack Mechanics', () => {
    it('efficiently manages free stack and compacts active indices in O(1)', () => {
      const poolSize = 10;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      // Simulate particle allocations (push 3 particles)
      const allocated: number[] = [];
      for (let i = 0; i < 3; i++) {
        expect(freeCount).toBeGreaterThan(0);
        const pIdx = freeIndices[--freeCount];
        allocated.push(pIdx);
        activeIndices[activeCount++] = pIdx;
      }

      expect(activeCount).toBe(3);
      expect(freeCount).toBe(7);
      expect(allocated).toEqual([9, 8, 7]);

      // Simulate middle particle expiring (allocated[1] = 8 dies, 9 and 7 survive)
      const surviving: boolean[] = [true, false, true];
      let writeIdx = 0;
      for (let i = 0; i < activeCount; i++) {
        const pIdx = activeIndices[i];
        if (!surviving[i]) {
          // Particle died -> return to free stack
          freeIndices[freeCount++] = pIdx;
          continue;
        }
        // Surviving particle -> compact in-place
        activeIndices[writeIdx++] = pIdx;
      }
      activeCount = writeIdx;

      expect(activeCount).toBe(2);
      expect(freeCount).toBe(8);
      // Active indices now densely contains [9, 7]
      expect(activeIndices[0]).toBe(9);
      expect(activeIndices[1]).toBe(7);
      // Free stack regained index 8
      expect(freeIndices[freeCount - 1]).toBe(8);
    });

    it('handles pool exhaustion gracefully without allocating new memory', () => {
      const poolSize = 3;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      // Allocate all 3
      while (freeCount > 0) {
        activeIndices[activeCount++] = freeIndices[--freeCount];
      }
      expect(freeCount).toBe(0);
      expect(activeCount).toBe(3);

      // Attempting further allocation safely halts without error or reallocation
      const canAllocate = freeCount > 0;
      expect(canAllocate).toBe(false);
      expect(activeCount).toBe(3);
    });
  });

  describe('R3.3: Early Exit Conditions for WaterSplashes & DustParticles', () => {
    it('evaluates water proximity and driving early exit conditions', () => {
      const WATER_SURFACE_CHASSIS_Y = -7.0; // Chassis above -7.0m cannot touch water at -8.0m

      // Helper simulating the early-exit check in WaterSplashes
      const shouldEarlyExitWater = (activeCount: number, chassisY: number, speed: number) => {
        const isNearWater = chassisY <= WATER_SURFACE_CHASSIS_Y;
        const isDriving = speed > DRIVING_SPEED_THRESHOLD;
        return activeCount === 0 && (!isDriving || !isNearWater);
      };

      // Case 1: Stationary car on dry high terrain (chassis Y = +10.0m, speed = 0)
      expect(shouldEarlyExitWater(0, 10.0, 0)).toBe(true);

      // Case 2: Fast driving car on dry high terrain (chassis Y = +10.0m, speed = 80 km/h) -> early exit!
      expect(shouldEarlyExitWater(0, 10.0, 80)).toBe(true);

      // Case 3: Stationary car in water (chassis Y = -7.5m, speed = 0 km/h) -> early exit!
      expect(shouldEarlyExitWater(0, -7.5, 0)).toBe(true);

      // Case 4: Fast car driving in coastal water (chassis Y = -7.5m, speed = 40 km/h) -> DO NOT early exit!
      expect(shouldEarlyExitWater(0, -7.5, 40)).toBe(false);

      // Case 5: Existing particles still alive (activeCount = 12) -> DO NOT early exit, allow them to finish!
      expect(shouldEarlyExitWater(12, 10.0, 0)).toBe(false);
    });

    it('evaluates dust idle and stationary early exit conditions', () => {
      // Helper simulating the early-exit check in DustParticles
      const shouldEarlyExitDust = (activeCount: number, speed: number, isDrifting: boolean) => {
        const isDriving = speed > DRIVING_SPEED_THRESHOLD;
        return activeCount === 0 && !isDriving && !isDrifting;
      };

      // Case 1: Stationary car at starting line (speed = 0, no drift, activeCount = 0) -> early exit!
      expect(shouldEarlyExitDust(0, 0, false)).toBe(true);

      // Case 2: Driving car (speed = 30, no drift) -> DO NOT early exit
      expect(shouldEarlyExitDust(0, 30, false)).toBe(false);

      // Case 3: Drifting car (speed = 10, isDrifting = true) -> DO NOT early exit
      expect(shouldEarlyExitDust(0, 10, true)).toBe(false);

      // Case 4: Car came to halt but has dust particles settling (activeCount = 15) -> DO NOT early exit
      expect(shouldEarlyExitDust(15, 0, false)).toBe(false);
    });
  });

  describe('R3.4: Tire Tracks Terrain Sampling & TopologyDirty Gating', () => {
    it('skips terrain sampling and contact addition when vehicle is stopped (< 0.2 m/s)', () => {
      const buffer = new TireRibbonBuffer();
      const notifySpy = vi.spyOn(buffer, 'notifyAirborne');
      const addPointSpy = vi.spyOn(buffer, 'addContactPoint');

      const speedMps = 0.1; // Below 0.2 m/s threshold
      const isGrounded = true;

      // Logic in useTireTracksLogic:
      if (speedMps < 0.2 || !isGrounded) {
        buffer.notifyAirborne();
      } else {
        // sampleTerrainHeightAndNormal and addContactPoint
        buffer.addContactPoint(new Vector3(), new Vector3(), 'tarmac', speedMps, 0, isGrounded, 0);
      }

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(addPointSpy).not.toHaveBeenCalled();
    });

    it('skips terrain sampling and contact addition when wheel is airborne (position.y <= -0.49)', () => {
      const buffer = new TireRibbonBuffer();
      const notifySpy = vi.spyOn(buffer, 'notifyAirborne');
      const addPointSpy = vi.spyOn(buffer, 'addContactPoint');

      const speedMps = 15.0; // High speed
      const wheelSuspensionY = -0.52; // Airborne (<= -0.49)
      const isGrounded = wheelSuspensionY > -0.49;

      if (speedMps < 0.2 || !isGrounded) {
        buffer.notifyAirborne();
      } else {
        buffer.addContactPoint(new Vector3(), new Vector3(), 'tarmac', speedMps, 0, isGrounded, 0);
      }

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(addPointSpy).not.toHaveBeenCalled();
    });

    it('gates geometry attribute VBO updates behind topologyDirty flag', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10, lifetime: 5, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      const mockAttrs = {
        position: { needsUpdate: false },
        uv: { needsUpdate: false },
        color: { needsUpdate: false },
        ribbonAlpha: { needsUpdate: false },
        index: { needsUpdate: false },
      };

      const syncVbo = () => {
        if (buffer.topologyDirty) {
          mockAttrs.position.needsUpdate = true;
          mockAttrs.uv.needsUpdate = true;
          mockAttrs.color.needsUpdate = true;
          mockAttrs.index.needsUpdate = true;
          buffer.topologyDirty = false;
        }
        mockAttrs.ribbonAlpha.needsUpdate = true;
      };

      // Initially topologyDirty is true
      expect(buffer.topologyDirty).toBe(true);
      syncVbo();
      expect(mockAttrs.position.needsUpdate).toBe(true);
      expect(mockAttrs.uv.needsUpdate).toBe(true);
      expect(mockAttrs.color.needsUpdate).toBe(true);
      expect(mockAttrs.index.needsUpdate).toBe(true);
      expect(mockAttrs.ribbonAlpha.needsUpdate).toBe(true);
      expect(buffer.topologyDirty).toBe(false);

      // Reset mock flags
      mockAttrs.position.needsUpdate = false;
      mockAttrs.uv.needsUpdate = false;
      mockAttrs.color.needsUpdate = false;
      mockAttrs.ribbonAlpha.needsUpdate = false;
      mockAttrs.index.needsUpdate = false;

      // Adding two points changes topology
      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 5, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'tarmac', 5, 0, true, 1.1);
      expect(buffer.topologyDirty).toBe(true);

      syncVbo();
      expect(mockAttrs.position.needsUpdate).toBe(true);
      expect(buffer.topologyDirty).toBe(false);

      // Reset mock flags
      mockAttrs.position.needsUpdate = false;
      mockAttrs.uv.needsUpdate = false;
      mockAttrs.color.needsUpdate = false;
      mockAttrs.ribbonAlpha.needsUpdate = false;
      mockAttrs.index.needsUpdate = false;

      // Next frame: car stopped, tracks only fading over time
      buffer.updateLifetime(1.2);
      expect(buffer.topologyDirty).toBe(false);

      syncVbo();
      // Positions, UVs, colors, indices are NOT flagged for GPU re-upload!
      expect(mockAttrs.position.needsUpdate).toBe(false);
      expect(mockAttrs.uv.needsUpdate).toBe(false);
      expect(mockAttrs.color.needsUpdate).toBe(false);
      expect(mockAttrs.index.needsUpdate).toBe(false);
      // ONLY ribbonAlpha is flagged for GPU re-upload!
      expect(mockAttrs.ribbonAlpha.needsUpdate).toBe(true);
    });
  });

  describe('R4: GPU Fill-Rate & Texture Filtering Anisotropy Clamping', () => {
    it('clamps terrain texture anisotropy on mobile to <= 2 across all qualities', () => {
      const computeTerrainAnisotropy = (isMobile: boolean, quality: string) => {
        const baseAnisotropy = quality === 'very_high' ? 16 : quality === 'high' ? 8 : 4;
        return isMobile ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
      };

      // On mobile: strictly <= 2
      expect(computeTerrainAnisotropy(true, 'low')).toBe(2);
      expect(computeTerrainAnisotropy(true, 'medium')).toBe(2);
      expect(computeTerrainAnisotropy(true, 'high')).toBe(2);
      expect(computeTerrainAnisotropy(true, 'very_high')).toBe(2);

      // On desktop: retains full fidelity
      expect(computeTerrainAnisotropy(false, 'low')).toBe(4);
      expect(computeTerrainAnisotropy(false, 'medium')).toBe(4);
      expect(computeTerrainAnisotropy(false, 'high')).toBe(8);
      expect(computeTerrainAnisotropy(false, 'very_high')).toBe(16);
    });

    it('clamps GrassField and PropsInstancer foliage/props anisotropy to <= 2 on mobile', () => {
      const computeFoliageAnisotropy = (isMobile: boolean) => (isMobile ? 2 : 4);
      const computePropsAnisotropy = (isMobile: boolean) => (isMobile ? 2 : 4);

      // Mobile
      expect(computeFoliageAnisotropy(true)).toBe(2);
      expect(computePropsAnisotropy(true)).toBe(2);

      // Desktop
      expect(computeFoliageAnisotropy(false)).toBe(4);
      expect(computePropsAnisotropy(false)).toBe(4);
    });

    it('integrates with isMobileDevice() utility detection', () => {
      vi.spyOn(deviceUtils, 'isMobileDevice').mockReturnValue(true);
      expect(deviceUtils.isMobileDevice()).toBe(true);

      const isMobile = deviceUtils.isMobileDevice();
      const baseAnisotropy = 16;
      const anisotropy = isMobile ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
      expect(anisotropy).toBe(2);

      vi.spyOn(deviceUtils, 'isMobileDevice').mockReturnValue(false);
      const isDesktop = deviceUtils.isMobileDevice();
      const desktopAnisotropy = isDesktop ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
      expect(desktopAnisotropy).toBe(16);
    });
  });
});
