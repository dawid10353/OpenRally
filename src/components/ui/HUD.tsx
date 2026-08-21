import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRacingStore } from '@/store/racingStore';
import { TelemetryHUD } from './TelemetryHUD';
import { Minimap } from './Minimap';

function formatLapTime(seconds: number): string {
  if (seconds <= 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

const surfaceColors: Record<string, string> = {
  tarmac: '#00d4ff',
  mud: '#d4883b',
  grass: '#38b000',
  sand: '#e0a96d',
};

/**
 * HUD overlay — speedometer, rally stage timer, surface indicator, and minimap.
 * Uses high-performance transient DOM updates to achieve 0 React re-renders during gameplay.
 */
export function HUD() {
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const gameMusicVolume = useSettingsStore((s) => s.gameMusicVolume);

  // Stage complete state is low-frequency and only changes upon finishing a lap
  const showStageComplete = useRacingStore((s) => s.showStageComplete);
  const lastLapTime = useRacingStore((s) => s.lastLapTime);
  const bestLapTime = useRacingStore((s) => s.bestLapTime);

  // Direct DOM Refs (No React re-renders on high-frequency changes)
  const lapTimeRef = useRef<HTMLDivElement>(null);
  const surfaceBadgeRef = useRef<HTMLSpanElement>(null);
  const cpValueRef = useRef<HTMLSpanElement>(null);
  const bestValueRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const rpmRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const speedArcRef = useRef<SVGCircleElement>(null);
  const rpmArcRef = useRef<SVGCircleElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = gameMusicVolume;
    }
  }, [gameMusicVolume, gameState]);

  // Handle browser autoplay policy by starting game music on user interaction
  useEffect(() => {
    if (gameState !== 'playing') return;

    const playBgm = () => {
      if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', playBgm);
    window.addEventListener('keydown', playBgm);

    playBgm();

    return () => {
      window.removeEventListener('pointerdown', playBgm);
      window.removeEventListener('keydown', playBgm);
    };
  }, [gameState]);

  // Transient gameStore subscriber (speed, rpm, gear, coords, surface)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateGameHUD = (state: ReturnType<typeof useGameStore.getState>) => {
      if (speedRef.current) speedRef.current.innerText = state.speed.toString();
      if (rpmRef.current) rpmRef.current.innerText = state.rpm.toString();

      if (gearRef.current) {
        let gearText = 'N';
        if (state.gear === -1) gearText = 'R';
        else if (state.gear > 0) gearText = state.gear.toString();
        gearRef.current.innerText = gearText;
      }

      if (coordsRef.current) {
        const [x, y, z] = state.position;
        coordsRef.current.innerText = `X: ${x.toFixed(1)} Y: ${y.toFixed(1)} Z: ${z.toFixed(1)}`;
      }

      if (surfaceBadgeRef.current) {
        surfaceBadgeRef.current.innerText = state.surface.toUpperCase();
        surfaceBadgeRef.current.style.backgroundColor = surfaceColors[state.surface] || '#00d4ff';
      }

      const maxSpeed = 240;
      const speedFraction = Math.min(state.speed / maxSpeed, 1);

      const maxRpm = 8000;
      const rpmFraction = Math.max(0, Math.min(1, state.rpm / maxRpm));

      if (needleRef.current) {
        const needleRotation = -135 + speedFraction * 270;
        needleRef.current.setAttribute('transform', `rotate(${needleRotation} 100 100)`);
      }

      if (speedArcRef.current) {
        speedArcRef.current.style.strokeDasharray = `${speedFraction * 401} ${534 - speedFraction * 401}`;
      }

      if (rpmArcRef.current) {
        rpmArcRef.current.style.strokeDasharray = `${rpmFraction * 306} ${408 - rpmFraction * 306}`;
      }
    };

    updateGameHUD(useGameStore.getState());
    const unsubGame = useGameStore.subscribe(updateGameHUD);

    return () => unsubGame();
  }, [gameState]);

  // Transient racingStore subscriber (timer, checkpoints, record)
  useEffect(() => {
    if (gameState !== 'playing' || gameMode !== 'timeattack') return;

    const updateRacingHUD = (state: ReturnType<typeof useRacingStore.getState>) => {
      if (lapTimeRef.current) {
        lapTimeRef.current.innerText = formatLapTime(state.currentLapTime);
      }

      if (cpValueRef.current) {
        cpValueRef.current.innerText =
          state.raceStatus === 'idle' ? 'START GATE' : `${state.currentCheckpoint} / ${state.totalCheckpoints}`;
      }

      if (bestValueRef.current) {
        bestValueRef.current.innerText = state.bestLapTime ? formatLapTime(state.bestLapTime) : '--:--.--';
      }
    };

    updateRacingHUD(useRacingStore.getState());
    const unsubRacing = useRacingStore.subscribe(updateRacingHUD);

    return () => unsubRacing();
  }, [gameState, gameMode]);

  if (gameState !== 'playing') return null;

  return (
    <div id="hud" style={styles.container}>
      {/* Background Music */}
      <audio ref={bgmRef} src="/sounds/freeroam-music.mp3" autoPlay loop />

      <TelemetryHUD />

      {/* Minimap radar */}
      <Minimap />

      {/* Mode Header Card (Top Left) */}
      {gameMode === 'timeattack' ? (
        <div style={styles.timerCard}>
          <div style={styles.timerHeader}>
            <span style={styles.stageTitle}>TIME ATTACK</span>
            <span ref={surfaceBadgeRef} style={styles.surfaceBadge}>
              TARMAC
            </span>
          </div>

          <div ref={lapTimeRef} style={styles.lapTimeText}>
            00:00.00
          </div>

          <div style={styles.timerFooter}>
            <div style={styles.checkpointProgress}>
              <span style={styles.cpLabel}>CHECKPOINT</span>
              <span ref={cpValueRef} style={styles.cpValue}>
                START GATE
              </span>
            </div>

            <div style={styles.bestTime}>
              <span style={styles.cpLabel}>RECORD (PB)</span>
              <span ref={bestValueRef} style={styles.bestValue}>
                {bestLapTime ? formatLapTime(bestLapTime) : '--:--.--'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...styles.timerCard, minWidth: '180px' }}>
          <div style={styles.timerHeader}>
            <span style={{ ...styles.stageTitle, color: '#10b981' }}>FREE ROAM</span>
            <span ref={surfaceBadgeRef} style={styles.surfaceBadge}>
              TARMAC
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontWeight: 500 }}>
            Open World Exploration
          </div>
        </div>
      )}

      {/* Stage Complete Overlay Banner (Time Attack only) */}
      {gameMode === 'timeattack' && showStageComplete && (
        <div style={styles.bannerContainer}>
          <div style={styles.stageCompleteBanner}>
            <div style={styles.bannerTitle}>STAGE COMPLETE!</div>
            <div style={styles.bannerTime}>TIME: {formatLapTime(lastLapTime || 0)}</div>
            {lastLapTime === bestLapTime && (
              <div style={styles.newRecordBadge}>★ NEW RECORD! ★</div>
            )}
          </div>
        </div>
      )}

      {/* Speedometer Gauge (Bottom Right) */}
      <div id="speedometer" style={styles.speedometer}>
        <svg viewBox="0 0 200 200" style={styles.gaugeSvg}>
          {/* Track arc */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
            strokeDasharray="401 133"
            strokeDashoffset="67"
            strokeLinecap="round"
          />
          {/* Active arc */}
          <circle
            ref={speedArcRef}
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#speedGradient)"
            strokeWidth="6"
            strokeDasharray="0 534"
            strokeDashoffset="67"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.1s ease-out' }}
          />
          {/* RPM Track arc */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
            strokeDasharray="330 110"
            strokeDashoffset="55"
            strokeLinecap="round"
          />
          {/* RPM Active arc */}
          <circle
            ref={rpmArcRef}
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="url(#rpmGradient)"
            strokeWidth="4"
            strokeDasharray="0 440"
            strokeDashoffset="55"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.05s ease-out' }}
          />
          {/* Gradients */}
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="60%" stopColor="#00ff88" />
              <stop offset="100%" stopColor="#ff4444" />
            </linearGradient>
            <linearGradient id="rpmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffaa00" />
              <stop offset="70%" stopColor="#ff5500" />
              <stop offset="100%" stopColor="#ff0000" />
            </linearGradient>
          </defs>
          {/* Needle */}
          <line
            ref={needleRef}
            x1="100"
            y1="45"
            x2="100"
            y2="12"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            transform="rotate(-135 100 100)"
            style={{ transition: 'transform 0.1s ease-out' }}
          />
        </svg>

        {/* Digital readout */}
        <div style={styles.speedValue}>
          <span ref={gearRef} style={styles.gearText}>N</span>
          <span ref={speedRef} style={styles.speedNumber}>0</span>
          <span style={styles.speedUnit}>km/h</span>
          <div style={styles.rpmReadout}>
            <span ref={rpmRef} style={styles.rpmNumber}>1000</span>
            <span style={styles.rpmUnit}>RPM</span>
          </div>
        </div>
      </div>

      {/* Coordinates / Heading (Bottom Left) */}
      <div id="coordinates" style={styles.coordinates}>
        <div ref={coordsRef} style={styles.coordsText}>X: 0.0 Y: 0.0 Z: 0.0</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    zIndex: 10,
  },
  timerCard: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'rgba(10, 14, 28, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '14px 20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    minWidth: '220px',
  },
  timerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  stageTitle: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#8b9bb4',
    letterSpacing: '1.5px',
  },
  surfaceBadge: {
    fontSize: '10px',
    fontWeight: 900,
    color: '#0a0e1c',
    padding: '2px 8px',
    borderRadius: '4px',
    letterSpacing: '1px',
    backgroundColor: '#00d4ff',
    transition: 'background-color 0.2s ease',
  },
  lapTimeText: {
    fontSize: '32px',
    fontWeight: 900,
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.4)',
    margin: '4px 0 8px 0',
  },
  timerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: '8px',
    gap: '16px',
  },
  checkpointProgress: {
    display: 'flex',
    flexDirection: 'column',
  },
  bestTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  cpLabel: {
    fontSize: '10px',
    color: '#6b7c96',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  cpValue: {
    fontSize: '13px',
    color: '#00ff88',
    fontWeight: 800,
    marginTop: '2px',
  },
  bestValue: {
    fontSize: '13px',
    color: '#ffb700',
    fontWeight: 800,
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  bannerContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 100,
  },
  stageCompleteBanner: {
    background: 'linear-gradient(135deg, rgba(20, 35, 60, 0.95), rgba(227, 24, 55, 0.95))',
    backdropFilter: 'blur(20px)',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '16px',
    padding: '24px 48px',
    textAlign: 'center',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8), 0 0 30px rgba(227,24,55,0.4)',
    animation: 'pulse 1s infinite alternate',
  },
  bannerTitle: {
    fontSize: '32px',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '3px',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
  },
  bannerTime: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#00d4ff',
    fontFamily: 'monospace',
    marginTop: '6px',
  },
  newRecordBadge: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#ffdd00',
    letterSpacing: '2px',
    marginTop: '8px',
    textShadow: '0 0 10px rgba(255,221,0,0.8)',
  },
  speedometer: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    width: '220px',
    height: '220px',
    background: 'radial-gradient(ellipse at center, rgba(10,10,30,0.95) 0%, rgba(10,10,30,0.7) 100%)',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  gaugeSvg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  speedValue: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gearText: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#00d4ff',
    marginBottom: '2px',
    lineHeight: 1,
    textShadow: '0 0 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.9)',
  },
  speedNumber: {
    fontSize: '56px',
    fontWeight: 900,
    color: '#ffffff',
    lineHeight: 1,
    textShadow: '0 0 4px rgba(0,0,0,1), 0 0 10px rgba(0,212,255,0.4), 0 2px 4px rgba(0,0,0,0.9)',
  },
  speedUnit: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    marginTop: '0px',
    marginBottom: '8px',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  rpmReadout: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  rpmNumber: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#ffaa00',
    textShadow: '0 0 4px rgba(0,0,0,1), 0 0 10px rgba(255,170,0,0.4), 0 2px 4px rgba(0,0,0,0.9)',
  },
  rpmUnit: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '1px',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  coordinates: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    background: 'rgba(10,10,30,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  coordsText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '1px',
    fontFamily: 'monospace',
  },
};
