import { useEffect, useRef, memo, useState } from 'react';
import { getLastInputType, isTouchDevice, type InputType } from '@/utils/input/touch';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';

function formatLapTime(seconds: number): string {
  if (seconds <= 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

/**
 * Rally Stage Timing Card & Classic 3-2-1-GO Countdown overlay for Time Attack mode.
 * Uses transient Zustand subscriptions for 0 React re-renders on timing updates.
 */
export const TimingBoard = memo(function TimingBoard() {
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
      {/* Time Attack Rally Stage Timing Card */}
      <div style={{
        ...styles.timerCard,
        top: isTouchActive ? 'calc(68px + var(--sat, 0px))' : 'calc(20px + var(--sat))',
      }}>
        <div style={styles.timerHeader}>
          <span style={styles.stageTitle}>RALLY STAGE</span>
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

      {/* Authentic Classic Rally 3-2-1-GO Countdown */}
      {countdown !== null && (
        <div style={styles.classicRallyCountdown}>
          <div key={countdown} style={styles.rallyCountdownContent}>
            <div style={styles.rallyStageRibbon}>
              <span>STAGE START</span>
            </div>
            <div
              style={{
                ...styles.rallyCountdownDigit,
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
  timerCard: {
    position: 'absolute',
    top: 'calc(20px + var(--sat))',
    left: 'calc(20px + var(--sal))',
    background: '#121620',
    border: '2px solid #374151',
    borderRadius: '12px',
    padding: '12px 18px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
    minWidth: '220px',
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
    color: '#94a3b8',
    letterSpacing: '1.5px',
  },
  lapTimeText: {
    fontSize: '32px',
    fontWeight: 900,
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: '1.5px',
    margin: '2px 0 6px 0',
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
