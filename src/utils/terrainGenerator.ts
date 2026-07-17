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
      const trackWidth = 22; // Szeroka droga, by pomieścić pojazd bez kolizji z uskokami
      const trackFalloff = 40; // gładki spadek zanikania śladu
      
      let trackMask = 0;
      const distToTrack = Math.abs(distFromCenter - trackRadius);
      
      if (distToTrack < trackWidth) {
        trackMask = 1.0;
      } else if (distToTrack < trackWidth + trackFalloff) {
        // Smoothstep interpolation for muddy track falloff
        const t = 1.0 - (distToTrack - trackWidth) / trackFalloff;
        trackMask = t * t * (3 - 2 * t);
      }

      if (distFromCenter > 40 && trackMask > 0) {
        const trackTargetHeight = -0.5; // płyciutkie, by siatka nie dostała cieni
        const carveStrength = trackMask * 0.9; // 90% siły, tworzy gładki i stabilny teren do jazdy (brak bocznych pochyłości na klifach)
        value = value * (1 - carveStrength) + trackTargetHeight * carveStrength;
      }

      if (distFromCenter <= 40) {
        trackMask = 0; // ensure spawn is clean
      }

      // --- Huge Mountain Challenge ---
      const mountWorldX = cx * config.width;
      const mountWorldZ = cz * config.depth;
      const mountCenterX = 280; // near the top-right edge (max is 400)
      const mountCenterZ = -280; // changed to negative Z to not overlap too much with the start
      const mountDist = Math.sqrt((mountWorldX - mountCenterX) ** 2 + (mountWorldZ - mountCenterZ) ** 2);
      const mountRadius = 180;
      
      if (mountDist < mountRadius) {
        const t = 1.0 - (mountDist / mountRadius);
        // A power of 1.5 gives a nice steep slope that is somewhat smooth
        const mountProfile = Math.pow(t, 1.5); 
        const mountHeight = 160; // Very high mountain
        value += mountProfile * mountHeight;
      }

      // Map edges fade to underwater to avoid sharp cutoffs
      const distToEdgeX = (0.5 - Math.abs(cx)) * config.width;
      const distToEdgeZ = (0.5 - Math.abs(cz)) * config.depth;
      const minEdgeDist = Math.min(distToEdgeX, distToEdgeZ);
      const edgeFalloff = 50; // Units from the edge where the fade starts

      if (minEdgeDist < edgeFalloff) {
        const edgeFactor = Math.max(0, minEdgeDist / edgeFalloff);
        let smoothEdge = edgeFactor * edgeFactor * (3 - 2 * edgeFactor); // Ease in-out
        
        // Zabezpiecz drogę (trackMask) przed wpadaniem do wody - tworzymy łagodne przewężenie lądowe
        smoothEdge = Math.min(1.0, smoothEdge + trackMask);
        
        const underwaterDepth = -15; // Ocean is at -15
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
