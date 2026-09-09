/**
 * Shared Web Audio Context Manager for OpenRally.
 *
 * Consolidates all procedural audio synthesizers (engine, tire skid, surface rolling, countdown)
 * into a single shared AudioContext instance.
 *
 * Rationale:
 * - Mobile operating systems (especially Android Chrome and WebViews) enforce a strict ceiling
 *   of 4 to 6 hardware AudioContext instances per tab/process.
 * - Spawning independent AudioContexts per audio node or component remount risks immediate
 *   DOMException crashes when the limit is breached.
 * - Automatically registers one-time touch/pointer/keyboard interaction hooks to satisfy
 *   browser autoplay policies and seamlessly resume suspended contexts.
 */

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let _sharedAudioContext: AudioContext | null = null;
let _interactionListenersAttached = false;

/**
 * Attaches one-time window listeners to automatically resume the audio context on user gesture.
 */
function attachInteractionListeners(ctx: AudioContext): void {
  if (_interactionListenersAttached || typeof window === 'undefined') return;
  _interactionListenersAttached = true;

  const unlock = () => {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      _interactionListenersAttached = false;
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

/**
 * Returns the singleton shared AudioContext instance.
 * Returns null in SSR or environments without Web Audio API support.
 */
export function getSharedAudioContext(): AudioContext | null {
  if (_sharedAudioContext && _sharedAudioContext.state !== 'closed') {
    return _sharedAudioContext;
  }
  _sharedAudioContext = null;
  _interactionListenersAttached = false;

  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
    if (!AudioCtx) return null;
    _sharedAudioContext = new AudioCtx();
    _sharedAudioContext.onstatechange = () => {
      if (_sharedAudioContext?.state === 'closed') {
        _sharedAudioContext = null;
        _interactionListenersAttached = false;
      }
    };
  } catch (e) {
    console.warn('[audioContext] Failed to instantiate AudioContext:', e);
    return null;
  }

  if (_sharedAudioContext && _sharedAudioContext.state === 'suspended') {
    attachInteractionListeners(_sharedAudioContext);
  }

  return _sharedAudioContext;
}

/**
 * Explicitly triggers audio context resume upon a recognized user interaction.
 */
export async function unlockSharedAudioContext(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Gracefully handle browser autoplay blocks
    }
  }
}

/**
 * Suspends the shared audio context to save battery and eliminate background audio processing.
 */
export async function suspendSharedAudioContext(): Promise<void> {
  if (_sharedAudioContext && _sharedAudioContext.state === 'running') {
    try {
      await _sharedAudioContext.suspend();
    } catch {
      // Ignore
    }
  }
  if (_sharedAudioContext && _sharedAudioContext.state === 'suspended') {
    attachInteractionListeners(_sharedAudioContext);
  }
}

/**
 * Resets the singleton instance (strictly for testing environments).
 */
export function resetSharedAudioContextForTests(mockContext: AudioContext | null = null): void {
  _sharedAudioContext = mockContext;
  _interactionListenersAttached = false;
}
