import type { SurfaceType, SurfaceDefinition } from '@/types';

/**
 * Centralized surface registry defining physics, audio, and visual characteristics
 * for every drivable terrain surface in OpenRally.
 */
export const SURFACE_REGISTRY: Record<SurfaceType, SurfaceDefinition> = {
  tarmac: {
    id: 'tarmac',
    name: 'Asphalt / Tarmac',
    tireModel: {
      front: { baseGrip: 3.4, peakSlipAngle: Math.PI / 8, slideGrip: 3.1 },
      rear: { baseGrip: 3.4, peakSlipAngle: Math.PI / 8, slideGrip: 3.1 },
    },
    particles: {
      color: '#e5e7eb',
      scale: 0.8,
      lifetime: 0.35,
      emitRateMultiplier: 0.5,
    },
    audio: {
      soundType: 'asphalt',
      basePitch: 1.1,
      volumeMultiplier: 0.7,
    },
    skidMarkOpacity: 0.85,
    rollingResistance: 0.005,
    looseSurfaceTractionLoss: 0.05,
  },
  mud: {
    id: 'mud',
    name: 'Mud / Track Dirt',
    tireModel: {
      front: { baseGrip: 2.3, peakSlipAngle: Math.PI / 6.5, slideGrip: 1.8 },
      rear: { baseGrip: 2.15, peakSlipAngle: Math.PI / 6.5, slideGrip: 1.6 },
    },
    particles: {
      color: '#8b6f4e',
      scale: 1.5,
      lifetime: 0.75,
      emitRateMultiplier: 1.5,
    },
    audio: {
      soundType: 'mud',
      basePitch: 0.85,
      volumeMultiplier: 1.2,
    },
    skidMarkOpacity: 0.7,
    rollingResistance: 0.026,
    looseSurfaceTractionLoss: 0.25,
  },
  grass: {
    id: 'grass',
    name: 'Grass / Meadow',
    tireModel: {
      front: { baseGrip: 1.85, peakSlipAngle: Math.PI / 7, slideGrip: 1.3 },
      rear: { baseGrip: 1.65, peakSlipAngle: Math.PI / 7, slideGrip: 1.15 },
    },
    particles: {
      color: '#856a4b',
      scale: 1.1,
      lifetime: 0.55,
      emitRateMultiplier: 1.0,
    },
    audio: {
      soundType: 'grass',
      basePitch: 0.95,
      volumeMultiplier: 1.0,
    },
    skidMarkOpacity: 0.4,
    rollingResistance: 0.030,
    looseSurfaceTractionLoss: 0.35,
  },
  sand: {
    id: 'sand',
    name: 'Beach Sand / Dunes',
    tireModel: {
      front: { baseGrip: 1.4, peakSlipAngle: Math.PI / 6, slideGrip: 1.0 },
      rear: { baseGrip: 1.2, peakSlipAngle: Math.PI / 6, slideGrip: 0.8 },
    },
    particles: {
      color: '#d4b483',
      scale: 1.7,
      lifetime: 0.9,
      emitRateMultiplier: 1.8,
    },
    audio: {
      soundType: 'sand',
      basePitch: 0.8,
      volumeMultiplier: 1.3,
    },
    skidMarkOpacity: 0.5,
    rollingResistance: 0.042,
    looseSurfaceTractionLoss: 0.45,
  },
  snow: {
    id: 'snow',
    name: 'Snow / Ice',
    tireModel: {
      front: { baseGrip: 1.1, peakSlipAngle: Math.PI / 5, slideGrip: 0.8 },
      rear: { baseGrip: 0.95, peakSlipAngle: Math.PI / 5, slideGrip: 0.7 },
    },
    particles: {
      color: '#f0f9ff',
      scale: 1.3,
      lifetime: 0.65,
      emitRateMultiplier: 1.3,
    },
    audio: {
      soundType: 'gravel',
      basePitch: 1.2,
      volumeMultiplier: 0.9,
    },
    skidMarkOpacity: 0.3,
    rollingResistance: 0.020,
    looseSurfaceTractionLoss: 0.40,
  },
  gravel: {
    id: 'gravel',
    name: 'Loose Gravel',
    tireModel: {
      front: { baseGrip: 2.15, peakSlipAngle: Math.PI / 6, slideGrip: 1.65 },
      rear: { baseGrip: 1.95, peakSlipAngle: Math.PI / 6, slideGrip: 1.45 },
    },
    particles: {
      color: '#a8a29e',
      scale: 1.4,
      lifetime: 0.7,
      emitRateMultiplier: 1.4,
    },
    audio: {
      soundType: 'gravel',
      basePitch: 1.05,
      volumeMultiplier: 1.1,
    },
    skidMarkOpacity: 0.6,
    rollingResistance: 0.024,
    looseSurfaceTractionLoss: 0.30,
  },
};

/**
 * Returns surface definition for a given surface type with fallback to grass.
 */
export function getSurfaceDefinition(surface: SurfaceType): SurfaceDefinition {
  return SURFACE_REGISTRY[surface] ?? SURFACE_REGISTRY.grass;
}

/**
 * Returns an array of all registered surfaces.
 */
export function getAllSurfaces(): SurfaceDefinition[] {
  return Object.values(SURFACE_REGISTRY);
}
