import { memo } from 'react';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useGameStore } from '@/store/gameStore';

function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/**
 * Stage Complete modal displayed when the 60-second Gymkhana Blitz timer expires.
 * Displays total drift score, personal best, new record badges, and performance breakdown.
 */
const GymkhanaCompleteModalContent = memo(function GymkhanaCompleteModalContent() {
  const totalScore = useGymkhanaStore((s) => s.totalScore);
  const bestScore = useGymkhanaStore((s) => s.bestScore);
  const isNewRecord = useGymkhanaStore((s) => s.isNewRecord);
  const stats = useGymkhanaStore((s) => s.stats);
  const dismissResultsModal = useGymkhanaStore((s) => s.dismissResultsModal);
  const startCountdown = useGymkhanaStore((s) => s.startCountdown);

  const setGameState = useGameStore((s) => s.setGameState);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const triggerReset = useGameStore((s) => s.triggerReset);

  const handlePlayAgain = () => {
    dismissResultsModal();
    triggerReset(true);
    startCountdown();
  };

  const handleSwitchToFreeRoam = () => {
    dismissResultsModal();
    setGameMode('freeroam');
  };

  const handleReturnToMenu = () => {
    dismissResultsModal();
    setGameState('menu');
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        {/* Header Badge */}
        <div style={styles.badgeWrapper}>
          <span style={styles.categoryBadge}>STAGE COMPLETE</span>
          {isNewRecord && <span style={styles.newRecordBadge}>★ NEW RECORD! ★</span>}
        </div>

        <h1 style={styles.title}>GYMKHANA BLITZ</h1>

        {/* Final Drift Score */}
        <div style={styles.scoreContainer}>
          <div style={styles.scoreLabel}>TOTAL DRIFT SCORE</div>
          <div style={styles.scoreNumber}>{formatScore(totalScore)}</div>
          <div style={styles.scoreUnit}>POINTS</div>
        </div>

        {/* Personal Best Pill */}
        <div style={styles.bestPill}>
          <span>STAGE RECORD:</span>
          <strong style={{ color: '#38BDF8' }}>
            {bestScore !== null ? `${formatScore(bestScore)} PTS` : `${formatScore(totalScore)} PTS`}
          </strong>
        </div>

        {/* Performance Stats Breakdown Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>MAX MULTIPLIER</span>
            <span style={styles.statValue}>x{stats.maxMultiplier}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>PEAK SLIP ANGLE</span>
            <span style={styles.statValue}>{stats.maxAngleDeg}°</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>LONGEST DRIFT</span>
            <span style={styles.statValue}>{stats.longestDriftSeconds.toFixed(1)}s</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>DRIFT CHAINS</span>
            <span style={styles.statValue}>{stats.totalDrifts}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={handlePlayAgain}>
            <span>PLAY AGAIN</span>
            <span style={styles.buttonArrow}>➜</span>
          </button>

          <button style={styles.secondaryButton} onClick={handleSwitchToFreeRoam}>
            CONTINUE IN FREE ROAM
          </button>

          <button style={styles.tertiaryButton} onClick={handleReturnToMenu}>
            RETURN TO MENU
          </button>
        </div>
      </div>
    </div>
  );
});

export const GymkhanaCompleteModal = memo(function GymkhanaCompleteModal() {
  const showResultsModal = useGymkhanaStore((s) => s.showResultsModal);
  if (!showResultsModal) return null;
  return <GymkhanaCompleteModalContent />;
});

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(5, 8, 16, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'auto',
    animation: 'fadeIn 0.25s ease-out',
  },
  modalCard: {
    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    padding: '32px 40px',
    maxWidth: '480px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.15)',
  },
  badgeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  categoryBadge: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    padding: '4px 12px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#94A3B8',
  },
  newRecordBadge: {
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '1px',
    padding: '4px 12px',
    borderRadius: '12px',
    background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
    color: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
    animation: 'pulse 1.5s infinite',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  scoreContainer: {
    background: 'rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '16px',
    padding: '16px 20px',
    marginBottom: '14px',
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  scoreLabel: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    color: '#F59E0B',
    marginBottom: '4px',
  },
  scoreNumber: {
    fontFamily: "'SF Mono', Consolas, Monaco, monospace",
    fontSize: '44px',
    fontWeight: 900,
    color: '#FACC15',
    textShadow: '0 0 20px rgba(250, 204, 21, 0.4)',
    lineHeight: 1.1,
  },
  scoreUnit: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '2px',
    color: '#94A3B8',
    marginTop: '2px',
  },
  bestPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#94A3B8',
    marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '24px',
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: '#64748B',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: "'SF Mono', Consolas, monospace",
    fontSize: '16px',
    fontWeight: 800,
    color: '#F8FAFC',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  primaryButton: {
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(90deg, #D97706, #F59E0B)',
    padding: '14px 20px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  secondaryButton: {
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '12px',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '12px 20px',
    color: '#34D399',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  tertiaryButton: {
    border: 'none',
    background: 'transparent',
    padding: '8px',
    color: '#94A3B8',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  buttonArrow: {
    fontSize: '16px',
    fontWeight: 900,
  },
};
