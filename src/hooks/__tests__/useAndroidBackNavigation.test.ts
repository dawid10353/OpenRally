import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleAndroidBackNavigation } from '../useAndroidBackNavigation';
import { useGameStore } from '@/store/gameStore';
import { onGameEvent } from '@/utils/events';

describe('useAndroidBackNavigation (Hardware Back Button & Gesture)', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: 'playing' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pauses active gameplay when back button is pressed during driving', () => {
    expect(useGameStore.getState().gameState).toBe('playing');
    handleAndroidBackNavigation();
    expect(useGameStore.getState().gameState).toBe('paused');
  });

  it('emits android_back_pressed game event when in menu or paused', () => {
    useGameStore.setState({ gameState: 'paused' });
    const listenerMock = vi.fn();
    const unsub = onGameEvent('android_back_pressed', listenerMock);

    handleAndroidBackNavigation();

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().gameState).toBe('paused');
    unsub();
  });

  it('emits android_back_pressed game event when in title or menu state', () => {
    useGameStore.setState({ gameState: 'menu' });
    const listenerMock = vi.fn();
    const unsub = onGameEvent('android_back_pressed', listenerMock);

    handleAndroidBackNavigation();

    expect(listenerMock).toHaveBeenCalledTimes(1);
    unsub();
  });
});
