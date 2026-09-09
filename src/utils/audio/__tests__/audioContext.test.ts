import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getSharedAudioContext,
  unlockSharedAudioContext,
  suspendSharedAudioContext,
  resetSharedAudioContextForTests,
} from '../audioContext';

interface MockAudioContext {
  state: AudioContextState;
  resume: ReturnType<typeof vi.fn>;
  suspend: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

describe('Shared Web Audio Context (audioContext.ts)', () => {
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    mockAudioContext = {
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    resetSharedAudioContextForTests(null);
  });

  afterEach(() => {
    resetSharedAudioContextForTests(null);
    vi.restoreAllMocks();
  });

  it('instantiates and returns a single shared AudioContext instance', () => {
    resetSharedAudioContextForTests(mockAudioContext as unknown as AudioContext);
    const ctx1 = getSharedAudioContext();
    const ctx2 = getSharedAudioContext();
    expect(ctx1).toBe(mockAudioContext);
    expect(ctx2).toBe(mockAudioContext);
    expect(ctx1).toBe(ctx2);
  });

  it('unlockSharedAudioContext calls resume on suspended context', async () => {
    resetSharedAudioContextForTests(mockAudioContext as unknown as AudioContext);
    await unlockSharedAudioContext();
    expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
  });

  it('suspendSharedAudioContext suspends context when running', async () => {
    mockAudioContext.state = 'running';
    resetSharedAudioContextForTests(mockAudioContext as unknown as AudioContext);
    await suspendSharedAudioContext();
    expect(mockAudioContext.suspend).toHaveBeenCalledTimes(1);
  });

  it('does not suspend when context is not running', async () => {
    mockAudioContext.state = 'suspended';
    resetSharedAudioContextForTests(mockAudioContext as unknown as AudioContext);
    await suspendSharedAudioContext();
    expect(mockAudioContext.suspend).not.toHaveBeenCalled();
  });
});
