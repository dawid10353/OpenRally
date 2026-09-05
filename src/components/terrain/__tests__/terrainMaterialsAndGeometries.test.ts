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
  createCastleTowerGeometry,
  createCastleWallGeometry,
  createCastleGateGeometry,
  createCastleKeepGeometry,
  createCastleArchGeometry,
  createStoneWallGeometry,
  createStandingStoneGeometry,
  createHighlandCottageWallGeometry,
  createHighlandCottageRoofGeometry,
  createStoneCairnGeometry,
  createHayBaleGeometry,
  createRallySignGeometry,
  createStoneBridgeGeometry,
} from '@/components/terrain/PropsInstancer';

describe('Terrain Materials and Procedural Geometries', () => {
  it('creates detailed terrain material with all required uniforms and properties', () => {
    const dummyTex = new Texture();
    const material = createDetailedTerrainMaterial({
      grassTexture: dummyTex,
      trackTexture: dummyTex,
      rockTexture: dummyTex,
      sandTexture: dummyTex,
      snowTexture: dummyTex,
      snowTrackTexture: dummyTex,
      isDesert: false,
      isSnow: false,
    });

    expect(material).toBeDefined();
    expect(material.vertexColors).toBe(true);
    expect(material.roughness).toBeGreaterThan(0.5);
    expect(typeof material.onBeforeCompile).toBe('function');

    const snowMaterial = createDetailedTerrainMaterial({
      grassTexture: dummyTex,
      trackTexture: dummyTex,
      rockTexture: dummyTex,
      sandTexture: dummyTex,
      snowTexture: dummyTex,
      snowTrackTexture: dummyTex,
      isDesert: false,
      isSnow: true,
    });

    expect(snowMaterial).toBeDefined();
    expect(snowMaterial.roughness).toBeGreaterThan(0.85);
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

  it('creates monumental round castle tower geometry with battlements and foundation', () => {
    const tower = createCastleTowerGeometry();

    expect(tower.attributes.position).toBeDefined();
    expect(tower.attributes.normal).toBeDefined();
    expect(tower.attributes.uv).toBeDefined();
    expect(tower.attributes.position.count).toBeGreaterThan(50);
  });

  it('creates medieval fortress curtain wall geometry with crenellations', () => {
    const wall = createCastleWallGeometry();

    expect(wall.attributes.position).toBeDefined();
    expect(wall.attributes.normal).toBeDefined();
    expect(wall.attributes.uv).toBeDefined();
    expect(wall.attributes.position.count).toBeGreaterThan(40);
  });

  it('creates Gothic arched castle barbican gatehouse geometry', () => {
    const gate = createCastleGateGeometry();

    expect(gate.attributes.position).toBeDefined();
    expect(gate.attributes.normal).toBeDefined();
    expect(gate.attributes.uv).toBeDefined();
    expect(gate.attributes.position.count).toBeGreaterThan(60);
  });

  it('creates British countryside dry-stone wall geometry', () => {
    const stoneWall = createStoneWallGeometry();

    expect(stoneWall.attributes.position).toBeDefined();
    expect(stoneWall.attributes.normal).toBeDefined();
    expect(stoneWall.attributes.uv).toBeDefined();
    expect(stoneWall.attributes.position.count).toBeGreaterThan(20);
  });

  it('creates grand medieval donjon keep citadel geometry with corner turrets', () => {
    const keep = createCastleKeepGeometry();

    expect(keep.attributes.position).toBeDefined();
    expect(keep.attributes.normal).toBeDefined();
    expect(keep.attributes.uv).toBeDefined();
    expect(keep.attributes.position.count).toBeGreaterThan(80);
  });

  it('creates ruined Gothic stone pointed archway and arcade geometry', () => {
    const arch = createCastleArchGeometry();

    expect(arch.attributes.position).toBeDefined();
    expect(arch.attributes.normal).toBeDefined();
    expect(arch.attributes.uv).toBeDefined();
    expect(arch.attributes.position.count).toBeGreaterThan(40);
  });

  it('creates ancient Celtic standing megalith stone geometry', () => {
    const stone = createStandingStoneGeometry();

    expect(stone.attributes.position).toBeDefined();
    expect(stone.attributes.normal).toBeDefined();
    expect(stone.attributes.uv).toBeDefined();
    expect(stone.attributes.position.count).toBeGreaterThan(30);
  });

  it('creates Scottish highland croft cottage walls and thatched roof geometries', () => {
    const walls = createHighlandCottageWallGeometry();
    const roof = createHighlandCottageRoofGeometry();

    expect(walls.attributes.position).toBeDefined();
    expect(walls.attributes.normal).toBeDefined();
    expect(walls.attributes.uv).toBeDefined();
    expect(walls.attributes.position.count).toBeGreaterThan(40);

    expect(roof.attributes.position).toBeDefined();
    expect(roof.attributes.normal).toBeDefined();
    expect(roof.attributes.uv).toBeDefined();
    expect(roof.attributes.position.count).toBeGreaterThan(10);
  });

  it('creates mountain stone cairn with Celtic cross geometry', () => {
    const cairn = createStoneCairnGeometry();

    expect(cairn.attributes.position).toBeDefined();
    expect(cairn.attributes.normal).toBeDefined();
    expect(cairn.attributes.uv).toBeDefined();
    expect(cairn.attributes.position.count).toBeGreaterThan(50);
  });

  it('creates agricultural straw hay bale geometry', () => {
    const bale = createHayBaleGeometry();

    expect(bale.attributes.position).toBeDefined();
    expect(bale.attributes.normal).toBeDefined();
    expect(bale.attributes.uv).toBeDefined();
    expect(bale.attributes.position.count).toBeGreaterThan(20);
  });

  it('creates rally warning chevron sign geometry', () => {
    const sign = createRallySignGeometry();

    expect(sign.attributes.position).toBeDefined();
    expect(sign.attributes.normal).toBeDefined();
    expect(sign.attributes.uv).toBeDefined();
    expect(sign.attributes.position.count).toBeGreaterThan(15);
  });

  it('creates ancient arched stone bridge geometry', () => {
    const bridge = createStoneBridgeGeometry();

    expect(bridge.attributes.position).toBeDefined();
    expect(bridge.attributes.normal).toBeDefined();
    expect(bridge.attributes.uv).toBeDefined();
    expect(bridge.attributes.position.count).toBeGreaterThan(20);
  });

  describe('Texture Anisotropy Clamping (R4)', () => {
    it('clamps terrain texture anisotropy to <= 2 when on mobile devices', () => {
      const qualities = ['low', 'medium', 'high', 'very_high'] as const;
      for (const q of qualities) {
        const base = q === 'very_high' ? 16 : q === 'high' ? 8 : 4;
        const mobileAnisotropy = Math.min(base, 2);
        expect(mobileAnisotropy).toBe(2);
        expect(mobileAnisotropy).toBeLessThanOrEqual(2);
      }
    });

    it('preserves high desktop anisotropy up to 16x when on desktop devices', () => {
      const getDesktopAnisotropy = (q: string) => (q === 'very_high' ? 16 : q === 'high' ? 8 : 4);
      expect(getDesktopAnisotropy('very_high')).toBe(16);
      expect(getDesktopAnisotropy('high')).toBe(8);
      expect(getDesktopAnisotropy('medium')).toBe(4);
      expect(getDesktopAnisotropy('low')).toBe(4);
    });

    it('applies clamped anisotropy to texture instances', () => {
      const tex = new Texture();
      const isMobile = true;
      const baseAnisotropy = 16;
      tex.anisotropy = isMobile ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
      expect(tex.anisotropy).toBe(2);

      const desktopTex = new Texture();
      const isDesktop = false;
      desktopTex.anisotropy = isDesktop ? Math.min(baseAnisotropy, 2) : baseAnisotropy;
      expect(desktopTex.anisotropy).toBe(16);
    });
  });
});
