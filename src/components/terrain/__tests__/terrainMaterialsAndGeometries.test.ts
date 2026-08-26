import { describe, it, expect } from 'vitest';
import { Texture } from 'three';
import { createDetailedTerrainMaterial } from '@/components/terrain/Terrain';
import { createGrassTuftGeometry } from '@/components/terrain/GrassField';
import {
  createTrunkGeometry,
  createPineFoliageGeometry,
  createRealisticRockGeometry,
} from '@/components/terrain/PropsInstancer';

describe('Terrain Materials and Procedural Geometries', () => {
  it('creates detailed terrain material with all required uniforms and properties', () => {
    const dummyTex = new Texture();
    const material = createDetailedTerrainMaterial({
      quality: 'high',
      grassTexture: dummyTex,
      trackTexture: dummyTex,
      rockTexture: dummyTex,
      sandTexture: dummyTex,
      isDesert: false,
    });

    expect(material).toBeDefined();
    expect(material.vertexColors).toBe(true);
    expect(material.roughness).toBeGreaterThan(0.5);
    expect(typeof material.onBeforeCompile).toBe('function');
  });

  it('creates grass tuft geometry with bladeTip, uv, normal, and position attributes', () => {
    const geometry = createGrassTuftGeometry();

    expect(geometry.attributes.position).toBeDefined();
    expect(geometry.attributes.bladeTip).toBeDefined();
    expect(geometry.attributes.uv).toBeDefined();
    expect(geometry.attributes.normal).toBeDefined();

    const posCount = geometry.attributes.position.count;
    expect(posCount).toBeGreaterThan(0);
    expect(geometry.attributes.bladeTip.count).toBe(posCount);
  });

  it('creates organic tree trunk geometry with flared root base', () => {
    const trunk = createTrunkGeometry();

    expect(trunk.attributes.position).toBeDefined();
    expect(trunk.attributes.normal).toBeDefined();
    expect(trunk.attributes.uv).toBeDefined();
    expect(trunk.attributes.position.count).toBeGreaterThan(20);
  });

  it('creates multi-tier pine foliage canopy geometry', () => {
    const foliage = createPineFoliageGeometry();

    expect(foliage.attributes.position).toBeDefined();
    expect(foliage.attributes.uv).toBeDefined();
    expect(foliage.attributes.normal).toBeDefined();
    expect(foliage.attributes.position.count).toBeGreaterThan(50);
  });

  it('creates realistic fractured rock geometry with UVs', () => {
    const rock = createRealisticRockGeometry();

    expect(rock.attributes.position).toBeDefined();
    expect(rock.attributes.normal).toBeDefined();
    expect(rock.attributes.uv).toBeDefined();
    expect(rock.attributes.position.count).toBeGreaterThan(10);
  });
});
