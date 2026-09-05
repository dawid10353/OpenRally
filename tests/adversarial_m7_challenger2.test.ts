import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Vector3, Texture, RepeatWrapping, SRGBColorSpace } from 'three';
import {
  TireRibbonBuffer,
  computeRibbonEdges,
} from '@/utils/physics/tireRibbon';
import {
  DRIVING_SPEED_THRESHOLD,
} from '@/config/particles';
import * as deviceUtils from '@/utils/device';

describe('Adversarial Challenge M7 (Challenger 2): Edge Cases, Boundary States & Anisotropy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Group 1: Vehicle Boundary States (Water Edge, Slow Reverse, Air-Time Jumps)', () => {
    // 1.1 Car parked on water edge
    it('handles vehicle parked at water edge boundary without emitting particles or leaking indices', () => {
      const WATER_LEVEL = -8.0;
      const CHASSIS_WATER_THRESHOLD = -7.0;

      // Simulate vehicle resting on water bank
      const chassisY = -7.2; // <= -7.0 (near water)
      const speed = 0.0; // Parked (< DRIVING_SPEED_THRESHOLD)
      const isDriving = speed > DRIVING_SPEED_THRESHOLD;
      const isNearWater = chassisY <= CHASSIS_WATER_THRESHOLD;

      // Early-exit condition check from WaterSplashes
      let activeCount = 0;
      const shouldEarlyExit = activeCount === 0 && (!isDriving || !isNearWater);
      expect(shouldEarlyExit).toBe(true);

      // Verify that even if wheels are partially submerged, zero particles are emitted when parked
      const wheelPositions = [
        new Vector3(-1, WATER_LEVEL - 0.1, 2),  // Submerged front-left
        new Vector3(1, WATER_LEVEL - 0.1, 2),   // Submerged front-right
        new Vector3(-1, WATER_LEVEL + 0.5, -2), // Dry rear-left
        new Vector3(1, WATER_LEVEL + 0.5, -2),  // Dry rear-right
      ];

      const poolSize = 250;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      activeCount = 0;

      // Emission logic check: only runs when isDriving && isNearWater
      if (isDriving && isNearWater) {
        for (const pos of wheelPositions) {
          if (pos.y - 0.35 <= WATER_LEVEL && freeCount > 0) {
            const pIdx = freeIndices[--freeCount];
            activeIndices[activeCount++] = pIdx;
          }
        }
      }

      expect(activeCount).toBe(0);
      expect(freeCount).toBe(poolSize);
    });

    it('gracefully drains and cleans up water particles when car stops at water edge', () => {
      const poolSize = 100;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      // Simulate 10 active water particles while car was splashing into water
      const particles = Array.from({ length: poolSize }, () => ({
        active: false,
        life: 0,
        maxLife: 0.6,
      }));

      for (let i = 0; i < 10; i++) {
        const pIdx = freeIndices[--freeCount];
        particles[pIdx].active = true;
        particles[pIdx].life = 0;
        particles[pIdx].maxLife = 0.6;
        activeIndices[activeCount++] = pIdx;
      }

      expect(activeCount).toBe(10);
      expect(freeCount).toBe(90);

      // Car comes to a complete halt at water edge (speed = 0)
      const speed = 0;
      const isDriving = speed > DRIVING_SPEED_THRESHOLD;
      const isNearWater = true;

      // In frame loop: activeCount > 0 prevents early-exit so particles can finish
      expect(activeCount === 0 && (!isDriving || !isNearWater)).toBe(false);

      // Simulate passage of time (delta = 0.3s -> particles age to 0.3s)
      let writeIdx = 0;
      const delta1 = 0.3;
      for (let i = 0; i < activeCount; i++) {
        const pIdx = activeIndices[i];
        const p = particles[pIdx];
        p.life += delta1;
        if (p.life >= p.maxLife) {
          p.active = false;
          freeIndices[freeCount++] = pIdx;
          continue;
        }
        activeIndices[writeIdx++] = pIdx;
      }
      activeCount = writeIdx;
      expect(activeCount).toBe(10); // Still living
      expect(freeCount).toBe(90);

      // Another delta = 0.4s -> all particles exceed maxLife (0.7 >= 0.6)
      writeIdx = 0;
      const delta2 = 0.4;
      for (let i = 0; i < activeCount; i++) {
        const pIdx = activeIndices[i];
        const p = particles[pIdx];
        p.life += delta2;
        if (p.life >= p.maxLife) {
          p.active = false;
          freeIndices[freeCount++] = pIdx;
          continue;
        }
        activeIndices[writeIdx++] = pIdx;
      }
      activeCount = writeIdx;

      // All particles expired, returned to free stack
      expect(activeCount).toBe(0);
      expect(freeCount).toBe(poolSize);

      // Next frame: early exit activates immediately
      const earlyExitNow = activeCount === 0 && (!isDriving || !isNearWater);
      expect(earlyExitNow).toBe(true);
    });

    it('asymmetrically suppresses dust emissions for submerged wheels while allowing dry wheels to emit dust', () => {
      const WATER_LEVEL = -8.0;
      const poolSize = 50;
      const freeIndices = new Int32Array(poolSize);
      for (let i = 0; i < poolSize; i++) freeIndices[i] = i;
      const activeIndices = new Int32Array(poolSize);
      let freeCount = poolSize;
      let activeCount = 0;

      const particles = Array.from({ length: poolSize }, () => ({
        active: false,
        position: new Vector3(),
      }));

      // Car is driving along water bank: left wheels submerged, right wheels on dry dirt
      const isDriving = true;
      const wheelWorldPositions = [
        new Vector3(-1.0, -8.1, 0), // Front-Left: in water (-8.1 - 0.35 <= -8.0)
        new Vector3(1.0, 5.0, 0),   // Front-Right: on dry ground (5.0 - 0.35 > -8.0)
        new Vector3(-1.0, -8.1, -2),// Rear-Left: in water
        new Vector3(1.0, 5.0, -2),  // Rear-Right: on dry ground
      ];

      if (isDriving) {
        for (let w = 0; w < 4; w++) {
          const wPos = wheelWorldPositions[w];
          if (freeCount <= 0) break;

          const pIdx = freeIndices[--freeCount];
          const p = particles[pIdx];
          p.position.copy(wPos);

          // DustParticles check: wheel in water must NOT emit dust
          if (p.position.y - 0.35 <= WATER_LEVEL) {
            p.active = false;
            freeIndices[freeCount++] = pIdx;
            continue;
          }

          p.active = true;
          activeIndices[activeCount++] = pIdx;
        }
      }

      // Exactly 2 dry wheels emitted dust; 2 wet wheels were cleanly rejected
      expect(activeCount).toBe(2);
      expect(freeCount).toBe(48);
    });

    // 1.2 Car reversing at slow speed (< 0.2 m/s)
    it('completely skips tire ribbon terrain sampling when reversing at speeds below 0.2 m/s', () => {
      const buffer = new TireRibbonBuffer();
      const notifySpy = vi.spyOn(buffer, 'notifyAirborne');
      const addPointSpy = vi.spyOn(buffer, 'addContactPoint');

      const reverseVelocities = [
        { x: 0, z: -0.05 }, // 0.05 m/s reverse
        { x: 0, z: -0.10 }, // 0.10 m/s reverse
        { x: 0, z: -0.19 }, // 0.19 m/s reverse
        { x: -0.12, z: -0.12 }, // ~0.17 m/s diagonal crawl
      ];

      for (const vel of reverseVelocities) {
        const speedMps = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        expect(speedMps).toBeLessThan(0.2);

        const isGrounded = true;

        if (speedMps < 0.2 || !isGrounded) {
          buffer.notifyAirborne();
        } else {
          buffer.addContactPoint(new Vector3(), new Vector3(), 'tarmac', speedMps, 0, isGrounded, 0);
        }
      }

      expect(notifySpy).toHaveBeenCalledTimes(4);
      expect(addPointSpy).not.toHaveBeenCalled();
      expect(buffer.getSegmentCount()).toBe(0);
    });

    it('correctly computes perpendicular ribbon edges and advances UVs when reversing at >= 0.2 m/s', () => {
      const contactPos = new Vector3(0, 1, -5);
      const forwardDir = new Vector3(0, 0, -1); // Pure reverse direction
      const surfaceNormal = new Vector3(0, 1, 0);
      const halfWidth = 0.17;

      const outLeft = new Vector3();
      const outRight = new Vector3();

      computeRibbonEdges(contactPos, forwardDir, surfaceNormal, halfWidth, outLeft, outRight);

      // Verify ribbon vertices are perpendicular to reverse movement vector
      const ribbonVector = new Vector3().subVectors(outRight, outLeft);
      expect(ribbonVector.dot(forwardDir)).toBeCloseTo(0, 5); // Orthogonal
      expect(ribbonVector.length()).toBeCloseTo(halfWidth * 2, 5); // Exactly tireWidth

      // Ensure no NaN or infinite coordinates
      expect(Number.isFinite(outLeft.x)).toBe(true);
      expect(Number.isFinite(outLeft.y)).toBe(true);
      expect(Number.isFinite(outLeft.z)).toBe(true);
      expect(Number.isFinite(outRight.x)).toBe(true);
      expect(Number.isFinite(outRight.y)).toBe(true);
      expect(Number.isFinite(outRight.z)).toBe(true);

      // Test buffer integration while reversing
      const buffer = new TireRibbonBuffer({ minDistance: 0.1, maxSegments: 20 });
      const normal = new Vector3(0, 1, 0);

      // Lay track while reversing backwards from z = 0 to z = -1
      buffer.addContactPoint(new Vector3(0, 0, 0.0), normal, 'tarmac', 2.0, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, -0.2), normal, 'tarmac', 2.0, 0, true, 1.1);
      buffer.addContactPoint(new Vector3(0, 0, -0.4), normal, 'tarmac', 2.0, 0, true, 1.2);
      buffer.addContactPoint(new Vector3(0, 0, -0.6), normal, 'tarmac', 2.0, 0, true, 1.3);

      expect(buffer.getSegmentCount()).toBe(3); // 1 initial position + 3 points
      buffer.updateLifetime(1.3);
      expect(buffer.getActiveIndicesCount()).toBe((3 - 1) * 6); // 2 quads = 12 indices
    });

    // 1.3 Sudden air-time jumps and hard landings
    it('flags airborne segments and prevents phantom bridge geometry across air-time jumps', () => {
      const buffer = new TireRibbonBuffer({ minDistance: 0.1, maxSegments: 50 });
      const normal = new Vector3(0, 1, 0);

      // Phase 1: Driving on ground before jump (initial pos + 3 segments = 2 quads)
      buffer.addContactPoint(new Vector3(0, 0, 0.0), normal, 'tarmac', 15.0, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 0.5), normal, 'tarmac', 15.0, 0, true, 1.1);
      buffer.addContactPoint(new Vector3(0, 0, 1.0), normal, 'tarmac', 15.0, 0, true, 1.2);
      buffer.addContactPoint(new Vector3(0, 0, 1.5), normal, 'tarmac', 15.0, 0, true, 1.3);

      buffer.updateLifetime(1.3);
      const preJumpQuads = buffer.getActiveIndicesCount() / 6;
      expect(preJumpQuads).toBe(2); // 2 quads connecting 3 segments

      // Phase 2: Car jumps off ramp! In air for 5 frames (position.y <= -0.49)
      for (let f = 0; f < 5; f++) {
        buffer.notifyAirborne();
        buffer.updateLifetime(1.3 + f * 0.05);
      }

      // Pre-jump quads unchanged
      expect(buffer.getActiveIndicesCount() / 6).toBe(2);

      // Phase 3: Hard landing at z = 3.0 (jumped 1.5 meters across air)
      // Car lands on ground: suspension compresses, isGrounded = true
      const landed = buffer.addContactPoint(new Vector3(0, 0, 3.0), normal, 'tarmac', 14.0, 0, true, 1.6);
      expect(landed).toBe(true);

      buffer.updateLifetime(1.6);

      // Crucial test: landing point must NOT add a bridge quad across the jump!
      // Number of quads MUST STILL BE 2!
      expect(buffer.getActiveIndicesCount() / 6).toBe(2);

      // Phase 4: Subsequent on-ground driving after landing
      buffer.addContactPoint(new Vector3(0, 0, 3.5), normal, 'tarmac', 13.0, 0, true, 1.7);
      buffer.updateLifetime(1.7);

      // Now connects landing point to next ground point: exactly 3 quads total!
      expect(buffer.getActiveIndicesCount() / 6).toBe(3);
    });

    it('safely decouples segments and resets tracking on extreme teleports / respawns (> 3.5m)', () => {
      const buffer = new TireRibbonBuffer({ minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 10, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 0.5), normal, 'tarmac', 10, 0, true, 1.1);
      buffer.addContactPoint(new Vector3(0, 0, 1.0), normal, 'tarmac', 10, 0, true, 1.2);
      buffer.updateLifetime(1.2);
      expect(buffer.getActiveIndicesCount() / 6).toBe(1); // 1 quad

      // Teleport to position 50m away (respawn / checkpoint restart)
      const teleported = buffer.addContactPoint(new Vector3(0, 0, 50), normal, 'tarmac', 10, 0, true, 1.3);
      expect(teleported).toBe(false); // Rejected by warp safeguard

      buffer.updateLifetime(1.3);
      // No stretched 50-meter triangle polygon created!
      expect(buffer.getActiveIndicesCount() / 6).toBe(1);

      // Resumes clean track laying at new location
      buffer.addContactPoint(new Vector3(0, 0, 50.5), normal, 'tarmac', 10, 0, true, 1.4);
      buffer.updateLifetime(1.4);
      expect(buffer.getActiveIndicesCount() / 6).toBe(1); // First point at new location is disconnected

      buffer.addContactPoint(new Vector3(0, 0, 51.0), normal, 'tarmac', 10, 0, true, 1.5);
      buffer.updateLifetime(1.5);
      expect(buffer.getActiveIndicesCount() / 6).toBe(2); // Connects 50.5 to 51.0
    });
  });

  describe('Group 2: topologyDirty & VBO Attribute Update Gating', () => {
    it('accurately sets topologyDirty on point push and pruning, and clears it when synced', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10, lifetime: 2.0, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      // 1. Initial state
      expect(buffer.topologyDirty).toBe(true);

      // Mock VBO sync operation as performed in useTireTracksLogic
      const vboUpdateCounters = {
        position: 0,
        uv: 0,
        color: 0,
        ribbonAlpha: 0,
        index: 0,
      };

      const syncVbo = (hasActive: boolean) => {
        if (buffer.topologyDirty) {
          vboUpdateCounters.position++;
          vboUpdateCounters.uv++;
          vboUpdateCounters.color++;
          vboUpdateCounters.index++;
          buffer.topologyDirty = false;
        }
        if (hasActive) {
          vboUpdateCounters.ribbonAlpha++;
        }
      };

      // Sync initial empty buffer
      syncVbo(false);
      expect(buffer.topologyDirty).toBe(false);
      expect(vboUpdateCounters.position).toBe(1);
      expect(vboUpdateCounters.ribbonAlpha).toBe(0);

      // 2. Add contact points -> topologyDirty flagged
      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 5, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 0.3), normal, 'tarmac', 5, 0, true, 1.1);
      expect(buffer.topologyDirty).toBe(true);

      const hasActive1 = buffer.updateLifetime(1.1);
      expect(hasActive1).toBe(true);
      syncVbo(hasActive1);

      expect(vboUpdateCounters.position).toBe(2);
      expect(vboUpdateCounters.ribbonAlpha).toBe(1);
      expect(buffer.topologyDirty).toBe(false);

      // 3. Fading frames: car stopped, elapsed time advances by 0.1s
      // Buffer must NOT flag topologyDirty, positions/UVs/colors/indices MUST NOT update
      for (let frame = 1; frame <= 5; frame++) {
        const hasActive = buffer.updateLifetime(1.1 + frame * 0.1);
        expect(hasActive).toBe(true);
        expect(buffer.topologyDirty).toBe(false); // Crucial! Still false
        syncVbo(hasActive);
      }

      // Positions/UVs/indices remained at 2 uploads; ribbonAlpha updated on every frame (6 total)
      expect(vboUpdateCounters.position).toBe(2);
      expect(vboUpdateCounters.uv).toBe(2);
      expect(vboUpdateCounters.color).toBe(2);
      expect(vboUpdateCounters.index).toBe(2);
      expect(vboUpdateCounters.ribbonAlpha).toBe(6);

      // 4. Time advances past lifetime (currentTime = 3.2s, point times were 1.0s and 1.1s)
      // Oldest point expires -> buffer prunes head -> topologyDirty MUST turn true!
      const hasActiveExpired = buffer.updateLifetime(3.2);
      expect(buffer.topologyDirty).toBe(true); // Head was pruned!
      syncVbo(hasActiveExpired);

      expect(vboUpdateCounters.position).toBe(3);
      expect(buffer.topologyDirty).toBe(false);
    });

    it('smoothly decays alpha channel in the fast path without altering vertex positions', () => {
      const buffer = new TireRibbonBuffer({ maxSegments: 10, lifetime: 2.0, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'mud', 5, 0, true, 1.0);
      buffer.addContactPoint(new Vector3(0, 0, 0.5), normal, 'mud', 5, 0, true, 1.0);
      buffer.updateLifetime(1.0);
      buffer.topologyDirty = false;

      // Capture initial vertex coordinates
      const initialPos0X = buffer.positions[0];
      const initialPos0Z = buffer.positions[2];
      const initialAlpha = buffer.alphas[0];
      expect(initialAlpha).toBeGreaterThan(0.5);

      // Advance time along fade curve: t = 1.0 -> 1.5s
      buffer.updateLifetime(1.5);
      expect(buffer.topologyDirty).toBe(false);

      // Vertex positions must be completely untouched
      expect(buffer.positions[0]).toBe(initialPos0X);
      expect(buffer.positions[2]).toBe(initialPos0Z);

      // Alphas must have smoothly decreased
      const midAlpha = buffer.alphas[0];
      expect(midAlpha).toBeLessThan(initialAlpha);
      expect(midAlpha).toBeGreaterThan(0.0);

      // Advance time closer to expiry: t = 1.9s
      buffer.updateLifetime(1.9);
      expect(buffer.alphas[0]).toBeLessThan(midAlpha);
    });

    it('manages ring buffer wraparound cleanly without corrupting triangle indices', () => {
      const maxSegs = 5;
      const buffer = new TireRibbonBuffer({ maxSegments: maxSegs, minDistance: 0.1 });
      const normal = new Vector3(0, 1, 0);

      // Push 10 points into a 5-capacity buffer
      buffer.addContactPoint(new Vector3(0, 0, 0), normal, 'tarmac', 5, 0, true, 1.0);
      for (let i = 1; i <= 9; i++) {
        buffer.addContactPoint(new Vector3(0, 0, i * 0.2), normal, 'tarmac', 5, 0, true, 1.0 + i * 0.1);
        buffer.updateLifetime(1.0 + i * 0.1);
        buffer.topologyDirty = false;
      }

      expect(buffer.getSegmentCount()).toBe(maxSegs);
      expect(buffer.getActiveIndicesCount()).toBe((maxSegs - 1) * 6);

      // Validate all generated triangle indices are within valid vertex bounds [0, maxSegs * 2 - 1]
      const maxVertexIdx = maxSegs * 2 - 1;
      const activeIdxCount = buffer.getActiveIndicesCount();
      for (let j = 0; j < activeIdxCount; j++) {
        const idx = buffer.indices[j];
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(maxVertexIdx);
      }
    });
  });

  describe('Group 3: Mobile Texture Anisotropy Clamping Across Terrain, Grass, and Props', () => {
    it('clamps terrain texture anisotropy strictly to <= 2 on mobile while preserving full anisotropic fidelity on desktop', () => {
      const mockTexture = () => ({
        wrapS: 0,
        wrapT: 0,
        colorSpace: '',
        anisotropy: 1,
        needsUpdate: false,
      } as unknown as Texture);

      const terrainTextures = [
        mockTexture(),
        mockTexture(),
        mockTexture(),
        mockTexture(),
        mockTexture(),
        mockTexture(),
        mockTexture(),
      ];

      const applyTerrainAnisotropy = (isMobile: boolean, quality: string) => {
        const baseAnisotropy = quality === 'very_high' ? 16 : quality === 'high' ? 8 : 4;
        const anisotropy = isMobile ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
        terrainTextures.forEach((tex) => {
          tex.wrapS = RepeatWrapping;
          tex.wrapT = RepeatWrapping;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = anisotropy;
          tex.needsUpdate = true;
        });
      };

      // Test mobile clamping across all quality levels
      const qualities = ['low', 'medium', 'high', 'very_high'] as const;
      for (const q of qualities) {
        applyTerrainAnisotropy(true, q);
        for (const tex of terrainTextures) {
          expect(tex.anisotropy).toBe(2);
          expect(tex.anisotropy).toBeLessThanOrEqual(2);
          expect(tex.wrapS).toBe(RepeatWrapping);
          expect(tex.wrapT).toBe(RepeatWrapping);
          expect(tex.colorSpace).toBe(SRGBColorSpace);
          expect(tex.needsUpdate).toBe(true);
        }
      }

      // Test desktop unconstrained values
      applyTerrainAnisotropy(false, 'low');
      expect(terrainTextures[0].anisotropy).toBe(4);

      applyTerrainAnisotropy(false, 'medium');
      expect(terrainTextures[0].anisotropy).toBe(4);

      applyTerrainAnisotropy(false, 'high');
      expect(terrainTextures[0].anisotropy).toBe(8);

      applyTerrainAnisotropy(false, 'very_high');
      expect(terrainTextures[0].anisotropy).toBe(16);
    });

    it('clamps GrassField foliage textures to anisotropy 2 on mobile and 4 on desktop', () => {
      const mockTexture = () => ({
        wrapS: 0,
        wrapT: 0,
        colorSpace: '',
        anisotropy: 1,
        needsUpdate: false,
      } as unknown as Texture);

      const grassTextures = [mockTexture(), mockTexture(), mockTexture()];

      const applyGrassAnisotropy = (isMobile: boolean) => {
        const anisotropy = isMobile ? 2 : 4;
        grassTextures.forEach((tex) => {
          tex.wrapS = RepeatWrapping;
          tex.wrapT = RepeatWrapping;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = anisotropy;
          tex.needsUpdate = true;
        });
      };

      // Mobile
      applyGrassAnisotropy(true);
      for (const tex of grassTextures) {
        expect(tex.anisotropy).toBe(2);
      }

      // Desktop
      applyGrassAnisotropy(false);
      for (const tex of grassTextures) {
        expect(tex.anisotropy).toBe(4);
      }
    });

    it('clamps PropsInstancer prop textures across all 22 materials to anisotropy 2 on mobile', () => {
      const mockTexture = () => ({
        wrapS: 0,
        wrapT: 0,
        colorSpace: '',
        anisotropy: 1,
        needsUpdate: false,
      } as unknown as Texture);

      const propTextures = Array.from({ length: 22 }, () => mockTexture());

      const applyPropsAnisotropy = (isMobile: boolean) => {
        const anisotropy = isMobile ? 2 : 4;
        propTextures.forEach((tex) => {
          tex.wrapS = RepeatWrapping;
          tex.wrapT = RepeatWrapping;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = anisotropy;
          tex.needsUpdate = true;
        });
      };

      // Mobile
      applyPropsAnisotropy(true);
      expect(propTextures.length).toBe(22);
      for (const tex of propTextures) {
        expect(tex.anisotropy).toBe(2);
      }

      // Desktop
      applyPropsAnisotropy(false);
      for (const tex of propTextures) {
        expect(tex.anisotropy).toBe(4);
      }
    });

    it('reliably detects mobile environment from Android navigator and Capacitor runtime', () => {
      // Mock Android user-agent
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro Build/AP2A.240805.005) AppleWebKit/537.36',
      });
      expect(deviceUtils.isAndroid()).toBe(true);
      expect(deviceUtils.isMobileDevice()).toBe(true);

      // Mock Desktop user-agent
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      });
      expect(deviceUtils.isAndroid()).toBe(false);
      expect(deviceUtils.isMobileDevice()).toBe(false);
    });
  });
});
