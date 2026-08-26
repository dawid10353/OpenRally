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
};

export const FOG_CONFIG = {
  color: '#a4bccc',
  near: 90,
  far: 650,
};

// ─── Lighting ───────────────────────────────────────────────────────
export const LIGHTING_CONFIG = {
  ambient: {
    intensity: 0.22,
    color: '#a8c0dc',
  },
  directional: {
    intensity: 1.25,
    color: '#fff4e6',
    shadowMapSize: 1024,
    shadowCameraRange: 80,
    shadowCameraNear: 0.5,
    shadowCameraFar: 600,
    shadowBias: -0.0001,
    shadowNormalBias: 0.02,
  },
  hemisphere: {
    skyColor: '#70a4d8',
    groundColor: '#25361b',
    intensity: 0.35,
  },
};

// ─── Post-Processing ────────────────────────────────────────────────
export const POSTPROCESSING_CONFIG = {
  bloom: {
    luminanceThreshold: 1.0,
    luminanceSmoothing: 0.9,
    intensity: 0.4,
  },
  vignette: {
    offset: 0.3,
    darkness: 0.6,
  },
};
