import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGymkhanaStore, BLITZ_DURATION_SECONDS, MIN_DRIFT_SPEED_KMH, MIN_DRIFT_ANGLE_RAD } from '../gymkhanaStore';

describe('gymkhanaStore', () => {
  beforeEach(() => {
    useGymkhanaStore.getState().resetBlitz();
    useGymkhanaStore.getState().resetAllGymkhanaRecords();
    vi.clearAllMocks();
  });

  it('initializes with default 60s blitz state', () => {
    const state = useGymkhanaStore.getState();
    expect(state.status).toBe('idle');
    expect(state.timeRemaining).toBe(BLITZ_DURATION_SECONDS);
    expect(state.totalScore).toBe(0);
    expect(state.currentDriftScore).toBe(0);
    expect(state.multiplier).toBe(1);
    expect(state.showResultsModal).toBe(false);
  });

  it('runs countdown sequence from 3 down to start', () => {
    const store = useGymkhanaStore.getState();
    store.startCountdown();

    expect(useGymkhanaStore.getState().status).toBe('countdown');
    expect(useGymkhanaStore.getState().countdown).toBe(3);

    // Tick to 1.5s -> countdown 2
    useGymkhanaStore.getState().tickCountdown(1.2);
    expect(useGymkhanaStore.getState().countdown).toBe(2);

    // Tick to 2.5s -> countdown 1
    useGymkhanaStore.getState().tickCountdown(1.0);
    expect(useGymkhanaStore.getState().countdown).toBe(1);

    // Tick past 3.0s -> status active, countdown 0 (START)
    useGymkhanaStore.getState().tickCountdown(1.0);
    expect(useGymkhanaStore.getState().status).toBe('active');
    expect(useGymkhanaStore.getState().countdown).toBe(0);
  });

  it('accumulates drift points when speed and angle exceed thresholds', () => {
    const store = useGymkhanaStore.getState();
    store.startBlitz();

    expect(useGymkhanaStore.getState().status).toBe('active');

    // 1. Below speed threshold: no points
    useGymkhanaStore.getState().tickBlitz(0.1, MIN_DRIFT_SPEED_KMH - 2, 0.4, true, false);
    expect(useGymkhanaStore.getState().currentDriftScore).toBe(0);

    // 2. Below angle threshold: no points
    useGymkhanaStore.getState().tickBlitz(0.1, 50, MIN_DRIFT_ANGLE_RAD - 0.05, true, false);
    expect(useGymkhanaStore.getState().currentDriftScore).toBe(0);

    // 3. Valid ground drift: points accumulate!
    useGymkhanaStore.getState().tickBlitz(0.5, 60, 0.5, true, false);
    expect(useGymkhanaStore.getState().currentDriftScore).toBeGreaterThan(0);
    expect(useGymkhanaStore.getState().isDrifting).toBe(true);
  });

  it('accumulates air time points and awards landing bonus when airborne', () => {
    const store = useGymkhanaStore.getState();
    store.startBlitz();

    expect(useGymkhanaStore.getState().status).toBe('active');

    // 1. Airborne below speed threshold: no points
    useGymkhanaStore.getState().tickBlitz(0.2, 10, 0, false, true);
    expect(useGymkhanaStore.getState().currentDriftScore).toBe(0);

    // 2. Airborne at high speed (jump off ramp): points accumulate and combo grace is held!
    useGymkhanaStore.getState().tickBlitz(0.5, 75, 0, false, true);
    const scoreInAir = useGymkhanaStore.getState().currentDriftScore;
    expect(scoreInAir).toBeGreaterThan(0);
    expect(useGymkhanaStore.getState().isAirborne).toBe(true);
    expect(useGymkhanaStore.getState().airTime).toBeCloseTo(0.5, 2);

    // Second flight tick: points increase further
    useGymkhanaStore.getState().tickBlitz(0.5, 70, 0, false, true);
    expect(useGymkhanaStore.getState().currentDriftScore).toBeGreaterThan(scoreInAir);
    expect(useGymkhanaStore.getState().airTime).toBeCloseTo(1.0, 2);

    // 3. Landing tick: awards landing bonus and logs stats!
    useGymkhanaStore.getState().tickBlitz(0.1, 65, 0, true, false);
    const postLandingScore = useGymkhanaStore.getState().currentDriftScore;
    expect(postLandingScore).toBeGreaterThan(scoreInAir);
    expect(useGymkhanaStore.getState().isAirborne).toBe(false);
    expect(useGymkhanaStore.getState().airTime).toBe(0);
    expect(useGymkhanaStore.getState().stats.totalAirTime).toBeGreaterThanOrEqual(1.0);
    expect(useGymkhanaStore.getState().stats.longestJumpSeconds).toBeGreaterThanOrEqual(1.0);
  });

  it('progresses combo multiplier during extended drift and banks after grace period', () => {
    useGymkhanaStore.getState().startBlitz();

    // Drift for 4.0 seconds (should reach 3x multiplier)
    for (let i = 0; i < 8; i++) {
      useGymkhanaStore.getState().tickBlitz(0.5, 55, 0.45, true);
    }

    expect(useGymkhanaStore.getState().multiplier).toBeGreaterThanOrEqual(3);
    const scoreBeforeBank = useGymkhanaStore.getState().currentDriftScore;
    expect(scoreBeforeBank).toBeGreaterThan(0);

    // Straighten out: grace timer ticks down
    useGymkhanaStore.getState().tickBlitz(0.5, 50, 0.0, true);
    expect(useGymkhanaStore.getState().isDrifting).toBe(false);
    expect(useGymkhanaStore.getState().currentDriftScore).toBe(scoreBeforeBank);

    // Grace timer expires (> 1.25s straight): score is banked into totalScore!
    useGymkhanaStore.getState().tickBlitz(1.0, 50, 0.0, true);
    expect(useGymkhanaStore.getState().currentDriftScore).toBe(0);
    expect(useGymkhanaStore.getState().totalScore).toBe(scoreBeforeBank);
    expect(useGymkhanaStore.getState().multiplier).toBe(1);
    expect(useGymkhanaStore.getState().stats.totalDrifts).toBe(1);
  });

  it('completes blitz when 60s timer expires and records high score', () => {
    useGymkhanaStore.getState().startBlitz();

    // Score some points
    useGymkhanaStore.getState().tickBlitz(2.0, 60, 0.5, true);
    const initialPoints = useGymkhanaStore.getState().currentDriftScore;

    // Fast-forward to end of session
    useGymkhanaStore.getState().tickBlitz(59.0, 0, 0, true);

    const finalState = useGymkhanaStore.getState();
    expect(finalState.status).toBe('completed');
    expect(finalState.timeRemaining).toBe(0);
    expect(finalState.totalScore).toBe(initialPoints);
    expect(finalState.showResultsModal).toBe(true);
    expect(finalState.isNewRecord).toBe(true);
    expect(finalState.bestScore).toBe(initialPoints);
  });

  it('handles failDrift on crash', () => {
    useGymkhanaStore.getState().startBlitz();
    useGymkhanaStore.getState().tickBlitz(1.0, 60, 0.5, true);

    expect(useGymkhanaStore.getState().currentDriftScore).toBeGreaterThan(0);

    useGymkhanaStore.getState().failDrift();

    expect(useGymkhanaStore.getState().currentDriftScore).toBe(0);
    expect(useGymkhanaStore.getState().multiplier).toBe(1);
  });
});
