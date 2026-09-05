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
  createRealisticRockGeometry,
  createSandstoneRockGeometry,
  createStandingStoneGeometry,
  createStoneCairnGeometry,
} from './geometries';
import type { PropItem } from './types';

export interface RocksInstancerProps {
  rocks: PropItem[];
  sandstoneRocks: PropItem[];
  standingStones: PropItem[];
  stoneCairns: PropItem[];
  canShadow: boolean;
  isSnow: boolean;
  rockTexture: Texture;
  sandTexture: Texture;
  celticStandingStoneTexture: Texture;
}

/**
 * GPU instanced renderer for geological terrain props:
 * granite boulders, desert sandstone crags, celtic megaliths, and mountain cairns.
 */
export function RocksInstancer({
  rocks,
  sandstoneRocks,
  standingStones,
  stoneCairns,
  canShadow,
  isSnow,
  rockTexture,
  sandTexture,
  celticStandingStoneTexture,
}: RocksInstancerProps) {
  const rockRef = useRef<InstancedMesh>(null);
  const sandstoneRef = useRef<InstancedMesh>(null);
  const standingStoneRef = useRef<InstancedMesh>(null);
  const stoneCairnRef = useRef<InstancedMesh>(null);

  // Geometries with genuine bounding spheres
  const rockGeo = useMemo(() => {
    const geo = createRealisticRockGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const sandstoneGeo = useMemo(() => {
    const geo = createSandstoneRockGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const standingStoneGeo = useMemo(() => {
    const geo = createStandingStoneGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const stoneCairnGeo = useMemo(() => {
    const geo = createStoneCairnGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // Materials
  const rockMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockTexture,
        roughness: isSnow ? 0.92 : 0.85,
        metalness: 0.05,
        color: new Color(isSnow ? '#b5bec8' : '#9fa4ab'),
      }),
    [rockTexture, isSnow],
  );

  const sandstoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: sandTexture,
        roughness: 0.90,
        metalness: 0.02,
        color: new Color('#bf8b5a'),
      }),
    [sandTexture],
  );

  const standingStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: celticStandingStoneTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color('#ffffff'),
      }),
    [celticStandingStoneTexture],
  );

  const stoneCairnMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: celticStandingStoneTexture,
        roughness: 0.90,
        metalness: 0.02,
        color: new Color('#c0c6cc'),
      }),
    [celticStandingStoneTexture],
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

    uploadBatch(rockRef.current, rocks);
    uploadBatch(sandstoneRef.current, sandstoneRocks);
    uploadBatch(standingStoneRef.current, standingStones);
    uploadBatch(stoneCairnRef.current, stoneCairns);
  }, [rocks, sandstoneRocks, standingStones, stoneCairns]);

  return (
    <>
      {/* 1. Granite Boulders */}
      <instancedMesh
        ref={rockRef}
        args={[rockGeo, rockMaterial, Math.max(1, rocks.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 2. Sandstone Crags */}
      <instancedMesh
        ref={sandstoneRef}
        args={[sandstoneGeo, sandstoneMaterial, Math.max(1, sandstoneRocks.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 3. Ancient Celtic Standing Stones */}
      <instancedMesh
        ref={standingStoneRef}
        args={[standingStoneGeo, standingStoneMaterial, Math.max(1, standingStones.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 4. Highland Mountain Stone Cairns */}
      <instancedMesh
        ref={stoneCairnRef}
        args={[stoneCairnGeo, stoneCairnMaterial, Math.max(1, stoneCairns.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
    </>
  );
}
