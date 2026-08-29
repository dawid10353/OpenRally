import type { Matrix4 } from 'three';
import type { PropType } from '@/types/level';

export interface PropItem {
  id: string;
  type: PropType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  matrix: Matrix4;
}

export interface CategorizedProps {
  pineTrees: PropItem[];
  birchTrees: PropItem[];
  desertTrees: PropItem[];
  rocks: PropItem[];
  sandstoneRocks: PropItem[];
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
  spatialGrid: Map<string, PropItem[]>;
}

export interface ProximityCollidersProps {
  spatialGrid: Map<string, PropItem[]>;
  initialTrees: PropItem[];
  initialRocks: PropItem[];
  initialCabins: PropItem[];
  initialFences: PropItem[];
  initialCastleTowers: PropItem[];
  initialCastleWalls: PropItem[];
  initialCastleGates: PropItem[];
  initialCastleKeeps: PropItem[];
  initialCastleArches: PropItem[];
  initialStoneWalls: PropItem[];
  initialStandingStones: PropItem[];
  initialHighlandCottages: PropItem[];
  initialStoneCairns: PropItem[];
  initialHayBales: PropItem[];
  initialRallySigns: PropItem[];
  initialStoneBridges: PropItem[];
}
