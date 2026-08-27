import { Vector3, CatmullRomCurve3 } from 'three';
import type { LevelData, PropData } from '@/types/level';

const LEVEL2_TRACK_POINTS = [
  { x: 0, z: 0 },         // CP 0: Start / Finish Gantry
  { x: 140, z: 50 },      // CP 1: Canyon Entry Straight
  { x: 270, z: 110 },     // CP 2: Sweeping Right 4 over Dune
  { x: 390, z: 190 },     // CP 3: Sharp Left 2 into Rock Gorge
  { x: 470, z: 320 },     // CP 4: High-Speed Plateau Run
  { x: 370, z: 430 },     // CP 5: Hairpin Right around Mesa
  { x: 220, z: 470 },     // CP 6: Steep Gorge Descent
  { x: 50, z: 410 },      // CP 7: 90° Left into Dry Riverbed
  { x: -70, z: 450 },     // CP 8: Right 3 Flick
  { x: -210, z: 390 },    // CP 9: Sand Wash Chicane
  { x: -330, z: 270 },    // CP 10: Technical Hairpin Left
  { x: -420, z: 120 },    // CP 11: Western Canyon Ridge Climb
  { x: -470, z: -50 },    // CP 12: Fast Ridge Crest Straight
  { x: -370, z: -170 },   // CP 13: 90° Right Flick
  { x: -440, z: -290 },   // CP 14: Sand Dune Hairpin Left
  { x: -310, z: -400 },   // CP 15: High-Speed Dunes Descent
  { x: -150, z: -350 },   // CP 16: Sharp Right 3 Chicane
  { x: -210, z: -210 },   // CP 17: S-Bend around Rock Pillars
  { x: -120, z: -110 },   // CP 18: Fast Canyon Straight
  { x: -60, z: -30 },     // CP 19: Final S-Bend to Start Line
];

function generateDesertProps(mapWidth: number, mapDepth: number): PropData[] {
  const props: PropData[] = [];
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  let propId = 0;

  // 1. Canyon Rock Formations & Markers along track
  const trackCurve = new CatmullRomCurve3(
    LEVEL2_TRACK_POINTS.map((p) => new Vector3(p.x, 0, p.z)),
    true,
    'catmullrom',
    0.5
  );

  const numTrackSamples = 120;
  for (let i = 0; i < numTrackSamples; i++) {
    const u = i / numTrackSamples;
    const pt = trackCurve.getPointAt(u);
    const tangent = trackCurve.getTangentAt(u).normalize();
    
    const normalX = -tangent.z;
    const normalZ = tangent.x;

    if (Math.hypot(pt.x, pt.z) < 45) continue;

    const sideOffsets = [10.0, 20.0];
    for (const offset of sideOffsets) {
      // Left side boulder / shrub
      const isLeftTree = random(propId * 5) < 0.15;
      const leftDist = offset + (random(propId * 5 + 1) - 0.5) * 4.0;
      const leftScale = isLeftTree ? 1.6 + random(propId * 5 + 2) * 1.8 : 1.2 + random(propId * 5 + 2) * 2.8;
      
      props.push({
        id: `desert_corridor_L_${propId++}`,
        type: isLeftTree ? 'tree' : 'rock',
        position: [
          pt.x + normalX * leftDist + tangent.x * (random(propId * 5 + 3) - 0.5) * 4.0,
          0,
          pt.z + normalZ * leftDist + tangent.z * (random(propId * 5 + 3) - 0.5) * 4.0,
        ],
        rotation: [0, random(propId * 5 + 4) * Math.PI * 2, 0],
        scale: [leftScale, isLeftTree ? leftScale * 1.2 : leftScale * 0.9, leftScale],
      });

      // Right side boulder / shrub
      const isRightTree = random(propId * 5) < 0.15;
      const rightDist = offset + (random(propId * 5 + 1) - 0.5) * 4.0;
      const rightScale = isRightTree ? 1.6 + random(propId * 5 + 2) * 1.8 : 1.2 + random(propId * 5 + 2) * 2.8;

      props.push({
        id: `desert_corridor_R_${propId++}`,
        type: isRightTree ? 'tree' : 'rock',
        position: [
          pt.x - normalX * rightDist + tangent.x * (random(propId * 5 + 3) - 0.5) * 4.0,
          0,
          pt.z - normalZ * rightDist + tangent.z * (random(propId * 5 + 3) - 0.5) * 4.0,
        ],
        rotation: [0, random(propId * 5 + 4) * Math.PI * 2, 0],
        scale: [rightScale, isRightTree ? rightScale * 1.2 : rightScale * 0.9, rightScale],
      });
    }
  }

  // 2. Wide Desert Basin Boulders & Shrubs
  const NUM_BG_PROPS = 1000;
  for (let i = 0; i < NUM_BG_PROPS; i++) {
    const isTree = random(propId * 5) < 0.12;
    const x = (random(propId * 5 + 1) - 0.5) * mapWidth * 0.75;
    const z = (random(propId * 5 + 2) - 0.5) * mapDepth * 0.75;

    if (Math.hypot(x, z) < 45) continue;

    const yRot = random(propId * 5 + 3) * Math.PI * 2;
    const scaleBase = isTree ? 1.4 + random(propId * 5 + 4) * 1.8 : 1.0 + random(propId * 5 + 4) * 3.2;

    props.push({
      id: `desert_bg_${propId++}`,
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
    width: 2000,
    depth: 2000,
    subdivisions: 384,
    amplitude: 20,
    frequency: 0.002,
    octaves: 4,
    lacunarity: 2.1,
    persistence: 0.42,
    seed: 98765,
  },
  track: {
    width: 12.0,
    falloff: 12.0,
    targetHeight: 0,
    points: LEVEL2_TRACK_POINTS,
  },
  heightModifiers: [
    {
      x: 0,
      z: 0,
      radius: 80,
      absoluteHeight: 8.0,
      shape: 'sphere', // Level spawn & start straight foundation
    },
    {
      x: 550,
      z: -450,
      radius: 380,
      heightDelta: 75,
      shape: 'smooth', // Grand North-East Canyon Mesa
    },
    {
      x: -520,
      z: -480,
      radius: 400,
      heightDelta: 80,
      shape: 'smooth', // Great North-West Mesa Massif
    },
    {
      x: 520,
      z: 500,
      radius: 360,
      heightDelta: 65,
      shape: 'smooth', // South-East Red Rock Ridge
    },
    {
      x: -500,
      z: 480,
      radius: 380,
      heightDelta: 70,
      shape: 'smooth', // South-West High Dunes
    },
    {
      x: -560,
      z: 50,
      radius: 320,
      heightDelta: 55,
      shape: 'smooth', // Western Canyon Buttress
    },
  ],
  props: generateDesertProps(2000, 2000),
};
