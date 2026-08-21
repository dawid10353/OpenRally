import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrLoadAudioBuffer, clearAudioBufferCache } from '../audioCache';

describe('audioCache', () => {
  beforeEach(() => {
    clearAudioBufferCache();
    vi.restoreAllMocks();
  });

  it('fetches, decodes and caches AudioBuffer', async () => {
    const fakeBuffer = {} as AudioBuffer;
    const fakeArrayBuffer = new ArrayBuffer(8);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeArrayBuffer),
    });

    const fakeCtx = {
      decodeAudioData: vi.fn().mockResolvedValue(fakeBuffer),
    } as unknown as AudioContext;

    const res1 = await getOrLoadAudioBuffer('/sounds/test.mp3', fakeCtx);
    expect(res1).toBe(fakeBuffer);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(fakeCtx.decodeAudioData).toHaveBeenCalledTimes(1);

    // Second call should return cached instance without fetch
    const res2 = await getOrLoadAudioBuffer('/sounds/test.mp3', fakeCtx);
    expect(res2).toBe(fakeBuffer);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(fakeCtx.decodeAudioData).toHaveBeenCalledTimes(1);
  });

  it('removes from cache on fetch failure so retry is possible', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const fakeCtx = {
      decodeAudioData: vi.fn(),
    } as unknown as AudioContext;

    await expect(getOrLoadAudioBuffer('/sounds/nonexistent.mp3', fakeCtx)).rejects.toThrow('Failed to fetch audio');

    // Next attempt should call fetch again
    const fakeBuffer = {} as AudioBuffer;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    (fakeCtx.decodeAudioData as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(fakeBuffer);

    const res = await getOrLoadAudioBuffer('/sounds/nonexistent.mp3', fakeCtx);
    expect(res).toBe(fakeBuffer);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
