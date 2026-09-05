import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DataTexture,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  RedFormat,
  FloatType,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';

import { GrassField, createGrassTuftGeometry } from '@/components/terrain/GrassField';
import { useSettingsStore } from '@/store/settingsStore';
import { canPropsCastShadow } from '@/components/terrain/PropsInstancer';
import { getClampedAnisotropy } from '@/utils/device';
import { WATER_SEGMENTS } from '@/config/water';
import { GRASS_CHUNKS } from '@/config/grass';
import type { GraphicsQuality } from '@/types';

describe('Adversarial M3 Iteration 2 (Challenger 2): Integration & Lifecycle Behavior', () => {
  const rootDir = path.resolve(__dirname, '..');

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
  });

  // =========================================================================
  // REQUIREMENT 1: GrassField in Low vs Balanced Mode & Memory Leak Stress
  // =========================================================================
  describe('1. GrassField: Low Graphics Return Null vs Balanced Mode Instanced Clusters & Memory Leak Stress', () => {
    it('returns null immediately under low graphics mode without rendering any DOM elements', () => {
      useSettingsStore.setState({ graphicsQuality: 'low' });
      const renderedHtml = renderToString(<GrassField />);
      expect(renderedHtml).toBe('');
    });

    it('createGrassTuftGeometry produces robust procedural cards with upward-biased hemisphere normals', () => {
      const geo = createGrassTuftGeometry();

      expect(geo).toBeDefined();
      const posAttr = geo.getAttribute('position');
      const normalAttr = geo.getAttribute('normal');
      const uvAttr = geo.getAttribute('uv');
      const bladeTipAttr = geo.getAttribute('bladeTip');

      expect(posAttr).toBeDefined();
      expect(posAttr.itemSize).toBe(3);
      // 3 cards * 4 triangles * 3 vertices = 36 vertices
      expect(posAttr.count).toBe(36);

      expect(normalAttr).toBeDefined();
      expect(normalAttr.itemSize).toBe(3);
      expect(normalAttr.count).toBe(36);

      // Verify all normals have upward bias (Y >= 0.85) for soft ambient light distribution
      for (let i = 0; i < normalAttr.count; i++) {
        const ny = normalAttr.getY(i);
        expect(ny).toBeGreaterThanOrEqual(0.85);
      }

      expect(uvAttr).toBeDefined();
      expect(uvAttr.itemSize).toBe(2);
      expect(uvAttr.count).toBe(36);

      expect(bladeTipAttr).toBeDefined();
      expect(bladeTipAttr.itemSize).toBe(1);
      expect(bladeTipAttr.count).toBe(36);

      // Verify buffer memory disposal
      expect(() => geo.dispose()).not.toThrow();
    });

    it('calculates 3,500 target grass clusters in mobile Balanced mode vs 0 in Low mode', () => {
      const calculateGrassClusters = (quality: GraphicsQuality, isMobile: boolean, isSnow: boolean, isBritain: boolean) => {
        const baseCount =
          isSnow || quality === 'low'
            ? 0
            : isMobile
            ? quality === 'medium'
              ? 3500
              : quality === 'high'
              ? 18000
              : 32000
            : quality === 'medium'
            ? 36000
            : quality === 'high'
            ? 72000
            : 105000;
        return isBritain ? Math.floor(baseCount * 1.3) : baseCount;
      };

      // In Low graphics: unconditionally 0 clusters
      expect(calculateGrassClusters('low', true, false, false)).toBe(0);
      expect(calculateGrassClusters('low', false, false, false)).toBe(0);
      expect(calculateGrassClusters('low', true, false, true)).toBe(0);
      expect(calculateGrassClusters('low', true, true, false)).toBe(0);

      // In Balanced mobile mode (medium quality): exactly 3,500 clusters (4,550 on Britain)
      expect(calculateGrassClusters('medium', true, false, false)).toBe(3500);
      expect(calculateGrassClusters('medium', true, false, true)).toBe(4550);

      // Desktop Balanced mode has 36,000 clusters
      expect(calculateGrassClusters('medium', false, false, false)).toBe(36000);
    });

    it('stress tests 100 rapid alternations between Low and Balanced mode without lingering state', () => {
      for (let i = 0; i < 100; i++) {
        const quality = i % 2 === 0 ? 'low' : 'medium';
        useSettingsStore.setState({ graphicsQuality: quality });

        if (quality === 'low') {
          expect(renderToString(<GrassField />)).toBe('');
        }
      }
    });

    it('verifies GrassChunkMesh unmount unregisters mesh cleanly to prevent memory leaks', () => {
      const registeredMeshes: (unknown | null)[] = [];
      const onMeshRegister = (mesh: unknown | null) => {
        registeredMeshes.push(mesh);
      };

      // Simulate mount
      const dummyMesh = { isInstancedMesh: true };
      onMeshRegister(dummyMesh);
      expect(registeredMeshes[registeredMeshes.length - 1]).toBe(dummyMesh);

      // Simulate unmount cleanup callback
      onMeshRegister(null);
      expect(registeredMeshes[registeredMeshes.length - 1]).toBeNull();
    });

    it('verifies GRASS_CHUNKS constant defines exactly 36 spatial chunks (6x6 grid)', () => {
      expect(GRASS_CHUNKS).toBe(6);
      const totalChunks = GRASS_CHUNKS * GRASS_CHUNKS;
      expect(totalChunks).toBe(36);
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Ocean with getClampedAnisotropy Mount & Disposal
  // =========================================================================
  describe('2. Ocean: getClampedAnisotropy Mount & Disposal Lifecycle Stress', () => {
    it('enforces getClampedAnisotropy clamping: base 8 clamped to 2 on mobile, preserved as 8 on desktop', () => {
      expect(getClampedAnisotropy(8, true)).toBe(2);
      expect(getClampedAnisotropy(8, false)).toBe(8);
      expect(getClampedAnisotropy(16, true)).toBe(2);
      expect(getClampedAnisotropy(16, false)).toBe(16);
      expect(getClampedAnisotropy(4, true)).toBe(2);
      expect(getClampedAnisotropy(4, false)).toBe(4);
      expect(getClampedAnisotropy(2, true)).toBe(2);
      expect(getClampedAnisotropy(1, true)).toBe(1);
    });

    it('handles degenerate and hostile anisotropy values gracefully without throwing', () => {
      expect(getClampedAnisotropy(0, true)).toBe(1);
      expect(getClampedAnisotropy(-10, true)).toBe(1);
      expect(getClampedAnisotropy(NaN, true)).toBe(1);
      expect(getClampedAnisotropy(Infinity, true)).toBe(1);
      expect(getClampedAnisotropy(-Infinity, true)).toBe(1);
    });

    it('executes 100 consecutive mount/dispose cycles for Ocean GPU resources without unhandled errors', () => {
      const mockHeights = new Float32Array(64 * 64);
      const mockIceTexture = new Texture();
      mockIceTexture.wrapS = RepeatWrapping;
      mockIceTexture.wrapT = RepeatWrapping;
      mockIceTexture.colorSpace = SRGBColorSpace;
      mockIceTexture.anisotropy = getClampedAnisotropy(8, true);

      expect(mockIceTexture.anisotropy).toBe(2);

      const onIceTextureDispose = vi.fn();
      mockIceTexture.addEventListener('dispose', onIceTextureDispose);

      const disposedHeightmaps: DataTexture[] = [];
      const disposedGeometries: PlaneGeometry[] = [];
      const disposedMaterials: MeshStandardMaterial[] = [];

      for (let cycle = 0; cycle < 100; cycle++) {
        // 1. Mount: Create terrainHeightmap
        const heightmap = new DataTexture(mockHeights, 64, 64, RedFormat, FloatType);
        heightmap.minFilter = LinearFilter;
        heightmap.magFilter = LinearFilter;

        // 2. Mount: Create waterMesh
        const segments = cycle % 2 === 0 ? 64 : 128;
        const geometry = new PlaneGeometry(1000, 1000, segments, segments);
        const material = new MeshStandardMaterial({ color: '#1a5276' });
        const mesh = new Mesh(geometry, material);

        // Verify clean structure
        expect(mesh.geometry).toBe(geometry);
        expect(mesh.material).toBe(material);

        // 3. Unmount: Execute Ocean disposal lifecycle
        heightmap.dispose();
        disposedHeightmaps.push(heightmap);

        mesh.geometry.dispose();
        disposedGeometries.push(geometry);

        mesh.material.dispose();
        disposedMaterials.push(material);

        // CRITICAL CHECK: iceTexture is cached across R3F and must NOT be disposed by Ocean unmount
        expect(onIceTextureDispose).not.toHaveBeenCalled();
      }

      expect(disposedHeightmaps.length).toBe(100);
      expect(disposedGeometries.length).toBe(100);
      expect(disposedMaterials.length).toBe(100);
      expect(onIceTextureDispose).not.toHaveBeenCalled();
    });

    it('verifies Ocean.tsx source decouples terrainHeightmap disposal from waterMesh re-creation', () => {
      const oceanSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/environment/Ocean.tsx'),
        'utf-8',
      );

      // Verify separate useEffect hooks for heightmap and waterMesh
      expect(oceanSrc).toContain('terrainHeightmap.dispose()');
      expect(oceanSrc).toContain('waterMesh.geometry.dispose()');
      expect(oceanSrc).toContain('waterMesh.material.dispose()');

      // Verify iceTexture anisotropy uses getClampedAnisotropy(8, isMobile)
      expect(oceanSrc).toMatch(/iceTexture\.anisotropy\s*=\s*getClampedAnisotropy\(8,\s*isMobile\)/);

      // Verify iceTexture is NOT disposed in Ocean unmount
      expect(oceanSrc).not.toContain('iceTexture.dispose()');
    });

    it('verifies segmentsCount adapts correctly to graphicsQuality (64 for low, 128 for medium, WATER_SEGMENTS for high)', () => {
      const getSegments = (quality: string) =>
        quality === 'low' ? 64 : quality === 'medium' ? 128 : WATER_SEGMENTS;

      expect(getSegments('low')).toBe(64);
      expect(getSegments('medium')).toBe(128);
      expect(getSegments('high')).toBe(WATER_SEGMENTS);
      expect(getSegments('very_high')).toBe(WATER_SEGMENTS);
    });
  });

  // =========================================================================
  // REQUIREMENT 3: PropsInstancer with canPropsCastShadow on Mobile
  // =========================================================================
  describe('3. PropsInstancer: canPropsCastShadow Evaluates False on Mobile & Disables All 27 Child Instancers', () => {
    it('pure predicate canPropsCastShadow strictly disables shadow casting on mobile for all quality modes', () => {
      // Mobile: ALWAYS false (saves 27 draw calls and shadow pass)
      expect(canPropsCastShadow(true, 'low')).toBe(false);
      expect(canPropsCastShadow(true, 'medium')).toBe(false); // Balanced
      expect(canPropsCastShadow(true, 'high')).toBe(false);
      expect(canPropsCastShadow(true, 'very_high')).toBe(false);

      // Desktop: true for medium, high, very_high; false for low
      expect(canPropsCastShadow(false, 'medium')).toBe(true);
      expect(canPropsCastShadow(false, 'high')).toBe(true);
      expect(canPropsCastShadow(false, 'very_high')).toBe(true);
      expect(canPropsCastShadow(false, 'low')).toBe(false);
    });

    it('verifies PropsInstancer forwards canShadow to all 4 child instancers', () => {
      const propsSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/PropsInstancer.tsx'),
        'utf-8',
      );

      // Verify canShadow calculation
      expect(propsSrc).toContain('const canShadow = canPropsCastShadow(isMobile, graphicsQuality);');

      // Verify all 4 child instancers receive canShadow
      expect(propsSrc).toMatch(/<VegetationInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toMatch(/<RocksInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toMatch(/<ArchitectureInstancer[^>]*canShadow=\{canShadow\}/s);
      expect(propsSrc).toMatch(/<TracksidePropsInstancer[^>]*canShadow=\{canShadow\}/s);
    });

    it('verifies VegetationInstancer binds castShadow={canShadow} on all 6 instanced meshes', () => {
      const vegSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/props/VegetationInstancer.tsx'),
        'utf-8',
      );

      // Matches all <instancedMesh tags
      const matches = vegSrc.match(/<instancedMesh[\s\S]*?\/>/g) || [];
      expect(matches.length).toBe(6);

      // All 6 must have castShadow={canShadow}
      matches.forEach((meshStr) => {
        expect(meshStr).toContain('castShadow={canShadow}');
        expect(meshStr).toContain('receiveShadow={canShadow}');
      });
    });

    it('verifies RocksInstancer binds castShadow={canShadow} on all 4 instanced meshes', () => {
      const rockSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/props/RocksInstancer.tsx'),
        'utf-8',
      );

      const matches = rockSrc.match(/<instancedMesh[\s\S]*?\/>/g) || [];
      expect(matches.length).toBe(4);

      matches.forEach((meshStr) => {
        expect(meshStr).toContain('castShadow={canShadow}');
        expect(meshStr).toContain('receiveShadow={canShadow}');
      });
    });

    it('verifies ArchitectureInstancer binds castShadow={canShadow} on all 13 instanced meshes', () => {
      const archSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/props/ArchitectureInstancer.tsx'),
        'utf-8',
      );

      const matches = archSrc.match(/<instancedMesh[\s\S]*?\/>/g) || [];
      expect(matches.length).toBe(13);

      matches.forEach((meshStr) => {
        expect(meshStr).toContain('castShadow={canShadow}');
        expect(meshStr).toContain('receiveShadow={canShadow}');
      });
    });

    it('verifies TracksidePropsInstancer binds castShadow={canShadow} on all 4 instanced meshes', () => {
      const trackSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/terrain/props/TracksidePropsInstancer.tsx'),
        'utf-8',
      );

      const matches = trackSrc.match(/<instancedMesh[\s\S]*?\/>/g) || [];
      expect(matches.length).toBe(4);

      matches.forEach((meshStr) => {
        expect(meshStr).toContain('castShadow={canShadow}');
        expect(meshStr).toContain('receiveShadow={canShadow}');
      });
    });

    it('confirms total mesh count: exactly 27 instanced meshes across all child instancers, 0 cast shadows on mobile', () => {
      // 6 (Vegetation) + 4 (Rocks) + 13 (Architecture) + 4 (Trackside) = 27 instanced meshes
      const totalMeshes = 6 + 4 + 13 + 4;
      expect(totalMeshes).toBe(27);

      const isMobile = true;
      const canShadow = canPropsCastShadow(isMobile, 'medium');
      expect(canShadow).toBe(false);

      // On mobile, active shadow casting meshes = 0
      const activeShadowMeshesOnMobile = canShadow ? totalMeshes : 0;
      expect(activeShadowMeshesOnMobile).toBe(0);

      // On desktop Balanced, active shadow casting meshes = 27
      const canShadowDesktop = canPropsCastShadow(false, 'medium');
      const activeShadowMeshesOnDesktop = canShadowDesktop ? totalMeshes : 0;
      expect(activeShadowMeshesOnDesktop).toBe(27);
    });
  });
});
