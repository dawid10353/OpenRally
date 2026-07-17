import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedRigidBodies } from '@react-three/rapier';
import { InstancedMesh, Object3D, Color, Matrix4, Vector3 } from 'three';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import {
  NUM_PROPS,
  PROPS_CLEARING_RADIUS,
  PROPS_EDGE_MARGIN,
  TREE_PROBABILITY,
  PROP_COLOR_TREE,
  PROP_COLOR_ROCK,
} from '@/config/terrain';

// Dystanse dla LOD (do kwadratu dla szybszych obliczeń)
const LOD0_DISTANCE_SQ = 60 * 60; // 60 metrów - cienie
const LOD1_DISTANCE_SQ = 150 * 150; // 150 metrów - bez cieni
// Powyżej 150m obiekty są ukrywane (Frustum / Distance Culling)

export function PropsInstancer() {
  const meshLOD0Ref = useRef<InstancedMesh>(null);
  const meshLOD1Ref = useRef<InstancedMesh>(null);
  const lastUpdatePos = useRef<Vector3 | null>(null);
  const { heightmapData, config } = useTerrainData();

  const { positions, rotations, scales, colors, matrices } = useMemo(() => {
    const { heights, trackMasks, rows, cols } = heightmapData;
    const mapWidth = config.width;
    const mapDepth = config.depth;

    const getHeightAt = (worldX: number, worldZ: number) => {
      const nx = (worldX + mapWidth / 2) / mapWidth;
      const nz = (worldZ + mapDepth / 2) / mapDepth;

      const x = Math.floor(nx * (cols - 1));
      const z = Math.floor(nz * (rows - 1));

      if (x >= 0 && x < cols && z >= 0 && z < rows) {
        return heights[z * cols + x];
      }
      return 0;
    };

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

    const pos: [number, number, number][] = [];
    const rot: [number, number, number][] = [];
    const scl: [number, number, number][] = [];
    const colsArr: Color[] = [];
    const mats: Matrix4[] = [];

    const random = (seed: number) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const dummy = new Object3D();

    for (let i = 0; i < NUM_PROPS; i++) {
      const isTree = random(i * 5) > (1 - TREE_PROBABILITY);

      const x = (random(i * 5 + 1) - 0.5) * mapWidth * PROPS_EDGE_MARGIN;
      const z = (random(i * 5 + 2) - 0.5) * mapDepth * PROPS_EDGE_MARGIN;

      if (Math.abs(x) < PROPS_CLEARING_RADIUS && Math.abs(z) < PROPS_CLEARING_RADIUS) continue;
      if (getTrackMaskAt(x, z) > 0) continue;

      const y = getHeightAt(x, z);

      const yOffset = isTree ? -0.5 : -0.2;
      pos.push([x, y + yOffset, z]);

      const yRot = random(i * 5 + 3) * Math.PI * 2;
      rot.push([0, yRot, 0]);

      const scaleBase = isTree ? 1.5 + random(i * 5 + 4) * 2 : 0.5 + random(i * 5 + 4) * 1.5;
      const s: [number, number, number] = [
        scaleBase,
        isTree ? scaleBase * (1.5 + random(i * 5 + 6)) : scaleBase,
        scaleBase,
      ];
      scl.push(s);

      colsArr.push(isTree ? PROP_COLOR_TREE : PROP_COLOR_ROCK);

      // Prekalkulacja macierzy dla szybszego LOD
      dummy.position.set(x, y + yOffset, z);
      dummy.rotation.set(0, yRot, 0);
      dummy.scale.set(s[0], s[1], s[2]);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());
    }

    return { positions: pos, rotations: rot, scales: scl, colors: colsArr, matrices: mats };
  }, [heightmapData, config]);

  const frameCountRef = useRef(0);

  // Pętla przeliczająca LOD na podstawie odległości kamery od instancji
  useFrame((state) => {
    frameCountRef.current++;
    // Optymalizacja CPU: Przeliczamy LOD maksymalnie raz na 10 klatek
    if (frameCountRef.current % 10 !== 0) return;

    if (!meshLOD0Ref.current || !meshLOD1Ref.current) return;

    const camPos = state.camera.position;
    
    // Optymalizacja: aktualizuj LOD tylko gdy kamera przesunie się o ponad 2 metry
    if (!lastUpdatePos.current) lastUpdatePos.current = new Vector3();
    if (camPos.distanceToSquared(lastUpdatePos.current) < 4) return;
    lastUpdatePos.current.copy(camPos);

    let count0 = 0;
    let count1 = 0;

    for (let i = 0; i < positions.length; i++) {
      const px = positions[i][0];
      const py = positions[i][1];
      const pz = positions[i][2];

      const distSq = (camPos.x - px) ** 2 + (camPos.y - py) ** 2 + (camPos.z - pz) ** 2;

      if (distSq < LOD0_DISTANCE_SQ) {
        meshLOD0Ref.current.setMatrixAt(count0, matrices[i]);
        meshLOD0Ref.current.setColorAt(count0, colors[i]);
        count0++;
      } else if (distSq < LOD1_DISTANCE_SQ) {
        meshLOD1Ref.current.setMatrixAt(count1, matrices[i]);
        meshLOD1Ref.current.setColorAt(count1, colors[i]);
        count1++;
      }
      // Obiekty dalej niż LOD1_DISTANCE_SQ są ignorowane (nie renderują się)
    }

    meshLOD0Ref.current.count = count0;
    meshLOD0Ref.current.instanceMatrix.needsUpdate = true;
    if (meshLOD0Ref.current.instanceColor) meshLOD0Ref.current.instanceColor.needsUpdate = true;
    meshLOD0Ref.current.computeBoundingSphere(); // CRITICAL: Update frustum culling volume

    meshLOD1Ref.current.count = count1;
    meshLOD1Ref.current.instanceMatrix.needsUpdate = true;
    if (meshLOD1Ref.current.instanceColor) meshLOD1Ref.current.instanceColor.needsUpdate = true;
    meshLOD1Ref.current.computeBoundingSphere(); // CRITICAL: Update frustum culling volume
  });

  const instances = useMemo(() => {
    return positions.map((pos, i) => ({
      key: i,
      position: pos,
      rotation: rotations[i],
      scale: scales[i],
    }));
  }, [positions, rotations, scales]);

  return (
    <>
      {/* Fizyka: Niewidzialne obiekty dla kolizji Rapier */}
      <InstancedRigidBodies
        instances={instances}
        colliders="cuboid"
        type="fixed"
      >
        <instancedMesh
          args={[undefined, undefined, positions.length]}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial />
        </instancedMesh>
      </InstancedRigidBodies>

      {/* LOD 0: Blisko - pudełka rzucające cienie */}
      <instancedMesh
        ref={meshLOD0Ref}
        args={[undefined, undefined, positions.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* LOD 1: Średni dystans - pudełka bez cieni dla lepszej wydajności */}
      <instancedMesh
        ref={meshLOD1Ref}
        args={[undefined, undefined, positions.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </>
  );
}
