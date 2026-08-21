import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CylinderCollider,
  BallCollider,
} from '@react-three/rapier';
import {
  InstancedMesh,
  Object3D,
  Color,
  Matrix4,
  Vector3,
  Sphere,
  BufferGeometry,
  CylinderGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';

// Distance thresholds squared for LOD and culling
const LOD0_DISTANCE_SQ = 70 * 70; // 70m - cast and receive shadows
const LOD1_DISTANCE_SQ = 180 * 180; // 180m - simplified / no shadows
const GLOBAL_BOUNDING_SPHERE = new Sphere(new Vector3(0, 0, 0), 1000);

/**
 * Creates a low-poly stylized pine tree geometry with baked vertex colors.
 * The trunk extends downward (Y = -0.6 to +1.2) to anchor firmly into terrain slopes and eliminate floating.
 */
function createTreeGeometry(): BufferGeometry {
  const trunk = new CylinderGeometry(0.2, 0.35, 1.8, 5);
  trunk.translate(0, 0.3, 0); // Spans Y: -0.6 to +1.2
  const trunkColors = new Float32Array(trunk.attributes.position.count * 3);
  const trunkColor = new Color('#3d2817');
  for (let i = 0; i < trunk.attributes.position.count; i++) {
    trunkColors[i * 3 + 0] = trunkColor.r;
    trunkColors[i * 3 + 1] = trunkColor.g;
    trunkColors[i * 3 + 2] = trunkColor.b;
  }
  trunk.setAttribute('color', new Float32BufferAttribute(trunkColors, 3));

  // Bottom cone
  const cone1 = new ConeGeometry(1.3, 1.6, 5);
  cone1.translate(0, 1.7, 0);
  const c1Colors = new Float32Array(cone1.attributes.position.count * 3);
  const c1Color = new Color('#1e4620');
  for (let i = 0; i < cone1.attributes.position.count; i++) {
    c1Colors[i * 3 + 0] = c1Color.r;
    c1Colors[i * 3 + 1] = c1Color.g;
    c1Colors[i * 3 + 2] = c1Color.b;
  }
  cone1.setAttribute('color', new Float32BufferAttribute(c1Colors, 3));

  // Mid cone
  const cone2 = new ConeGeometry(1.0, 1.3, 5);
  cone2.translate(0, 2.5, 0);
  const c2Colors = new Float32Array(cone2.attributes.position.count * 3);
  const c2Color = new Color('#27592a');
  for (let i = 0; i < cone2.attributes.position.count; i++) {
    c2Colors[i * 3 + 0] = c2Color.r;
    c2Colors[i * 3 + 1] = c2Color.g;
    c2Colors[i * 3 + 2] = c2Color.b;
  }
  cone2.setAttribute('color', new Float32BufferAttribute(c2Colors, 3));

  // Top cone
  const cone3 = new ConeGeometry(0.65, 1.1, 5);
  cone3.translate(0, 3.2, 0);
  const c3Colors = new Float32Array(cone3.attributes.position.count * 3);
  const c3Color = new Color('#346e38');
  for (let i = 0; i < cone3.attributes.position.count; i++) {
    c3Colors[i * 3 + 0] = c3Color.r;
    c3Colors[i * 3 + 1] = c3Color.g;
    c3Colors[i * 3 + 2] = c3Color.b;
  }
  cone3.setAttribute('color', new Float32BufferAttribute(c3Colors, 3));

  const merged = BufferGeometryUtils.mergeGeometries([trunk, cone1, cone2, cone3]);
  merged.computeVertexNormals();
  return merged;
}

/**
 * Creates a low-poly boulder geometry with vertex colors.
 */
function createRockGeometry(): BufferGeometry {
  const rock = new DodecahedronGeometry(0.8, 0);
  const pos = rock.attributes.position;
  // Perturb vertices slightly for organic asymmetry
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(i, x * (0.85 + ((i % 5) * 0.06)), y * 0.75, z * (0.85 + (((i + 2) % 5) * 0.06)));
  }
  rock.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const rockColor = new Color('#686e75');
  for (let i = 0; i < pos.count; i++) {
    const variation = 0.9 + ((i % 7) / 7) * 0.2;
    colors[i * 3 + 0] = rockColor.r * variation;
    colors[i * 3 + 1] = rockColor.g * variation;
    colors[i * 3 + 2] = rockColor.b * variation;
  }
  rock.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return rock;
}

interface PropItem {
  id: string;
  type: 'tree' | 'rock';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  matrix: Matrix4;
}

