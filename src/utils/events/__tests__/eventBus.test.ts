import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  emitGameEvent,
  onGameEvent,
  clearAllGameEventListeners,
} from '@/utils/events';

describe('Game EventBus', () => {
  beforeEach(() => {
    clearAllGameEventListeners();
  });

  it('receives emitted events with typed payload', () => {
    const listener = vi.fn();
    const unsub = onGameEvent('lap_completed', listener);

    emitGameEvent('lap_completed', {
      lap: 1,
      lapTime: 45.123,
      isBest: true,
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      lap: 1,
      lapTime: 45.123,
      isBest: true,
    });

    unsub();

    emitGameEvent('lap_completed', {
      lap: 2,
      lapTime: 46.5,
      isBest: false,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handles multiple listeners cleanly', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    onGameEvent('checkpoint_passed', fn1);
    onGameEvent('checkpoint_passed', fn2);

    emitGameEvent('checkpoint_passed', {
      checkpointIndex: 2,
      totalCheckpoints: 8,
    });

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('does not crash if a listener throws', () => {
    const errorFn = vi.fn(() => {
      throw new Error('Listener explosion');
    });
    const goodFn = vi.fn();

    onGameEvent('surface_changed', errorFn);
    onGameEvent('surface_changed', goodFn);

    expect(() => {
      emitGameEvent('surface_changed', { from: 'tarmac', to: 'mud' });
    }).not.toThrow();

    expect(errorFn).toHaveBeenCalledTimes(1);
    expect(goodFn).toHaveBeenCalledTimes(1);
  });
});
