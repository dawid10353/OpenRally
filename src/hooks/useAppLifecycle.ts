import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { resetTouchInputState } from '@/utils/input/touch';
import { resetGamepadEdgeState } from '@/utils/input/gamepad';
import { activeKeys } from '@/hooks/useInput';
import { suspendSharedAudioContext, unlockSharedAudioContext } from '@/utils/audio/audioContext';

/**
 * Pure handler function executed when the application is backgrounded, minimized, or loses focus.
 * Safely auto-pauses active gameplay, resets sticky touch states, clears pressed keys and gamepad states,
 * and suspends the shared AudioContext to prevent battery drain and audio glitching.
 */
export function handleAppBackgrounded(): void {
  const { gameState, setGameState } = useGameStore.getState();

  // 1. Auto-pause active gameplay so vehicle momentum is frozen cleanly
  if (gameState === 'playing') {
    setGameState('paused');
  }

  // 2. Reset sticky touch controls (prevents car continuing to accelerate into a wall)
  resetTouchInputState();

  // 3. Clear keyboard inputs & gamepad edge states
  activeKeys.clear();
  resetGamepadEdgeState();

  // 4. Suspend shared Web Audio Context
  suspendSharedAudioContext().catch(() => {});

  // 5. Safely pause any active HTML5 audio elements (e.g. background music)
  if (typeof document !== 'undefined') {
    try {
      const audios = document.querySelectorAll('audio');
      audios.forEach((audio) => {
        try {
          audio.pause();
        } catch {
          // Ignore
        }
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Handler executed when the application returns to foreground and gains window focus.
 * Re-arms and attempts to resume the shared AudioContext if gameplay is active.
 */
export function handleAppForegrounded(): void {
  const { gameState } = useGameStore.getState();
  if (gameState === 'playing') {
    unlockSharedAudioContext().catch(() => {});
  }
}

/**
 * Top-level hook monitoring Android application lifecycle, tab visibility, and window focus.
 * Mounted at App root to guarantee graceful backgrounding and resumption.
 */
export function useAppLifecycle(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAppBackgrounded();
      } else if (document.visibilityState === 'visible') {
        handleAppForegrounded();
      }
    };

    const onPageHide = () => {
      handleAppBackgrounded();
    };

    const onBlur = () => {
      handleAppBackgrounded();
    };

    const onFocus = () => {
      handleAppForegrounded();
    };

    const onOrientationChange = () => {
      const isPortrait =
        (typeof window.matchMedia === 'function' && window.matchMedia('(orientation: portrait)').matches) ||
        (window.screen?.orientation && window.screen.orientation.type.includes('portrait')) ||
        window.innerHeight > window.innerWidth;
      if (isPortrait) {
        handleAppBackgrounded();
      } else {
        handleAppForegrounded();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('orientationchange', onOrientationChange);

    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener('change', onOrientationChange);
    }
    const portraitMql = typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
    if (portraitMql?.addEventListener) {
      portraitMql.addEventListener('change', onOrientationChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('orientationchange', onOrientationChange);

      if (window.screen?.orientation?.removeEventListener) {
        window.screen.orientation.removeEventListener('change', onOrientationChange);
      }
      if (portraitMql?.removeEventListener) {
        portraitMql.removeEventListener('change', onOrientationChange);
      }
    };
  }, []);
}
