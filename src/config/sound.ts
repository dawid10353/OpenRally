// ─── Engine Sound Constants ──────────────────────────────────────────
/** Base volume for the engine sound */
export const ENGINE_VOLUME = 0.5;

/** Base pitch (playbackRate) at 0 km/h */
export const IDLE_PITCH = 0.8;

/** Pitch (playbackRate) increase per km/h of speed */
export const PITCH_PER_KMH = 0.015;

/** Base low-pass filter cutoff at idle (Hz) */
export const IDLE_FILTER_CUTOFF = 600;

/** Filter cutoff increase per km/h of speed */
export const FILTER_CUTOFF_PER_KMH = 20;

/** Audio parameter ramp time (seconds) for smooth transitions */
export const AUDIO_RAMP_TIME = 0.05;

/** Gain ramp time (seconds) for mute/unmute transitions */
export const GAIN_RAMP_TIME = 0.1;

// ─── Surface Sound Constants ─────────────────────────────────────────

/** Maximum volume for the surface sound when driving fast */
export const SURFACE_MAX_VOLUME = 0.3;

/** Speed (km/h) at which surface sound reaches maximum volume */
export const SURFACE_SPEED_FOR_MAX_VOL = 80;

/** Speed (km/h) below which surface sound is completely silent */
export const SURFACE_MIN_SPEED = 2;

/** Pitch variation for surface sound based on speed */
export const SURFACE_BASE_PITCH = 0.9;
export const SURFACE_PITCH_PER_KMH = 0.005;
