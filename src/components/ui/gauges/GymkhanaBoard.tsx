import { useEffect, useRef, memo, useState } from 'react';
import { getLastInputType, isTouchDevice, type InputType } from '@/utils/input/touch';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useGymkhanaStore, DRIFT_GRACE_PERIOD_SECONDS } from '@/store/gymkhanaStore';

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
 * and 3-2-1-GO countdown overlay.
 * Uses transient Zustand subscriptions for 0 React re-renders during high-frequency gameplay.
 */
export const GymkhanaBoard = memo(function GymkhanaBoard() {
  const touchControlMode = useSettingsStore((s) => s.touchControlMode);
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

  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const countdown = useGymkhanaStore((s) => s.countdown);

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

      // 4. Active drift card
      const showDriftCard = state.currentDriftScore > 0 || state.isDrifting;
      if (driftCardRef.current) {
        driftCardRef.current.style.opacity = showDriftCard ? '1' : '0';
        driftCardRef.current.style.transform = showDriftCard ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, -10px) scale(0.95)';
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

        if (graceBarRef.current) {
          const graceRatio = Math.max(0, Math.min(1, state.graceTimer / DRIFT_GRACE_PERIOD_SECONDS));
          graceBarRef.current.style.width = `${graceRatio * 100}%`;
          graceBarRef.current.style.background = state.isDrifting ? '#10b981' : '#f59e0b';
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

  return (
    <>
      {/* Top Header Card (Timer & Total Score) */}
      <div
        style={{
          ...styles.timerCard,
          top: isTouchActive ? 'calc(68px + var(--sat, 0px))' : 'calc(20px + var(--sat))',
        }}
      >
        <div style={styles.timerHeader}>
          <span style={styles.stageTitle}>GYMKHANA BLITZ</span>
        </div>

        {/* 60s Digital Countdown */}
        <div ref={timerTextRef} style={styles.lapTimeText}>
          01:00.00
        </div>

        {/* Banked Score & Best Score */}
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>SCORE:</span>
          <span ref={totalScoreRef} style={styles.scoreValue}>
            0 PTS
          </span>
        </div>
        <div style={styles.bestRow}>
          <span style={styles.bestLabel}>BEST:</span>
          <span ref={bestScoreRef} style={styles.bestValue}>
            --- PTS
          </span>
        </div>
      </div>

      {/* Floating Active Drift Card (Center Upper Screen) */}
      <div
        ref={driftCardRef}
        style={{
          ...styles.driftCard,
          top: isTouchActive ? 'calc(170px + var(--sat, 0px))' : 'calc(135px + var(--sat))',
        }}
      >
        <div style={styles.driftCardHeader}>
          <span ref={driftQualityRef} style={styles.driftQualityText}>
            DRIFTING...
          </span>
          <span ref={multiplierBadgeRef} style={styles.multiplierBadge}>
            x1
          </span>
        </div>

        <div ref={driftPointsRef} style={styles.driftPointsText}>
          +0
        </div>

        {/* Grace Timer Progress Bar */}
        <div style={styles.graceBarTrack}>
          <div ref={graceBarRef} style={styles.graceBarFill} />
        </div>
      </div>

      {/* Classic 3-2-1-GO Countdown Overlay */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <div
            key={countdown}
            style={{
              ...styles.countdownNumber,
              color: countdown === 0 ? '#10B981' : '#FFFFFF',
              textShadow: countdown === 0 ? '0 0 40px #10B981' : '0 0 30px rgba(0,0,0,0.8)',
            }}
          >
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      )}
    </>
  );
});

const styles: Record<string, React.CSSProperties> = {
  timerCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 22px',
    minWidth: '220px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none',
    zIndex: 20,
  },
  timerHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2px',
  },
  stageTitle: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  lapTimeText: {
    fontFamily: "'SF Mono', Consolas, Monaco, monospace",
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
    margin: '2px 0 6px 0',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 800,
    color: '#E2E8F0',
    marginTop: '2px',
  },
  scoreLabel: {
    color: '#94A3B8',
    letterSpacing: '0.5px',
  },
  scoreValue: {
    color: '#38BDF8',
    fontFamily: "'SF Mono', Consolas, monospace",
    fontWeight: 800,
  },
  bestRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    marginTop: '2px',
  },
  bestLabel: {
    letterSpacing: '0.5px',
  },
  bestValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    color: '#94A3B8',
  },
  driftCard: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '8px 18px',
    minWidth: '200px',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
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
    fontSize: '24px',
    fontWeight: 900,
    color: '#FACC15',
    textShadow: '0 0 12px rgba(250, 204, 21, 0.5)',
    margin: '2px 0 4px 0',
  },
  graceBarTrack: {
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  graceBarFill: {
    width: '100%',
    height: '100%',
    background: '#10B981',
    transition: 'width 0.05s linear',
  },
  countdownOverlay: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 100,
  },
  countdownNumber: {
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    fontSize: '120px',
    fontWeight: 900,
    letterSpacing: '4px',
    animation: 'countdownPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};
