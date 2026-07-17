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
        {/* Car silhouette animation */}
        <div style={styles.carIcon}>
          <svg
            viewBox="0 0 120 50"
            style={{ width: '120px', height: '50px' }}
          >
            {/* Car body */}
            <path
              d="M10,35 L15,20 L35,12 L80,12 L100,20 L110,35 Z"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Windows */}
            <path
              d="M38,12 L42,20 L75,20 L80,12"
              fill="none"
              stroke="rgba(0,212,255,0.4)"
              strokeWidth="1.5"
            />
            {/* Wheels */}
            <circle cx="30" cy="38" r="7" fill="none" stroke="#00d4ff" strokeWidth="2">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 30 38"
                to="360 30 38"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="90" cy="38" r="7" fill="none" stroke="#00d4ff" strokeWidth="2">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 90 38"
                to="360 90 38"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Wheel spokes */}
            <line x1="30" y1="31" x2="30" y2="45" stroke="rgba(0,212,255,0.3)" strokeWidth="1">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 30 38"
                to="360 30 38"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
            <line x1="90" y1="31" x2="90" y2="45" stroke="rgba(0,212,255,0.3)" strokeWidth="1">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 90 38"
                to="360 90 38"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          </svg>
        </div>

        <h1 style={styles.title}>OPENRALLY</h1>

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
    background: 'linear-gradient(135deg, #0a0a1e 0%, #1a1a3e 50%, #0a0a2e 100%)',
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
  carIcon: {
    animation: 'pulse 2s ease-in-out infinite',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '6px',
    textTransform: 'uppercase' as const,
    margin: 0,
    textShadow: '0 0 30px rgba(0,212,255,0.3)',
  },
  loadingBar: {
    width: '240px',
    height: '3px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  loadingFill: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #00d4ff, #00ff88, #00d4ff)',
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
    opacity: 0.5,
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    margin: 0,
  },
};
