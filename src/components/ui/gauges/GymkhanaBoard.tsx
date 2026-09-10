import { useEffect, useRef, memo, useState } from 'react';
import { getLastInputType, isTouchDevice, type InputType } from '@/utils/input/touch';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useGymkhanaStore, DRIFT_GRACE_PERIOD_SECONDS } from '@/store/gymkhanaStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { CARBON_FIBER_BG, RALLY_HAZARD_STRIPES_YELLOW, rallyHudTheme } from './rallyHudStyles';

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Gymkhana Blitz HUD — digital 60s countdown timer, banked score,
 * real-time floating drift chain gauge with combo multiplier and grace timer,
 * and authentic rally countdown overlay.
 * Uses transient Zustand subscriptions for 0 React re-renders during high-frequency gameplay.
 * Adapts dynamically to an ultra-compact horizontal strip on mobile phones to keep the road and vehicle completely clear.
 */
export const GymkhanaBoard = memo(function GymkhanaBoard() {
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
  const countdown = useGymkhanaStore((s) => s.countdown);

  const isSpectating = useMultiplayerStore((s) => s.isSpectating);
  const spectateTargetNickname = useMultiplayerStore((s) => s.spectateTargetNickname);
  const spectateRoundRemaining = useMultiplayerStore((s) => s.spectateRoundRemaining);
  const cycleSpectateTarget = useMultiplayerStore((s) => s.cycleSpectateTarget);

  useEffect(() => {
    if (!isSpectating) return;
    const handleSpectateKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' || e.code === 'ArrowLeft') {
        cycleSpectateTarget(-1);
      } else if (e.code === 'KeyE' || e.code === 'ArrowRight') {
        cycleSpectateTarget(1);
      }
    };
    window.addEventListener('keydown', handleSpectateKey);
    return () => window.removeEventListener('keydown', handleSpectateKey);
  }, [isSpectating, cycleSpectateTarget]);

  useEffect(() => {
    if (!isSpectating) return;
    const interval = setInterval(() => {
      const cur = useMultiplayerStore.getState().spectateRoundRemaining;
      if (cur > 0) {
        useMultiplayerStore.setState({ spectateRoundRemaining: Math.max(0, cur - 1) });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSpectating]);

  // Transient DOM references
  const timerTextRef = useRef<HTMLDivElement>(null);
  const totalScoreRef = useRef<HTMLSpanElement>(null);
  const bestScoreRef = useRef<HTMLSpanElement>(null);
  const driftCardRef = useRef<HTMLDivElement>(null);
  const driftPointsRef = useRef<HTMLDivElement>(null);
  const multiplierBadgeRef = useRef<HTMLSpanElement>(null);
  const driftQualityRef = useRef<HTMLSpanElement>(null);
  const graceBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState !== 'playing' || gameMode !== 'gymkhana_blitz') return;

    const updateHUD = (state: ReturnType<typeof useGymkhanaStore.getState>) => {
      // 1. Timer update
      if (timerTextRef.current) {
        timerTextRef.current.innerText = formatTime(state.timeRemaining);
        if (state.timeRemaining <= 10.0 && state.timeRemaining > 0) {
          timerTextRef.current.style.color = '#ef4444';
          timerTextRef.current.style.textShadow = '0 0 16px rgba(239, 68, 68, 0.8)';
        } else {
          timerTextRef.current.style.color = '#ffffff';
          timerTextRef.current.style.textShadow = '0 2px 8px rgba(0, 0, 0, 0.6)';
        }
      }

      // 2. Banked score update
      if (totalScoreRef.current) {
        totalScoreRef.current.innerText = `${formatScore(state.totalScore)} PTS`;
      }

      // 3. Best score update
      if (bestScoreRef.current) {
        bestScoreRef.current.innerText = state.bestScore !== null ? `${formatScore(state.bestScore)} PTS` : '--- PTS';
      }

      // 4. Active drift / stunt card
      const showDriftCard = state.currentDriftScore > 0 || state.isDrifting || state.isAirborne;
      if (driftCardRef.current) {
        driftCardRef.current.style.opacity = showDriftCard ? '1' : '0';
        driftCardRef.current.style.transform = showDriftCard
          ? 'translate(-50%, 0) scale(1)'
          : 'translate(-50%, -8px) scale(0.95)';
      }

      if (showDriftCard) {
        if (driftPointsRef.current) {
          driftPointsRef.current.innerText = `+${formatScore(state.currentDriftScore)}`;
        }

        if (multiplierBadgeRef.current) {
          multiplierBadgeRef.current.innerText = `x${state.multiplier}`;
          multiplierBadgeRef.current.style.background =
            state.multiplier >= 5
              ? 'linear-gradient(90deg, #ec4899, #ef4444)'
              : state.multiplier >= 4
              ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
              : state.multiplier >= 3
              ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
              : state.multiplier >= 2
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'rgba(255, 255, 255, 0.15)';
        }

        if (driftQualityRef.current) {
          if (state.isAirborne) {
            if (state.airTime >= 1.5) {
              driftQualityRef.current.innerText = 'INSANE AIR!';
              driftQualityRef.current.style.color = '#ec4899';
            } else if (state.airTime >= 0.8) {
              driftQualityRef.current.innerText = 'BIG AIR!';
              driftQualityRef.current.style.color = '#f59e0b';
            } else {
              driftQualityRef.current.innerText = 'AIR TIME!';
              driftQualityRef.current.style.color = '#38bdf8';
            }
          } else {
            const angle = state.driftAngleDeg;
            if (angle >= 45) {
              driftQualityRef.current.innerText = 'DRIFT KING!';
              driftQualityRef.current.style.color = '#f43f5e';
            } else if (angle >= 30) {
              driftQualityRef.current.innerText = 'AWESOME ANGLE!';
              driftQualityRef.current.style.color = '#f59e0b';
            } else if (angle >= 18) {
              driftQualityRef.current.innerText = 'GREAT SLIDE!';
              driftQualityRef.current.style.color = '#10b981';
            } else {
              driftQualityRef.current.innerText = 'DRIFTING...';
              driftQualityRef.current.style.color = '#38bdf8';
            }
          }
        }

        if (graceBarRef.current) {
          const graceRatio = Math.max(0, Math.min(1, state.graceTimer / DRIFT_GRACE_PERIOD_SECONDS));
          graceBarRef.current.style.width = `${graceRatio * 100}%`;
          graceBarRef.current.style.background = state.isAirborne
            ? '#38bdf8'
            : state.isDrifting
            ? '#10b981'
            : '#f59e0b';
        }
      }
    };

    updateHUD(useGymkhanaStore.getState());
    const unsub = useGymkhanaStore.subscribe(updateHUD);
    return () => unsub();
  }, [gameState, gameMode]);

  if (gameMode !== 'gymkhana_blitz') {
    return null;
  }

  if (isSpectating) {
    return (
      <div style={styles.spectatorContainer}>
        <div style={styles.spectatorCard}>
          <div style={styles.spectatorHeader}>
            <span style={styles.spectatorLiveDot} />
            <span style={styles.spectatorLiveText}>LIVE BROADCAST</span>
            <span style={styles.spectatorBadge}>SPECTATOR MODE</span>
          </div>

          <div style={styles.spectatorTargetRow}>
            <button
              type="button"
              style={styles.spectatorNavBtn}
              onClick={() => cycleSpectateTarget(-1)}
              title="Previous Driver [Q / Left Arrow]"
            >
              ◀
            </button>
            <div style={styles.spectatorDriverInfo}>
              <span style={styles.spectatorDriverLabel}>SPECTATING DRIVER</span>
              <span style={styles.spectatorDriverName}>
                {spectateTargetNickname ?? 'Active Driver'}
              </span>
            </div>
            <button
              type="button"
              style={styles.spectatorNavBtn}
              onClick={() => cycleSpectateTarget(1)}
              title="Next Driver [E / Right Arrow]"
            >
              ▶
            </button>
          </div>

          <div style={styles.spectatorTimerRow}>
            <span style={styles.spectatorTimerLabel}>ROUND ENDS IN:</span>
            <span style={styles.spectatorTimerValue}>{Math.ceil(spectateRoundRemaining)}s</span>
          </div>

          <div style={styles.spectatorFooter}>
            <span>You will join automatically when the new round begins</span>
            <span style={styles.spectatorHotkeyTip}>[Q / E or ◀ / ▶ to switch drivers]</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Header Card (Timer & Banked Score) */}
      {isMobile ? (
        <div style={styles.mobileTimerBar}>
          {/* Corner Rivets */}
          <div style={{ ...rallyHudTheme.cornerRivet, top: '3px', left: '3px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, top: '3px', right: '3px' }} />

          <div style={styles.mobileInner}>
            <span style={styles.mobileRallyBadge}>GYMKHANA</span>
            <div ref={timerTextRef} style={styles.mobileLapTimeText}>
              01:00.00
            </div>
            <div style={styles.mobileDivider} />
            <div style={styles.mobileMetaItem}>
              <span style={styles.mobileMetaLabel}>SCORE</span>
              <span ref={totalScoreRef} style={styles.mobileScoreValue}>
                0 PTS
              </span>
            </div>
            <div style={styles.mobileDivider} />
            <div style={styles.mobileMetaItem}>
              <span style={styles.mobileMetaLabel}>BEST</span>
              <span ref={bestScoreRef} style={styles.mobileBestValue}>
                --- PTS
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.timerCard}>
          {/* 4 Corner Rivets */}
          <div style={{ ...rallyHudTheme.cornerRivet, top: '6px', left: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, top: '6px', right: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, bottom: '6px', left: '6px' }} />
          <div style={{ ...rallyHudTheme.cornerRivet, bottom: '6px', right: '6px' }} />

          {/* Top Hazard Caution Stripe Accent */}
          <div style={styles.rallyHazardBar} />

          <div style={styles.timerHeader}>
            <span style={styles.stageTitle}>GYMKHANA BLITZ</span>
            <span style={styles.driftTag}>DRIFT STAGE</span>
          </div>

          {/* 60s Digital Countdown */}
          <div ref={timerTextRef} style={styles.lapTimeText}>
            01:00.00
          </div>

          {/* Banked Score & Best Score */}
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>BANKED SCORE</span>
            <span ref={totalScoreRef} style={styles.scoreValue}>
              0 PTS
            </span>
          </div>
          <div style={styles.bestRow}>
            <span style={styles.bestLabel}>STAGE RECORD</span>
            <span ref={bestScoreRef} style={styles.bestValue}>
              --- PTS
            </span>
          </div>
        </div>
      )}

      {/* Floating Active Drift Card (Upper Screen, Streamlined on Mobile) */}
      <div
        ref={driftCardRef}
        style={{
          ...(isMobile ? styles.mobileDriftCard : styles.driftCard),
          top: isMobile ? 'calc(52px + var(--sat, 0px))' : 'calc(145px + var(--sat))',
        }}
      >
        <div style={{ ...rallyHudTheme.cornerRivet, top: '4px', left: '4px' }} />
        <div style={{ ...rallyHudTheme.cornerRivet, top: '4px', right: '4px' }} />
        {!isMobile && (
          <>
            <div style={{ ...rallyHudTheme.cornerRivet, bottom: '4px', left: '4px' }} />
            <div style={{ ...rallyHudTheme.cornerRivet, bottom: '4px', right: '4px' }} />
          </>
        )}

        <div style={isMobile ? styles.mobileDriftRow : styles.driftCardHeader}>
          <div style={isMobile ? styles.mobileDriftLeft : undefined}>
            <span ref={multiplierBadgeRef} style={isMobile ? styles.mobileMultiplierBadge : styles.multiplierBadge}>
              x1
            </span>
            <span ref={driftQualityRef} style={isMobile ? styles.mobileDriftQualityText : styles.driftQualityText}>
              DRIFTING...
            </span>
          </div>

          <div ref={driftPointsRef} style={isMobile ? styles.mobileDriftPointsText : styles.driftPointsText}>
            +0
          </div>
        </div>

        {/* Grace Timer Progress Bar */}
        <div style={isMobile ? styles.mobileGraceBarTrack : styles.graceBarTrack}>
          <div ref={graceBarRef} style={styles.graceBarFill} />
        </div>
      </div>

      {/* Authentic Classic Rally 3-2-1-GO Countdown */}
      {countdown !== null && (
        <div style={styles.classicRallyCountdown}>
          <div key={countdown} style={styles.rallyCountdownContent}>
            <div
              style={{
                ...styles.rallyStageRibbon,
                padding: isMobile ? '2px 18px' : '4px 32px',
                fontSize: isMobile ? '12px' : '15px',
              }}
            >
              <span>GYMKHANA START</span>
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
    background: 'rgba(255, 255, 255, 0.2)',
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
    letterSpacing: '0.5px',
  },
  mobileScoreValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '11px',
    fontWeight: 800,
    color: '#38bdf8',
  },
  mobileBestValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '11px',
    fontWeight: 800,
    color: '#cbd5e1',
  },

  // Desktop Timing Card
  timerCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: 'calc(20px + var(--sat))',
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '2px solid #334155',
    borderRadius: '12px',
    padding: '10px 22px',
    minWidth: '240px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
    zIndex: 20,
  },
  rallyHazardBar: {
    width: '100%',
    height: '5px',
    background: RALLY_HAZARD_STRIPES_YELLOW,
    borderRadius: '4px',
    marginBottom: '6px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
  },
  timerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  stageTitle: {
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '1.5px',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  driftTag: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#38bdf8',
    fontSize: '8.5px',
    fontWeight: 800,
    padding: '1px 5px',
    borderRadius: '3px',
    letterSpacing: '0.8px',
  },
  lapTimeText: {
    fontFamily: "'SF Mono', Consolas, Monaco, monospace",
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '1px',
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
    margin: '2px 0 6px 0',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 800,
    color: '#E2E8F0',
    marginTop: '2px',
  },
  scoreLabel: {
    color: '#94A3B8',
    letterSpacing: '0.5px',
    fontSize: '10px',
  },
  scoreValue: {
    color: '#38BDF8',
    fontFamily: "'SF Mono', Consolas, monospace",
    fontWeight: 900,
    fontSize: '13px',
  },
  bestRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748B',
    marginTop: '2px',
  },
  bestLabel: {
    letterSpacing: '0.5px',
    color: '#94a3b8',
  },
  bestValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    color: '#cbd5e1',
    fontWeight: 800,
  },

  // Mobile Floating Drift Card (Super slim 28px ribbon right under the timer bar)
  mobileDriftCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '1.5px solid #475569',
    borderRadius: '12px',
    padding: '4px 14px 7px 14px',
    minWidth: '220px',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    zIndex: 25,
    pointerEvents: 'none',
    transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
    opacity: 0,
  },
  mobileDriftRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  mobileDriftLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  mobileMultiplierBadge: {
    fontSize: '10px',
    fontWeight: 900,
    padding: '1px 6px',
    borderRadius: '6px',
    color: '#FFFFFF',
    letterSpacing: '0.5px',
  },
  mobileDriftQualityText: {
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  mobileDriftPointsText: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '15px',
    fontWeight: 900,
    color: '#FACC15',
    textShadow: '0 0 8px rgba(250, 204, 21, 0.6)',
  },
  mobileGraceBarTrack: {
    position: 'absolute',
    bottom: '2px',
    left: '10px',
    right: '10px',
    height: '2.5px',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '1.5px',
    overflow: 'hidden',
  },

  // Desktop Floating Drift Card
  driftCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '2px solid #334155',
    borderRadius: '12px',
    padding: '10px 20px',
    minWidth: '220px',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
    zIndex: 20,
    transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
    opacity: 0,
  },
  driftCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '2px',
  },
  driftQualityText: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  multiplierBadge: {
    fontSize: '12px',
    fontWeight: 900,
    padding: '2px 8px',
    borderRadius: '10px',
    color: '#FFFFFF',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  },
  driftPointsText: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '26px',
    fontWeight: 900,
    color: '#FACC15',
    textShadow: '0 0 12px rgba(250, 204, 21, 0.5)',
    margin: '2px 0 6px 0',
  },
  graceBarTrack: {
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  graceBarFill: {
    width: '100%',
    height: '100%',
    background: '#10B981',
    transition: 'width 0.05s linear',
  },

  // Classic Rally 3-2-1-GO Countdown Styles
  classicRallyCountdown: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 9999,
  },
  rallyCountdownContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'rallyPop 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  rallyStageRibbon: {
    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
    color: '#0f172a',
    fontWeight: 900,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    borderRadius: '4px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    marginBottom: '8px',
  },
  rallyCountdownDigit: {
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    fontWeight: 900,
    letterSpacing: '2px',
    lineHeight: 1,
    filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.9))',
  },

  // Spectator Overlay Styles
  spectatorContainer: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 40,
    pointerEvents: 'auto',
    width: '92%',
    maxWidth: '480px',
  },
  spectatorCard: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(8, 12, 22, 0.98) 100%)',
    border: '2px solid rgba(245, 158, 11, 0.55)',
    borderRadius: '16px',
    padding: '12px 18px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.25)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  spectatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  spectatorLiveDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#EF4444',
    boxShadow: '0 0 10px #EF4444',
  },
  spectatorLiveText: {
    fontSize: '12px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  spectatorBadge: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    padding: '2px 8px',
    borderRadius: '8px',
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#FACC15',
    textTransform: 'uppercase',
  },
  spectatorTargetRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '4px 0',
  },
  spectatorNavBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#F8FAFC',
    fontSize: '14px',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  spectatorDriverInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  spectatorDriverLabel: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  spectatorDriverName: {
    fontSize: '18px',
    fontWeight: 900,
    letterSpacing: '1px',
    color: '#38BDF8',
    textShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
  },
  spectatorTimerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '4px 14px',
  },
  spectatorTimerLabel: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: '#CBD5E1',
  },
  spectatorTimerValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '18px',
    fontWeight: 900,
    color: '#FACC15',
  },
  spectatorFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#94A3B8',
  },
  spectatorHotkeyTip: {
    fontSize: '9px',
    color: '#64748B',
  },
};

