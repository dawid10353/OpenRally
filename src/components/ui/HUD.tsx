import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { toDegrees } from '@/utils/math';

/**
 * Compass direction from heading angle.
 */
function getCompassDirection(headingRad: number): string {
  // Convert to degrees, normalize to 0-360
  let deg = toDegrees(headingRad) % 360;
  if (deg < 0) deg += 360;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

/**
 * HUD overlay — speedometer and compass.
 * Pure HTML/CSS overlay rendered on top of the 3D canvas.
 */
export function HUD() {
  const gameState = useGameStore((s) => s.gameState);
  const gameMusicVolume = useSettingsStore((s) => s.gameMusicVolume);

  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const compassDirRef = useRef<HTMLDivElement>(null);
  const compassDegRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const speedArcRef = useRef<SVGCircleElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = gameMusicVolume;
    }
  }, [gameMusicVolume, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    // Pobierz początkowy stan, aby od razu wypełnić refy, by zapobiec miganiu początkowemu (0)
    const initialState = useGameStore.getState();

    const updateHUD = (state: typeof initialState) => {
      if (speedRef.current) speedRef.current.innerText = state.speed.toString();

      if (gearRef.current) {
        let gearText = 'N';
        if (state.gear === -1) gearText = 'R';
        else if (state.gear > 0) gearText = state.gear.toString();
        gearRef.current.innerText = gearText;
      }

      if (compassDirRef.current && compassDegRef.current) {
        const compassDir = getCompassDirection(state.heading);
        const headingDeg = Math.round(((toDegrees(state.heading) % 360) + 360) % 360);
        compassDirRef.current.innerText = compassDir;
        compassDegRef.current.innerText = `${headingDeg}°`;
      }

      const maxSpeed = 240;
      const speedFraction = state.speed / maxSpeed;
      
      if (needleRef.current) {
        const needleRotation = -135 + speedFraction * 270;
        needleRef.current.setAttribute('transform', `rotate(${needleRotation} 100 100)`);
      }
      
      if (speedArcRef.current) {
        speedArcRef.current.style.strokeDasharray = `${speedFraction * 401} ${534 - speedFraction * 401}`;
      }
    };

    updateHUD(initialState);
    const unsubscribe = useGameStore.subscribe(updateHUD);
    
    return () => unsubscribe();
  }, [gameState]);

  if (gameState !== 'playing') return null;

  return (
    <div id="hud" style={styles.container}>
      {/* Background Music */}
      <audio ref={bgmRef} src="/sounds/freeroam-music.mp3" autoPlay loop />

      {/* Speedometer */}
      <div id="speedometer" style={styles.speedometer}>
        {/* Gauge background */}
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
          {/* Gradient definition */}
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="60%" stopColor="#00ff88" />
              <stop offset="100%" stopColor="#ff4444" />
            </linearGradient>
          </defs>
          {/* Needle */}
          <line
            ref={needleRef}
            x1="100"
            y1="100"
            x2="100"
            y2="25"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform="rotate(-135 100 100)"
            style={{ transition: 'transform 0.1s ease-out' }}
          />
          {/* Center dot */}
          <circle cx="100" cy="100" r="5" fill="#ffffff" />
        </svg>

        {/* Digital readout */}
        <div style={styles.speedValue}>
          <span ref={gearRef} style={styles.gearText}>N</span>
          <span ref={speedRef} style={styles.speedNumber}>0</span>
          <span style={styles.speedUnit}>km/h</span>
        </div>
      </div>

      {/* Compass */}
      <div id="compass" style={styles.compass}>
        <div ref={compassDirRef} style={styles.compassDirection}>N</div>
        <div ref={compassDegRef} style={styles.compassDegrees}>0°</div>
      </div>


    </div>
  );
}

/** Inline styles for HUD elements */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    zIndex: 10,
  },
  speedometer: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    width: '180px',
    height: '180px',
    background: 'radial-gradient(ellipse at center, rgba(10,10,30,0.85) 0%, rgba(10,10,30,0.65) 100%)',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  gaugeSvg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  speedValue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '20px',
    zIndex: 1,
  },
  gearText: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#00d4ff',
    marginBottom: '2px',
    lineHeight: 1,
    textShadow: '0 0 10px rgba(0,212,255,0.5)',
  },
  speedNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1,
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
  },
  speedUnit: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    marginTop: '2px',
  },
  compass: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(10,10,30,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  compassDirection: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#00d4ff',
    letterSpacing: '1px',
  },
  compassDegrees: {
    fontSize: '13px',
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
  },

};
