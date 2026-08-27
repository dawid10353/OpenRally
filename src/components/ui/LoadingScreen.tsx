import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useGameStore } from '@/store/gameStore';

/**
 * Loading screen overlay — shown while physics/scene initializes when entering gameplay.
 * Fades out once ready. Never displays during Pause Menu or Main Menu.
 */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  const gameState = useGameStore((s) => s.gameState);
  const isSceneReady = useGameStore((s) => s.isSceneReady);

  const isPlaying = gameState === 'playing';
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setVisible(false);
      setFadeOut(false);
      return;
    }

    // While entering active gameplay:
    if (!isSceneReady || active || progress < 100) {
      setVisible(true);
      setFadeOut(false);
    } else {
      // Scene is fully ready (models downloaded, physics settled, shaders compiled)
      setFadeOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, isSceneReady, active, progress]);

  // Loading screen is strictly for loading into gameplay; never render if not in 'playing' state
  if (!isPlaying || (!visible && isSceneReady)) return null;

  // Format progress for display
  const displayProgress = Math.round(progress) || (isSceneReady ? 100 : 0);

  return (
    <div
      id="loading-screen"
      style={{
        ...styles.overlay,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      <div style={styles.content}>
        {/* Game Logo */}
        <div style={styles.logoContainer}>
          <img src="/openrally_logo.png" alt="OpenRally Logo" style={styles.logoImage} />
        </div>

        {/* Loading bar */}
        <div style={styles.loadingBar}>
          <div style={{ ...styles.loadingFill, width: `${Math.max(8, displayProgress)}%` }}>
            <div style={styles.loadingGlow} />
          </div>
        </div>

        <p style={styles.subtitle}>
          {displayProgress < 100 ? `Loading assets... ${displayProgress}%` : 'Starting engine...'}
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
