// ─── Engine Sound Constants ──────────────────────────────────────────
/** Base volume for the engine sound */
export const ENGINE_VOLUME = 0.2;

/** Oscillator idle frequency (Hz) at 0 km/h */
export const IDLE_FREQUENCY = 50;

/** Frequency increase per km/h of speed */
export const FREQUENCY_PER_KMH = 2.0;

/** Base low-pass filter cutoff at idle (Hz) */
export const IDLE_FILTER_CUTOFF = 300;

/** Filter cutoff increase per km/h of speed */
export const FILTER_CUTOFF_PER_KMH = 15;

/** Audio parameter ramp time (seconds) for smooth transitions */
export const AUDIO_RAMP_TIME = 0.05;

/** Gain ramp time (seconds) for mute/unmute transitions */
export const GAIN_RAMP_TIME = 0.1;
