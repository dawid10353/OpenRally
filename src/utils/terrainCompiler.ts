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
      // Normalize coordinates to [0, 1] range, then scale by frequency
      const nx = (x / subdivisions) * width * frequency;
      const nz = (z / subdivisions) * depth * frequency;

      // Base: Fractal Brownian Motion
      let value = 0;
      let amp = 1;
      let freq = 1;
      let maxAmp = 0;

      for (let o = 0; o < octaves; o++) {
        value += amp * noise2D(nx * freq, nz * freq);
        maxAmp += amp;
        amp *= persistence;
        freq *= lacunarity;
      }

      // Normalize to [-1, 1] then scale by amplitude
      value = (value / maxAmp) * amplitude;

      const cx = x / subdivisions - 0.5;
      const cz = z / subdivisions - 0.5;
      const worldX = cx * width;
      const worldZ = cz * depth;

      // --- Apply Explicit Data-Driven Modifiers (Brushes) ---
      if (heightModifiers) {
        for (const mod of heightModifiers) {
          const dist = Math.sqrt((worldX - mod.x) ** 2 + (worldZ - mod.z) ** 2);
          if (dist < mod.radius) {
            const t = 1.0 - (dist / mod.radius);
            
            if (mod.shape === 'sphere') {
              // Smooth spherical falloff
              const profile = t * t * (3 - 2 * t); // Smoothstep
              if (mod.heightDelta !== undefined) {
                value += profile * mod.heightDelta;
              } else if (mod.absoluteHeight !== undefined) {
                value = value * (1 - profile) + mod.absoluteHeight * profile;
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
               }
            }
          }
        }
      }

      // --- Track generation via Spline ---
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
        trackMask = t * t * (3 - 2 * t);
      }

      if (trackMask > 0) {
        const carveStrength = trackMask * 0.9;
        value = value * (1 - carveStrength) + track.targetHeight * carveStrength;
      }

      // Map edges fade to underwater
      const distToEdgeX = (0.5 - Math.abs(cx)) * width;
      const distToEdgeZ = (0.5 - Math.abs(cz)) * depth;
      const minEdgeDist = Math.min(distToEdgeX, distToEdgeZ);
      const edgeFalloff = 50;

      if (minEdgeDist < edgeFalloff) {
        const edgeFactor = Math.max(0, minEdgeDist / edgeFalloff);
        let smoothEdge = edgeFactor * edgeFactor * (3 - 2 * edgeFactor); 
        
        // Protect track from going underwater at the edge
        smoothEdge = Math.min(1.0, smoothEdge + trackMask);
        
        const underwaterDepth = -15;
        value = underwaterDepth + (value - underwaterDepth) * smoothEdge;
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
