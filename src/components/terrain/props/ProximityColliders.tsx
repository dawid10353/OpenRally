import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CylinderCollider,
  BallCollider,
  CuboidCollider,
} from '@react-three/rapier';
import { useGameStore } from '@/store/gameStore';
import type { PropItem, ProximityCollidersProps } from './types';

export function ProximityColliders({
  spatialGrid,
  initialTrees,
  initialRocks,
  initialCabins,
  initialFences,
  initialCastleTowers,
  initialCastleWalls,
  initialCastleGates,
  initialCastleKeeps,
  initialCastleArches,
  initialStoneWalls,
  initialStandingStones,
  initialHighlandCottages,
  initialStoneCairns,
  initialHayBales,
  initialRallySigns,
  initialStoneBridges,
}: ProximityCollidersProps) {
  const lastCarPosRef = useRef<[number, number]>([-9999, -9999]);
  const activeCollidersRef = useRef<{
    trees: PropItem[];
    rocks: PropItem[];
    cabins: PropItem[];
    fences: PropItem[];
    castleTowers: PropItem[];
    castleWalls: PropItem[];
    castleGates: PropItem[];
    castleKeeps: PropItem[];
    castleArches: PropItem[];
    stoneWalls: PropItem[];
    standingStones: PropItem[];
    highlandCottages: PropItem[];
    stoneCairns: PropItem[];
    hayBales: PropItem[];
    rallySigns: PropItem[];
    stoneBridges: PropItem[];
  }>({
    trees: initialTrees,
    rocks: initialRocks,
    cabins: initialCabins,
    fences: initialFences,
    castleTowers: initialCastleTowers,
    castleWalls: initialCastleWalls,
    castleGates: initialCastleGates,
    castleKeeps: initialCastleKeeps,
    castleArches: initialCastleArches,
    stoneWalls: initialStoneWalls,
    standingStones: initialStandingStones,
    highlandCottages: initialHighlandCottages,
    stoneCairns: initialStoneCairns,
    hayBales: initialHayBales,
    rallySigns: initialRallySigns,
    stoneBridges: initialStoneBridges,
  });
  const [activeColliders, setActiveColliders] = useState(activeCollidersRef.current);
  const lastCellKeyRef = useRef('');

  useFrame(() => {
    const carPos = useGameStore.getState().position;
    const CELL_SIZE = 50;
    const cx = Math.floor(carPos[0] / CELL_SIZE);
    const cz = Math.floor(carPos[2] / CELL_SIZE);
    const cellKey = `${cx}_${cz}`;

    const dx = carPos[0] - lastCarPosRef.current[0];
    const dz = carPos[2] - lastCarPosRef.current[1];

    if (dx * dx + dz * dz > 100 || cellKey !== lastCellKeyRef.current) {
      lastCarPosRef.current[0] = carPos[0];
      lastCarPosRef.current[1] = carPos[2];
      lastCellKeyRef.current = cellKey;

      const nearbyTrees: PropItem[] = [];
      const nearbyRocks: PropItem[] = [];
      const nearbyCabins: PropItem[] = [];
      const nearbyFences: PropItem[] = [];
      const nearbyCastleTowers: PropItem[] = [];
      const nearbyCastleWalls: PropItem[] = [];
      const nearbyCastleGates: PropItem[] = [];
      const nearbyCastleKeeps: PropItem[] = [];
      const nearbyCastleArches: PropItem[] = [];
      const nearbyStoneWalls: PropItem[] = [];
      const nearbyStandingStones: PropItem[] = [];
      const nearbyHighlandCottages: PropItem[] = [];
      const nearbyStoneCairns: PropItem[] = [];
      const nearbyHayBales: PropItem[] = [];
      const nearbyRallySigns: PropItem[] = [];
      const nearbyStoneBridges: PropItem[] = [];

      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const key = `${cx + ox}_${cz + oz}`;
          const cell = spatialGrid.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              const item = cell[i];
              const distSq = (item.position[0] - carPos[0]) ** 2 + (item.position[2] - carPos[2]) ** 2;
              if (distSq < 95 * 95) {
                if (item.type === 'cabin') {
                  nearbyCabins.push(item);
                } else if (item.type === 'fence') {
                  nearbyFences.push(item);
                } else if (item.type === 'castle_tower') {
                  nearbyCastleTowers.push(item);
                } else if (item.type === 'castle_wall') {
                  nearbyCastleWalls.push(item);
                } else if (item.type === 'castle_gate') {
                  nearbyCastleGates.push(item);
                } else if (item.type === 'castle_keep') {
                  nearbyCastleKeeps.push(item);
                } else if (item.type === 'castle_arch') {
                  nearbyCastleArches.push(item);
                } else if (item.type === 'stone_wall') {
                  nearbyStoneWalls.push(item);
                } else if (item.type === 'standing_stone') {
                  nearbyStandingStones.push(item);
                } else if (item.type === 'highland_cottage') {
                  nearbyHighlandCottages.push(item);
                } else if (item.type === 'stone_cairn') {
                  nearbyStoneCairns.push(item);
                } else if (item.type === 'hay_bale') {
                  nearbyHayBales.push(item);
                } else if (item.type === 'rally_sign') {
                  nearbyRallySigns.push(item);
                } else if (item.type === 'stone_bridge') {
                  nearbyStoneBridges.push(item);
                } else if (item.type.startsWith('tree')) {
                  nearbyTrees.push(item);
                } else {
                  nearbyRocks.push(item);
                }
              }
            }
          }
        }
      }

      const prev = activeCollidersRef.current;
      const countChanged =
        prev.trees.length !== nearbyTrees.length ||
        prev.rocks.length !== nearbyRocks.length ||
        prev.cabins.length !== nearbyCabins.length ||
        prev.fences.length !== nearbyFences.length ||
        prev.castleTowers.length !== nearbyCastleTowers.length ||
        prev.castleWalls.length !== nearbyCastleWalls.length ||
        prev.castleGates.length !== nearbyCastleGates.length ||
        prev.castleKeeps.length !== nearbyCastleKeeps.length ||
        prev.castleArches.length !== nearbyCastleArches.length ||
        prev.stoneWalls.length !== nearbyStoneWalls.length ||
        prev.standingStones.length !== nearbyStandingStones.length ||
        prev.highlandCottages.length !== nearbyHighlandCottages.length ||
        prev.stoneCairns.length !== nearbyStoneCairns.length ||
        prev.hayBales.length !== nearbyHayBales.length ||
        prev.rallySigns.length !== nearbyRallySigns.length ||
        prev.stoneBridges.length !== nearbyStoneBridges.length;

      let changed = countChanged;
      if (!changed && nearbyTrees.length > 0 && nearbyTrees[0].id !== prev.trees[0]?.id) {
        changed = true;
      }

      if (changed) {
        const nextColliders = {
          trees: nearbyTrees,
          rocks: nearbyRocks,
          cabins: nearbyCabins,
          fences: nearbyFences,
          castleTowers: nearbyCastleTowers,
          castleWalls: nearbyCastleWalls,
          castleGates: nearbyCastleGates,
          castleKeeps: nearbyCastleKeeps,
          castleArches: nearbyCastleArches,
          stoneWalls: nearbyStoneWalls,
          standingStones: nearbyStandingStones,
          highlandCottages: nearbyHighlandCottages,
          stoneCairns: nearbyStoneCairns,
          hayBales: nearbyHayBales,
          rallySigns: nearbyRallySigns,
          stoneBridges: nearbyStoneBridges,
        };
        activeCollidersRef.current = nextColliders;
        setActiveColliders(nextColliders);
      }
    }
  });

  return (
    <RigidBody type="fixed" colliders={false}>
      {activeColliders.trees.map((t) => (
        <CylinderCollider
          key={t.id}
          args={[1.4 * t.scale[1], 0.35 * t.scale[0]]}
          position={[t.position[0], t.position[1] + 1.4 * t.scale[1], t.position[2]]}
          rotation={t.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.rocks.map((r) => (
        <BallCollider
          key={r.id}
          args={[0.85 * r.scale[0]]}
          position={[r.position[0], r.position[1] + 0.45 * r.scale[1], r.position[2]]}
          rotation={r.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.cabins.map((c) => (
        <CuboidCollider
          key={c.id}
          args={[3.1 * c.scale[0], 2.6 * c.scale[1], 4.2 * c.scale[2]]}
          position={[c.position[0], c.position[1] + 2.6 * c.scale[1], c.position[2]]}
          rotation={c.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.fences.map((f) => (
        <CuboidCollider
          key={f.id}
          args={[1.7 * f.scale[0], 0.6 * f.scale[1], 0.15 * f.scale[2]]}
          position={[f.position[0], f.position[1] + 0.6 * f.scale[1], f.position[2]]}
          rotation={f.rotation}
          friction={0.7}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleTowers.map((t) => (
        <CylinderCollider
          key={t.id}
          args={[4.5 * t.scale[1], 3.2 * t.scale[0]]}
          position={[t.position[0], t.position[1] + 4.5 * t.scale[1], t.position[2]]}
          rotation={t.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleWalls.map((w) => (
        <CuboidCollider
          key={w.id}
          args={[4.0 * w.scale[0], 2.8 * w.scale[1], 0.8 * w.scale[2]]}
          position={[w.position[0], w.position[1] + 2.8 * w.scale[1], w.position[2]]}
          rotation={w.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleGates.map((g) => {
        const rotY = g.rotation[1];
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const offset = 3.6 * g.scale[0];
        return (
          <group key={g.id}>
            <CylinderCollider
              args={[4.5 * g.scale[1], 1.7 * g.scale[0]]}
              position={[
                g.position[0] - cosY * offset,
                g.position[1] + 4.5 * g.scale[1],
                g.position[2] + sinY * offset,
              ]}
              rotation={g.rotation}
              friction={0.9}
              restitution={0.05}
            />
            <CylinderCollider
              args={[4.5 * g.scale[1], 1.7 * g.scale[0]]}
              position={[
                g.position[0] + cosY * offset,
                g.position[1] + 4.5 * g.scale[1],
                g.position[2] - sinY * offset,
              ]}
              rotation={g.rotation}
              friction={0.9}
              restitution={0.05}
            />
          </group>
        );
      })}
      {activeColliders.castleKeeps.map((k) => (
        <CuboidCollider
          key={k.id}
          args={[7.2 * k.scale[0], 9.0 * k.scale[1], 7.2 * k.scale[2]]}
          position={[k.position[0], k.position[1] + 9.0 * k.scale[1], k.position[2]]}
          rotation={k.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleArches.map((a) => {
        const rotY = a.rotation[1];
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const offset = 2.6 * a.scale[0];
        return (
          <group key={a.id}>
            <CylinderCollider
              args={[2.8 * a.scale[1], 0.6 * a.scale[0]]}
              position={[
                a.position[0] - cosY * offset,
                a.position[1] + 2.8 * a.scale[1],
                a.position[2] + sinY * offset,
              ]}
              rotation={a.rotation}
              friction={0.9}
              restitution={0.05}
            />
            <CylinderCollider
              args={[2.8 * a.scale[1], 0.6 * a.scale[0]]}
              position={[
                a.position[0] + cosY * offset,
                a.position[1] + 2.8 * a.scale[1],
                a.position[2] - sinY * offset,
              ]}
              rotation={a.rotation}
              friction={0.9}
              restitution={0.05}
            />
          </group>
        );
      })}
      {activeColliders.stoneWalls.map((sw) => (
        <CuboidCollider
          key={sw.id}
          args={[3.1 * sw.scale[0], 0.65 * sw.scale[1], 0.3 * sw.scale[2]]}
          position={[sw.position[0], sw.position[1] + 0.65 * sw.scale[1], sw.position[2]]}
          rotation={sw.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.standingStones.map((ss) => (
        <CuboidCollider
          key={ss.id}
          args={[0.8 * ss.scale[0], 2.7 * ss.scale[1], 0.5 * ss.scale[2]]}
          position={[ss.position[0], ss.position[1] + 2.7 * ss.scale[1], ss.position[2]]}
          rotation={ss.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.highlandCottages.map((hc) => (
        <CuboidCollider
          key={hc.id}
          args={[3.2 * hc.scale[0], 2.2 * hc.scale[1], 2.2 * hc.scale[2]]}
          position={[hc.position[0], hc.position[1] + 2.2 * hc.scale[1], hc.position[2]]}
          rotation={hc.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.stoneCairns.map((sc) => (
        <BallCollider
          key={sc.id}
          args={[1.6 * sc.scale[0]]}
          position={[sc.position[0], sc.position[1] + 1.2 * sc.scale[1], sc.position[2]]}
          rotation={sc.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.hayBales.map((hb) => (
        <CylinderCollider
          key={hb.id}
          args={[0.75 * hb.scale[1], 0.75 * hb.scale[0]]}
          position={[hb.position[0], hb.position[1] + 0.72 * hb.scale[1], hb.position[2]]}
          rotation={hb.rotation}
          friction={0.85}
          restitution={0.05}
        />
      ))}
      {activeColliders.rallySigns.map((rs) => (
        <CylinderCollider
          key={rs.id}
          args={[0.8 * rs.scale[1], 0.15 * rs.scale[0]]}
          position={[rs.position[0], rs.position[1] + 0.8 * rs.scale[1], rs.position[2]]}
          rotation={rs.rotation}
          friction={0.5}
          restitution={0.05}
        />
      ))}
      {activeColliders.stoneBridges.map((sb) => (
        <CuboidCollider
          key={sb.id}
          args={[3.4 * sb.scale[0], 0.7 * sb.scale[1], 6.0 * sb.scale[2]]}
          position={[sb.position[0], sb.position[1] + 0.5 * sb.scale[1], sb.position[2]]}
          rotation={sb.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
    </RigidBody>
  );
}
