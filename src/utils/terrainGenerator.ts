import { createNoise2D } from 'simplex-noise';
import type { HeightmapData, TerrainConfig } from '@/types/terrain';

/**
 * Seed-based PRNG (mulberry32) for deterministic noise.
 * @param seed - Integer seed value
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
 * Generate a heightmap using fractal Brownian motion (fBM) with simplex noise.
 *
 * The returned Float32Array has (subdivisions+1)^2 elements in row-major order
 * (iterating Z first, then X), matching Rapier's HeightfieldCollider expectations.
 *
 * @param config - Terrain generation configuration
 * @returns HeightmapData with heights and metadata
 */
export function generateHeightmap(config: TerrainConfig): HeightmapData {
  const {
    subdivisions,
    amplitude,
    frequency,
    octaves,
    lacunarity,
    persistence,
    seed,
  } = config;

  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);

  const size = subdivisions + 1;
  const heights = new Float32Array(size * size);
  const trackMasks = new Float32Array(size * size);

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      // Normalize coordinates to [0, 1] range, then scale by frequency
      const nx = (x / subdivisions) * config.width * frequency;
      const nz = (z / subdivisions) * config.depth * frequency;

      // Fractal Brownian Motion
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

      // Flatten center area for spawn zone (smooth falloff within radius 30 units)
      const cx = x / subdivisions - 0.5;
      const cz = z / subdivisions - 0.5;
      const distFromCenter = Math.sqrt(cx * cx + cz * cz) * config.width;
      const flattenRadius = 30;
      const flattenFalloff = 20;
      if (distFromCenter < flattenRadius + flattenFalloff) {
        const flattenFactor = Math.max(
          0,
          1 - Math.max(0, distFromCenter - flattenRadius) / flattenFalloff,
        );
        value *= 1 - flattenFactor;
      }

      // Track generation
      const trackNoiseFreq = 3.0;
      const angle = Math.atan2(cz, cx);
      const trackNx = Math.cos(angle) * trackNoiseFreq;
      const trackNz = Math.sin(angle) * trackNoiseFreq;
      const trackWiggle = noise2D(trackNx, trackNz);
      
      const trackBaseRadius = 220;
      const trackVariance = 80;
      const trackRadius = trackBaseRadius + trackWiggle * trackVariance;
      const trackWidth = 12;
      const trackFalloff = 45; // increased significantly for smooth rolling hills
      
      let trackMask = 0;
      const distToTrack = Math.abs(distFromCenter - trackRadius);
      
      if (distToTrack < trackWidth) {
        trackMask = 1.0;
      } else if (distToTrack < trackWidth + trackFalloff) {
        // Smoothstep interpolation for natural, non-angular terrain transitions
        const t = 1.0 - (distToTrack - trackWidth) / trackFalloff;
        trackMask = t * t * (3 - 2 * t);
      }

      // Only apply track if we are somewhat outside the spawn clearing
      if (distFromCenter > 40 && trackMask > 0) {
        // Flatten the track towards a slightly lower base height
        const trackTargetHeight = -2.0; 
        // Use 80% carving strength to keep minor bumps on the track itself
        const carveStrength = trackMask * 0.8;
        value = value * (1 - carveStrength) + trackTargetHeight * carveStrength;
      } else {
        trackMask = 0; // ensure spawn is clean
      }

      // Map edges fade to underwater to avoid sharp cutoffs
      const distToEdgeX = (0.5 - Math.abs(cx)) * config.width;
      const distToEdgeZ = (0.5 - Math.abs(cz)) * config.depth;
      const minEdgeDist = Math.min(distToEdgeX, distToEdgeZ);
      const edgeFalloff = 50; // Units from the edge where the fade starts

      if (minEdgeDist < edgeFalloff) {
        const edgeFactor = Math.max(0, minEdgeDist / edgeFalloff);
        const smoothEdge = edgeFactor * edgeFactor * (3 - 2 * edgeFactor); // Ease in-out
        const underwaterDepth = -15; // Ocean is at -8
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
