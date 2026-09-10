import { Vector3, CatmullRomCurve3 } from 'three';
import type { LevelData, PropData } from '@/types/level';

export const LEVEL5_TRACK_POINTS = [
  { x: 0, z: 0 },         // CP 0: Arena Launch Grid (Heading North +Z)
  { x: 30, z: 80 },       // CP 1: Power Exit into Sweeper
  { x: 100, z: 150 },     // CP 2: Wide Outer Sweeper Right
  { x: 180, z: 120 },     // CP 3: Entry to Container Alley
  { x: 190, z: 20 },      // CP 4: High-Speed Slalom 1
  { x: 150, z: -80 },     // CP 5: High-Speed Slalom 2
  { x: 90, z: -160 },     // CP 6: 180 Hairpin Entry
  { x: 0, z: -200 },      // CP 7: Deep South Hairpin Apex
  { x: -90, z: -160 },    // CP 8: Hairpin Exit towards 360 Donut
  { x: -140, z: -70 },    // CP 9: Transition Flick
  { x: -180, z: 10 },     // CP 10: 360 Donut Entry
  { x: -210, z: 80 },     // CP 11: Donut Outer Orbit
  { x: -160, z: 140 },    // CP 12: Donut Apex
  { x: -90, z: 90 },      // CP 13: Donut Exit into Crossover
  { x: -40, z: 30 },      // CP 14: Figure-8 Approach
  { x: -10, z: -20 },     // CP 15: Final S-Flick to Gantry
];

/**
 * Procedurally generates props for Level 5 (Apex Gymkhana Arena).
 * Scatters shipping containers, drift pylons, hay bale apex buffers,
 * rally chevron signs, and perimeter fences.
 */
