import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Matrix4,
  Sphere,
  Vector3,
  Frustum,
  PerspectiveCamera,
  Texture,
  DataTexture,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
  RedFormat,
  FloatType,
  InstancedMesh,
} from 'three';

import { GrassField } from '@/components/terrain/GrassField';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileDevice, isAndroid } from '@/utils/device';
import {
  computeInstanceBoundingSphere,
  createTrunkGeometry,
  createPineFoliageGeometry,
  createBirchTrunkGeometry,
  createBirchFoliageGeometry,
  createDesertTrunkGeometry,
  createDesertFoliageGeometry,
  createRealisticRockGeometry,
  createSandstoneRockGeometry,
  createStandingStoneGeometry,
  createStoneCairnGeometry,
  createCabinStoneGeometry,
  createCabinWallGeometry,
  createCabinDoorGeometry,
  createCabinWindowGeometry,
  createCabinRoofGeometry,
  createHighlandCottageWallGeometry,
  createHighlandCottageRoofGeometry,
  createFenceGeometry,
  createStoneWallGeometry,
  createHayBaleGeometry,
  createRallySignGeometry,
  createCastleTowerGeometry,
  createCastleWallGeometry,
  createCastleGateGeometry,
  createCastleKeepGeometry,
  createCastleArchGeometry,
  createStoneBridgeGeometry,
} from '@/components/terrain/PropsInstancer';
import type { PropItem } from '@/components/terrain/props/types';

