import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Color,
  MeshStandardMaterial,
  type Texture,
  type IUniform,
  type Sphere,
} from 'three';
import {
  createTrunkGeometry,
  createPineFoliageGeometry,
  createBirchTrunkGeometry,
  createBirchFoliageGeometry,
  createDesertTrunkGeometry,
  createDesertFoliageGeometry,
} from './geometries';
import { createFoliageWindMaterial } from './materials';
import type { PropItem } from './types';

export interface VegetationInstancerProps {
  pineTrees: PropItem[];
  birchTrees: PropItem[];
  desertTrees: PropItem[];
  canShadow: boolean;
  isSnow: boolean;
  isDesert: boolean;
  pineBarkTexture: Texture;
  pineBranchTexture: Texture;
  pineBranchSnowTexture: Texture;
  birchBarkTexture: Texture;
  leafyBranchTexture: Texture;
  desertBarkTexture: Texture;
  desertAcaciaBranchTexture: Texture;
  globalBoundingSphere: Sphere;
}

/**
 * High-performance GPU-instanced vegetation renderer (Nordic Pines, Broadleaf Birch, Desert Acacia)
 * featuring custom vertex wind displacement shaders and zero-GC matrix uploads.
 */
export function VegetationInstancer({
  pineTrees,
  birchTrees,
  desertTrees,
  canShadow,
  isSnow,
  isDesert,
  pineBarkTexture,
  pineBranchTexture,
  pineBranchSnowTexture,
  birchBarkTexture,
  leafyBranchTexture,
  desertBarkTexture,
  desertAcaciaBranchTexture,
  globalBoundingSphere,
}: VegetationInstancerProps) {
  const pineTrunkRef = useRef<InstancedMesh>(null);
  const pineFoliageRef = useRef<InstancedMesh>(null);
  const birchTrunkRef = useRef<InstancedMesh>(null);
  const birchFoliageRef = useRef<InstancedMesh>(null);
  const desertTrunkRef = useRef<InstancedMesh>(null);
  const desertFoliageRef = useRef<InstancedMesh>(null);

  const foliageShaderUniformsRef = useRef<Record<string, IUniform>[]>([]);

  // Procedural Geometries
  const pineTrunkGeo = useMemo(() => {
    const geo = createTrunkGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  const pineFoliageGeo = useMemo(() => {
    const geo = createPineFoliageGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  const birchTrunkGeo = useMemo(() => {
    const geo = createBirchTrunkGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  const birchFoliageGeo = useMemo(() => {
    const geo = createBirchFoliageGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  const desertTrunkGeo = useMemo(() => {
    const geo = createDesertTrunkGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  const desertFoliageGeo = useMemo(() => {
    const geo = createDesertFoliageGeometry();
    geo.boundingSphere = globalBoundingSphere.clone();
    return geo;
  }, [globalBoundingSphere]);

  // Materials
  const pineTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: pineBarkTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: new Color(isSnow ? '#44342a' : '#5a3f2b'),
      }),
    [pineBarkTexture, isSnow],
  );

  const birchTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: birchBarkTexture,
        roughness: 0.94,
        metalness: 0.01,
        color: new Color('#4c443c'),
      }),
    [birchBarkTexture],
  );

  const desertTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: desertBarkTexture,
        roughness: 0.95,
        metalness: 0.02,
        color: new Color('#5a3e2b'),
      }),
    [desertBarkTexture],
  );

  const pineFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        isSnow ? pineBranchSnowTexture : pineBranchTexture,
        isSnow ? '#ffffff' : isDesert ? '#8b7a42' : '#23441a',
        false,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pineBranchTexture, pineBranchSnowTexture, isDesert, isSnow],
  );

  const birchFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        leafyBranchTexture,
        '#2d541a',
        true,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leafyBranchTexture],
  );

  const desertFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        desertAcaciaBranchTexture,
        '#9e914c',
        true,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desertAcaciaBranchTexture],
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
    };

    uploadBatch(pineTrunkRef.current, pineTrees);
    uploadBatch(pineFoliageRef.current, pineTrees);
    uploadBatch(birchTrunkRef.current, birchTrees);
    uploadBatch(birchFoliageRef.current, birchTrees);
    uploadBatch(desertTrunkRef.current, desertTrees);
    uploadBatch(desertFoliageRef.current, desertTrees);
  }, [pineTrees, birchTrees, desertTrees]);

  // Frame update for wind animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    for (const uniforms of foliageShaderUniformsRef.current) {
      if (uniforms.u_time) uniforms.u_time.value = time;
    }
  });

  return (
    <>
      {/* 1. Nordic Pines */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[pineTrunkGeo, pineTrunkMaterial, Math.max(1, pineTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={pineFoliageRef}
        args={[pineFoliageGeo, pineFoliageMaterial, Math.max(1, pineTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 2. European Birch */}
      <instancedMesh
        ref={birchTrunkRef}
        args={[birchTrunkGeo, birchTrunkMaterial, Math.max(1, birchTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={birchFoliageRef}
        args={[birchFoliageGeo, birchFoliageMaterial, Math.max(1, birchTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 3. Desert Acacia */}
      <instancedMesh
        ref={desertTrunkRef}
        args={[desertTrunkGeo, desertTrunkMaterial, Math.max(1, desertTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={desertFoliageRef}
        args={[desertFoliageGeo, desertFoliageMaterial, Math.max(1, desertTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
    </>
  );
}