export function generateLevel5Props(_mapWidth: number, _mapDepth: number): PropData[] {
  const props: PropData[] = [];
  let propId = 0;

  // Build CatmullRom track curve to sample road segments
  const trackCurve = new CatmullRomCurve3(
    LEVEL5_TRACK_POINTS.map((p) => new Vector3(p.x, 0, p.z)),
    true,
    'catmullrom',
    0.5,
  );

  const numSamples = 600;
  const samplePoints: Vector3[] = [];
  for (let i = 0; i <= numSamples; i++) {
    samplePoints.push(trackCurve.getPointAt(i / numSamples));
  }

  // Minimum distance to track spline
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

  // 1. High-Visibility Drift Pylons (marking donut centers, clipping zones, and chicane apexes)
  const pylonLocations = [
    // 360 Donut Center Pylon cluster
    { x: -160, z: 75, rotY: 0 },
    { x: -162, z: 78, rotY: 0.5 },
    { x: -158, z: 72, rotY: -0.5 },

    // South Hairpin Center Pylons
    { x: 0, z: -150, rotY: 0 },
    { x: 5, z: -153, rotY: 0.8 },
    { x: -5, z: -147, rotY: -0.8 },

    // Slalom Clipping Pylons
    { x: 170, z: 70, rotY: 0.3 },
    { x: 165, z: -30, rotY: -0.4 },
    { x: 135, z: -120, rotY: 0.2 },

    // Sweeper Outer Markers
    { x: 60, z: 125, rotY: 0.7 },
    { x: 145, z: 140, rotY: 1.1 },
    { x: -115, z: 120, rotY: -0.6 },
  ];

  for (const pl of pylonLocations) {
    props.push({
      id: `drift_pylon_${propId++}`,
      type: 'drift_pylon',
      position: [pl.x, 0, pl.z],
      rotation: [0, pl.rotY, 0],
      scale: [1.1, 1.1, 1.1],
    });
  }

  // 2. Shipping Containers (Outer boundary barriers, stacked spectator walls, chicane funnels)
  const containerDefinitions = [
    // North Container Wall & Stack (Y = 0 and stacked at Y = 2.7)
    { x: 40, y: 0, z: 190, rotY: 0.2 },
    { x: 40, y: 2.7, z: 190, rotY: 0.2 },
    { x: 65, y: 0, z: 195, rotY: 0.2 },
    { x: 90, y: 0, z: 198, rotY: 0.2 },
    { x: 90, y: 2.7, z: 198, rotY: 0.2 },
    { x: 115, y: 0, z: 195, rotY: -0.1 },

    // East Slalom Corridor Containers (Safe distance from driving line)
    { x: 235, y: 0, z: 100, rotY: 1.57 },
    { x: 235, y: 2.7, z: 100, rotY: 1.57 },
    { x: 235, y: 0, z: 50, rotY: 1.57 },
    { x: 235, y: 0, z: 0, rotY: 1.57 },
    { x: 235, y: 2.7, z: 0, rotY: 1.57 },
    { x: 215, y: 0, z: -60, rotY: 1.2 },
    { x: 190, y: 0, z: -110, rotY: 0.8 },

    // South Hairpin Outer Containment Wall
    { x: 60, y: 0, z: -245, rotY: 0.3 },
    { x: 30, y: 0, z: -250, rotY: 0 },
    { x: 30, y: 2.7, z: -250, rotY: 0 },
    { x: 0, y: 0, z: -250, rotY: 0 },
    { x: -30, y: 0, z: -250, rotY: 0 },
    { x: -30, y: 2.7, z: -250, rotY: 0 },
    { x: -60, y: 0, z: -245, rotY: -0.3 },

    // West Donut Outer Container Stack
    { x: -255, y: 0, z: 40, rotY: 1.57 },
    { x: -255, y: 2.7, z: 40, rotY: 1.57 },
    { x: -260, y: 0, z: 90, rotY: 1.57 },
    { x: -255, y: 0, z: 140, rotY: 1.57 },
    { x: -255, y: 2.7, z: 140, rotY: 1.57 },
    { x: -210, y: 0, z: 180, rotY: 2.3 },
    { x: -160, y: 0, z: 195, rotY: 3.14 },

    // Launch Grid Paddock Containers
    { x: -50, y: 0, z: -50, rotY: 0.78 },
    { x: -50, y: 2.7, z: -50, rotY: 0.78 },
    { x: -75, y: 0, z: -65, rotY: 0.78 },
    { x: 50, y: 0, z: -50, rotY: -0.78 },
    { x: 50, y: 2.7, z: -50, rotY: -0.78 },
  ];

  for (const c of containerDefinitions) {
    // Check clearance from track line (min 23.0m for safety)
    const dist = getMinDistToTrack(c.x, c.z);
    if (dist < 23.0) continue;

    props.push({
      id: `shipping_container_${propId++}`,
      type: 'shipping_container',
      position: [c.x, c.y, c.z],
      rotation: [0, c.rotY, 0],
      scale: [1.0, 1.0, 1.0],
    });
  }

  // 3. Straw Hay Bales (Corner safety cushions)
  const hayBaleLocations = [
    { x: 15, z: 45, rotY: 0.2 },
    { x: 65, z: 110, rotY: 0.6 },
    { x: 135, z: 145, rotY: 1.2 },
    { x: 175, z: 75, rotY: 1.6 },
    { x: 160, z: -25, rotY: 2.0 },
    { x: 125, z: -115, rotY: 2.4 },
    { x: 45, z: -185, rotY: 2.8 },
    { x: -45, z: -185, rotY: -2.8 },
    { x: -120, z: -125, rotY: -2.3 },
    { x: -165, z: -35, rotY: -1.7 },
    { x: -185, z: 45, rotY: -1.2 },
    { x: -175, z: 115, rotY: -0.7 },
    { x: -125, z: 125, rotY: -0.2 },
    { x: -65, z: 65, rotY: 0.4 },
  ];

  for (const hb of hayBaleLocations) {
    props.push({
      id: `hay_bale_${propId++}`,
      type: 'hay_bale',
      position: [hb.x, 0, hb.z],
      rotation: [0, hb.rotY, 0],
      scale: [1.2, 1.2, 1.2],
    });
  }

  // 4. Rally Warning Chevron Signs
  const signLocations = [
    { x: 25, z: 75, rotY: 0.4 },
    { x: 85, z: 145, rotY: 0.9 },
    { x: 185, z: 105, rotY: 1.8 },
    { x: 115, z: -155, rotY: 2.5 },
    { x: -10, z: -215, rotY: 3.14 },
    { x: -130, z: -145, rotY: -2.4 },
    { x: -205, z: 25, rotY: -1.5 },
    { x: -195, z: 135, rotY: -0.8 },
  ];

  for (const rs of signLocations) {
    props.push({
      id: `rally_sign_${propId++}`,
      type: 'rally_sign',
      position: [rs.x, 0, rs.z],
      rotation: [0, rs.rotY, 0],
      scale: [1.0, 1.0, 1.0],
    });
  }

  // 5. Perimeter Fences (Spectator boundary beyond track)
  const fencePerimeter = [
    { x: 150, z: 220, rotY: 0.3 },
    { x: 180, z: 210, rotY: 0.5 },
    { x: 210, z: 190, rotY: 0.8 },
    { x: 260, z: 60, rotY: 1.57 },
    { x: 260, z: 20, rotY: 1.57 },
    { x: 260, z: -20, rotY: 1.57 },
    { x: 230, z: -160, rotY: 2.4 },
    { x: 200, z: -200, rotY: 2.6 },
    { x: 100, z: -270, rotY: 3.14 },
    { x: -100, z: -270, rotY: 3.14 },
    { x: -220, z: -180, rotY: -2.5 },
    { x: -280, z: 30, rotY: -1.57 },
    { x: -280, z: 80, rotY: -1.57 },
    { x: -280, z: 130, rotY: -1.57 },
  ];

  for (const f of fencePerimeter) {
    const dist = getMinDistToTrack(f.x, f.z);
    if (dist < 26.0) continue;

    props.push({
      id: `fence_${propId++}`,
      type: 'fence',
      position: [f.x, 0, f.z],
      rotation: [0, f.rotY, 0],
      scale: [1.0, 1.0, 1.0],
    });
  }

  // 6. Stunt Jump Launch Ramps (Apex Gymkhana Big Air Ramps)
  const jumpRampLocations = [
    // Ramp 1: Launch Grid Straightaway Launch (towards Sweeper)
    { x: 12, z: 35, rotY: 0.36 },
    // Ramp 2: High-Speed Slalom Corridor Super Jump
    { x: 172, z: -25, rotY: -2.76 },
    // Ramp 3: South Hairpin Exit Power Launch
    { x: -115, z: -115, rotY: -0.51 },
    // Ramp 4: Donut Crossover Air Launch
    { x: -65, z: 60, rotY: 2.45 },
    // Ramp 5: Center Compound Freestyle Mega Ramp (Facing North)
    { x: 0, z: -90, rotY: 0.0 },
  ];

  for (const jr of jumpRampLocations) {
    props.push({
      id: `jump_ramp_${propId++}`,
      type: 'jump_ramp',
      position: [jr.x, 0, jr.z],
      rotation: [0, jr.rotY, 0],
      scale: [1.0, 1.0, 1.0],
    });
  }

  return props;
}

export const LEVEL5_GYMKHANA_DATA: LevelData = {
  id: 'level5_gymkhana',
  name: 'Apex Gymkhana Arena',
  terrainBase: {
    width: 1400,
    depth: 1400,
    subdivisions: 256,
    amplitude: 1.5,
    frequency: 0.002,
    octaves: 3,
    lacunarity: 2.0,
    persistence: 0.45,
    seed: 1337,
  },
  track: {
    width: 22.0,
    falloff: 12.0,
    targetHeight: 8.0,
    points: LEVEL5_TRACK_POINTS,
  },
  heightModifiers: [
    {
      x: 0,
      z: 0,
      radius: 460,
      absoluteHeight: 8.0,
      shape: 'sphere', // Smooth flat asphalt arena plateau
    },
    {
      x: 0,
      z: 0,
      radius: 350,
      absoluteHeight: 8.0,
      shape: 'flat', // Level central drift compound
    },
  ],
  props: generateLevel5Props(1400, 1400),
};
