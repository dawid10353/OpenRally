/**
 * Operational status of the Gymkhana Blitz session.
 */
export type GymkhanaStatus = 'idle' | 'countdown' | 'active' | 'completed';

/**
 * Historical and round stats for Gymkhana Blitz.
 */
export interface GymkhanaStats {
  /** Maximum combo multiplier reached during the round */
  maxMultiplier: number;
  /** Maximum drift slip angle achieved (degrees) */
  maxAngleDeg: number;
  /** Longest uninterrupted continuous drift time in seconds */
  longestDriftSeconds: number;
  /** Total number of banked drift chains during the round */
  totalDrifts: number;
}

/**
 * Gymkhana Blitz state management store interface.
 */
export interface GymkhanaStore {
  /** Active status of the Blitz */
  status: GymkhanaStatus;
  /** Remaining time in seconds (ticking down from 60.0 to 0.0) */
  timeRemaining: number;
  /** Total banked drift score */
  totalScore: number;
  /** Current active (unbanked) drift score in the current chain */
  currentDriftScore: number;
  /** Current combo multiplier (1 to 5) */
  multiplier: number;
  /** Whether the vehicle is actively drifting this frame */
  isDrifting: boolean;
  /** Current slip angle in degrees */
  driftAngleDeg: number;
  /** Transition grace timer remaining in seconds (e.g., 1.2s to switch directions without losing combo) */
  graceTimer: number;
  /** Best score for active level */
  bestScore: number | null;
  /** High scores dictionary indexed by level ID */
  bestScores: Record<string, number>;
  /** Whether the stage complete results modal is displayed */
  showResultsModal: boolean;
  /** Whether the round set a new personal best */
  isNewRecord: boolean;
  /** Active countdown digit (3, 2, 1, 0 for START, or null when inactive) */
  countdown: number | null;
  /** Elapsed time of the countdown sequence */
  countdownTimer: number;
  /** Round performance statistics */
  stats: GymkhanaStats;

  // Actions
  startCountdown: () => void;
  tickCountdown: (dt: number) => void;
  startBlitz: () => void;
  tickBlitz: (
    dt: number,
    speedKmh: number,
    slipAngleRad: number,
    isGrounded: boolean,
  ) => void;
  bankDrift: () => void;
  failDrift: () => void;
  resetBlitz: () => void;
  dismissResultsModal: () => void;
  getBestScoreForLevel: (levelId: string) => number | null;
  syncBestScoreForLevel: (levelId: string) => void;
  resetAllGymkhanaRecords: () => void;
}
