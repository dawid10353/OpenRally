import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getActiveGamepad, sampleGamepad } from '@/utils/input/gamepad';

/**
 * Minimalist Title Screen ("Press Any Key To Start").
 * Unlocks the WebAudio context silently on user gesture and transitions into the Main Menu.
 */
export function TitleScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  const [isFadingOut, setIsFadingOut] = useState(false);
  const startedRef = useRef(false);

  // Silently resume audio context to satisfy browser autoplay policy
  const unlockAudioContext = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {
      // Ignored
    }
  }, []);

  const handleStart = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setIsFadingOut(true);
    unlockAudioContext();

    setTimeout(() => {
      setGameState('menu');
    }, 280);
  }, [unlockAudioContext, setGameState]);

  // Keyboard & mouse listener
  useEffect(() => {
    if (gameState !== 'title') return;

    const onKeyDown = () => handleStart();
    const onPointerDown = () => handleStart();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gameState, handleStart]);

  // Gamepad listener
  useEffect(() => {
    if (gameState !== 'title') return;

    let animFrameId: number;

    const checkGamepad = () => {
      const gp = getActiveGamepad();
      if (gp) {
        const state = sampleGamepad(1.0, gp);
        if (
          state.menuConfirm ||
          state.menuBack ||
          state.pauseToggle ||
          state.cameraToggle ||
          state.resetToggle ||
          state.menuUp ||
          state.menuDown ||
          state.menuLeft ||
          state.menuRight ||
          state.handbrake ||
          state.throttle > 0.3 ||
          state.brake > 0.3
        ) {
          handleStart();
          return;
        }
      }
      animFrameId = requestAnimationFrame(checkGamepad);
    };

    animFrameId = requestAnimationFrame(checkGamepad);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, handleStart]);

  if (gameState !== 'title') {
    return null;
  }

  return (
    <div
      id="title-screen"
      style={{
        ...styles.overlay,
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
      onClick={handleStart}
    >
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logoWrapper}>
          <img
            src="/openrally_logo.png"
            alt="OpenRally"
            style={styles.logoImage}
          />
        </div>

        {/* Clean, minimalist call to action */}
        <div style={styles.prompt}>
          <span style={styles.promptText}>PRESS ANY KEY TO START</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 90,
    background: '#0B0F19',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.3s ease-out',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '36px',
  },
  logoWrapper: {
    maxWidth: '420px',
    width: '85vw',
  },
  logoImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  prompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  promptText: {
    color: '#F3F4F6',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '4px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
};