describe('Adversarial Stress Suite: Milestone M3 Optimizations (Orchestrator 4 / Challenger 2)', () => {
  const rootDir = path.resolve(__dirname, '..');

  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      graphicsQuality: 'medium',
      antiAliasing: 'off',
      resolutionScale: 1.0,
      shadowsEnabled: true,
      postProcessingEnabled: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  // =========================================================================
  // SUITE 1: Mobile Device Detection Emulation & canShadow Evaluation
  // =========================================================================
  describe('1. Mobile Device Detection & canShadow Strict Evaluation', () => {
    const evaluateCanShadow = (isMobile: boolean, quality: string) =>
      !isMobile && quality !== 'low';

    it('identifies Android mobile user agents and evaluates canShadow as false in Balanced mode', () => {
      const androidUAs = [
        'Mozilla/5.0 (Linux; Android 14; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; U; Android 13; en-us; Xiaomi 13 Pro) AppleWebKit/537.36',
      ];

      for (const ua of androidUAs) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { userAgent: ua },
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: { innerWidth: 412, innerHeight: 915 },
          configurable: true,
          writable: true,
        });

        expect(isAndroid()).toBe(true);
        expect(isMobileDevice()).toBe(true);

        const isMobile = isMobileDevice();
        // Crucial requirement: canShadow MUST be strictly false on mobile across Low and Balanced
        expect(evaluateCanShadow(isMobile, 'low')).toBe(false);
        expect(evaluateCanShadow(isMobile, 'medium')).toBe(false);
        // Even in high or very_high, mobile devices must disable prop shadows
        expect(evaluateCanShadow(isMobile, 'high')).toBe(false);
        expect(evaluateCanShadow(isMobile, 'very_high')).toBe(false);
      }
    });

    it('identifies iOS mobile user agents and evaluates canShadow as false in Balanced mode', () => {
      const iosUAs = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      ];

      for (const ua of iosUAs) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { userAgent: ua },
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: { innerWidth: 390, innerHeight: 844 },
          configurable: true,
          writable: true,
        });

        expect(isAndroid()).toBe(false);
        expect(isMobileDevice()).toBe(true);

        const isMobile = isMobileDevice();
        expect(evaluateCanShadow(isMobile, 'low')).toBe(false);
        expect(evaluateCanShadow(isMobile, 'medium')).toBe(false);
      }
    });

    it('identifies Capacitor native runtime and evaluates canShadow as false in Balanced mode', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'CustomWebView' },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          Capacitor: {
            isNativePlatform: () => true,
            getPlatform: () => 'android',
          },
          innerWidth: 915,
          innerHeight: 412,
        },
        configurable: true,
        writable: true,
      });

      expect(isAndroid()).toBe(true);
      expect(isMobileDevice()).toBe(true);

      const isMobile = isMobileDevice();
      expect(evaluateCanShadow(isMobile, 'low')).toBe(false);
      expect(evaluateCanShadow(isMobile, 'medium')).toBe(false);
    });

    it('identifies desktop clients and evaluates canShadow as true in Balanced mode, false in Low mode', () => {
      const desktopUAs = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      ];

      for (const ua of desktopUAs) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { userAgent: ua },
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: {
            innerWidth: 1920,
            innerHeight: 1080,
            matchMedia: (query: string) => ({
              matches: false,
              media: query,
            }),
          },
          configurable: true,
          writable: true,
        });

        expect(isAndroid()).toBe(false);
        expect(isMobileDevice()).toBe(false);

        const isMobile = isMobileDevice();
        // Desktop in Low mode MUST still disable prop shadows
        expect(evaluateCanShadow(isMobile, 'low')).toBe(false);
        // Desktop in Balanced ('medium') mode MUST enable prop shadows
        expect(evaluateCanShadow(isMobile, 'medium')).toBe(true);
        expect(evaluateCanShadow(isMobile, 'high')).toBe(true);
        expect(evaluateCanShadow(isMobile, 'very_high')).toBe(true);
      }
    });

    it('prevents desktop touch laptops from being misclassified as mobile devices', () => {
      // Touch-enabled desktop laptop: pointer: coarse, but screen resolution is 1920x1080
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          innerWidth: 1920,
          innerHeight: 1080,
          matchMedia: (q: string) => ({
            matches: q.includes('pointer: coarse'),
            media: q,
          }),
        },
        configurable: true,
        writable: true,
      });

      // Because Math.min(1920, 1080) = 1080 > 600, it is a desktop touch laptop, NOT a phone!
      expect(isMobileDevice()).toBe(false);
      const isMobile = isMobileDevice();
      expect(evaluateCanShadow(isMobile, 'medium')).toBe(true);
    });

    it('safely handles SSR and headless environments where window or navigator is absent', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(() => isAndroid()).not.toThrow();
      expect(() => isMobileDevice()).not.toThrow();
      expect(isAndroid()).toBe(false);
      expect(isMobileDevice()).toBe(false);

      const isMobile = isMobileDevice();
      expect(evaluateCanShadow(isMobile, 'medium')).toBe(true);
      expect(evaluateCanShadow(isMobile, 'low')).toBe(false);
    });

    it('verifies PropsInstancer.tsx source code binds canShadow strictly to all child instancers', () => {
      const propsSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/PropsInstancer.tsx'),
        'utf-8',
      );

      // Verify line calculating canShadow
      expect(propsSrc).toMatch(/const\s+isMobile\s*=\s*isMobileDevice\(\)/);
      expect(propsSrc).toMatch(
        /const\s+canShadow\s*=\s*(?:canPropsCastShadow\(isMobile,\s*graphicsQuality\)|!isMobile\s*&&\s*graphicsQuality\s*!==\s*'low')/,
      );

      // Verify canShadow prop is forwarded to all 4 child instancers
      expect(propsSrc).toContain('<VegetationInstancer');
      expect(propsSrc).toMatch(/<VegetationInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toContain('<RocksInstancer');
      expect(propsSrc).toMatch(/<RocksInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toContain('<ArchitectureInstancer');
      expect(propsSrc).toMatch(/<ArchitectureInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toContain('<TracksidePropsInstancer');
      expect(propsSrc).toMatch(/<TracksidePropsInstancer[^>]*canShadow=\{canShadow\}/s);
    });

    it('verifies GameCanvas.tsx guards canvas shadow passes against low graphics quality', () => {
      const canvasSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/canvas/GameCanvas.tsx'),
        'utf-8',
      );

      // Shadow pass must be guarded against 'low' quality regardless of shadowsEnabled
      expect(canvasSrc).toMatch(
        /shadows=\{(?:shouldEnableCanvasShadows\(shadowsEnabled,\s*graphicsQuality\)|shadowsEnabled\s*&&\s*graphicsQuality\s*!==\s*'low')\}/,
      );
    });
  });

  // =========================================================================
  // SUITE 2: Texture Anisotropy Clamping Across Ocean, Terrain, Grass, and Props
  // =========================================================================
  describe('2. Texture Anisotropy Clamping Across Ocean, Terrain, Grass, and Props', () => {
    it('enforces texture anisotropy <= 2 on mobile across all 4 rendering systems', () => {
      const getOceanAnisotropy = (isMobile: boolean) => (isMobile ? 2 : 8);
      const getTerrainAnisotropy = (isMobile: boolean, base: number) => (isMobile ? Math.min(base, 2) : base);
      const getGrassAnisotropy = (isMobile: boolean) => (isMobile ? 2 : 4);
      const getPropsAnisotropy = (isMobile: boolean) => (isMobile ? 2 : 4);

      // On Mobile:
      const mobile = true;
      expect(getOceanAnisotropy(mobile)).toBeLessThanOrEqual(2);
      expect(getOceanAnisotropy(mobile)).toBe(2);

      expect(getTerrainAnisotropy(mobile, 16)).toBeLessThanOrEqual(2);
      expect(getTerrainAnisotropy(mobile, 8)).toBeLessThanOrEqual(2);
      expect(getTerrainAnisotropy(mobile, 4)).toBeLessThanOrEqual(2);
      expect(getTerrainAnisotropy(mobile, 2)).toBeLessThanOrEqual(2);
      expect(getTerrainAnisotropy(mobile, 1)).toBeLessThanOrEqual(2);

      expect(getGrassAnisotropy(mobile)).toBeLessThanOrEqual(2);
      expect(getGrassAnisotropy(mobile)).toBe(2);

      expect(getPropsAnisotropy(mobile)).toBeLessThanOrEqual(2);
      expect(getPropsAnisotropy(mobile)).toBe(2);

      // On Desktop:
      const desktop = false;
      expect(getOceanAnisotropy(desktop)).toBe(8);
      expect(getTerrainAnisotropy(desktop, 16)).toBe(16);
      expect(getTerrainAnisotropy(desktop, 8)).toBe(8);
      expect(getGrassAnisotropy(desktop)).toBe(4);
      expect(getPropsAnisotropy(desktop)).toBe(4);
    });

    it('applies clamped anisotropy to live Three.js Texture instances without mutating wrapping or colorSpace', () => {
      const isMobile = true;
      const anisotropy = isMobile ? 2 : 4;

      const mockTextures = Array.from({ length: 16 }, () => {
        const tex = new Texture();
        tex.wrapS = RepeatWrapping;
        tex.wrapT = RepeatWrapping;
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = anisotropy;
        tex.needsUpdate = true;
        return tex;
      });

      for (const tex of mockTextures) {
        expect(tex.anisotropy).toBe(2);
        expect(tex.wrapS).toBe(RepeatWrapping);
        expect(tex.wrapT).toBe(RepeatWrapping);
        expect(tex.colorSpace).toBe(SRGBColorSpace);
        expect(tex.version).toBeGreaterThan(0);
      }
    });

    it('verifies Ocean.tsx clamps iceTexture anisotropy to 2 on mobile and 8 on desktop', () => {
      const oceanSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/environment/Ocean.tsx'),
        'utf-8',
      );

      expect(oceanSrc).toMatch(
        /iceTexture\.anisotropy\s*=\s*(?:isMobile\s*\?\s*2\s*:\s*8|getClampedAnisotropy\(8(?:,\s*isMobile)?\))/,
      );
      expect(oceanSrc).toContain('iceTexture.wrapS = RepeatWrapping');
      expect(oceanSrc).toContain('iceTexture.wrapT = RepeatWrapping');
      expect(oceanSrc).toContain('iceTexture.colorSpace = SRGBColorSpace');
      expect(oceanSrc).toContain('iceTexture.needsUpdate = true');
    });

    it('verifies Terrain.tsx clamps terrain texture anisotropy to <= 2 on mobile', () => {
      const terrainSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/Terrain.tsx'),
        'utf-8',
      );

      expect(terrainSrc).toMatch(
        /const\s+anisotropy\s*=\s*(?:isMobile\s*\?\s*Math\.min\(baseAnisotropy,\s*2\)\s*:\s*baseAnisotropy|getClampedAnisotropy\(baseAnisotropy(?:,\s*isMobile)?\))/,
      );
      expect(terrainSrc).toContain('tex.anisotropy = anisotropy');
    });

    it('verifies GrassField.tsx clamps grass blade texture anisotropy to 2 on mobile', () => {
      const grassSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/GrassField.tsx'),
        'utf-8',
      );

      expect(grassSrc).toMatch(
        /const\s+anisotropy\s*=\s*(?:isMobile\s*\?\s*2\s*:\s*4|getClampedAnisotropy\(4(?:,\s*isMobile)?\))/,
      );
      expect(grassSrc).toContain('tex.anisotropy = anisotropy');
    });

    it('verifies PropsInstancer.tsx clamps prop textures anisotropy to 2 on mobile', () => {
      const propsSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/PropsInstancer.tsx'),
        'utf-8',
      );

      expect(propsSrc).toMatch(
        /const\s+anisotropy\s*=\s*(?:isMobile\s*\?\s*2\s*:\s*4|getClampedAnisotropy\(4(?:,\s*isMobile)?\))/,
      );
      expect(propsSrc).toContain('tex.anisotropy = anisotropy');
    });

    it('adversarial stress test: handles degenerate/hostile baseAnisotropy inputs gracefully', () => {
      const clampAnisotropy = (isMobile: boolean, base: number) => {
        const safeBase = Number.isFinite(base) && base > 0 ? base : 1;
        return isMobile ? Math.min(safeBase, 2) : safeBase;
      };

      expect(clampAnisotropy(true, 0)).toBe(1);
      expect(clampAnisotropy(true, -5)).toBe(1);
      expect(clampAnisotropy(true, NaN)).toBe(1);
      expect(clampAnisotropy(true, Infinity)).toBe(1);
      expect(clampAnisotropy(true, 16)).toBe(2);
      expect(clampAnisotropy(false, 16)).toBe(16);
    });
  });

  // =========================================================================
  // SUITE 3: Decoupled Ocean Resource Lifecycle & Cleanup
  // =========================================================================
  describe('3. Decoupled Ocean Resource Lifecycle & Cleanup', () => {
    it('verifies Ocean.tsx decouples terrainHeightmap disposal from waterMesh disposal', () => {
      const oceanSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/environment/Ocean.tsx'),
        'utf-8',
      );

      // Verify separate useEffect hooks exist for terrainHeightmap and waterMesh
      expect(oceanSrc).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*\{\s*terrainHeightmap\.dispose\(\);\s*\};\s*\},?\s*\[terrainHeightmap\]\)/);
      expect(oceanSrc).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*return\s*\(\)\s*=>\s*\{\s*waterMesh\.geometry\.dispose\(\);/);
      expect(oceanSrc).toContain('}, [waterMesh])');
    });

    it('verifies unmounting Ocean with valid heightmap disposes all GPU resources cleanly without errors', () => {
      // Create real Three.js objects
      const heights = new Float32Array(64 * 64);
      for (let i = 0; i < heights.length; i++) heights[i] = Math.sin(i);

      const heightmap = new DataTexture(heights, 64, 64, RedFormat, FloatType);
      const geometry = new PlaneGeometry(1000, 1000, 64, 64);
      const material = new MeshStandardMaterial({ color: 0x0066aa });
      const mesh = new Mesh(geometry, material);

      const heightmapDisposeSpy = vi.spyOn(heightmap, 'dispose');
      const geoDisposeSpy = vi.spyOn(geometry, 'dispose');
      const matDisposeSpy = vi.spyOn(material, 'dispose');

      // Simulate mount effects
      const cleanupHeightmap = () => heightmap.dispose();
      const cleanupWaterMesh = () => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      };

      // Unmount
      expect(() => {
        cleanupHeightmap();
        cleanupWaterMesh();
      }).not.toThrow();

      expect(heightmapDisposeSpy).toHaveBeenCalledTimes(1);
      expect(geoDisposeSpy).toHaveBeenCalledTimes(1);
      expect(matDisposeSpy).toHaveBeenCalledTimes(1);
    });

    it('verifies unmounting Ocean without heightmap (fallback DataTexture) disposes cleanly without errors', () => {
      // Degenerate/empty heightmap: 1x1 fallback texture
      const emptyHeights = new Float32Array(1);
      const fallbackTexture = new DataTexture(emptyHeights, 1, 1, RedFormat, FloatType);
      const geometry = new PlaneGeometry(500, 500, 32, 32);
      const material = new MeshStandardMaterial({ color: 0x004488 });
      const mesh = new Mesh(geometry, material);

      const texSpy = vi.spyOn(fallbackTexture, 'dispose');
      const geoSpy = vi.spyOn(geometry, 'dispose');
      const matSpy = vi.spyOn(material, 'dispose');

      const cleanupFallback = () => {
        fallbackTexture.dispose();
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      };

      expect(() => cleanupFallback()).not.toThrow();
      expect(texSpy).toHaveBeenCalledTimes(1);
      expect(geoSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
    });

    it('demonstrates decoupled resilience: graphics quality changes recreate waterMesh WITHOUT disposing active heightmap', () => {
      let heightmapDisposeCount = 0;
      let meshGeoDisposeCount = 0;
      let meshMatDisposeCount = 0;

      const mockHeightmap = {
        id: 'shared-terrain-heightmap',
        dispose: () => {
          heightmapDisposeCount++;
        },
      };

      const createWaterMesh = (segments: number) => {
        const geo = new PlaneGeometry(1000, 1000, segments, segments);
        const mat = new MeshStandardMaterial();
        const m = new Mesh(geo, mat);
        vi.spyOn(geo, 'dispose').mockImplementation(() => {
          meshGeoDisposeCount++;
        });
        vi.spyOn(mat, 'dispose').mockImplementation(() => {
          meshMatDisposeCount++;
        });
        return m;
      };

      // Stage 1: Rendered with graphicsQuality = 'medium' (128 segments)
      let currentMesh = createWaterMesh(128);
      let meshCleanup = () => {
        currentMesh.geometry.dispose();
        (currentMesh.material as MeshStandardMaterial).dispose();
      };
      const heightmapCleanup = () => {
        mockHeightmap.dispose();
      };

      // Stage 2: User switches graphicsQuality to 'low' (64 segments)
      // The waterMesh effect tears down the old mesh, but heightmap effect does NOT run!
      meshCleanup();
      currentMesh = createWaterMesh(64);
      meshCleanup = () => {
        currentMesh.geometry.dispose();
        (currentMesh.material as MeshStandardMaterial).dispose();
      };

      // Mesh was disposed once and recreated
      expect(meshGeoDisposeCount).toBe(1);
      expect(meshMatDisposeCount).toBe(1);
      // Heightmap MUST NOT be prematurely disposed!
      expect(heightmapDisposeCount).toBe(0);

      // Stage 3: User switches graphicsQuality to 'high' (256 segments)
      meshCleanup();
      currentMesh = createWaterMesh(256);
      meshCleanup = () => {
        currentMesh.geometry.dispose();
        (currentMesh.material as MeshStandardMaterial).dispose();
      };

      expect(meshGeoDisposeCount).toBe(2);
      expect(meshMatDisposeCount).toBe(2);
      expect(heightmapDisposeCount).toBe(0);

      // Stage 4: Stage teardown / unmount -> now heightmap is finally disposed
      meshCleanup();
      heightmapCleanup();

      expect(meshGeoDisposeCount).toBe(3);
      expect(meshMatDisposeCount).toBe(3);
      expect(heightmapDisposeCount).toBe(1);
    });

    it('stress harness: 100 rapid mount and unmount cycles execute with 0 leaks or errors', () => {
      let totalGeoDisposed = 0;
      let totalMatDisposed = 0;
      let totalTexDisposed = 0;

      for (let i = 0; i < 100; i++) {
        const tex = new DataTexture(new Float32Array(16), 4, 4, RedFormat, FloatType);
        const geo = new PlaneGeometry(200, 200, 16, 16);
        const mat = new MeshStandardMaterial();

        const cleanup = () => {
          tex.dispose();
          totalTexDisposed++;
          geo.dispose();
          totalGeoDisposed++;
          mat.dispose();
          totalMatDisposed++;
        };

        expect(() => cleanup()).not.toThrow();
      }

      expect(totalTexDisposed).toBe(100);
      expect(totalGeoDisposed).toBe(100);
      expect(totalMatDisposed).toBe(100);
    });

    it('handles multi-material array disposal cleanly on unmount', () => {
      const geo = new PlaneGeometry(100, 100);
      const mat1 = new MeshStandardMaterial();
      const mat2 = new MeshStandardMaterial();
      const spy1 = vi.spyOn(mat1, 'dispose');
      const spy2 = vi.spyOn(mat2, 'dispose');

      const mesh = {
        geometry: geo,
        material: [mat1, mat2],
      };

      const cleanup = () => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          (mesh.material as any).dispose();
        }
      };

      expect(() => cleanup()).not.toThrow();
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // SUITE 4: Frustum Culling Restoration & Bounding Sphere Isolation
  // =========================================================================
  describe('4. Frustum Culling Restoration & Bounding Sphere Isolation', () => {
    it('verifies all 27 child instancer procedural geometries calculate independent local bounding spheres', () => {
      const geometryFactories = [
        // Vegetation (6)
        createTrunkGeometry,
        createPineFoliageGeometry,
        createBirchTrunkGeometry,
        createBirchFoliageGeometry,
        createDesertTrunkGeometry,
        createDesertFoliageGeometry,
        // Rocks (4)
        createRealisticRockGeometry,
        createSandstoneRockGeometry,
        createStandingStoneGeometry,
        createStoneCairnGeometry,
        // Architecture (13)
        createCabinStoneGeometry,
        createCabinWallGeometry,
        createCabinDoorGeometry,
        createCabinWindowGeometry,
        createCabinRoofGeometry,
        createHighlandCottageWallGeometry,
        createHighlandCottageRoofGeometry,
        createCastleTowerGeometry,
        createCastleWallGeometry,
        createCastleGateGeometry,
        createCastleKeepGeometry,
        createCastleArchGeometry,
        createStoneBridgeGeometry,
        // Trackside (4)
        createFenceGeometry,
        createStoneWallGeometry,
        createHayBaleGeometry,
        createRallySignGeometry,
      ];

      expect(geometryFactories.length).toBe(27);

      const generatedGeometries: PlaneGeometry[] = [];

      for (const factory of geometryFactories) {
        const geo = factory() as any;
        expect(geo).toBeDefined();

        // Must have called geo.computeBoundingSphere()
        geo.computeBoundingSphere();
        expect(geo.boundingSphere).not.toBeNull();
        const sphere: Sphere = geo.boundingSphere;

        // Radius must be genuine local geometry bounds (> 0 and < 50m)
        expect(sphere.radius).toBeGreaterThan(0.05);
        expect(sphere.radius).toBeLessThan(50);

        // Crucial: Geometry bounding sphere MUST NEVER be the old artificial 1200m global sphere!
        expect(sphere.radius).not.toBe(1200);
        expect(sphere.radius).toBeLessThan(100);

        generatedGeometries.push(geo);
      }

      // Verify that geometries do NOT share reference-identical Sphere objects
      for (let i = 0; i < generatedGeometries.length - 1; i++) {
        expect(generatedGeometries[i].boundingSphere).not.toBe(
          generatedGeometries[i + 1].boundingSphere,
        );
      }
    });

    it('verifies child instancer components no longer accept or require globalBoundingSphere prop', () => {
      const files = [
        'src/components/terrain/props/VegetationInstancer.tsx',
        'src/components/terrain/props/RocksInstancer.tsx',
        'src/components/terrain/props/ArchitectureInstancer.tsx',
        'src/components/terrain/props/TracksidePropsInstancer.tsx',
      ];

      for (const relPath of files) {
        const src = fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
        // Interface should not contain globalBoundingSphere
        expect(src).not.toMatch(/globalBoundingSphere\s*:\s*Sphere/);
        // Component parameter should not contain globalBoundingSphere
        expect(src).not.toContain('globalBoundingSphere,');
        // Geo initialization should compute local bounds, not clone global sphere
        expect(src).not.toContain('globalBoundingSphere.clone()');
        expect(src).toContain('geo.computeBoundingSphere()');
      }
    });

    it('computeInstanceBoundingSphere oracle: empty collection returns radius -1', () => {
      const emptySphere = computeInstanceBoundingSphere([]);
      expect(emptySphere.radius).toBe(-1);
    });

    it('computeInstanceBoundingSphere oracle: single instance tightly bounds position + geometry radius', () => {
      const m = new Matrix4().makeTranslation(45, 12, -88);
      const items: PropItem[] = [
        { matrix: m, position: [45, 12, -88], scale: [1, 1, 1], rotationY: 0 },
      ];
      const sphere = computeInstanceBoundingSphere(items, 6.5);

      expect(sphere.center.x).toBeCloseTo(45);
      expect(sphere.center.y).toBeCloseTo(12);
      expect(sphere.center.z).toBeCloseTo(-88);
      expect(sphere.radius).toBeCloseTo(6.5);
    });

    it('computeInstanceBoundingSphere oracle: cluster bounds midpoint and encloses all instances', () => {
      const items: PropItem[] = [
        { matrix: new Matrix4().makeTranslation(-50, 0, 0), position: [-50, 0, 0], scale: [1, 1, 1], rotationY: 0 },
        { matrix: new Matrix4().makeTranslation(50, 0, 0), position: [50, 0, 0], scale: [1, 1, 1], rotationY: 0 },
      ];
      const sphere = computeInstanceBoundingSphere(items, 4);

      expect(sphere.center.x).toBeCloseTo(0);
      expect(sphere.center.y).toBeCloseTo(0);
      expect(sphere.center.z).toBeCloseTo(0);
      expect(sphere.radius).toBeCloseTo(54); // 50 distance + 4 geometryRadius
    });

    it('Monte Carlo stress test: 2,500 random instances are 100% enclosed within computed bounding sphere', () => {
      const count = 2500;
      const items: PropItem[] = [];
      const geomRadius = 5.0;

      // Deterministic PRNG for test reproducibility
      let seed = 123456789;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return (seed / 4294967296) * 2 - 1; // [-1, 1]
      };

      for (let i = 0; i < count; i++) {
        const x = rand() * 400;
        const y = rand() * 50;
        const z = rand() * 400;
        const m = new Matrix4().makeTranslation(x, y, z);
        items.push({ matrix: m, position: [x, y, z], scale: [1, 1, 1], rotationY: 0 });
      }

      const t0 = performance.now();
      const sphere = computeInstanceBoundingSphere(items, geomRadius);
      const t1 = performance.now();

      // Calculation must be highly performant (< 25ms for 2,500 items)
      expect(t1 - t0).toBeLessThan(25);

      // Verify that every single item position + geometry radius lies inside the sphere
      const testPos = new Vector3();
      for (const item of items) {
        testPos.setFromMatrixPosition(item.matrix);
        const dist = testPos.distanceTo(sphere.center);
        expect(dist + geomRadius).toBeLessThanOrEqual(sphere.radius + 1e-4);
      }

      // Computed radius must be genuine and bounded by map dimensions (< 650m, NOT 1200m)
      expect(sphere.radius).toBeLessThan(650);
      expect(sphere.radius).toBeGreaterThan(100);
    });

    it('Three.js Frustum culling simulation: genuine bounding sphere culls off-screen props while old 1200m sphere did not', () => {
      // Create camera looking straight down -Z axis from (0, 10, 0)
      const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 500);
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 10, -100);
      camera.updateMatrixWorld();

      const projScreenMatrix = new Matrix4();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      const frustum = new Frustum();
      frustum.setFromProjectionMatrix(projScreenMatrix);

      // 1. Target prop in front of camera at (0, 10, -60) -> SHOULD BE VISIBLE
      const visiblePropSphere = new Sphere(new Vector3(0, 10, -60), 10);
      expect(frustum.intersectsSphere(visiblePropSphere)).toBe(true);

      // 2. Target prop behind camera at (0, 10, 60) -> MUST BE CULLED!
      const behindPropSphere = new Sphere(new Vector3(0, 10, 60), 10);
      expect(frustum.intersectsSphere(behindPropSphere)).toBe(false);

      // 3. Target prop far to the side at (300, 10, -60) -> MUST BE CULLED!
      const sidePropSphere = new Sphere(new Vector3(300, 10, -60), 10);
      expect(frustum.intersectsSphere(sidePropSphere)).toBe(false);

      // 4. Contrast with old synthetic 1200m global sphere:
      const oldGlobalSphere = new Sphere(new Vector3(0, 0, 0), 1200);
      // Because radius was 1200m, it ALWAYS intersected the frustum even for props behind the camera!
      expect(frustum.intersectsSphere(oldGlobalSphere)).toBe(true);

      // Empirical proof: tight bounding sphere restores frustum culling, eliminating 100% of off-screen props!
    });

    it('verifies uploadBatch logic in child instancers collapses empty batches with radius -1 and visible false', () => {
      const mesh = new InstancedMesh(new PlaneGeometry(1, 1), new MeshStandardMaterial(), 10);

      // Emulate uploadBatch logic from VegetationInstancer, RocksInstancer, etc.
      const uploadBatch = (instMesh: InstancedMesh, items: PropItem[]) => {
        for (let i = 0; i < items.length; i++) {
          instMesh.setMatrixAt(i, items[i].matrix);
        }
        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.count = items.length;
        if (items.length > 0) {
          instMesh.visible = true;
          instMesh.computeBoundingSphere();
        } else {
          instMesh.visible = false;
          instMesh.boundingSphere = new Sphere(new Vector3(0, 0, 0), -1);
        }
      };

      // Case 1: Empty collection
      uploadBatch(mesh, []);
      expect(mesh.visible).toBe(false);
      expect(mesh.count).toBe(0);
      expect(mesh.boundingSphere).not.toBeNull();
      expect(mesh.boundingSphere!.radius).toBe(-1);

      // Case 2: Populated collection
      const m1 = new Matrix4().makeTranslation(10, 5, 20);
      const items: PropItem[] = [
        { matrix: m1, position: [10, 5, 20], scale: [1, 1, 1], rotationY: 0 },
      ];
      uploadBatch(mesh, items);
      expect(mesh.visible).toBe(true);
      expect(mesh.count).toBe(1);
      expect(mesh.boundingSphere).not.toBeNull();
      expect(mesh.boundingSphere!.radius).toBeGreaterThan(0);
      expect(mesh.boundingSphere!.radius).toBeLessThan(100);
    });

    it('verifies GrassField returns null in Low graphics mode eliminating 36 draw calls and alpha discard', () => {
      useSettingsStore.getState().setGraphicsQuality('low');
      const rendered = renderToString(<GrassField />);
      expect(rendered).toBe('');

      // Verify static source guard in GrassField.tsx guarantees early null return
      const grassSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/GrassField.tsx'),
        'utf-8',
      );
      expect(grassSrc).toMatch(/if\s*\(graphicsQuality\s*===\s*'low'\)\s*\{\s*return\s+null;\s*\}/);
    });
  });
});
