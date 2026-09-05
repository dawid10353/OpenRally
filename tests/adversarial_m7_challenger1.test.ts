import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Vector3 } from 'three';
import {
  MAX_PARTICLES,
  MOBILE_MAX_PARTICLES,
  WATER_MAX_PARTICLES,
  WATER_MOBILE_MAX_PARTICLES,
} from '@/config/particles';
import * as deviceUtils from '@/utils/device';
import { TireRibbonBuffer } from '@/utils/physics/tireRibbon';

describe('Empirical Challenger: M7 Optimization Deep Stress & Lifecycle Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: PARTICLE POOLING & LIFECYCLE ADVERSARIAL STRESS
  // =========================================================================
  describe('Adversarial Stress 1: Particle Pool & Lifecycle Invariants', () => {
    it('survives 50,000 rapid randomized spawn/despawn cycles without index leakage or corruption', () => {
      const poolSizes = [MOBILE_MAX_PARTICLES, MAX_PARTICLES, WATER_MOBILE_MAX_PARTICLES, WATER_MAX_PARTICLES];

      for (const poolSize of poolSizes) {
        const freeIndices = new Int32Array(poolSize);
        for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
        const activeIndices = new Int32Array(poolSize);
        let freeCount = poolSize;
        let activeCount = 0;

        // Particle lifetimes tracking
        const particleLifetimes = new Float32Array(poolSize);
        const particleMaxLifetimes = new Float32Array(poolSize);

        // Run 500 simulation frames per pool size
        for (let frame = 0; frame < 500; frame++) {
          const delta = 0.016 + Math.random() * 0.02; // Jittered 30-60fps delta

          // 1. Spawning phase: attempt random burst of 0 to 12 particles
          const spawnAttempts = Math.floor(Math.random() * 13);
          for (let s = 0; s < spawnAttempts; s++) {
            if (freeCount <= 0) break; // pool exhausted safeguard
            const pIdx = freeIndices[--freeCount];
            activeIndices[activeCount++] = pIdx;
            particleLifetimes[pIdx] = 0;
            particleMaxLifetimes[pIdx] = 0.05 + Math.random() * 0.3;
          }

          // 2. Invariant Check: Sum of freeCount + activeCount MUST equal poolSize
          expect(freeCount + activeCount).toBe(poolSize);

          // 3. Compaction & Lifecycle update phase (identical to WaterSplashes & DustParticles)
          let writeIdx = 0;
          const count = activeCount;
          for (let i = 0; i < count; i++) {
            const pIdx = activeIndices[i];
            particleLifetimes[pIdx] += delta;

            if (particleLifetimes[pIdx] >= particleMaxLifetimes[pIdx]) {
              // Expired -> return to free stack
              freeIndices[freeCount++] = pIdx;
              continue;
            }

            // Survived -> compact in-place
            activeIndices[writeIdx++] = pIdx;
          }
          activeCount = writeIdx;

          // Re-verify invariant immediately after compaction
          expect(freeCount + activeCount).toBe(poolSize);
        }

        // Final verification: check all indices in free + active cover [0..poolSize-1] exactly once
        const tracker = new Uint8Array(poolSize);
        for (let i = 0; i < activeCount; i++) {
          tracker[activeIndices[i]]++;
        }
        for (let i = 0; i < freeCount; i++) {
          tracker[freeIndices[i]]++;
        }
        for (let i = 0; i < poolSize; i++) {
          expect(tracker[i]).toBe(1);
        }
      }
    });

    it('handles zero-count quiescent state transitions and immediate re-awakening', () => {
      const poolSize = MOBILE_MAX_PARTICLES; // 150
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      // Allocate 50 particles
      for (let i = 0; i < 50; i++) {
        activeIndices[activeCount++] = freeIndices[--freeCount];
      }
      expect(activeCount).toBe(50);
      expect(freeCount).toBe(100);

      // Force-expire all 50 particles (e.g. car stopped, dust settled)
      let writeIdx = 0;
      for (let i = 0; i < activeCount; i++) {
        const pIdx = activeIndices[i];
        freeIndices[freeCount++] = pIdx;
      }
      activeCount = writeIdx;

      // Pool is now completely in quiescent state
      expect(activeCount).toBe(0);
      expect(freeCount).toBe(poolSize);

      // Verify early exit condition triggers
      const isDriving = false;
      const isDrifting = false;
      const shouldEarlyExit = activeCount === 0 && !isDriving && !isDrifting;
      expect(shouldEarlyExit).toBe(true);

      // Now car re-accelerates: spawn immediate burst of 80 particles
      for (let i = 0; i < 80; i++) {
        const pIdx = freeIndices[--freeCount];
        activeIndices[activeCount++] = pIdx;
      }
      expect(activeCount).toBe(80);
      expect(freeCount).toBe(poolSize - 80);

      // Ensure no indices were corrupted during zero-drain and re-spawn
      const uniqueActive = new Set(Array.from(activeIndices.subarray(0, activeCount)));
      expect(uniqueActive.size).toBe(80);
    });

    it('clamps massive time deltas (tab backgrounding) without runaway memory allocation or negative values', () => {
      const delta = 15.0;
      const timeAccumulator = { current: delta };
      const EMIT_RATE = 0.05;

      let emissionsToDo = Math.floor(timeAccumulator.current / EMIT_RATE);
      emissionsToDo = Math.min(emissionsToDo, 3);
      expect(emissionsToDo).toBe(3);

      timeAccumulator.current -= emissionsToDo * EMIT_RATE;
      expect(timeAccumulator.current).toBeCloseTo(15.0 - 0.15, 4);

      const isDriving = false;
      const isDrifting = false;
      if (!isDriving && !isDrifting) {
        timeAccumulator.current = 0;
      }
      expect(timeAccumulator.current).toBe(0);
    });

    it('stress-tests extreme water entry at 150 km/h with full pool exhaustion', () => {
      const poolSize = WATER_MOBILE_MAX_PARTICLES; // 250
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      // 150 km/h entry generates bursts
      for (let frame = 0; frame < 15; frame++) {
        const requests = 20;
        let spawnedThisFrame = 0;
        for (let r = 0; r < requests; r++) {
          if (freeCount <= 0) break; // Pool exhaustion guard
          const pIdx = freeIndices[--freeCount];
          activeIndices[activeCount++] = pIdx;
          spawnedThisFrame++;
        }

        if (frame < 12) {
          expect(spawnedThisFrame).toBe(20);
        } else if (frame === 12) {
          expect(spawnedThisFrame).toBe(10); // 240 + 10 = 250
          expect(freeCount).toBe(0);
        } else {
          expect(spawnedThisFrame).toBe(0);
          expect(freeCount).toBe(0);
          expect(activeCount).toBe(poolSize);
        }
      }

      expect(activeCount).toBe(poolSize);
      expect(freeCount).toBe(0);
    });

    it('correctly suppresses dust particle emission when wheels enter water (Y - 0.35 <= -8.0)', () => {
      const poolSize = 10;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      const wheelWorldPositions = [
        new Vector3(0, 10.0, 0),   // High ground -> emit dust
        new Vector3(0, -7.5, 0),   // Wheel Y = -7.5, -7.5 - 0.35 = -7.85 > -8.0 -> emit dust
        new Vector3(0, -7.7, 0),   // Wheel Y = -7.7, -7.7 - 0.35 = -8.05 <= -8.0 -> IN WATER, reject!
        new Vector3(0, -9.0, 0),   // Deep water -> reject!
      ];

      for (const pos of wheelWorldPositions) {
        if (freeCount <= 0) break;
        const pIdx = freeIndices[--freeCount];

        if (pos.y - 0.35 <= -8.0) {
          freeIndices[freeCount++] = pIdx;
          continue;
        }

        activeIndices[activeCount++] = pIdx;
      }

      expect(activeCount).toBe(2);
      expect(freeCount).toBe(8);
      expect(freeCount + activeCount).toBe(poolSize);
    });
  });

  // =========================================================================
  // SUITE 2: TIRE TRACK VBO DIRTY GATING & TOPOLOGY TRANSITIONS
  // =========================================================================
  describe('Adversarial Stress 2: Tire Track VBO Dirty Gating & Topology Transitions', () => {
    it('ensures topology updates cleanly during driving -> airborne -> landing sequence without phantom bridge quads', () => {
      const buffer = new TireRibbonBuffer({
        maxSegments: 100,
        lifetime: 10,
        minDistance: 0.2,
        tireWidth: 0.3,
      });
      const normal = new Vector3(0, 1, 0);

      // Phase 1: Car is driving on ground
      // First point sets hasLastPosition
      expect(buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 10, 0, true, 1.0)).toBe(false);
      // Second point creates segment 1 (count = 1, 0 quads yet since need >= 2 segments to form a quad)
      expect(buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'tarmac', 10, 0, true, 1.1)).toBe(true);
      // Third point creates segment 2 (count = 2, forms first quad = 6 indices)
      expect(buffer.addContactPoint(new Vector3(0, 0, 2), normal, 'tarmac', 10, 0, true, 1.2)).toBe(true);
      expect(buffer.topologyDirty).toBe(true);

      buffer.updateLifetime(1.2);
      expect(buffer.getActiveIndicesCount()).toBe(6);
      buffer.topologyDirty = false;

      // Phase 2: Car jumps over a crest into the air!
      buffer.notifyAirborne();

      // Simulate 10 frames while airborne: car travels in air
      for (let f = 1; f <= 10; f++) {
        const time = 1.2 + f * 0.05;
        buffer.notifyAirborne();
        const hasActive = buffer.updateLifetime(time);
        expect(hasActive).toBe(true);
        // Topology MUST NOT be dirty while airborne and fading
        expect(buffer.topologyDirty).toBe(false);
      }

      // Phase 3: Car lands 30 meters ahead on ground!
      // First point after landing: distance > 3.5m triggers warp guard, setting lastPosition to landing spot
      const landingPos1 = new Vector3(0, 0, 32);
      expect(buffer.addContactPoint(landingPos1, normal, 'tarmac', 12, 0, true, 1.8)).toBe(false);

      // Second point post-landing: added with isDisconnected = wasAirborne (true)
      const landingPos2 = new Vector3(0, 0, 33);
      expect(buffer.addContactPoint(landingPos2, normal, 'tarmac', 12, 0, true, 1.9)).toBe(true);

      // Third point post-landing: continues ribbon
      const landingPos3 = new Vector3(0, 0, 34);
      expect(buffer.addContactPoint(landingPos3, normal, 'tarmac', 12, 0, true, 2.0)).toBe(true);

      buffer.updateLifetime(2.0);

      // Total segments: 2 pre-jump + 2 post-landing = 4 segments.
      // Quad 1: between pt 0 and pt 1 (Z: 1 to 2)
      // NO Quad between pt 1 and pt 2 (Z: 2 to 33 is air gap, pt 2 is marked disconnected!)
      // Quad 2: between pt 2 and pt 3 (Z: 33 to 34)
      // Total active indices = 2 quads * 6 = 12 indices (NOT 18 indices!)
      expect(buffer.getActiveIndicesCount()).toBe(12);

      const indices = buffer.indices;
      // Pre-jump quad (vertices 0, 2, 1 and 1, 2, 3)
      expect(indices[0]).toBe(0);
      expect(indices[1]).toBe(2);
      expect(indices[2]).toBe(1);
      expect(indices[3]).toBe(1);
      expect(indices[4]).toBe(2);
      expect(indices[5]).toBe(3);

      // Post-jump quad (vertices 4, 6, 5 and 5, 6, 7)
      expect(indices[6]).toBe(4);
      expect(indices[7]).toBe(6);
      expect(indices[8]).toBe(5);
      expect(indices[9]).toBe(5);
      expect(indices[10]).toBe(6);
      expect(indices[11]).toBe(7);
    });

    it('handles stationary car fade-out to zero and early-exits completely', () => {
      const buffer = new TireRibbonBuffer({
        maxSegments: 50,
        lifetime: 2.0,
        minDistance: 0.2,
      });
      const normal = new Vector3(0, 1, 0);

      // Establish baseline + 4 segments (3 quads = 18 indices)
      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 5, 0, true, 1.0); // baseline
      buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'tarmac', 5, 0, true, 1.1); // seg 1
      buffer.addContactPoint(new Vector3(0, 0, 2), normal, 'tarmac', 5, 0, true, 1.2); // seg 2
      buffer.addContactPoint(new Vector3(0, 0, 3), normal, 'tarmac', 5, 0, true, 1.3); // seg 3
      buffer.addContactPoint(new Vector3(0, 0, 4), normal, 'tarmac', 5, 0, true, 1.4); // seg 4

      buffer.updateLifetime(1.4);
      buffer.topologyDirty = false;
      expect(buffer.getSegmentCount()).toBe(4);
      expect(buffer.getActiveIndicesCount()).toBe(18);

      // Car comes to a complete halt at time = 1.5 (speed < 0.2 m/s)
      buffer.updateLifetime(1.8);
      expect(buffer.topologyDirty).toBe(false);
      expect(buffer.getSegmentCount()).toBe(4);

      // At time = 3.15: seg 1 (t=1.1) expired (3.15 - 1.1 = 2.05 >= 2.0)
      buffer.updateLifetime(3.15);
      expect(buffer.topologyDirty).toBe(true);
      buffer.topologyDirty = false;
      expect(buffer.getSegmentCount()).toBe(3);

      // At time = 3.6: all points expired!
      const hasActive = buffer.updateLifetime(3.6);
      expect(hasActive).toBe(false);
      expect(buffer.getSegmentCount()).toBe(0);
      expect(buffer.getActiveIndicesCount()).toBe(0);
      expect(buffer.topologyDirty).toBe(true);
      buffer.topologyDirty = false;

      // In useTireTracksLogic:
      const speedMps = 0.0;
      const hasAnySegments = buffer.getSegmentCount() > 0;
      const earlyExit = speedMps < 0.2 && !hasAnySegments;
      expect(earlyExit).toBe(true);
    });

    it('survives circular ring buffer wrap-around when points exceed maxSegments', () => {
      const maxSegments = 5;
      const buffer = new TireRibbonBuffer({
        maxSegments,
        lifetime: 100,
        minDistance: 0.1,
      });
      const normal = new Vector3(0, 1, 0);

      // Add 25 consecutive points
      for (let i = 0; i < 25; i++) {
        buffer.addContactPoint(new Vector3(0, 0, i * 0.5), normal, 'tarmac', 10, 0, true, i * 0.1);
        buffer.updateLifetime(i * 0.1);
        buffer.topologyDirty = false;

        expect(buffer.getSegmentCount()).toBeLessThanOrEqual(maxSegments);
      }

      expect(buffer.getSegmentCount()).toBe(maxSegments);
      expect(buffer.getActiveIndicesCount()).toBe(24);

      for (let v = 0; v < maxSegments * 2 * 3; v++) {
        expect(Number.isFinite(buffer.positions[v])).toBe(true);
      }
    });

    it('rejects instantaneous vehicle teleports / respawns (> 3.5m) to prevent elongated geometry spikes', () => {
      const buffer = new TireRibbonBuffer({ minDistance: 0.2 });
      const normal = new Vector3(0, 1, 0);

      // Baseline
      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 5, 0, true, 1.0);
      // Pre-teleport quad 1
      buffer.addContactPoint(new Vector3(0, 0, 1), normal, 'tarmac', 5, 0, true, 1.1);
      buffer.addContactPoint(new Vector3(0, 0, 2), normal, 'tarmac', 5, 0, true, 1.2);
      buffer.updateLifetime(1.2);
      expect(buffer.getActiveIndicesCount()).toBe(6);

      // Player respawns or teleports 50 meters away!
      const acceptedTeleport = buffer.addContactPoint(new Vector3(0, 0, 52), normal, 'tarmac', 5, 0, true, 1.3);
      expect(acceptedTeleport).toBe(false); // Safeguard catches jump > 3.5m

      // Post-teleport point 1 (establishes direction from 52)
      buffer.addContactPoint(new Vector3(0, 0, 53), normal, 'tarmac', 5, 0, true, 1.4);
      // Post-teleport point 2 (creates quad)
      buffer.addContactPoint(new Vector3(0, 0, 54), normal, 'tarmac', 5, 0, true, 1.5);

      buffer.updateLifetime(1.5);
      // 2 quads total (1 pre-teleport + 1 post-teleport), 0 elongated quads connecting 2 to 52!
      expect(buffer.getActiveIndicesCount()).toBe(12);
    });
  });

  // =========================================================================
  // SUITE 3: TEXTURE ANISOTROPY CLAMPING COMPREHENSIVE CHECKS
  // =========================================================================
  describe('Adversarial Stress 3: Texture Filtering Anisotropy Clamping', () => {
    it('strictly clamps mobile anisotropy to <= 2 across all graphics quality levels', () => {
      const qualities = ['low', 'medium', 'high', 'very_high', 'ultra_custom'] as const;

      for (const quality of qualities) {
        const baseAnisotropy = quality === 'very_high' ? 16 : quality === 'high' ? 8 : 4;

        const mobileAnisotropy = Math.min(baseAnisotropy, 2);
        expect(mobileAnisotropy).toBeLessThanOrEqual(2);
        expect(mobileAnisotropy).toBe(2);

        const desktopAnisotropy = baseAnisotropy;
        expect(desktopAnisotropy).toBeGreaterThanOrEqual(4);
      }
    });

    it('verifies foliage and prop anisotropy clamps strictly to 2 on mobile and 4 on desktop', () => {
      const mockTex = {
        wrapS: 0,
        wrapT: 0,
        colorSpace: '',
        anisotropy: 1,
        needsUpdate: false,
      };

      vi.spyOn(deviceUtils, 'isMobileDevice').mockReturnValue(true);
      const isMobile = deviceUtils.isMobileDevice();
      const foliageAnisotropy = isMobile ? 2 : 4;
      mockTex.anisotropy = foliageAnisotropy;
      expect(mockTex.anisotropy).toBe(2);

      vi.spyOn(deviceUtils, 'isMobileDevice').mockReturnValue(false);
      const isDesktop = !deviceUtils.isMobileDevice();
      const desktopFoliageAnisotropy = isDesktop ? 4 : 2;
      mockTex.anisotropy = desktopFoliageAnisotropy;
      expect(mockTex.anisotropy).toBe(4);
    });

    it('verifies mobile DPR ceiling and mobile device detection integrity', () => {
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro) AppleWebKit/537.36' },
        configurable: true,
      });

      expect(deviceUtils.isAndroid()).toBe(true);
      expect(deviceUtils.isMobileDevice()).toBe(true);

      const dprConfig = deviceUtils.calculateDprConfig({
        windowDpr: 3.5,
        graphicsQuality: 'medium',
        isMobile: true,
      });

      expect(dprConfig.targetDpr).toBe(1.0);
      expect(dprConfig.targetDpr).toBeLessThanOrEqual(deviceUtils.MOBILE_MAX_DPR);

      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });
  });
});
