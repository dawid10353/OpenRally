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
  createFenceGeometry,
  createStoneWallGeometry,
  createHayBaleGeometry,
  createRallySignGeometry,
} from './geometries';
import type { PropItem } from './types';

export interface TracksidePropsInstancerProps {
  fences: PropItem[];
  stoneWalls: PropItem[];
  hayBales: PropItem[];
  rallySigns: PropItem[];
  canShadow: boolean;
  isSnow: boolean;
  fenceTexture: Texture;
  britishDrystoneTexture: Texture;
  highlandCottageThatchTexture: Texture;
  cabinRedWallTexture: Texture;
}

/**
 * GPU instanced renderer for trackside barriers, roadside fencing, straw bales, and rally chevron signs.
 */
export function TracksidePropsInstancer({
  fences,
  stoneWalls,
  hayBales,
  rallySigns,
  canShadow,
  isSnow,
  fenceTexture,
  britishDrystoneTexture,
  highlandCottageThatchTexture,
  cabinRedWallTexture,
}: TracksidePropsInstancerProps) {
  const fenceRef = useRef<InstancedMesh>(null);
  const stoneWallRef = useRef<InstancedMesh>(null);
  const hayBaleRef = useRef<InstancedMesh>(null);
  const rallySignRef = useRef<InstancedMesh>(null);

  // Geometries with genuine bounding spheres
  const fenceGeo = useMemo(() => {
    const geo = createFenceGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const stoneWallGeo = useMemo(() => {
    const geo = createStoneWallGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const hayBaleGeo = useMemo(() => {
    const geo = createHayBaleGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const rallySignGeo = useMemo(() => {
    const geo = createRallySignGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // Materials
  const fenceMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: fenceTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: new Color(isSnow ? '#8b8478' : '#7a7164'),
      }),
    [fenceTexture, isSnow],
  );

  const stoneWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#ffffff'),
      }),
    [britishDrystoneTexture],
  );

  const hayBaleMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: highlandCottageThatchTexture,
        roughness: 0.94,
        metalness: 0.01,
        color: new Color('#e5c26b'),
      }),
    [highlandCottageThatchTexture],
  );

  const rallySignMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinRedWallTexture,
        roughness: 0.60,
        metalness: 0.08,
        color: new Color('#ff3322'),
      }),
    [cabinRedWallTexture],
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

    uploadBatch(fenceRef.current, fences);
    uploadBatch(stoneWallRef.current, stoneWalls);
    uploadBatch(hayBaleRef.current, hayBales);
    uploadBatch(rallySignRef.current, rallySigns);
  }, [fences, stoneWalls, hayBales, rallySigns]);

  return (
    <>
      {/* 1. Village Wooden Fences */}
      <instancedMesh
        ref={fenceRef}
        args={[fenceGeo, fenceMaterial, Math.max(1, fences.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 2. British Dry-Stone Dyke Walls */}
      <instancedMesh
        ref={stoneWallRef}
        args={[stoneWallGeo, stoneWallMaterial, Math.max(1, stoneWalls.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 3. Agricultural Straw Hay Bales */}
      <instancedMesh
        ref={hayBaleRef}
        args={[hayBaleGeo, hayBaleMaterial, Math.max(1, hayBales.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 4. Roadside Rally Warning Signs */}
      <instancedMesh
        ref={rallySignRef}
        args={[rallySignGeo, rallySignMaterial, Math.max(1, rallySigns.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
    </>
  );
}
