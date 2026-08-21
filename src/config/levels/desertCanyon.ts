import type { LevelData, PropData } from '@/types/level';

const NUM_PROPS = 600;
const PROPS_CLEARING_RADIUS = 40;
const PROPS_EDGE_MARGIN = 0.88;
const TREE_PROBABILITY = 0.15; // Desert shrubs and boulders

function generateDesertProps(mapWidth: number, mapDepth: number): PropData[] {
  const props: PropData[] = [];

  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < NUM_PROPS; i++) {
    const isTree = random(i * 5) < TREE_PROBABILITY;
    const x = (random(i * 5 + 1) - 0.5) * mapWidth * PROPS_EDGE_MARGIN;
    const z = (random(i * 5 + 2) - 0.5) * mapDepth * PROPS_EDGE_MARGIN;

    // Keep spawn & start straight clear
    if (Math.abs(x) < PROPS_CLEARING_RADIUS && Math.abs(z) < PROPS_CLEARING_RADIUS) continue;

    const yRot = random(i * 5 + 3) * Math.PI * 2;
    const scaleBase = isTree ? 1.2 + random(i * 5 + 4) * 1.5 : 0.8 + random(i * 5 + 4) * 2.5;

    props.push({
      id: `desert_prop_${i}`,
      type: isTree ? 'tree' : 'rock',
      position: [x, 0, z],
      rotation: [0, yRot, 0],
      scale: [scaleBase, isTree ? scaleBase * 1.2 : scaleBase * 0.9, scaleBase],
    });
  }

  return props;
}

export const LEVEL2_DESERT_DATA: LevelData = {
  id: 'desert_canyon',
  name: 'Desert Canyon',
  terrainBase: {
    width: 800,
    depth: 800,
    subdivisions: 256,
    amplitude: 38,
    frequency: 0.0035,
    octaves: 4,
    lacunarity: 2.1,
    persistence: 0.42,
    seed: 98765,
  },
  track: {
    width: 28,
    falloff: 45,
    targetHeight: 1.0,
    points: [
      { x: 0, z: 0 },         // Checkpoint 0: Start / Finish Gantry
      { x: 110, z: 40 },      // Checkpoint 1: Canyon Entry
      { x: 210, z: 100 },     // Checkpoint 2: Sand Dunes Pass
      { x: 240, z: 190 },     // Checkpoint 3: Eastern Plateau Bend
      { x: 120, z: 250 },     // Checkpoint 4: Gorge Descent
      { x: -50, z: 230 },     // Checkpoint 5: Dry Riverbed Sweep
      { x: -190, z: 150 },    // Checkpoint 6: Rocky Valley Hairpin
      { x: -230, z: 10 },     // Checkpoint 7: Western Ridge Climb
      { x: -160, z: -130 },   // Checkpoint 8: North Dunes Crest
      { x: -70, z: -110 },    // Checkpoint 9: Canyon Chicane
      { x: -70, z: -25 },     // Checkpoint 10: Start Straight Approach
    ],
  },
  heightModifiers: [
    {
      x: 0,
      z: 0,
      radius: 65,
      absoluteHeight: 1.0,
      shape: 'sphere', // Level spawn & start straight
    },
    {
      x: -220,
      z: -220,
      radius: 180,
      heightDelta: 80,
      shape: 'sphere',
    },
    {
      x: 200,
      z: -200,
      radius: 150,
      heightDelta: 60,
      shape: 'sphere',
    },
  ],
  props: generateDesertProps(800, 800),
};
