import { useGameStore } from '@/store/gameStore';

/**
 * Overlay rendering the Main Menu or Pause Menu
 * Features a modern glassmorphism aesthetic.
 */
export function MenuOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  if (gameState === 'playing' || gameState === 'loading') {
    return null;
  }

  const isPause = gameState === 'paused';

  const handlePlay = () => {
    setGameState('playing');
  };

  const handleReset = () => {
    useGameStore.getState().triggerReset(true);
    setGameState('playing');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isPause ? 'ZAPAUZOWANO' : 'OPENRALLY'}</h1>
        <p style={styles.subtitle}>
          {isPause ? 'Zrób przerwę albo wracaj na trasę.' : 'Naciśnij Play, by rozpocząć jazdę!'}
        </p>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handlePlay}>
            {isPause ? 'Wznów grę (ESC)' : 'Graj'}
          </button>
          
          <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={handleReset}>
            Resetuj pojazd do startu
          </button>
        </div>

        <div style={styles.controlsHelp}>
          <p><strong>WASD / Strzałki</strong> - Sterowanie</p>
          <p><strong>Spacja</strong> - Hamulec ręczny</p>
          <p><strong>C</strong> - Zmiana kamery</p>
          <p><strong>R</strong> - Resetowanie pozycji</p>
          <p><strong>ESC</strong> - Pauza</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 30, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)', // for Safari
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '40px 60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    color: '#fff',
    minWidth: '400px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 10px 0',
    background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '40px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    marginBottom: '40px',
  },
  button: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(90deg, #00d4ff, #00b4d8)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, filter 0.2s',
    outline: 'none',
    boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
  },
  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    boxShadow: 'none',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  controlsHelp: {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '20px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }
};
