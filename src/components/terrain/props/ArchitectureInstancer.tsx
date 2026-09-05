import { useRef, useMemo, useLayoutEffect } from 'react';
import {
  InstancedMesh,
  Color,
  MeshStandardMaterial,
  type Texture,
  Sphere,
  Vector3,
} from 'three';
import {
  createCabinStoneGeometry,
  createCabinWallGeometry,
  createCabinDoorGeometry,
  createCabinWindowGeometry,
  createCabinRoofGeometry,
  createCastleTowerGeometry,
  createCastleWallGeometry,
  createCastleGateGeometry,
  createCastleKeepGeometry,
  createCastleArchGeometry,
  createHighlandCottageWallGeometry,
  createHighlandCottageRoofGeometry,
  createStoneBridgeGeometry,
} from './geometries';
import type { PropItem } from './types';

export interface ArchitectureInstancerProps {
  cabins: PropItem[];
  highlandCottages: PropItem[];
  castleTowers: PropItem[];
  castleWalls: PropItem[];
  castleGates: PropItem[];
  castleKeeps: PropItem[];
  castleArches: PropItem[];
  stoneBridges: PropItem[];
  canShadow: boolean;
  isSnow: boolean;
  rockTexture: Texture;
  cabinTimberWallTexture: Texture;
  cabinRedWallTexture: Texture;
  cabinDoorTexture: Texture;
  cabinWindowTexture: Texture;
  cabinRoofTexture: Texture;
  cabinRoofSnowTexture: Texture;
  castleStoneTexture: Texture;
  britishDrystoneTexture: Texture;
  highlandCottageThatchTexture: Texture;
}

/**
 * GPU instanced renderer for architectural structures:
 * Nordic timber cabins, Scottish croft cottages, medieval fortress complex, and stone packhorse bridges.
 */
