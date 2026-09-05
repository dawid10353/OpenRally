import { useEffect, useRef, useState, memo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getLastInputType, isTouchDevice, type InputType } from '@/utils/input/touch';

/**
 * Authentic Rally Twin-Gauge Cluster (Speedometer & Tachometer).
 * Uses direct DOM mutations via transient Zustand subscriber to achieve 0 React re-renders during 60/120 FPS driving.
 */
export const AnalogGauges = memo(function AnalogGauges() {
  const gameState = useGameStore((s) => s.gameState);
  const storeTouchControlMode = useSettingsStore((s) => s.touchControlMode);
  const touchControlMode = useSettingsStore.getState().touchControlMode ?? storeTouchControlMode;
  const [activeInputType, setActiveInputType] = useState<InputType>(() => getLastInputType());

  useEffect(() => {
    const handleInputSwitch = (e?: Event) => {
      if (e && 'detail' in e && typeof (e as CustomEvent).detail?.modality === 'string') {
        setActiveInputType((e as CustomEvent).detail.modality);
      } else {
        setActiveInputType(getLastInputType());
      }
    };
    window.addEventListener('pointerdown', handleInputSwitch, { passive: true });
    window.addEventListener('touchstart', handleInputSwitch, { passive: true });
    window.addEventListener('keydown', handleInputSwitch, { passive: true });
    window.addEventListener('openrally-input-switch', handleInputSwitch as EventListener);
    return () => {
      window.removeEventListener('pointerdown', handleInputSwitch);
      window.removeEventListener('touchstart', handleInputSwitch);
      window.removeEventListener('keydown', handleInputSwitch);
      window.removeEventListener('openrally-input-switch', handleInputSwitch as EventListener);
    };
  }, []);

  const effectiveInputType = getLastInputType() || activeInputType;
  const isTouchActive =
    touchControlMode === 'always' ||
    (touchControlMode === 'auto' &&
      (effectiveInputType === 'touch' || isTouchDevice()) &&
      effectiveInputType !== 'keyboard' &&
      effectiveInputType !== 'gamepad');

  const speedTextRef = useRef<HTMLSpanElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const gearTextRef = useRef<HTMLSpanElement>(null);
  const speedNeedleRef = useRef<SVGGElement>(null);
  const rpmNeedleRef = useRef<SVGGElement>(null);
  const shiftLightRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateGameHUD = (state: ReturnType<typeof useGameStore.getState>) => {
      if (speedTextRef.current) speedTextRef.current.innerText = state.speed.toString();
      if (rpmTextRef.current) rpmTextRef.current.innerText = state.rpm.toString();

      if (gearTextRef.current) {
        let gearText = 'N';
        if (state.gear === -1) gearText = 'R';
        else if (state.gear > 0) gearText = state.gear.toString();
        gearTextRef.current.innerText = gearText;
      }

      // Speedometer needle angle (-135deg at 0 km/h to +135deg at 240 km/h)
      const maxSpeed = 240;
      const speedFraction = Math.min(Math.max(0, state.speed / maxSpeed), 1);
      const speedAngle = -135 + speedFraction * 270;
      if (speedNeedleRef.current) {
        speedNeedleRef.current.setAttribute('transform', `rotate(${speedAngle} 85 88)`);
      }

      // Tachometer needle angle (-135deg at 0 RPM to +135deg at 8000 RPM)
      const maxRpm = 8000;
      const rpmFraction = Math.min(Math.max(0, state.rpm / maxRpm), 1);
      const rpmAngle = -135 + rpmFraction * 270;
      if (rpmNeedleRef.current) {
        rpmNeedleRef.current.setAttribute('transform', `rotate(${rpmAngle} 255 88)`);
      }

      // Rally Shift Light Indicator
      if (shiftLightRef.current) {
        const isShiftWarning = state.rpm >= 6500;
        shiftLightRef.current.style.opacity = isShiftWarning ? '1' : '0.15';
        shiftLightRef.current.style.filter = isShiftWarning
          ? 'drop-shadow(0 0 8px #ff1e1e)'
          : 'none';
      }
    };

    updateGameHUD(useGameStore.getState());
    const unsubGame = useGameStore.subscribe(updateGameHUD);

    return () => unsubGame();
  }, [gameState]);

  const clusterStyle: React.CSSProperties = {
    ...styles.rallyCluster,
    ...(isTouchActive
      ? {
          left: '50%',
          top: 'calc(14px + var(--sat, 0px))',
          bottom: 'auto',
          right: 'auto',
          transform: 'translateX(-50%) scale(0.42)',
          transformOrigin: 'top center',
        }
      : {
          bottom: 'calc(20px + var(--sab))',
          right: 'calc(20px + var(--sar))',
          left: 'auto',
          top: 'auto',
          transform: 'none',
        }),
  };

  return (
    <div id="rally-cluster" style={clusterStyle}>
      <svg viewBox="0 0 340 175" style={styles.clusterSvg}>
        <defs>
          {/* Dark Rally Pod Bezel Gradient */}
          <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a303c" />
            <stop offset="50%" stopColor="#181d26" />
            <stop offset="100%" stopColor="#0f1218" />
          </linearGradient>

          {/* Inner Dial Face Radial Gradient */}
          <radialGradient id="dialFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1c222d" />
            <stop offset="85%" stopColor="#11151c" />
            <stop offset="100%" stopColor="#0a0d12" />
          </radialGradient>
        </defs>

        {/* Pod Outer Casing */}
        <rect
          x="4"
          y="4"
          width="332"
          height="167"
          rx="24"
          fill="url(#bezelGrad)"
          stroke="#475569"
          strokeWidth="2.5"
        />
        {/* Inner Pod Shadow */}
        <rect
          x="7"
          y="7"
          width="326"
          height="161"
          rx="21"
          fill="none"
          stroke="#0a0d12"
          strokeWidth="2"
        />

        {/* 4 Corner Rally Mounting Bolts */}
        <circle cx="16" cy="16" r="3.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
        <circle cx="324" cy="16" r="3.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
        <circle cx="16" cy="159" r="3.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />
        <circle cx="324" cy="159" r="3.5" fill="#64748b" stroke="#1e293b" strokeWidth="1" />

        {/* ════════════════ LEFT GAUGE: SPEEDOMETER (0 - 240 KM/H) ════════════════ */}
        {/* Bezel Ring */}
        <circle cx="85" cy="88" r="68" fill="#1e2430" stroke="#475569" strokeWidth="2" />
        <circle cx="85" cy="88" r="64" fill="url(#dialFace)" stroke="#0f131a" strokeWidth="1.5" />

        {/* Speedometer Scale Arc (270 degrees) */}
        <circle
          cx="85"
          cy="88"
          r="56"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
          strokeDasharray="264 88"
          strokeDashoffset="44"
        />

        {/* Minor Ticks (Every 10 km/h) */}
        {[
          135, 146.25, 157.5, 168.75, 180, 191.25, 202.5, 213.75, 225, 236.25, 247.5, 258.75,
          270, 281.25, 292.5, 303.75, 315, 326.25, 337.5, 348.75, 360, 371.25, 382.5, 393.75, 405
        ].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const isMajor = i % 3 === 0;
          const rOuter = 56;
          const rInner = isMajor ? 48 : 52;
          const x1 = 85 + rOuter * Math.cos(rad);
          const y1 = 88 + rOuter * Math.sin(rad);
          const x2 = 85 + rInner * Math.cos(rad);
          const y2 = 88 + rInner * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#f8fafc' : 'rgba(255,255,255,0.45)'}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Speedometer Numerals */}
        <text x="56" y="122" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">0</text>
        <text x="44" y="100" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">30</text>
        <text x="46" y="74" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">60</text>
        <text x="62" y="55" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">90</text>
        <text x="85" y="47" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">120</text>
        <text x="108" y="55" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">150</text>
        <text x="124" y="74" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">180</text>
        <text x="126" y="100" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">210</text>
        <text x="114" y="122" fill="#e2e8f0" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">240</text>

        {/* Speedometer Dial Label */}
        <text x="85" y="112" fill="#94a3b8" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1px" fontFamily="'Segoe UI', sans-serif">KM/H</text>
        <text x="85" y="122" fill="#64748b" fontSize="6.5" fontWeight="700" textAnchor="middle" letterSpacing="0.8px" fontFamily="'Segoe UI', sans-serif">SPEED</text>

        {/* Speedometer Analog Needle */}
        <g ref={speedNeedleRef} transform="rotate(-135 85 88)">
          <polygon points="83.5,88 85,34 86.5,88 85,98" fill="#e11d48" />
          <polygon points="84.2,34 85,30 85.8,34" fill="#ffffff" />
          <circle cx="85" cy="88" r="9" fill="#181d26" stroke="#334155" strokeWidth="2" />
          <circle cx="85" cy="88" r="3.5" fill="#94a3b8" />
        </g>

        {/* ════════════════ RIGHT GAUGE: TACHOMETER (0 - 8 x1000 RPM) ════════════════ */}
        {/* Bezel Ring */}
        <circle cx="255" cy="88" r="68" fill="#1e2430" stroke="#475569" strokeWidth="2" />
        <circle cx="255" cy="88" r="64" fill="url(#dialFace)" stroke="#0f131a" strokeWidth="1.5" />

        {/* Tachometer Scale Arc */}
        <circle
          cx="255"
          cy="88"
          r="56"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
          strokeDasharray="264 88"
          strokeDashoffset="44"
        />

        {/* Redline Zone Arc (6.5k to 8.0k RPM in racing red) */}
        <path
          d="M 307 66 A 56 56 0 0 1 295 128"
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
        />

        {/* Ticks (Every 500 RPM) */}
        {[
          135, 151.875, 168.75, 185.625, 202.5, 219.375, 236.25, 253.125,
          270, 286.875, 303.75, 320.625, 337.5, 354.375, 371.25, 388.125, 405
        ].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const isMajor = i % 2 === 0;
          const isRedline = deg >= 340;
          const rOuter = 56;
          const rInner = isMajor ? 47 : 51;
          const x1 = 255 + rOuter * Math.cos(rad);
          const y1 = 88 + rOuter * Math.sin(rad);
          const x2 = 255 + rInner * Math.cos(rad);
          const y2 = 88 + rInner * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isRedline ? '#ef4444' : isMajor ? '#f8fafc' : 'rgba(255,255,255,0.45)'}
              strokeWidth={isMajor ? 2.2 : 1}
            />
          );
        })}

        {/* Tachometer Numerals */}
        <text x="226" y="122" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">0</text>
        <text x="214" y="100" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">1</text>
        <text x="216" y="74" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">2</text>
        <text x="232" y="55" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">3</text>
        <text x="255" y="47" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">4</text>
        <text x="278" y="55" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">5</text>
        <text x="294" y="74" fill="#e2e8f0" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">6</text>
        <text x="296" y="100" fill="#ef4444" fontSize="9.5" fontWeight="900" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">7</text>
        <text x="284" y="122" fill="#ef4444" fontSize="9.5" fontWeight="900" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">8</text>

        {/* Tachometer Dial Label */}
        <text x="255" y="132" fill="#94a3b8" fontSize="7.5" fontWeight="800" textAnchor="middle" letterSpacing="0.8px" fontFamily="'Segoe UI', sans-serif">RPM x1000</text>

        {/* Shift Light LED Indicator at top */}
        <circle cx="255" cy="23" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <circle
          ref={shiftLightRef}
          cx="255"
          cy="23"
          r="5"
          fill="#ef4444"
          style={{ opacity: 0.15, transition: 'opacity 0.05s ease-out' }}
        />
        <text x="255" y="14" fill="#94a3b8" fontSize="6.5" fontWeight="800" textAnchor="middle" letterSpacing="0.6px" fontFamily="'Segoe UI', sans-serif">SHIFT</text>

        {/* Tachometer Analog Needle */}
        <g ref={rpmNeedleRef} transform="rotate(-135 255 88)">
          <polygon points="253.5,88 255,34 256.5,88 255,98" fill="#e11d48" />
          <polygon points="254.2,34 255,30 255.8,34" fill="#ffffff" />
          <circle cx="255" cy="88" r="9" fill="#181d26" stroke="#334155" strokeWidth="2" />
          <circle cx="255" cy="88" r="3.5" fill="#94a3b8" />
        </g>

        {/* Center Cluster Rally Badge */}
        <text x="170" y="24" fill="#e2e8f0" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="1.8px" fontFamily="'Segoe UI', sans-serif">OPEN RALLY</text>
        <text x="170" y="34" fill="#64748b" fontSize="6.5" fontWeight="800" textAnchor="middle" letterSpacing="1px" fontFamily="'Segoe UI', sans-serif">CORSE COMPETIZIONE</text>
      </svg>

      {/* Rally Digital Speed Readout (Left dial overlay) */}
      <div style={styles.speedDigitalContainer}>
        <span ref={speedTextRef} style={styles.speedDigitalNumber}>0</span>
      </div>

      {/* Vintage Rally Gear Indicator Box (Right dial overlay) */}
      <div style={styles.gearBoxContainer}>
        <div style={styles.gearBox}>
          <span ref={gearTextRef} style={styles.gearBoxText}>N</span>
        </div>
        <span style={styles.gearLabel}>GEAR</span>
      </div>

      {/* Real-time RPM readout */}
      <div style={styles.rpmDigitalContainer}>
        <span ref={rpmTextRef} style={styles.rpmDigitalNumber}>1000</span>
        <span style={styles.rpmDigitalUnit}>RPM</span>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  rallyCluster: {
    position: 'absolute',
    bottom: 'calc(20px + var(--sab))',
    right: 'calc(20px + var(--sar))',
    width: '340px',
    height: '175px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
    borderRadius: '24px',
    pointerEvents: 'none',
  },
  clusterSvg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  speedDigitalContainer: {
    position: 'absolute',
    left: '45px',
    top: '128px',
    width: '80px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedDigitalNumber: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
  },
  gearBoxContainer: {
    position: 'absolute',
    left: '150px',
    top: '48px',
    width: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gearBox: {
    width: '32px',
    height: '36px',
    background: '#090c10',
    border: '2px solid #ca8a04',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 8px rgba(202, 138, 4, 0.4)',
  },
  gearBoxText: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#facc15',
    fontFamily: 'monospace',
    lineHeight: 1,
    textShadow: '0 0 8px rgba(250, 204, 21, 0.7)',
  },
  gearLabel: {
    fontSize: '7px',
    fontWeight: 900,
    color: '#94a3b8',
    letterSpacing: '1px',
    marginTop: '3px',
  },
  rpmDigitalContainer: {
    position: 'absolute',
    right: '45px',
    top: '102px',
    width: '80px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: '2px',
  },
  rpmDigitalNumber: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#cbd5e1',
    fontFamily: 'monospace',
  },
  rpmDigitalUnit: {
    fontSize: '7px',
    fontWeight: 700,
    color: '#64748b',
  },
};
