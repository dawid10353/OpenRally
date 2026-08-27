import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRacingStore } from '../racingStore';

describe('racingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useRacingStore.setState({
      raceStatus: 'idle',
      currentCheckpoint: 0,
      totalCheckpoints: 4,
      currentLapTime: 0,
      bestLapTime: null,
      lastLapTime: null,
      splitDelta: null,
      lapCount: 0,
      showStageComplete: false,
      countdown: null,
      countdownTimer: 0,
    });
  });

  it('starts countdown when crossing checkpoint 0 from idle', () => {
    useRacingStore.getState().passCheckpoint(0);

    const state = useRacingStore.getState();
    expect(state.raceStatus).toBe('countdown');
    expect(state.countdown).toBe(3);
    expect(state.currentCheckpoint).toBe(1);
    expect(state.currentLapTime).toBe(0);
  });

  it('progresses through 3 -> 2 -> 1 -> START sequence and transitions to racing', () => {
    useRacingStore.getState().startCountdown();

    expect(useRacingStore.getState().raceStatus).toBe('countdown');
    expect(useRacingStore.getState().countdown).toBe(3);

    // Tick to 1.1s (count = 2)
    useRacingStore.getState().tickCountdown(1.1);
    expect(useRacingStore.getState().countdown).toBe(2);
    expect(useRacingStore.getState().raceStatus).toBe('countdown');

    // Tick to 2.1s (count = 1)
    useRacingStore.getState().tickCountdown(1.0);
    expect(useRacingStore.getState().countdown).toBe(1);
    expect(useRacingStore.getState().raceStatus).toBe('countdown');

    // Tick to 3.1s (count = 0 / START!)
    useRacingStore.getState().tickCountdown(1.0);
    expect(useRacingStore.getState().countdown).toBe(0);
    expect(useRacingStore.getState().raceStatus).toBe('racing');
    expect(useRacingStore.getState().currentLapTime).toBeCloseTo(0.1, 1);

    // Tick past 4.0s (countdown badge fades out)
    useRacingStore.getState().tickCountdown(1.0);
    expect(useRacingStore.getState().countdown).toBeNull();
    expect(useRacingStore.getState().raceStatus).toBe('racing');
  });

  it('progresses through checkpoints sequentially while racing', () => {
    useRacingStore.getState().startRace();

    // Passing wrong checkpoint shouldn't advance
    useRacingStore.getState().passCheckpoint(2);
    expect(useRacingStore.getState().currentCheckpoint).toBe(1);

    // Passing correct checkpoint advances
    useRacingStore.getState().passCheckpoint(1);
    expect(useRacingStore.getState().currentCheckpoint).toBe(2);

    useRacingStore.getState().passCheckpoint(2);
    expect(useRacingStore.getState().currentCheckpoint).toBe(3);

    // Passing checkpoint 3 targets checkpoint 0 (Start/Finish line)
    useRacingStore.getState().passCheckpoint(3);
    expect(useRacingStore.getState().currentCheckpoint).toBe(0);
  });

  it('completes lap when passing Start/Finish line (checkpoint 0) after full circuit', () => {
    useRacingStore.getState().startRace();
    useRacingStore.getState().updateTimer(25.5);

    useRacingStore.getState().passCheckpoint(1);
    useRacingStore.getState().passCheckpoint(2);
    useRacingStore.getState().passCheckpoint(3);

    expect(useRacingStore.getState().currentCheckpoint).toBe(0);

    // Crossing Checkpoint 0 (Start/Finish Gantry) completes the lap
    useRacingStore.getState().passCheckpoint(0);

    const state = useRacingStore.getState();
    expect(state.raceStatus).toBe('racing');
    expect(state.currentCheckpoint).toBe(1);
    expect(state.currentLapTime).toBe(0);
    expect(state.lastLapTime).toBeCloseTo(25.5);
    expect(state.bestLapTime).toBeCloseTo(25.5);
    expect(state.lapCount).toBe(1);
  });

  it('resets race properly', () => {
    useRacingStore.getState().startCountdown();
    useRacingStore.getState().tickCountdown(1.0);
    useRacingStore.getState().resetRace();

    const state = useRacingStore.getState();
    expect(state.raceStatus).toBe('idle');
    expect(state.currentCheckpoint).toBe(0);
    expect(state.currentLapTime).toBe(0);
    expect(state.countdown).toBeNull();
    expect(state.countdownTimer).toBe(0);
  });

  it('stores and retrieves track records per level ID', () => {
    useRacingStore.setState({
      bestLapTimes: { level1: 42.5, desert_canyon: 58.2 },
    });

    expect(useRacingStore.getState().getBestLapForLevel('level1')).toBe(42.5);
    expect(useRacingStore.getState().getBestLapForLevel('desert_canyon')).toBe(58.2);
    expect(useRacingStore.getState().getBestLapForLevel('non_existent')).toBeNull();

    useRacingStore.getState().syncBestLapForLevel('desert_canyon');
    expect(useRacingStore.getState().bestLapTime).toBe(58.2);
  });
});
