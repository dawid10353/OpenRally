import { create } from 'zustand';
import type { GymkhanaStore, GymkhanaStats } from '@/types/gymkhana';
import { useGameStore } from '@/store/gameStore';
import { emitGameEvent } from '@/utils/events';
import { playCountdownBeep } from '@/utils/countdownSound';

const GYMKHANA_RECORDS_KEY = 'openrally_gymkhana_records';
export const BLITZ_DURATION_SECONDS = 60.0;
export const MIN_DRIFT_SPEED_KMH = 18.0;
export const MIN_DRIFT_ANGLE_RAD = 0.14; // ~8.0 degrees
export const DRIFT_GRACE_PERIOD_SECONDS = 1.25;

function loadGymkhanaRecords(): Record<string, number> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(GYMKHANA_RECORDS_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, number>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveGymkhanaRecords(records: Record<string, number>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GYMKHANA_RECORDS_KEY, JSON.stringify(records));
    }
  } catch {
    // Ignore storage quota or serialization errors
  }
}

const initialRecords = loadGymkhanaRecords();
const initialLevel = useGameStore.getState().selectedLevelId;

const initialStats: GymkhanaStats = {
  maxMultiplier: 1,
  maxAngleDeg: 0,
  longestDriftSeconds: 0,
  totalDrifts: 0,
  totalAirTime: 0,
  longestJumpSeconds: 0,
};

let currentChainTime = 0;
let continuousDriftTime = 0;
let continuousAirTime = 0;