export function ArchitectureInstancer({
  cabins,
  highlandCottages,
  castleTowers,
  castleWalls,
  castleGates,
  castleKeeps,
  castleArches,
  stoneBridges,
  canShadow,
  isSnow,
  rockTexture,
  cabinTimberWallTexture,
  cabinRedWallTexture,
  cabinDoorTexture,
  cabinWindowTexture,
  cabinRoofTexture,
  cabinRoofSnowTexture,
  castleStoneTexture,
  britishDrystoneTexture,
  highlandCottageThatchTexture,
}: ArchitectureInstancerProps) {
  const cabinStoneRef = useRef<InstancedMesh>(null);
  const cabinWallRef = useRef<InstancedMesh>(null);
  const cabinDoorRef = useRef<InstancedMesh>(null);
  const cabinWindowRef = useRef<InstancedMesh>(null);
  const cabinRoofRef = useRef<InstancedMesh>(null);

  const cottageWallRef = useRef<InstancedMesh>(null);
  const cottageRoofRef = useRef<InstancedMesh>(null);

  const castleTowerRef = useRef<InstancedMesh>(null);
  const castleWallRef = useRef<InstancedMesh>(null);
  const castleGateRef = useRef<InstancedMesh>(null);
  const castleKeepRef = useRef<InstancedMesh>(null);
  const castleArchRef = useRef<InstancedMesh>(null);
  const stoneBridgeRef = useRef<InstancedMesh>(null);

  // Geometries with genuine bounding spheres
  const cabinStoneGeo = useMemo(() => {
    const geo = createCabinStoneGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cabinWallGeo = useMemo(() => {
    const geo = createCabinWallGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cabinDoorGeo = useMemo(() => {
    const geo = createCabinDoorGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cabinWindowGeo = useMemo(() => {
    const geo = createCabinWindowGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cabinRoofGeo = useMemo(() => {
    const geo = createCabinRoofGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cottageWallGeo = useMemo(() => {
    const geo = createHighlandCottageWallGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const cottageRoofGeo = useMemo(() => {
    const geo = createHighlandCottageRoofGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const castleTowerGeo = useMemo(() => {
    const geo = createCastleTowerGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const castleWallGeo = useMemo(() => {
    const geo = createCastleWallGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const castleGateGeo = useMemo(() => {
    const geo = createCastleGateGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const castleKeepGeo = useMemo(() => {
    const geo = createCastleKeepGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const castleArchGeo = useMemo(() => {
    const geo = createCastleArchGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const stoneBridgeGeo = useMemo(() => {
    const geo = createStoneBridgeGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // Materials
  const cabinStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color('#888c92'),
      }),
    [rockTexture],
  );

  const cabinWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: isSnow ? cabinRedWallTexture : cabinTimberWallTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color(isSnow ? '#b83b2a' : '#755f4c'),
      }),
    [cabinTimberWallTexture, cabinRedWallTexture, isSnow],
  );

  const cabinDoorMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinDoorTexture,
        roughness: 0.82,
        metalness: 0.04,
        color: new Color(isSnow ? '#ded9ce' : '#80654e'),
      }),
    [cabinDoorTexture, isSnow],
  );

  const cabinWindowMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinWindowTexture,
        roughness: 0.35,
        metalness: 0.12,
        color: new Color('#e0dbcb'),
      }),
    [cabinWindowTexture],
  );

  const cabinRoofMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: isSnow ? cabinRoofSnowTexture : cabinRoofTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color(isSnow ? '#ffffff' : '#635e4f'),
      }),
    [cabinRoofTexture, cabinRoofSnowTexture, isSnow],
  );

  const castleStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: castleStoneTexture,
        roughness: 0.86,
        metalness: 0.02,
        color: new Color('#ffffff'),
      }),
    [castleStoneTexture],
  );

  const cottageWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#eae6dc'),
      }),
    [britishDrystoneTexture],
  );

  const cottageRoofMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: highlandCottageThatchTexture,
        roughness: 0.92,
        metalness: 0.01,
        color: new Color('#ffffff'),
      }),
    [highlandCottageThatchTexture],
  );

  const stoneBridgeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#ded9ce'),
      }),
    [britishDrystoneTexture],
  );

  // VRAM Upload per batch
  useLayoutEffect(() => {
    const uploadBatch = (mesh: InstancedMesh | null, items: PropItem[]) => {
      if (!mesh) return;
      for (let i = 0; i < items.length; i++) {
        mesh.setMatrixAt(i, items[i].matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = items.length;
      if (items.length > 0) {
        mesh.visible = true;
        mesh.computeBoundingSphere();
      } else {
        mesh.visible = false;
        mesh.boundingSphere = new Sphere(new Vector3(0, 0, 0), -1);
      }
    };

    uploadBatch(cabinStoneRef.current, cabins);
    uploadBatch(cabinWallRef.current, cabins);
    uploadBatch(cabinDoorRef.current, cabins);
    uploadBatch(cabinWindowRef.current, cabins);
    uploadBatch(cabinRoofRef.current, cabins);

    uploadBatch(cottageWallRef.current, highlandCottages);
    uploadBatch(cottageRoofRef.current, highlandCottages);

    uploadBatch(castleTowerRef.current, castleTowers);
    uploadBatch(castleWallRef.current, castleWalls);
    uploadBatch(castleGateRef.current, castleGates);
    uploadBatch(castleKeepRef.current, castleKeeps);
    uploadBatch(castleArchRef.current, castleArches);
    uploadBatch(stoneBridgeRef.current, stoneBridges);
  }, [
    cabins,
    highlandCottages,
    castleTowers,
    castleWalls,
    castleGates,
    castleKeeps,
    castleArches,
    stoneBridges,
  ]);

  return (
    <>
      {/* 1. Rustic Cabins */}
      <instancedMesh
        ref={cabinStoneRef}
        args={[cabinStoneGeo, cabinStoneMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinWallRef}
        args={[cabinWallGeo, cabinWallMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinDoorRef}
        args={[cabinDoorGeo, cabinDoorMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinWindowRef}
        args={[cabinWindowGeo, cabinWindowMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinRoofRef}
        args={[cabinRoofGeo, cabinRoofMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 2. Scottish Croft Cottages */}
      <instancedMesh
        ref={cottageWallRef}
        args={[cottageWallGeo, cottageWallMaterial, Math.max(1, highlandCottages.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cottageRoofRef}
        args={[cottageRoofGeo, cottageRoofMaterial, Math.max(1, highlandCottages.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 3. Medieval Castle Complex */}
      <instancedMesh
        ref={castleTowerRef}
        args={[castleTowerGeo, castleStoneMaterial, Math.max(1, castleTowers.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={castleWallRef}
        args={[castleWallGeo, castleStoneMaterial, Math.max(1, castleWalls.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={castleGateRef}
        args={[castleGateGeo, castleStoneMaterial, Math.max(1, castleGates.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={castleKeepRef}
        args={[castleKeepGeo, castleStoneMaterial, Math.max(1, castleKeeps.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={castleArchRef}
        args={[castleArchGeo, castleStoneMaterial, Math.max(1, castleArches.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 4. Ancient Arched Stone Packhorse Bridges */}
      <instancedMesh
        ref={stoneBridgeRef}
        args={[stoneBridgeGeo, stoneBridgeMaterial, Math.max(1, stoneBridges.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
    </>
  );
}
