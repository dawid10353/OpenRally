/**
 * In-memory cache for decoded AudioBuffer instances.
 * Prevents redundant fetch and decodeAudioData calls when switching vehicles or restarting levels.
 */
const audioBufferCache = new Map<string, Promise<AudioBuffer>>();

/**
 * Loads and decodes an audio file into an AudioBuffer with promise-based memoization.
 * 
 * @param url - Path or URL to the audio file
 * @param ctx - AudioContext instance used for decoding
 * @returns Promise resolving to the decoded AudioBuffer
 */
export async function getOrLoadAudioBuffer(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  const cached = audioBufferCache.get(url);
  if (cached) {
    return cached;
  }

  const loadPromise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file from ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  })();

  audioBufferCache.set(url, loadPromise);

  // If the load fails, delete from cache so subsequent attempts can retry
  loadPromise.catch(() => {
    audioBufferCache.delete(url);
  });

  return loadPromise;
}

/**
 * Clears the audio buffer cache (useful for tests or low-memory conditions).
 */
export function clearAudioBufferCache(): void {
  audioBufferCache.clear();
}