export const useGymkhanaStore = create<GymkhanaStore>((set, get) => ({
  status: 'idle',
  timeRemaining: BLITZ_DURATION_SECONDS,
  totalScore: 0,
  currentDriftScore: 0,
  multiplier: 1,
  isDrifting: false,
  driftAngleDeg: 0,
  graceTimer: 0,
  isAirborne: false,
  airTime: 0,
  bestScores: initialRecords,
  bestScore: initialRecords[initialLevel] ?? null,
  showResultsModal: false,
  isNewRecord: false,
  countdown: null,
  countdownTimer: 0,
  stats: { ...initialStats },

  getBestScoreForLevel: (levelId: string) => {
    return get().bestScores[levelId] ?? null;
  },

  syncBestScoreForLevel: (levelId: string) => {
    const records = get().bestScores;
    set({ bestScore: records[levelId] ?? null });
  },

  startCountdown: () => {
    playCountdownBeep(false);
    currentChainTime = 0;
    continuousDriftTime = 0;
    continuousAirTime = 0;
    set({
      status: 'countdown',
      countdown: 3,
      countdownTimer: 0,
      timeRemaining: BLITZ_DURATION_SECONDS,
      totalScore: 0,
      currentDriftScore: 0,
      multiplier: 1,
      isDrifting: false,
      driftAngleDeg: 0,
      graceTimer: 0,
      isAirborne: false,
      airTime: 0,
      showResultsModal: false,
      isNewRecord: false,
      stats: { ...initialStats },
    });
  },

  tickCountdown: (dt: number) => {
    const { status, countdownTimer, countdown } = get();
    if (status !== 'countdown' && countdown === null) return;

    const newTimer = countdownTimer + dt;

    if (newTimer < 1.0) {
      if (countdown !== 3) {
        playCountdownBeep(false);
        set({ countdown: 3, countdownTimer: newTimer });
      } else {
        set({ countdownTimer: newTimer });
      }
    } else if (newTimer < 2.0) {
      if (countdown !== 2) {
        playCountdownBeep(false);
        set({ countdown: 2, countdownTimer: newTimer });
      } else {
        set({ countdownTimer: newTimer });
      }
    } else if (newTimer < 3.0) {
      if (countdown !== 1) {
        playCountdownBeep(false);
        set({ countdown: 1, countdownTimer: newTimer });
      } else {
        set({ countdownTimer: newTimer });
      }
    } else if (newTimer < 3.7) {
      if (countdown !== 0) {
        playCountdownBeep(true);
        set({
          status: 'active',
          countdown: 0,
          countdownTimer: newTimer,
          timeRemaining: BLITZ_DURATION_SECONDS,
        });
      } else {
        set({
          countdownTimer: newTimer,
        });
      }
    } else {
      set({
        countdown: null,
        countdownTimer: newTimer,
      });
    }
  },

  startBlitz: () => {
    currentChainTime = 0;
    continuousDriftTime = 0;
    continuousAirTime = 0;
    set({
      status: 'active',
      countdown: null,
      countdownTimer: 0,
      timeRemaining: BLITZ_DURATION_SECONDS,
      totalScore: 0,
      currentDriftScore: 0,
      multiplier: 1,
      isDrifting: false,
      driftAngleDeg: 0,
      graceTimer: 0,
      isAirborne: false,
      airTime: 0,
      showResultsModal: false,
      isNewRecord: false,
      stats: { ...initialStats },
    });
  },

  tickBlitz: (
    dt: number,
    speedKmh: number,
    slipAngleRad: number,
    isGrounded: boolean,
    isAirborne: boolean = !isGrounded,
  ) => {
    const state = get();
    if (state.status !== 'active') return;

    // 1. Tick session timer
    const newTimeRemaining = Math.max(0, state.timeRemaining - dt);

    // 2. Check drift telemetry
    const absAngleRad = Math.abs(slipAngleRad);
    const angleDeg = Math.min(90, Math.round((absAngleRad * 180) / Math.PI));
    const meetsDriftCriteria =
      !isAirborne &&
      isGrounded &&
      speedKmh >= MIN_DRIFT_SPEED_KMH &&
      absAngleRad >= MIN_DRIFT_ANGLE_RAD;

    let {
      currentDriftScore,
      totalScore,
      multiplier,
      graceTimer,
      isDrifting,
      stats,
    } = state;

    // 3. Air time scoring & jump bonus
    const wasAirborne = continuousAirTime > 0;
    if (isAirborne) {
      isDrifting = false;
      continuousDriftTime = 0;

      if (speedKmh >= 15.0) {
        continuousAirTime += dt;
        currentChainTime += dt;

        // Maintain drift chain combo during flight
        graceTimer = Math.max(graceTimer, DRIFT_GRACE_PERIOD_SECONDS);

        // Multiplier progression: 1x -> 2x (1.5s) -> 3x (3.2s) -> 4x (5.2s) -> 5x (7.5s)
        if (currentChainTime >= 7.5) {
          multiplier = 5;
        } else if (currentChainTime >= 5.2) {
          multiplier = 4;
        } else if (currentChainTime >= 3.2) {
          multiplier = 3;
        } else if (currentChainTime >= 1.5) {
          multiplier = 2;
        }

        // Air points accrued dynamically based on speed and combo multiplier
        const speedMultiplier = Math.min(3.0, speedKmh / 35.0);
        const airPointsThisFrame = Math.round(
          220 * speedMultiplier * multiplier * dt,
        );
        currentDriftScore += Math.max(1, airPointsThisFrame);

        const maxMultiplier = Math.max(stats.maxMultiplier, multiplier);
        if (maxMultiplier !== stats.maxMultiplier) {
          stats = {
            ...stats,
            maxMultiplier,
          };
        }
      }
    } else if (wasAirborne) {
      // Landing event from previous flight
      if (continuousAirTime >= 0.35) {
        // Landing bonus for catching air
        const landingBonus = Math.round(continuousAirTime * 250 * multiplier);
        currentDriftScore += landingBonus;

        const totalAir = (stats.totalAirTime ?? 0) + continuousAirTime;
        const longestJump = Math.max(stats.longestJumpSeconds ?? 0, continuousAirTime);
        stats = {
          ...stats,
          totalAirTime: totalAir,
          longestJumpSeconds: longestJump,
        };
      }
      continuousAirTime = 0;
    }

    // 4. Ground drift scoring & chain banking
    if (meetsDriftCriteria) {
      if (!isDrifting) {
        emitGameEvent('drift_started', {
          speedKmh,
          slipAngle: absAngleRad,
        });
      }

      isDrifting = true;
      currentChainTime += dt;
      continuousDriftTime += dt;
      graceTimer = DRIFT_GRACE_PERIOD_SECONDS;

      // Multiplier progression: 1x -> 2x (1.5s) -> 3x (3.2s) -> 4x (5.2s) -> 5x (7.5s)
      if (currentChainTime >= 7.5) {
        multiplier = 5;
      } else if (currentChainTime >= 5.2) {
        multiplier = 4;
      } else if (currentChainTime >= 3.2) {
        multiplier = 3;
      } else if (currentChainTime >= 1.5) {
        multiplier = 2;
      } else {
        multiplier = 1;
      }

      // Points formula: higher angle & speed scale score dynamically
      const angleMultiplier = Math.min(2.5, absAngleRad / (Math.PI / 4));
      const speedMultiplier = speedKmh / 25.0;
      const pointsThisFrame = Math.round(
        140 * angleMultiplier * speedMultiplier * multiplier * dt,
      );
      currentDriftScore += Math.max(1, pointsThisFrame);

      // Track peak stats
      const maxMultiplier = Math.max(stats.maxMultiplier, multiplier);
      const maxAngleDeg = Math.max(stats.maxAngleDeg, angleDeg);

      if (maxMultiplier !== stats.maxMultiplier || maxAngleDeg !== stats.maxAngleDeg) {
        stats = {
          ...stats,
          maxMultiplier,
          maxAngleDeg,
        };
      }
    } else if (!isAirborne) {
      if (continuousDriftTime > stats.longestDriftSeconds) {
        stats = {
          ...stats,
          longestDriftSeconds: continuousDriftTime,
        };
      }
      continuousDriftTime = 0;

      if (isDrifting) {
        // Just exited active drift: start decrementing grace timer
        isDrifting = false;
      }

      if (currentDriftScore > 0) {
        graceTimer = Math.max(0, graceTimer - dt);

        if (graceTimer <= 0) {
          // Grace period expired without re-engaging drift or jump: Bank current chain!
          totalScore += currentDriftScore;
          emitGameEvent('drift_ended', {
            duration: currentChainTime,
            score: currentDriftScore,
          });

          stats = {
            ...stats,
            totalDrifts: stats.totalDrifts + 1,
            longestDriftSeconds: Math.max(stats.longestDriftSeconds, currentChainTime),
          };

          currentDriftScore = 0;
          multiplier = 1;
          currentChainTime = 0;
        }
      }
    }

    // 5. Check for Blitz completion
    if (newTimeRemaining <= 0) {
      if (continuousDriftTime > stats.longestDriftSeconds) {
        stats = {
          ...stats,
          longestDriftSeconds: continuousDriftTime,
        };
      }

      if (continuousAirTime >= 0.35) {
        const totalAir = (stats.totalAirTime ?? 0) + continuousAirTime;
        const longestJump = Math.max(stats.longestJumpSeconds ?? 0, continuousAirTime);
        stats = {
          ...stats,
          totalAirTime: totalAir,
          longestJumpSeconds: longestJump,
        };
      }
      continuousAirTime = 0;

      // Auto-bank remaining score on finish
      if (currentDriftScore > 0) {
        totalScore += currentDriftScore;
        currentDriftScore = 0;
        stats = {
          ...stats,
          totalDrifts: stats.totalDrifts + 1,
          longestDriftSeconds: Math.max(stats.longestDriftSeconds, currentChainTime),
        };
      }

      const activeLevel = useGameStore.getState().selectedLevelId;
      const prevBest = state.bestScores[activeLevel] ?? null;
      const isNewRecord = prevBest === null || totalScore > prevBest;

      let newBestScores = state.bestScores;
      let newBest = prevBest;

      if (isNewRecord && totalScore > 0) {
        newBest = totalScore;
        newBestScores = { ...state.bestScores, [activeLevel]: totalScore };
        saveGymkhanaRecords(newBestScores);
      }

      set({
        status: 'completed',
        timeRemaining: 0,
        totalScore,
        currentDriftScore: 0,
        multiplier: 1,
        isDrifting: false,
        driftAngleDeg: 0,
        graceTimer: 0,
        isAirborne: false,
        airTime: 0,
        bestScores: newBestScores,
        bestScore: newBest,
        showResultsModal: true,
        isNewRecord,
        stats,
      });
      return;
    }

    set({
      timeRemaining: newTimeRemaining,
      totalScore,
      currentDriftScore,
      multiplier,
      isDrifting,
      driftAngleDeg: meetsDriftCriteria ? angleDeg : 0,
      graceTimer,
      isAirborne,
      airTime: continuousAirTime,
      stats,
    });
  },

  bankDrift: () => {
    const { currentDriftScore, totalScore, stats } = get();
    if (currentDriftScore <= 0) return;

    const newTotal = totalScore + currentDriftScore;
    emitGameEvent('drift_ended', {
      duration: currentChainTime,
      score: currentDriftScore,
    });

    currentChainTime = 0;
    continuousDriftTime = 0;
    continuousAirTime = 0;

    set({
      totalScore: newTotal,
      currentDriftScore: 0,
      multiplier: 1,
      isDrifting: false,
      graceTimer: 0,
      isAirborne: false,
      airTime: 0,
      stats: {
        ...stats,
        totalDrifts: stats.totalDrifts + 1,
      },
    });
  },

  failDrift: () => {
    const { currentDriftScore } = get();
    if (currentDriftScore <= 0) return;

    currentChainTime = 0;
    continuousDriftTime = 0;
    continuousAirTime = 0;

    set({
      currentDriftScore: 0,
      multiplier: 1,
      isDrifting: false,
      graceTimer: 0,
      isAirborne: false,
      airTime: 0,
    });
  },

  resetBlitz: () => {
    currentChainTime = 0;
    continuousDriftTime = 0;
    continuousAirTime = 0;
    set({
      status: 'idle',
      timeRemaining: BLITZ_DURATION_SECONDS,
      totalScore: 0,
      currentDriftScore: 0,
      multiplier: 1,
      isDrifting: false,
      driftAngleDeg: 0,
      graceTimer: 0,
      isAirborne: false,
      airTime: 0,
      showResultsModal: false,
      isNewRecord: false,
      countdown: null,
      countdownTimer: 0,
      stats: { ...initialStats },
    });
  },

  dismissResultsModal: () => {
    set({ showResultsModal: false });
  },

  resetAllGymkhanaRecords: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(GYMKHANA_RECORDS_KEY);
      }
    } catch {
      // Ignore
    }
    set({
      bestScores: {},
      bestScore: null,
    });
  },
}));