export function PropsInstancer() {
  const treeLOD0Ref = useRef<InstancedMesh>(null);
  const treeLOD1Ref = useRef<InstancedMesh>(null);
  const rockLOD0Ref = useRef<InstancedMesh>(null);
  const rockLOD1Ref = useRef<InstancedMesh>(null);
  const lastUpdatePos = useRef<Vector3 | null>(null);

  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  const treeGeometry = useMemo(() => {
    const geo = createTreeGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);
  const rockGeometry = useMemo(() => {
    const geo = createRockGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const propMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
      }),
    [],
  );

  const { trees, rocks } = useMemo(() => {
    const { heights, trackMasks, rows, cols } = heightmapData;
    const mapWidth = levelData.terrainBase.width;
    const mapDepth = levelData.terrainBase.depth;

    const getTrackMaskAt = (worldX: number, worldZ: number) => {
      const nx = (worldX + mapWidth / 2) / mapWidth;
      const nz = (worldZ + mapDepth / 2) / mapDepth;
      const x = Math.floor(nx * (cols - 1));
      const z = Math.floor(nz * (rows - 1));
      if (x >= 0 && x < cols && z >= 0 && z < rows) {
        return trackMasks[z * cols + x];
      }
      return 0;
    };

    const treeList: PropItem[] = [];
    const rockList: PropItem[] = [];
    const dummy = new Object3D();

    for (const prop of levelData.props) {
      const [x, originalY, z] = prop.position;
      // Do not spawn on track
      if (getTrackMaskAt(x, z) > 0.1) continue;

      const terrainY = getInterpolatedHeight(x, z, heights, rows, cols, mapWidth, mapDepth);
      // Skip if deep underwater
      if (terrainY < -6.0) continue;

      const isTree = prop.type === 'tree';
      // Sink slightly into terrain for realistic soil/root anchoring
      const yOffset = isTree ? -0.25 : -0.2;
      const y = originalY !== 0 ? originalY : terrainY;
      const finalY = y + yOffset;

      dummy.position.set(x, finalY, z);
      dummy.rotation.set(...prop.rotation);
      dummy.scale.set(...prop.scale);
      dummy.updateMatrix();

      const item: PropItem = {
        id: prop.id,
        type: prop.type,
        position: [x, finalY, z],
        rotation: prop.rotation,
        scale: prop.scale,
        matrix: dummy.matrix.clone(),
      };

      if (isTree) {
        treeList.push(item);
      } else {
        rockList.push(item);
      }
    }

    return { trees: treeList, rocks: rockList };
  }, [heightmapData, levelData]);

  const frameCountRef = useRef(0);

  // LOD calculation loop
  useFrame((state) => {
    frameCountRef.current++;
    if (frameCountRef.current % 8 !== 0) return;

    const camPos = state.camera.position;
    if (!lastUpdatePos.current) lastUpdatePos.current = new Vector3();
    if (camPos.distanceToSquared(lastUpdatePos.current) < 4) return;
    lastUpdatePos.current.copy(camPos);

    // Update Trees LOD
    if (treeLOD0Ref.current && treeLOD1Ref.current) {
      let t0 = 0;
      let t1 = 0;
      for (let i = 0; i < trees.length; i++) {
        const [px, py, pz] = trees[i].position;
        const distSq = (camPos.x - px) ** 2 + (camPos.y - py) ** 2 + (camPos.z - pz) ** 2;
        if (distSq < LOD0_DISTANCE_SQ) {
          treeLOD0Ref.current.setMatrixAt(t0, trees[i].matrix);
          t0++;
        } else if (distSq < LOD1_DISTANCE_SQ) {
          treeLOD1Ref.current.setMatrixAt(t1, trees[i].matrix);
          t1++;
        }
      }
      treeLOD0Ref.current.count = t0;
      treeLOD0Ref.current.instanceMatrix.needsUpdate = true;

      treeLOD1Ref.current.count = t1;
      treeLOD1Ref.current.instanceMatrix.needsUpdate = true;
    }

    // Update Rocks LOD
    if (rockLOD0Ref.current && rockLOD1Ref.current) {
      let r0 = 0;
      let r1 = 0;
      for (let i = 0; i < rocks.length; i++) {
        const [px, py, pz] = rocks[i].position;
        const distSq = (camPos.x - px) ** 2 + (camPos.y - py) ** 2 + (camPos.z - pz) ** 2;
        if (distSq < LOD0_DISTANCE_SQ) {
          rockLOD0Ref.current.setMatrixAt(r0, rocks[i].matrix);
          r0++;
        } else if (distSq < LOD1_DISTANCE_SQ) {
          rockLOD1Ref.current.setMatrixAt(r1, rocks[i].matrix);
          r1++;
        }
      }
      rockLOD0Ref.current.count = r0;
      rockLOD0Ref.current.instanceMatrix.needsUpdate = true;

      rockLOD1Ref.current.count = r1;
      rockLOD1Ref.current.instanceMatrix.needsUpdate = true;
    }
  });

  const canShadow = graphicsQuality !== 'low';

  return (
    <>
      {/* Static Compound Physics Colliders for Props */}
      <RigidBody type="fixed" colliders={false}>
        {/* Tree Trunk Colliders */}
        {trees.map((t) => (
          <CylinderCollider
            key={t.id}
            args={[1.2 * t.scale[1], 0.35 * t.scale[0]]}
            position={[t.position[0], t.position[1] + 1.2 * t.scale[1], t.position[2]]}
            rotation={t.rotation}
            friction={0.8}
            restitution={0.05}
          />
        ))}

        {/* Rock Boulder Colliders */}
        {rocks.map((r) => (
          <BallCollider
            key={r.id}
            args={[0.75 * r.scale[0]]}
            position={[r.position[0], r.position[1] + 0.35 * r.scale[1], r.position[2]]}
            rotation={r.rotation}
            friction={0.9}
            restitution={0.05}
          />
        ))}
      </RigidBody>

      {/* Visual Trees LOD 0 (Close - Shadows) */}
      <instancedMesh
        ref={treeLOD0Ref}
        args={[treeGeometry, propMaterial, trees.length]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* Visual Trees LOD 1 (Far - No shadows) */}
      <instancedMesh
        ref={treeLOD1Ref}
        args={[treeGeometry, propMaterial, trees.length]}
        receiveShadow={false}
        frustumCulled
      />

      {/* Visual Rocks LOD 0 */}
      <instancedMesh
        ref={rockLOD0Ref}
        args={[rockGeometry, propMaterial, rocks.length]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* Visual Rocks LOD 1 */}
      <instancedMesh
        ref={rockLOD1Ref}
        args={[rockGeometry, propMaterial, rocks.length]}
        receiveShadow={false}
        frustumCulled
      />
    </>
  );
}

