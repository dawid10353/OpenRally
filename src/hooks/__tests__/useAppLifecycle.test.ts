import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleAppBackgrounded } from '../useAppLifecycle';
import { useGameStore } from '@/store/gameStore';
import { getTouchInputState, setTouchInput } from '@/utils/input/touch';
import { activeKeys } from '@/hooks/useInput';

describe('useAppLifecycle (Android Tab & App Backgrounding)', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: 'playing' });
    setTouchInput({ throttle: 1.0, steering: 0.8, brake: 0.5, handbrake: true });
    activeKeys.add('KeyW');
    activeKeys.add('KeyA');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-pauses active gameplay when backgrounded', () => {
    expect(useGameStore.getState().gameState).toBe('playing');
    handleAppBackgrounded();
    expect(useGameStore.getState().gameState).toBe('paused');
  });

  it('does not mutate non-playing game states (e.g. menu, title, loading)', () => {
    useGameStore.setState({ gameState: 'menu' });
    handleAppBackgrounded();
    expect(useGameStore.getState().gameState).toBe('menu');

    useGameStore.setState({ gameState: 'title' });
    handleAppBackgrounded();
    expect(useGameStore.getState().gameState).toBe('title');
  });

  it('resets sticky touch inputs on backgrounded event', () => {
    expect(getTouchInputState().throttle).toBe(1.0);
    expect(getTouchInputState().handbrake).toBe(true);

    handleAppBackgrounded();

    const state = getTouchInputState();
    expect(state.throttle).toBe(0);
    expect(state.steering).toBe(0);
    expect(state.brake).toBe(0);
    expect(state.handbrake).toBe(false);
  });

  it('clears activeKeys on backgrounded event', () => {
    expect(activeKeys.has('KeyW')).toBe(true);
    expect(activeKeys.has('KeyA')).toBe(true);

    handleAppBackgrounded();

    expect(activeKeys.size).toBe(0);
  });

  describe('handleAppForegrounded', () => {
    it('attempts to unlock shared audio context if gameplay was active (playing)', async () => {
      const audioModule = await import('@/utils/audio/audioContext');
      const unlockSpy = vi.spyOn(audioModule, 'unlockSharedAudioContext').mockResolvedValue(undefined);

      useGameStore.setState({ gameState: 'playing' });
      const { handleAppForegrounded } = await import('../useAppLifecycle');
      handleAppForegrounded();

      expect(unlockSpy).toHaveBeenCalled();
    });

    it('does not unlock audio context if gameplay is paused or in menu', async () => {
      const audioModule = await import('@/utils/audio/audioContext');
      const unlockSpy = vi.spyOn(audioModule, 'unlockSharedAudioContext').mockResolvedValue(undefined);

      useGameStore.setState({ gameState: 'paused' });
      const { handleAppForegrounded } = await import('../useAppLifecycle');
      handleAppForegrounded();

      expect(unlockSpy).not.toHaveBeenCalled();
    });
  });
});
