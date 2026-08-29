/**
 * Web Audio synthesizer for rally countdown start beeps.
 * Produces crisp 520Hz ready beeps for 3, 2, 1 and high-pitch 1040Hz triumphant beep for START.
 */
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        _audioCtx = new AudioCtx();
      }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a rally countdown tone.
 * @param isGo - True if it's the START signal (1040 Hz), false for 3, 2, 1 preparatory beeps (520 Hz).
 */
export function playCountdownBeep(isGo: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = isGo ? 1046.5 : 523.25; // C6 for GO, C5 for 3, 2, 1
    const duration = isGo ? 0.35 : 0.12;

    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful degradation if audio context is blocked
  }
}
