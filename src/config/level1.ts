import type { LevelData, PropData } from '@/types/level';

const NUM_PROPS = 800;
const PROPS_CLEARING_RADIUS = 40;
const PROPS_EDGE_MARGIN = 0.9;
const TREE_PROBABILITY = 0.7;

/**
 * Procedurally generates props for Level 1 (Island Circuit).
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

    // Keep spawn and start line area clear of random props
    if (Math.abs(x) < PROPS_CLEARING_RADIUS && Math.abs(z) < PROPS_CLEARING_RADIUS) continue;

    const yRot = random(i * 5 + 3) * Math.PI * 2;
    const scaleBase = isTree ? 1.5 + random(i * 5 + 4) * 2 : 0.5 + random(i * 5 + 4) * 1.5;
    const sX = scaleBase;
    const sY = isTree ? scaleBase * (1.5 + random(i * 5 + 6)) : scaleBase;
    const sZ = scaleBase;

    props.push({
      id: `prop_${i}`,
      type: isTree ? 'tree' : 'rock',
      position: [x, 0, z], // y snapped to terrain by PropsInstancer
      rotation: [0, yRot, 0],
      scale: [sX, sY, sZ],
    });
  }
  
  return props;
}

export const LEVEL1_DATA: LevelData = {
  id: 'level1',
  name: 'Island Circuit',
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
      { x: 0, z: 0 },         // Checkpoint 0: Start / Finish Gantry
      { x: 90, z: -45 },      // Checkpoint 1: Fast Straight Exit
      { x: 180, z: -90 },     // Checkpoint 2: Sweeping High-Speed Right
      { x: 240, z: -10 },     // Checkpoint 3: Coastal Cliffs
      { x: 200, z: 110 },     // Checkpoint 4: Hill Crest
      { x: 70, z: 190 },      // Checkpoint 5: Southern Valley
      { x: -80, z: 210 },     // Checkpoint 6: South-West Basin
      { x: -190, z: 120 },    // Checkpoint 7: Western Elevation
      { x: -220, z: -20 },    // Checkpoint 8: North-West Plateau
      { x: -150, z: -120 },   // Checkpoint 9: Coastal Chicane
      { x: -70, z: 35 },      // Checkpoint 10: Start Straight Approach
    ],
  },
  heightModifiers: [
    {
      x: 0,
      z: 0,
      radius: 65,
      absoluteHeight: 0,
      shape: 'sphere', // Level spawn & start straight foundation
    },
    {
      x: 280,
      z: -280,
      radius: 220,
      heightDelta: 100,
      shape: 'sphere',
    },
  ],
  props: generateLevel1Props(800, 800),
};
