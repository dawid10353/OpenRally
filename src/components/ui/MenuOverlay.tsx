import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Overlay rendering the Main Menu or Pause Menu
 * Features loading-screen style for main menu, and glassmorphism for pause.
 */
export function MenuOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const [view, setView] = useState<'main' | 'options' | 'controls'>('main');

  const { 
    graphicsQuality, setGraphicsQuality, 
    shadowsEnabled, toggleShadows, 
    postProcessingEnabled, togglePostProcessing,
    sfxVolume, setSfxVolume,
    menuMusicVolume, setMenuMusicVolume,
    gameMusicVolume, setGameMusicVolume
  } = useSettingsStore();

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = menuMusicVolume;
    }
  }, [menuMusicVolume, gameState]);

  if (gameState === 'playing') {
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

  const currentOverlayStyle = styles.overlayMenu;
  const currentCardStyle = styles.cardMenu;
  const textColor = '#333333';
  const subtitleColor = '#666666';

  const renderMainView = () => (
    <div style={styles.buttonGroup}>
      <button style={styles.button} onClick={handlePlay}>
        {isPause ? 'Resume (ESC)' : 'Free Roam'}
      </button>
      
      {isPause && (
        <>
          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)'
            }} 
            onClick={handleReset}
          >
            Reset vehicle to start
          </button>
          
          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)'
            }} 
            onClick={() => {
              useGameStore.getState().triggerReset(true);
              setGameState('menu');
            }}
          >
            Return to Main Menu
          </button>
        </>
      )}

      <button 
        style={{ 
          ...styles.button, 
          ...styles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(0, 0, 0, 0.2)'
        }} 
        onClick={() => setView('options')}
      >
        Options
      </button>

      <button 
        style={{ 
          ...styles.button, 
          ...styles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(0, 0, 0, 0.2)'
        }} 
        onClick={() => setView('controls')}
      >
        Controls
      </button>
    </div>
  );

  const renderOptionsView = () => (
    <div style={{ ...styles.subView, color: textColor }}>
      <h2 style={styles.subViewTitle}>Options</h2>
      
      <div style={styles.optionRow}>
        <span>Graphics Quality</span>
        <select 
          value={graphicsQuality} 
          onChange={(e) => setGraphicsQuality(e.target.value as any)}
          style={styles.select}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div style={styles.optionRow}>
        <span>Real-time Shadows</span>
        <input 
          type="checkbox" 
          checked={shadowsEnabled} 
          onChange={toggleShadows}
          style={styles.checkbox}
        />
      </div>

      <div style={styles.optionRow}>
        <span>Post Processing</span>
        <input 
          type="checkbox" 
          checked={postProcessingEnabled} 
          onChange={togglePostProcessing}
          style={styles.checkbox}
        />
      </div>

      <div style={styles.optionRow}>
        <span>Menu Music</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={menuMusicVolume}
          onChange={(e) => setMenuMusicVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div style={styles.optionRow}>
        <span>Game Music</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={gameMusicVolume}
          onChange={(e) => setGameMusicVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div style={styles.optionRow}>
        <span>SFX Volume</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={sfxVolume}
          onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <button 
        style={{ ...styles.button, marginTop: '20px', width: '100%' }} 
        onClick={() => setView('main')}
      >
        Back
      </button>
    </div>
  );

  const renderControlsView = () => (
    <div style={{ ...styles.subView, color: textColor }}>
      <h2 style={styles.subViewTitle}>Controls</h2>
      <div style={{
        ...styles.controlsHelp,
        background: 'rgba(0,0,0,0.05)',
        color: '#666666'
      }}>
        <p style={styles.controlRow}><strong>WASD / Arrows</strong> <span>Steering</span></p>
        <p style={styles.controlRow}><strong>Space</strong> <span>Handbrake</span></p>
        <p style={styles.controlRow}><strong>C</strong> <span>Change camera</span></p>
        <p style={styles.controlRow}><strong>B</strong> <span>Look back (hold)</span></p>
        <p style={styles.controlRow}><strong>R</strong> <span>Reset position</span></p>
        <p style={styles.controlRow}><strong>ESC</strong> <span>Pause</span></p>
      </div>
      <button 
        style={{ ...styles.button, marginTop: '20px', width: '100%' }} 
        onClick={() => setView('main')}
      >
        Back
      </button>
    </div>
  );

  return (
    <div style={currentOverlayStyle}>
      <audio ref={audioRef} src="/sounds/menu-music.mp3" autoPlay loop />
      <div style={{ ...currentCardStyle, color: textColor }}>
        
        {/* Game Logo */}
        <div style={styles.logoContainer}>
          <img src="/openrally_logo.png" alt="OpenRally Logo" style={styles.logoImage} />
        </div>

        {isPause && view === 'main' && (
          <h1 style={styles.pauseTitle}>PAUSED</h1>
        )}

        {view === 'main' && (
          <p style={{ ...styles.subtitle, color: subtitleColor }}>
            {isPause ? 'Take a break or get back on track.' : 'Press Free Roam to start driving!'}
          </p>
        )}

        {view === 'main' && renderMainView()}
        {view === 'options' && renderOptionsView()}
        {view === 'controls' && renderControlsView()}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlayMenu: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  cardMenu: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '400px',
    gap: '8px',
  },
  logoContainer: {
    marginBottom: '10px',
  },
  logoImage: {
    maxWidth: '400px',
    maxHeight: '200px',
    objectFit: 'contain',
  },
  pauseTitle: {
    fontSize: '28px',
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
    marginBottom: '30px',
    fontWeight: 500,
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
    background: 'linear-gradient(90deg, #1B365D, #E31837)', // matches loading screen theme
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, filter 0.2s',
    outline: 'none',
    boxShadow: '0 4px 15px rgba(227, 24, 55, 0.3)',
  },
  secondaryButton: {
    background: 'transparent',
    boxShadow: 'none',
    border: '1px solid',
  },
  controlsHelp: {
    width: '100%',
    borderRadius: '12px',
    padding: '20px',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: 0,
  },
  subView: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  subViewTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: 600,
  },
  optionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
  },
  select: {
    padding: '6px 12px',
    borderRadius: '6px',
    background: '#fff',
    color: '#000',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  }
};

