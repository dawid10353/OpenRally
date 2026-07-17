import { useEffect, useState } from 'react';

import { useGameStore } from '@/store/gameStore';

/**
 * Loading screen overlay — shown while physics/scene initializes.
 * Fades out once ready.
 */
export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const setGameState = useGameStore((s) => s.setGameState);

  useEffect(() => {
    // Give the physics engine and scene a moment to initialize
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Remove from DOM after fade animation
      const removeTimer = setTimeout(() => {
        setVisible(false);
        setGameState('menu');
      }, 800);
      return () => clearTimeout(removeTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, [setGameState]);

  if (!visible) return null;

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
          <div style={styles.loadingFill}>
            <div style={styles.loadingGlow} />
          </div>
        </div>

        <p style={styles.subtitle}>Generating terrain...</p>
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
