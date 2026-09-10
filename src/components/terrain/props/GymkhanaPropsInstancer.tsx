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
  createShippingContainerGeometry,
  createDriftPylonGeometry,
  createJumpRampGeometry,
} from './geometries';
import type { PropItem } from './types';

export interface GymkhanaPropsInstancerProps {
  shippingContainers: PropItem[];
  driftPylons: PropItem[];
  jumpRamps: PropItem[];
  jumpRampTexture: Texture;
  canShadow: boolean;
}

/**
 * Computes bounding sphere encompassing all placed instances for a prop group.
 */
function computeInstanceBoundingSphere(items: PropItem[], geometryRadius = 8): Sphere {
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
 * GPU instanced renderer for Gymkhana arena obstacles & stunt structures:
 * industrial cargo shipping containers, safety fluorescent drift pylons,
 * and textured competition-spec launch jump ramps.
 */
export function GymkhanaPropsInstancer({
  shippingContainers,
  driftPylons,
  jumpRamps,
  jumpRampTexture,
  canShadow,
}: GymkhanaPropsInstancerProps) {
  const containerRef = useRef<InstancedMesh>(null);
  const driftPylonRef = useRef<InstancedMesh>(null);
  const jumpRampRef = useRef<InstancedMesh>(null);

  // Geometries with computed bounding spheres
  const containerGeo = useMemo(() => {
    const geo = createShippingContainerGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const driftPylonGeo = useMemo(() => {
    const geo = createDriftPylonGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const jumpRampGeo = useMemo(() => {
    const geo = createJumpRampGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // Materials
  const containerMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        roughness: 0.62,
        metalness: 0.35,
        color: new Color('#1d4ed8'), // Industrial cobalt blue freight container
      }),
    [],
  );

  const driftPylonMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        roughness: 0.40,
        metalness: 0.15,
        color: new Color('#ea580c'), // Safety fluorescent orange
      }),
    [],
  );

  const jumpRampMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: jumpRampTexture,
        roughness: 0.55,
        metalness: 0.42,
      }),
    [jumpRampTexture],
  );

  // Upload instance matrices
  useLayoutEffect(() => {
    if (containerRef.current && shippingContainers.length > 0) {
      for (let i = 0; i < shippingContainers.length; i++) {
        containerRef.current.setMatrixAt(i, shippingContainers[i].matrix);
      }
      containerRef.current.instanceMatrix.needsUpdate = true;
      const sphere = computeInstanceBoundingSphere(shippingContainers, 8);
      if (sphere.radius > 0) {
        containerRef.current.boundingSphere = sphere;
      }
    }

    if (driftPylonRef.current && driftPylons.length > 0) {
      for (let i = 0; i < driftPylons.length; i++) {
        driftPylonRef.current.setMatrixAt(i, driftPylons[i].matrix);
      }
      driftPylonRef.current.instanceMatrix.needsUpdate = true;
      const sphere = computeInstanceBoundingSphere(driftPylons, 3);
      if (sphere.radius > 0) {
        driftPylonRef.current.boundingSphere = sphere;
      }
    }

    if (jumpRampRef.current && jumpRamps.length > 0) {
      for (let i = 0; i < jumpRamps.length; i++) {
        jumpRampRef.current.setMatrixAt(i, jumpRamps[i].matrix);
      }
      jumpRampRef.current.instanceMatrix.needsUpdate = true;
      const sphere = computeInstanceBoundingSphere(jumpRamps, 8);
      if (sphere.radius > 0) {
        jumpRampRef.current.boundingSphere = sphere;
      }
    }
  }, [shippingContainers, driftPylons, jumpRamps]);

  return (
    <group>
      {shippingContainers.length > 0 && (
        <instancedMesh
          ref={containerRef}
          args={[containerGeo, containerMaterial, shippingContainers.length]}
          castShadow={canShadow}
          receiveShadow={canShadow}
        />
      )}

      {driftPylons.length > 0 && (
        <instancedMesh
          ref={driftPylonRef}
          args={[driftPylonGeo, driftPylonMaterial, driftPylons.length]}
          castShadow={canShadow}
          receiveShadow={canShadow}
        />
      )}

      {jumpRamps.length > 0 && (
        <instancedMesh
          ref={jumpRampRef}
          args={[jumpRampGeo, jumpRampMaterial, jumpRamps.length]}
          castShadow={canShadow}
          receiveShadow={canShadow}
        />
      )}
    </group>
  );
}
