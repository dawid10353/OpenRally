import { useMemo } from 'react';
import {
  Vector3,
  Sphere,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { useTexture } from '@react-three/drei';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileDevice, getClampedAnisotropy } from '@/utils/device';
import {
  usePropsData,
  ProximityColliders,
  VegetationInstancer,
  RocksInstancer,
  ArchitectureInstancer,
  TracksidePropsInstancer,
} from './props';
import type { PropItem } from './props/types';

// Re-export all procedural geometry builders for 100% test suite and project-wide compatibility
export {
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
} from './props/geometries';

/**
 * Evaluates whether terrain prop instanced meshes should cast and receive shadows.
 *
 * Performance Rationale (Mobile GPU optimization):
 * The terrain features up to 27 distinct instanced meshes across 4 categories (vegetation,
 * rocks, architecture, and trackside props). Casting shadows from all props requires an additional
 * shadow map pass, causing severe fill-rate and draw call overhead on mobile GPUs.
 *
 * - On mobile (`isMobile === true`): Prop shadows are strictly disabled across all quality
 *   levels (including Balanced 'medium', 'high', and 'very_high').
 * - On desktop (`isMobile === false`): Prop shadows are enabled for all modes except 'low'.
 *
 * @param isMobile Whether the current runtime environment is a mobile/touch device.
 * @param graphicsQuality The current graphics quality setting ('low' | 'medium' | 'high' | 'very_high').
 * @returns boolean True if prop meshes should cast and receive shadows; false otherwise.
 */
export function canPropsCastShadow(isMobile: boolean, graphicsQuality: string): boolean {
  return !isMobile && graphicsQuality !== 'low';
}

/**
 * Computes a genuine bounding sphere encompassing all placed instances for a prop group.
 */
export function computeInstanceBoundingSphere(items: PropItem[], geometryRadius = 5): Sphere {
  const sphere = new Sphere();
  if (!items || items.length === 0) {
    sphere.radius = -1;
    return sphere;
  }
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const pos = new Vector3();
  for (let i = 0; i < items.length; i++) {
    pos.setFromMatrixPosition(items[i].matrix);
    min.min(pos);
    max.max(pos);
  }
  sphere.center.addVectors(min, max).multiplyScalar(0.5);
  let maxDistSq = 0;
  for (let i = 0; i < items.length; i++) {
    pos.setFromMatrixPosition(items[i].matrix);
    const dSq = pos.distanceToSquared(sphere.center);
    if (dSq > maxDistSq) maxDistSq = dSq;
  }
  sphere.radius = Math.sqrt(maxDistSq) + geometryRadius;
  return sphere;
}

/**
 * Clean orchestrator component for all GPU-instanced terrain props,
 * proximity Rapier physics colliders, and environmental dressing.
 */
