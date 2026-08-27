import { Vector3, CatmullRomCurve3 } from 'three';
import type { LevelData, PropData } from '@/types/level';

const LEVEL1_TRACK_POINTS = [
  { x: 0, z: 0 },         // CP 0: Start / Finish Gantry
  { x: 130, z: -70 },     // CP 1: Fast Straight Exit
  { x: 260, z: -150 },    // CP 2: Right 4 over Crest
  { x: 380, z: -210 },    // CP 3: Sweeping High-Speed Right
  { x: 440, z: -90 },     // CP 4: Sharp Left 2 into Coastal Ridge
  { x: 350, z: 20 },      // CP 5: Forest Tunnel Entry
  { x: 430, z: 120 },     // CP 6: Sharp Right 3 Flick
  { x: 340, z: 230 },     // CP 7: Technical Hairpin Right
  { x: 200, z: 320 },     // CP 8: Fast Downhill Straight
  { x: 70, z: 380 },      // CP 9: Left 3 into Southern Basin
  { x: -70, z: 420 },     // CP 10: S-Bend Left
  { x: -180, z: 360 },    // CP 11: S-Bend Right onto Fast Section
  { x: -280, z: 270 },    // CP 12: Sharp Left 2 Chicane
  { x: -370, z: 150 },    // CP 13: Ridge Climb Switchback
  { x: -440, z: 10 },     // CP 14: Cliffside Hairpin Left
  { x: -380, z: -120 },   // CP 15: High-Speed Forest Descent
  { x: -280, z: -210 },   // CP 16: Right 3 over Crest
  { x: -350, z: -300 },   // CP 17: Sudden Left 2 Flick
  { x: -240, z: -370 },   // CP 18: Hairpin Right around Boulders
  { x: -110, z: -300 },   // CP 19: Long Forest Full Throttle Straight
  { x: -160, z: -160 },   // CP 20: Left 3 Chicane
  { x: -70, z: -35 },     // CP 21: Final S-Bend Approach
];

/**
 * Procedurally generates props for Level 1 (Island / Finland Forest Stage).
 * Creates a vast, continuous Scandinavian boreal pine forest covering all
 * rolling hills, ridges, and valleys, with natural clearance along the driving line.
 */
function generateLevel1Props(_mapWidth: number, _mapDepth: number): PropData[] {
  const props: PropData[] = [];
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  let propId = 0;

  // Build CatmullRom track curve to sample road segments
  const trackCurve = new CatmullRomCurve3(
    LEVEL1_TRACK_POINTS.map((p) => new Vector3(p.x, 0, p.z)),
    true,
    'catmullrom',
    0.5,
  );

  const numSamples = 160;
  const samplePoints: Vector3[] = [];
  for (let i = 0; i <= numSamples; i++) {
    samplePoints.push(trackCurve.getPointAt(i / numSamples));
  }

  // Fast minimum distance to track segments
  const getMinDistToTrack = (px: number, pz: number): number => {
    let minDistSq = Infinity;
    for (let i = 0; i < samplePoints.length - 1; i++) {
      const v = samplePoints[i];
      const w = samplePoints[i + 1];
      const l2 = (w.x - v.x) ** 2 + (w.z - v.z) ** 2;
      let distSq: number;
      if (l2 === 0) {
        distSq = (px - v.x) ** 2 + (pz - v.z) ** 2;
      } else {
        let t = ((px - v.x) * (w.x - v.x) + (pz - v.z) * (w.z - v.z)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = v.x + t * (w.x - v.x);
        const projZ = v.z + t * (w.z - v.z);
        distSq = (px - projX) ** 2 + (pz - projZ) ** 2;
      }
      if (distSq < minDistSq) minDistSq = distSq;
    }
    return Math.sqrt(minDistSq);
  };

  // Dense boreal Scandinavian forest matrix covering all hills, ridges, and valleys
  const islandRadius = 550;
  const gridStep = 13.0; // Dense 13m grid with organic jitter
  const halfExtent = 560;

  for (let gx = -halfExtent; gx <= halfExtent; gx += gridStep) {
    for (let gz = -halfExtent; gz <= halfExtent; gz += gridStep) {
      const distFromCenter = Math.hypot(gx, gz);
      if (distFromCenter > islandRadius) continue; // Out in the ocean

      // Organic position jitter
      const seed = (gx * 374761393 + gz * 668265263) ^ 0x5bf03635;
      const jx = (random(seed) - 0.5) * (gridStep * 0.85);
      const jz = (random(seed + 1) - 0.5) * (gridStep * 0.85);
      const x = gx + jx;
      const z = gz + jz;

      // Keep start gantry and spawn grid clear
      if (Math.hypot(x, z) < 42) continue;

      // Check distance to road
      const distToTrack = getMinDistToTrack(x, z);
      if (distToTrack < 6.8) continue; // Keep driving lane clear

      // Natural forest density modulation (organic groves and clearings)
      const groveNoise = Math.sin(x * 0.015) * Math.cos(z * 0.015);
      const treeProb = distToTrack < 25 ? 0.96 : (groveNoise > -0.6 ? 0.88 : 0.40);
      if (random(seed + 2) > treeProb) continue;

      const isTree = random(seed + 3) < 0.94;
      const scaleBase = isTree
        ? 2.2 + random(seed + 4) * 2.6 // Tall majestic Finnish pines (2.2m to 4.8m)
        : 0.9 + random(seed + 4) * 1.8; // Boulders

      const yRot = random(seed + 5) * Math.PI * 2;
      const heightScale = isTree ? scaleBase * (1.2 + random(seed + 6) * 0.4) : scaleBase * 0.9;

      props.push({
        id: `fin_tree_${propId++}`,
        type: isTree ? 'tree' : 'rock',
        position: [x, 0, z],
        rotation: [0, yRot, 0],
        scale: [scaleBase, heightScale, scaleBase],
      });
    }
  }

  return props;
}

export const LEVEL1_DATA: LevelData = {
  id: 'level1',
  name: 'Island Circuit',
  terrainBase: {
    width: 2000,
    depth: 2000,
    subdivisions: 384,
    amplitude: 18,
    frequency: 0.002,
    octaves: 5,
    lacunarity: 2.0,
    persistence: 0.45,
    seed: 42,
  },
  track: {
    width: 11.0,
    falloff: 10.0,
    targetHeight: 0,
    points: LEVEL1_TRACK_POINTS,
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
      shape: 'smooth', // Grand North-East Mountain Peak
    },
    {
      x: 50,
      z: -550,
      radius: 320,
      heightDelta: 60,
      shape: 'smooth', // Northern Mountain Ridge
    },
    {
      x: 500,
      z: 380,
      radius: 340,
      heightDelta: 55,
      shape: 'smooth', // South-East Coastal Horn
    },
    {
      x: -480,
      z: 480,
      radius: 360,
      heightDelta: 70,
      shape: 'smooth', // South-West Mountain Massif
    },
    {
      x: -520,
      z: -380,
      radius: 340,
      heightDelta: 50,
      shape: 'smooth', // North-West Coastal Cliffs
    },
  ],
  props: generateLevel1Props(2000, 2000),
};
