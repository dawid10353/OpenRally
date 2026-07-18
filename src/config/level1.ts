import type { LevelData, PropData } from '@/types/level';

const NUM_PROPS = 800;
const PROPS_CLEARING_RADIUS = 40;
const PROPS_EDGE_MARGIN = 0.9;
const TREE_PROBABILITY = 0.7;

/**
 * Procedurally generates the placeholder props array for Level 1.
 * In a fully data-driven pipeline (Stage 4), this array would be loaded from a JSON file.
 */
function generateLevel1Props(mapWidth: number, mapDepth: number): PropData[] {
  const props: PropData[] = [];
  
  const random = (seed: number) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < NUM_PROPS; i++) {
    const isTree = random(i * 5) > (1 - TREE_PROBABILITY);
    const x = (random(i * 5 + 1) - 0.5) * mapWidth * PROPS_EDGE_MARGIN;
    const z = (random(i * 5 + 2) - 0.5) * mapDepth * PROPS_EDGE_MARGIN;

    // Keep spawn area clear
    if (Math.abs(x) < PROPS_CLEARING_RADIUS && Math.abs(z) < PROPS_CLEARING_RADIUS) continue;
    
    // Note: Track mask clearing will be done dynamically by PropsInstancer 
    // or the Map Editor in the future. For now, PropsInstancer will filter them.

    const yRot = random(i * 5 + 3) * Math.PI * 2;
    const scaleBase = isTree ? 1.5 + random(i * 5 + 4) * 2 : 0.5 + random(i * 5 + 4) * 1.5;
    const sX = scaleBase;
    const sY = isTree ? scaleBase * (1.5 + random(i * 5 + 6)) : scaleBase;
    const sZ = scaleBase;

    props.push({
      id: `prop_${i}`,
      type: isTree ? 'tree' : 'rock',
      position: [x, 0, z], // y will be snapped to terrain by PropsInstancer
      rotation: [0, yRot, 0],
      scale: [sX, sY, sZ],
    });
  }
  
  return props;
}

export const LEVEL1_DATA: LevelData = {
  id: 'level1',
  name: 'Default Rally Track',
  terrainBase: {
    width: 800,
    depth: 800,
    subdivisions: 256,
    amplitude: 30,
    frequency: 0.003,
    octaves: 5,
    lacunarity: 2.0,
    persistence: 0.45,
    seed: 42,
  },
  track: {
    width: 25,
    falloff: 40,
    targetHeight: -0.5,
    points: [
      { x: 0, z: 0 },
      { x: 100, z: -50 },
      { x: 180, z: -100 },
      { x: 220, z: 0 },
      { x: 150, z: 120 },
      { x: 0, z: 200 },
      { x: -150, z: 100 },
      { x: -200, z: 0 },
      { x: -100, z: -150 },
      { x: -50, z: -50 },
    ],
  },
  heightModifiers: [
    {
      x: 0,
      z: 0,
      radius: 50, // 30 + 20 falloff
      absoluteHeight: 0,
      shape: 'sphere' // acts like spawn_flatten
    },
    {
      x: 280,
      z: -280,
      radius: 180,
      heightDelta: 160,
      shape: 'smooth' // acts like the old mountain
    }
  ],
  props: generateLevel1Props(800, 800),
};