export function PropsInstancer() {
  const { levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  // Load shared props textures
  const [
    pineBarkTexture,
    pineBranchTexture,
    pineBranchSnowTexture,
    birchBarkTexture,
    leafyBranchTexture,
    desertBarkTexture,
    desertAcaciaBranchTexture,
    rockTexture,
    sandTexture,
    cabinTimberWallTexture,
    cabinRedWallTexture,
    cabinDoorTexture,
    cabinWindowTexture,
    cabinRoofTexture,
    cabinRoofSnowTexture,
    fenceTexture,
    castleStoneTexture,
    _castleCobblestoneTexture,
    britishDrystoneTexture,
    celticStandingStoneTexture,
    _highlandCottageWallTexture,
    highlandCottageThatchTexture,
  ] = useTexture([
    '/textures/foliage/tree_bark.jpg',
    '/textures/foliage/pine_branch.jpg',
    '/textures/foliage/pine_branch_snow.jpg',
    '/textures/foliage/birch_bark.jpg',
    '/textures/foliage/leafy_branch.jpg',
    '/textures/foliage/desert_bark.jpg',
    '/textures/foliage/desert_acacia_branch.jpg',
    '/textures/terrain/rock_cliff.jpg',
    '/textures/terrain/desert_sand.jpg',
    '/textures/props/cabin_timber_wall.jpg',
    '/textures/props/cabin_red_wall.jpg',
    '/textures/props/cabin_door.jpg',
    '/textures/props/cabin_window.jpg',
    '/textures/props/cabin_roof.jpg',
    '/textures/props/cabin_roof_snow.jpg',
    '/textures/props/rustic_fence.jpg',
    '/textures/props/castle_stone_wall.jpg',
    '/textures/props/castle_cobblestone.jpg',
    '/textures/props/british_drystone_wall.jpg',
    '/textures/props/celtic_standing_stone.jpg',
    '/textures/props/highland_cottage_wall.jpg',
    '/textures/props/highland_cottage_thatch.jpg',
  ]);

  useMemo(() => {
    const isMobile = isMobileDevice();
    const anisotropy = getClampedAnisotropy(4, isMobile);
    [
      pineBarkTexture,
      pineBranchTexture,
      pineBranchSnowTexture,
      birchBarkTexture,
      leafyBranchTexture,
      desertBarkTexture,
      desertAcaciaBranchTexture,
      rockTexture,
      sandTexture,
      cabinTimberWallTexture,
      cabinRedWallTexture,
      cabinDoorTexture,
      cabinWindowTexture,
      cabinRoofTexture,
      cabinRoofSnowTexture,
      fenceTexture,
      castleStoneTexture,
      _castleCobblestoneTexture,
      britishDrystoneTexture,
      celticStandingStoneTexture,
      _highlandCottageWallTexture,
      highlandCottageThatchTexture,
    ].forEach((tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = anisotropy;
      tex.needsUpdate = true;
    });
  }, [
    pineBarkTexture,
    pineBranchTexture,
    pineBranchSnowTexture,
    birchBarkTexture,
    leafyBranchTexture,
    desertBarkTexture,
    desertAcaciaBranchTexture,
    rockTexture,
    sandTexture,
    cabinTimberWallTexture,
    cabinRedWallTexture,
    cabinDoorTexture,
    cabinWindowTexture,
    cabinRoofTexture,
    cabinRoofSnowTexture,
    fenceTexture,
    castleStoneTexture,
    _castleCobblestoneTexture,
    britishDrystoneTexture,
    celticStandingStoneTexture,
    _highlandCottageWallTexture,
    highlandCottageThatchTexture,
  ]);

  const levelId = levelData.id.toLowerCase();
  const isDesert = levelId.includes('desert');
  const isSnow = levelId.includes('sweden') || levelId.includes('snow') || levelId.includes('winter');
  const isMobile = isMobileDevice();
  const canShadow = canPropsCastShadow(isMobile, graphicsQuality);

  // Compute terrain ground-snapped matrices and categorized collections
  const categorized = usePropsData();

  return (
    <>
      {/* Isolated Dynamic Proximity Physics Colliders */}
      <ProximityColliders
        spatialGrid={categorized.spatialGrid}
        initialTrees={[...categorized.pineTrees, ...categorized.birchTrees, ...categorized.desertTrees].slice(0, 120)}
        initialRocks={[...categorized.rocks, ...categorized.sandstoneRocks].slice(0, 40)}
        initialCabins={categorized.cabins.slice(0, 10)}
        initialFences={categorized.fences.slice(0, 40)}
        initialCastleTowers={categorized.castleTowers.slice(0, 16)}
        initialCastleWalls={categorized.castleWalls.slice(0, 30)}
        initialCastleGates={categorized.castleGates.slice(0, 8)}
        initialCastleKeeps={categorized.castleKeeps.slice(0, 4)}
        initialCastleArches={categorized.castleArches.slice(0, 12)}
        initialStoneWalls={categorized.stoneWalls.slice(0, 50)}
        initialStandingStones={categorized.standingStones.slice(0, 30)}
        initialHighlandCottages={categorized.highlandCottages.slice(0, 12)}
        initialStoneCairns={categorized.stoneCairns.slice(0, 12)}
        initialHayBales={categorized.hayBales.slice(0, 20)}
        initialRallySigns={categorized.rallySigns.slice(0, 20)}
        initialStoneBridges={categorized.stoneBridges.slice(0, 4)}
      />

      {/* 1. GPU-Instanced Vegetation (Pines, Birch, Acacia + Wind Displacement) */}
      <VegetationInstancer
        pineTrees={categorized.pineTrees}
        birchTrees={categorized.birchTrees}
        desertTrees={categorized.desertTrees}
        canShadow={canShadow}
        isSnow={isSnow}
        isDesert={isDesert}
        pineBarkTexture={pineBarkTexture}
        pineBranchTexture={pineBranchTexture}
        pineBranchSnowTexture={pineBranchSnowTexture}
        birchBarkTexture={birchBarkTexture}
        leafyBranchTexture={leafyBranchTexture}
        desertBarkTexture={desertBarkTexture}
        desertAcaciaBranchTexture={desertAcaciaBranchTexture}
      />

      {/* 2. GPU-Instanced Rocks & Megaliths (Granite, Sandstone, Standing Stones, Cairns) */}
      <RocksInstancer
        rocks={categorized.rocks}
        sandstoneRocks={categorized.sandstoneRocks}
        standingStones={categorized.standingStones}
        stoneCairns={categorized.stoneCairns}
        canShadow={canShadow}
        isSnow={isSnow}
        rockTexture={rockTexture}
        sandTexture={sandTexture}
        celticStandingStoneTexture={celticStandingStoneTexture}
      />

      {/* 3. GPU-Instanced Architecture (Cabins, Cottages, Fortress, Bridges) */}
      <ArchitectureInstancer
        cabins={categorized.cabins}
        highlandCottages={categorized.highlandCottages}
        castleTowers={categorized.castleTowers}
        castleWalls={categorized.castleWalls}
        castleGates={categorized.castleGates}
        castleKeeps={categorized.castleKeeps}
        castleArches={categorized.castleArches}
        stoneBridges={categorized.stoneBridges}
        canShadow={canShadow}
        isSnow={isSnow}
        rockTexture={rockTexture}
        cabinTimberWallTexture={cabinTimberWallTexture}
        cabinRedWallTexture={cabinRedWallTexture}
        cabinDoorTexture={cabinDoorTexture}
        cabinWindowTexture={cabinWindowTexture}
        cabinRoofTexture={cabinRoofTexture}
        cabinRoofSnowTexture={cabinRoofSnowTexture}
        castleStoneTexture={castleStoneTexture}
        britishDrystoneTexture={britishDrystoneTexture}
        highlandCottageThatchTexture={highlandCottageThatchTexture}
      />

      {/* 4. GPU-Instanced Trackside Props (Fences, Dyke Walls, Hay Bales, Rally Signs) */}
      <TracksidePropsInstancer
        fences={categorized.fences}
        stoneWalls={categorized.stoneWalls}
        hayBales={categorized.hayBales}
        rallySigns={categorized.rallySigns}
        canShadow={canShadow}
        isSnow={isSnow}
        fenceTexture={fenceTexture}
        britishDrystoneTexture={britishDrystoneTexture}
        highlandCottageThatchTexture={highlandCottageThatchTexture}
        cabinRedWallTexture={cabinRedWallTexture}
      />
    </>
  );
}
