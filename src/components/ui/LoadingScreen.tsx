import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useGameStore } from '@/store/gameStore';

/**
 * Loading screen overlay — shown while physics/scene initializes.
 * Fades out once ready.
 */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  const gameState = useGameStore((s) => s.gameState);
  
  // We only care about loading when the game is supposed to be active
  const showGame = gameState === 'playing' || gameState === 'paused';
  
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);

  useEffect(() => {
    if (!showGame) {
      setVisible(false);
      setHasStartedLoading(false);
      setFadeOut(false);
      return;
    }

    if (active) {
      setVisible(true);
      setFadeOut(false);
      setHasStartedLoading(true);
    } else if (hasStartedLoading) {
      // It's not active anymore, so it finished loading
      setFadeOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      // Game started, but Drei hasn't reported active yet.
      // Set a failsafe timeout in case everything was cached and loads instantly.
      const failsafeTimer = setTimeout(() => {
        setVisible(true);
        setHasStartedLoading(true);
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
        }, 800);
      }, 500); // Wait 500ms for loading to actually start

      return () => clearTimeout(failsafeTimer);
    }
  }, [active, showGame, hasStartedLoading]);

  // Force it to be visible initially when showGame becomes true but Drei hasn't reported active yet
  const isReallyVisible = (showGame && !hasStartedLoading) || visible;

  if (!isReallyVisible) return null;

  // Format progress for display
  const displayProgress = Math.round(progress) || 0;

  return (
    <div
      id="loading-screen"
      style={{
        ...styles.overlay,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease-out',
      }}
    >
      <div style={styles.content}>
        {/* Game Logo */}
        <div style={styles.logoContainer}>
          <img src="/openrally_logo.png" alt="OpenRally Logo" style={styles.logoImage} />
        </div>

        {/* Loading bar */}
        <div style={styles.loadingBar}>
          <div style={{ ...styles.loadingFill, width: `${hasStartedLoading ? displayProgress : 0}%` }}>
            <div style={styles.loadingGlow} />
          </div>
        </div>

        <p style={styles.subtitle}>
          {hasStartedLoading ? `Loading map... ${displayProgress}%` : 'Preparing scene...'}
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: '#FEFFFD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  logoContainer: {
    animation: 'pulse 2s ease-in-out infinite',
    marginBottom: '10px',
  },
  logoImage: {
    maxWidth: '400px',
    maxHeight: '200px',
    objectFit: 'contain',
  },
  loadingBar: {
    width: '240px',
    height: '4px',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  loadingFill: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #1B365D, #E31837, #1B365D)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
    borderRadius: '2px',
    position: 'relative' as const,
  },
  loadingGlow: {
    position: 'absolute' as const,
    inset: '-2px',
    background: 'inherit',
    filter: 'blur(6px)',
    opacity: 0.3,
  },
  subtitle: {
    fontSize: '13px',
    color: '#666666',
    letterSpacing: '2px',
    margin: 0,
    fontWeight: 500,
  },
};
