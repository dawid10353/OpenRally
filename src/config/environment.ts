/**
 * Environment and visual configuration.
 * Centralizes values for sky, fog, lighting, and post-processing.
 */

// ─── Sky & Atmosphere ───────────────────────────────────────────────
export const SKY_CONFIG = {
  distance: 450000,
  sunPosition: [80, 100, 60] as [number, number, number],
  inclination: 0,
  azimuth: 0.25,
  turbidity: 4.5,
  rayleigh: 1.4,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.82,
};

export const FOG_CONFIG = {
  color: '#a4bccc',
  near: 90,
  far: 650,
};

// ─── Lighting ───────────────────────────────────────────────────────
export const LIGHTING_CONFIG = {
  ambient: {
    intensity: 0.24,
    color: '#b2cde8',
  },
  directional: {
    intensity: 1.35,
    color: '#fff6ec',
    shadowMapSize: 1024,
    shadowCameraRange: 75,
    shadowCameraNear: 0.5,
    shadowCameraFar: 450,
    shadowBias: -0.00008,
    shadowNormalBias: 0.035,
  },
  hemisphere: {
    skyColor: '#80b3e6',
    groundColor: '#2b3d1f',
    intensity: 0.38,
  },
};

// ─── Post-Processing ────────────────────────────────────────────────
export const POSTPROCESSING_CONFIG = {
  bloom: {
    luminanceThreshold: 0.88,
    luminanceSmoothing: 0.35,
    intensity: 0.42,
  },
  vignette: {
    offset: 0.32,
    darkness: 0.52,
  },
};
