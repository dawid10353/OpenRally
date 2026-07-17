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
  color: '#b8c9d9',
  near: 100,
  far: 500,
};

// ─── Lighting ───────────────────────────────────────────────────────
export const LIGHTING_CONFIG = {
  ambient: {
    intensity: 0.3,
    color: '#b0c4de',
  },
  directional: {
    intensity: 1.8,
    color: '#fff5e6',
    shadowMapSize: 1024,
    shadowCameraRange: 80,
    shadowCameraNear: 0.5,
    shadowCameraFar: 600,
    shadowBias: -0.001,
  },
  hemisphere: {
    skyColor: '#87ceeb',
    groundColor: '#556b2f',
    intensity: 0.4,
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
