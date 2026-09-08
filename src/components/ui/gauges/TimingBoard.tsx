import { useEffect, useRef, memo, useState } from 'react';
import { getLastInputType, isTouchDevice, type InputType } from '@/utils/input/touch';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { CARBON_FIBER_BG, RALLY_HAZARD_STRIPES_YELLOW, rallyHudTheme } from './rallyHudStyles';

function formatLapTime(seconds: number): string {
  if (seconds <= 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

/**
 * Rally Stage Timing Card & Classic 3-2-1-GO Countdown overlay for Time Attack mode.
 * Features authentic motorsport carbon fiber texture, rally hazard chevrons, and hex rivets.
 * Dynamically scales to an ultra-compact horizontal timing strip on mobile devices to prevent blocking road visibility.
 */
export const TimingBoard = memo(function TimingBoard() {
  const touchControlMode = useSettingsStore((s) => s.touchControlMode);
  const [activeInputType, setActiveInputType] = useState<InputType>(() => getLastInputType());
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight < 520;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768 || window.innerHeight < 520);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const isMobile = isTouchActive || isMobileScreen;

  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const bestLapTime = useRacingStore((s) => s.bestLapTime);
  const countdown = useRacingStore((s) => s.countdown);

  const lapTimeRef = useRef<HTMLDivElement>(null);
  const cpValueRef = useRef<HTMLSpanElement>(null);
  const bestValueRef = useRef<HTMLSpanElement>(null);

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

  if (gameMode !== 'timeattack') {
    return null;
  }

  return (
    <>
      {/* Mobile Streamlined Timing Strip (Unobtrusive & Road-Clear) */}
      {isMobile ? (
        <div style={{ ...styles.mobileTimerBar, top: isTouchActive ? 'calc(68px + var(--sat, 0px))' : 'calc(12px + var(--sat, 0px))' }}>
          {/* Corner Rivets */}
          <div style={{ ...rallyHudTheme.cornerRivet, top: '3px', left: '3px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, top: '3px', right: '3px' }} />

          <div style={styles.mobileInner}>
            <span style={styles.mobileRallyBadge}>STAGE</span>
            <div ref={lapTimeRef} style={styles.mobileLapTimeText}>
              00:00.00
            </div>
            <div style={styles.mobileDivider} />
            <div style={styles.mobileMetaItem}>
              <span style={styles.mobileMetaLabel}>CP</span>
              <span ref={cpValueRef} style={styles.mobileCpValue}>
                START
              </span>
            </div>
            <div style={styles.mobileDivider} />
            <div style={styles.mobileMetaItem}>
              <span style={styles.mobileMetaLabel}>BEST</span>
              <span ref={bestValueRef} style={styles.mobileBestValue}>
                {bestLapTime ? formatLapTime(bestLapTime) : '--:--.--'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Rally Stage Timing Card with Carbon Fiber & Hazard Chevrons */
        <div style={styles.timerCard}>
          {/* 4 Corner Screws */}
          <div style={{ ...rallyHudTheme.cornerRivet, top: '6px', left: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, top: '6px', right: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, bottom: '6px', left: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, bottom: '6px', right: '6px' }} />

          {/* Top Hazard Caution Stripe Accent */}
          <div style={styles.rallyHazardBar} />

          <div style={styles.timerHeader}>
            <span style={styles.stageTitle}>OPEN RALLY STAGE</span>
            <span style={styles.chronoTag}>CHRONO</span>
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
              <span style={styles.cpLabel}>STAGE RECORD</span>
              <span ref={bestValueRef} style={styles.bestValue}>
                {bestLapTime ? formatLapTime(bestLapTime) : '--:--.--'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Authentic Classic Rally 3-2-1-GO Countdown */}
      {countdown !== null && (
        <div style={styles.classicRallyCountdown}>
          <div key={countdown} style={styles.rallyCountdownContent}>
            <div style={{
              ...styles.rallyStageRibbon,
              padding: isMobile ? '2px 18px' : '4px 32px',
              fontSize: isMobile ? '12px' : '15px',
            }}>
              <span>STAGE START</span>
            </div>
            <div
              style={{
                ...styles.rallyCountdownDigit,
                fontSize: isMobile ? '64px' : '110px',
                color:
                  countdown === 0
                    ? '#00ff66'
                    : countdown === 1
                    ? '#ff3333'
                    : countdown === 2
                    ? '#ff9900'
                    : '#ffcc00',
                textShadow:
                  countdown === 0
                    ? '0 6px 0 #000000, 0 0 35px rgba(0, 255, 102, 0.9), 0 0 60px rgba(0, 255, 102, 0.5)'
                    : '0 6px 0 #000000, 0 0 25px rgba(0, 0, 0, 0.9), 0 0 45px currentColor',
              }}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

const styles: Record<string, React.CSSProperties> = {
  // Mobile Streamlined Horizontal Strip
  mobileTimerBar: {
    position: 'absolute',
    top: 'calc(12px + var(--sat, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '1.5px solid #475569',
    borderRadius: '18px',
    padding: '3px 12px',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    zIndex: 30,
    pointerEvents: 'none',
  },
  mobileInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mobileRallyBadge: {
    background: '#f59e0b',
    color: '#0f172a',
    fontSize: '9px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    letterSpacing: '0.8px',
  },
  mobileLapTimeText: {
    fontFamily: "'SF Mono', Consolas, Monaco, monospace",
    fontSize: '17px',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '1px',
    textShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
  },
  mobileDivider: {
    width: '1px',
    height: '14px',
    background: 'rgba(255, 255, 255, 0.15)',
  },
  mobileMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  mobileMetaLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#94a3b8',
  },
  mobileCpValue: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#22c55e',
    fontFamily: 'monospace',
  },
  mobileBestValue: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#eab308',
    fontFamily: 'monospace',
  },

  // Desktop Timing Card
  timerCard: {
    position: 'absolute',
    top: 'calc(20px + var(--sat))',
    left: 'calc(20px + var(--sal))',
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '2px solid #334155',
    borderRadius: '12px',
    padding: '12px 18px',
    boxShadow: '0 10px 32px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.18), inset 0 0 16px rgba(0, 0, 0, 0.8)',
    minWidth: '220px',
    zIndex: 20,
    overflow: 'hidden',
  },
  rallyHazardBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: RALLY_HAZARD_STRIPES_YELLOW,
  },
  timerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  stageTitle: {
    fontSize: '11px',
    fontWeight: 900,
    color: '#cbd5e1',
    letterSpacing: '1.5px',
  },
  chronoTag: {
    fontSize: '9px',
    fontWeight: 900,
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '3px',
    padding: '1px 4px',
    letterSpacing: '0.8px',
  },
  lapTimeText: {
    fontSize: '32px',
    fontWeight: 900,
    color: '#ffffff',
    fontFamily: "'SF Mono', Consolas, Monaco, monospace",
    letterSpacing: '1.5px',
    margin: '2px 0 6px 0',
    textShadow: '0 0 12px rgba(255, 255, 255, 0.35)',
  },
  timerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid #28303f',
    paddingTop: '6px',
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
    fontSize: '9px',
    color: '#64748b',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  cpValue: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: 800,
    marginTop: '1px',
  },
  bestValue: {
    fontSize: '12px',
    color: '#eab308',
    fontWeight: 800,
    fontFamily: 'monospace',
    marginTop: '1px',
  },
  classicRallyCountdown: {
    position: 'absolute',
    top: '22%',
    left: 'var(--sal)',
    right: 'var(--sar)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 100,
  },
  rallyCountdownContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rallyStageRibbon: {
    background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, transparent)',
    padding: '4px 32px',
    fontSize: '15px',
    fontWeight: 900,
    fontStyle: 'italic',
    color: '#ffffff',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
    borderBottom: '2px solid #ffcc00',
    transform: 'skew(-12deg)',
    marginBottom: '2px',
  },
  rallyCountdownDigit: {
    fontSize: '110px',
    fontWeight: 900,
    fontStyle: 'italic',
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    lineHeight: 1,
    letterSpacing: '4px',
    transform: 'skew(-12deg)',
    WebkitTextStroke: '2.5px #000000',
    userSelect: 'none',
  },
};
