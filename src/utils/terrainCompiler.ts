import { CatmullRomCurve3, Vector3 } from 'three';
import { createNoise2D } from 'simplex-noise';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';

/**
 * Seed-based PRNG (mulberry32) for deterministic noise.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compiles a LevelData definition into a final HeightmapData array.
 * This separates the Data-Driven state from the procedural rendering logic.
 */
export function compileTerrain(level: LevelData): HeightmapData {
  const { terrainBase, track, heightModifiers } = level;
  const { subdivisions, amplitude, frequency, octaves, lacunarity, persistence, seed, width, depth } = terrainBase;

  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);

  const size = subdivisions + 1;
  const heights = new Float32Array(size * size);
  const trackMasks = new Float32Array(size * size);

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  // --- Track Spline Precalculation ---
  const trackCurve = new CatmullRomCurve3(
    track.points.map((p) => new Vector3(p.x, 0, p.z)),
    true, // closed curve
    'catmullrom',
    0.5,
  );
  // Sample the curve into discrete segments for fast distance checking
  const trackSamples = trackCurve.getSpacedPoints(400);

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const cx = x / subdivisions - 0.5;
      const cz = z / subdivisions - 0.5;
      const worldX = cx * width;
      const worldZ = cz * depth;

      // Base Fractal Brownian Motion
      const nx = (x / subdivisions) * width * frequency;
      const nz = (z / subdivisions) * depth * frequency;

      let fbm = 0;
      let amp = 1;
      let freq = 1;
      let maxAmp = 0;

      for (let o = 0; o < octaves; o++) {
        fbm += amp * noise2D(nx * freq, nz * freq);
        maxAmp += amp;
        amp *= persistence;
        freq *= lacunarity;
      }
      fbm = fbm / maxAmp; // Normalized to [-1, 1]

      // --- 1. Organic Coastal Landmass Profile ---
      const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
      const theta = Math.atan2(worldZ, worldX);

      // Multi-frequency organic coastline distortion (proportional to map dimensions)
      const coastScale = width / 2000.0;
      const coastNoise1 = noise2D(Math.cos(theta) * 2.2 + 12.3, Math.sin(theta) * 2.2 + 8.7) * (110.0 * coastScale);
      const coastNoise2 = noise2D(Math.cos(theta * 2.0) * 3.5 + 4.1, Math.sin(theta * 2.0) * 3.5 + 1.9) * (45.0 * coastScale);
      const effectiveRadius = distFromCenter + coastNoise1 + coastNoise2;

      const islandRadius = width * 0.38; // Mainland plateau coverage
      const deepRadius = width * 0.47;   // Deep ocean perimeter transition

      let baseElevation = -65.0;
      let noiseScale = 0.0;

      if (effectiveRadius < islandRadius) {
        // Inside the main landmass
        const islandT = 1.0 - effectiveRadius / islandRadius;
        const islandProfile = Math.pow(islandT, 0.7); // Gentle interior plateau
        baseElevation = 4.0 + 8.0 * islandProfile;
        noiseScale = 1.0;
      } else if (effectiveRadius < deepRadius) {
        // Coastal beach & underwater shelf descent
        const coastalT = (effectiveRadius - islandRadius) / (deepRadius - islandRadius);
        const smoothCoast = coastalT * coastalT * (3.0 - 2.0 * coastalT);
        baseElevation = 4.0 + (-65.0 - 4.0) * smoothCoast;
        noiseScale = 1.0 - smoothCoast;
      } else {
        // Deep open ocean seabed
        baseElevation = -65.0;
        noiseScale = 0.0;
      }

      let value = baseElevation + fbm * (amplitude * noiseScale);

      // --- 3. Apply Explicit Data-Driven Modifiers (Brushes) ---
      if (heightModifiers) {
        for (const mod of heightModifiers) {
          const dist = Math.sqrt((worldX - mod.x) ** 2 + (worldZ - mod.z) ** 2);
          if (dist < mod.radius) {
            const t = 1.0 - (dist / mod.radius);
            
            if (mod.shape === 'sphere') {
              // Smooth spherical falloff
              const profile = t * t * (3.0 - 2.0 * t); // Smoothstep
              if (mod.heightDelta !== undefined) {
                value += profile * mod.heightDelta;
              } else if (mod.absoluteHeight !== undefined) {
                value = value * (1.0 - profile) + mod.absoluteHeight * profile;
              }
            } else if (mod.shape === 'flat') {
              // Hard flat transition
              if (mod.absoluteHeight !== undefined) {
                value = mod.absoluteHeight;
              }
            } else if (mod.shape === 'smooth') {
               const profile = Math.pow(t, 1.5);
               if (mod.heightDelta !== undefined) {
                 value += profile * mod.heightDelta;
               } else if (mod.absoluteHeight !== undefined) {
                 value = value * (1.0 - profile) + mod.absoluteHeight * profile;
               }
            }
          }
        }
      }

      // --- 4. Track generation via Spline ---
      let minDistanceSq = Infinity;
      
      for (let i = 0; i < trackSamples.length - 1; i++) {
        const v = trackSamples[i];
        const w = trackSamples[i + 1];
        
        const l2 = (w.x - v.x) ** 2 + (w.z - v.z) ** 2;
        let distSq: number;
        
        if (l2 === 0) {
          distSq = (worldX - v.x) ** 2 + (worldZ - v.z) ** 2;
        } else {
          let t = ((worldX - v.x) * (w.x - v.x) + (worldZ - v.z) * (w.z - v.z)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = v.x + t * (w.x - v.x);
          const projZ = v.z + t * (w.z - v.z);
          distSq = (worldX - projX) ** 2 + (worldZ - projZ) ** 2;
        }
        
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
        }
      }
      
      const distToTrack = Math.sqrt(minDistanceSq);
      let trackMask = 0;
      
      if (distToTrack < track.width) {
        trackMask = 1.0;
      } else if (distToTrack < track.width + track.falloff) {
        const t = 1.0 - (distToTrack - track.width) / track.falloff;
        trackMask = t * t * (3.0 - 2.0 * t);
      }

      heights[z * size + x] = value;
      trackMasks[z * size + x] = trackMask;

      if (value < minHeight) minHeight = value;
      if (value > maxHeight) maxHeight = value;
    }
  }

  return {
    heights,
    trackMasks,
    cols: size,
    rows: size,
    minHeight,
    maxHeight,
  };
}

/**
 * Bilinear height interpolation from heightmap data for smooth world coordinates sampling.
 * Eliminates step artifacts and levitation on slopes.
 */
export function getInterpolatedHeight(
  worldX: number,
  worldZ: number,
  heights: Float32Array,
  rows: number,
  cols: number,
  mapWidth: number,
  mapDepth: number,
): number {
  const nx = (worldX + mapWidth / 2) / mapWidth;
  const nz = (worldZ + mapDepth / 2) / mapDepth;
  const gx = nx * (cols - 1);
  const gz = nz * (rows - 1);
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = Math.min(x0 + 1, cols - 1);
  const z1 = Math.min(z0 + 1, rows - 1);

  if (x0 < 0 || x0 >= cols || z0 < 0 || z0 >= rows) return 0;

  const fx = gx - x0;
  const fz = gz - z0;

  const h00 = heights[z0 * cols + x0];
  const h10 = heights[z0 * cols + x1];
  const h01 = heights[z1 * cols + x0];
  const h11 = heights[z1 * cols + x1];

  const h0 = h00 + (h10 - h00) * fx;
  const h1 = h01 + (h11 - h01) * fx;
  return h0 + (h1 - h0) * fz;
}
