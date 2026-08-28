import { describe, it, expect } from 'vitest';
import { Texture } from 'three';
import { createDetailedTerrainMaterial } from '@/components/terrain/Terrain';
import { createGrassTuftGeometry } from '@/components/terrain/GrassField';
import {
  createTrunkGeometry,
  createPineFoliageGeometry,
  createBirchTrunkGeometry,
  createBirchFoliageGeometry,
  createDesertTrunkGeometry,
  createDesertFoliageGeometry,
  createRealisticRockGeometry,
  createSandstoneRockGeometry,
  createCabinStoneGeometry,
  createCabinWallGeometry,
  createCabinDoorGeometry,
  createCabinWindowGeometry,
  createCabinRoofGeometry,
  createFenceGeometry,
} from '@/components/terrain/PropsInstancer';

describe('Terrain Materials and Procedural Geometries', () => {
  it('creates detailed terrain material with all required uniforms and properties', () => {
    const dummyTex = new Texture();
    const material = createDetailedTerrainMaterial({
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

  it('creates 3D volumetric grass tuft geometry with bladeTip, uv, normal, and position attributes', () => {
    const geometry = createGrassTuftGeometry();

    expect(geometry.attributes.position).toBeDefined();
    expect(geometry.attributes.bladeTip).toBeDefined();
    expect(geometry.attributes.uv).toBeDefined();
    expect(geometry.attributes.normal).toBeDefined();

    const posCount = geometry.attributes.position.count;
    expect(posCount).toBeGreaterThan(0);
    expect(geometry.attributes.bladeTip.count).toBe(posCount);
  });

  it('creates organic pine tree trunk geometry with flared root base', () => {
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

  it('creates branched European birch trunk geometry', () => {
    const trunk = createBirchTrunkGeometry();

    expect(trunk.attributes.position).toBeDefined();
    expect(trunk.attributes.normal).toBeDefined();
    expect(trunk.attributes.uv).toBeDefined();
    expect(trunk.attributes.position.count).toBeGreaterThan(30);
  });

  it('creates volumetric birch/broadleaf rounded foliage canopy geometry', () => {
    const foliage = createBirchFoliageGeometry();

    expect(foliage.attributes.position).toBeDefined();
    expect(foliage.attributes.uv).toBeDefined();
    expect(foliage.attributes.normal).toBeDefined();
    expect(foliage.attributes.position.count).toBeGreaterThan(50);
  });

  it('creates twisted desert acacia trunk geometry', () => {
    const trunk = createDesertTrunkGeometry();

    expect(trunk.attributes.position).toBeDefined();
    expect(trunk.attributes.normal).toBeDefined();
    expect(trunk.attributes.uv).toBeDefined();
    expect(trunk.attributes.position.count).toBeGreaterThan(25);
  });

  it('creates flat umbrella desert foliage geometry', () => {
    const foliage = createDesertFoliageGeometry();

    expect(foliage.attributes.position).toBeDefined();
    expect(foliage.attributes.uv).toBeDefined();
    expect(foliage.attributes.normal).toBeDefined();
    expect(foliage.attributes.position.count).toBeGreaterThan(40);
  });

  it('creates realistic fractured granite rock geometry with UVs', () => {
    const rock = createRealisticRockGeometry();

    expect(rock.attributes.position).toBeDefined();
    expect(rock.attributes.normal).toBeDefined();
    expect(rock.attributes.uv).toBeDefined();
    expect(rock.attributes.position.count).toBeGreaterThan(10);
  });

  it('creates layered sandstone slab geometry with UVs', () => {
    const rock = createSandstoneRockGeometry();

    expect(rock.attributes.position).toBeDefined();
    expect(rock.attributes.normal).toBeDefined();
    expect(rock.attributes.uv).toBeDefined();
    expect(rock.attributes.position.count).toBeGreaterThan(10);
  });

  it('creates deep grounded stone foundation and chimney geometry', () => {
    const stone = createCabinStoneGeometry();

    expect(stone.attributes.position).toBeDefined();
    expect(stone.attributes.normal).toBeDefined();
    expect(stone.attributes.uv).toBeDefined();
    expect(stone.attributes.position.count).toBeGreaterThan(20);
  });

  it('creates rustic cabin wall geometry with porch posts and log notches', () => {
    const cabin = createCabinWallGeometry();

    expect(cabin.attributes.position).toBeDefined();
    expect(cabin.attributes.normal).toBeDefined();
    expect(cabin.attributes.uv).toBeDefined();
    expect(cabin.attributes.position.count).toBeGreaterThan(30);
  });

  it('creates textured wooden entrance door geometry', () => {
    const door = createCabinDoorGeometry();

    expect(door.attributes.position).toBeDefined();
    expect(door.attributes.normal).toBeDefined();
    expect(door.attributes.uv).toBeDefined();
    expect(door.attributes.position.count).toBeGreaterThan(5);
  });

  it('creates authentic 3D rustic window geometry for cabins', () => {
    const windows = createCabinWindowGeometry();

    expect(windows.attributes.position).toBeDefined();
    expect(windows.attributes.normal).toBeDefined();
    expect(windows.attributes.uv).toBeDefined();
    expect(windows.attributes.position.count).toBeGreaterThan(20);
  });

  it('creates pitched A-frame roof geometry for cabins', () => {
    const roof = createCabinRoofGeometry();

    expect(roof.attributes.position).toBeDefined();
    expect(roof.attributes.normal).toBeDefined();
    expect(roof.attributes.uv).toBeDefined();
    expect(roof.attributes.position.count).toBeGreaterThan(30);
  });

  it('creates deeply anchored split-rail village wooden fence geometry', () => {
    const fence = createFenceGeometry();

    expect(fence.attributes.position).toBeDefined();
    expect(fence.attributes.normal).toBeDefined();
    expect(fence.attributes.uv).toBeDefined();
    expect(fence.attributes.position.count).toBeGreaterThan(30);
  });
});
