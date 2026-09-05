import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldAdvanceFrame, startFramePacingLoop } from '../GameCanvas';

describe('Mobile Frame Pacing (60 FPS on 120Hz LTPO)', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  const originalNow = performance.now;

  let rafQueue: Array<{ id: number; callback: (now: number) => void }>;
  let nextRafId: number;
  let currentTime: number;

  beforeEach(() => {
    rafQueue = [];
    nextRafId = 1;
    currentTime = 1000.0;

    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: (now: number) => void) => {
        const id = nextRafId++;
        rafQueue.push({ id, callback });
        return id;
      })
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        rafQueue = rafQueue.filter((item) => item.id !== id);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
    performance.now = originalNow;
  });

  describe('shouldAdvanceFrame pacing predicate', () => {
    it('rejects intermediate 120Hz frame ticks (< 15.17ms elapsed)', () => {
      const lastFrameTime = 1000.0;
      // 120Hz tick arrives after 8.333ms
      const tick1Time = lastFrameTime + 8.333;
      expect(shouldAdvanceFrame(tick1Time, lastFrameTime, 60, 1.5)).toBe(false);

      // 14ms tick still within 60 FPS frame window
      const tick14Time = lastFrameTime + 14.0;
      expect(shouldAdvanceFrame(tick14Time, lastFrameTime, 60, 1.5)).toBe(false);
    });

    it('approves frame ticks reaching the 16.67ms window with 1.5ms jitter tolerance (>= 15.17ms)', () => {
      const lastFrameTime = 1000.0;
      // Exact threshold boundary: 16.667ms - 1.5ms = 15.167ms
      expect(shouldAdvanceFrame(lastFrameTime + 15.167, lastFrameTime, 60, 1.5)).toBe(true);

      // Nominal 60 FPS interval: 16.667ms
      expect(shouldAdvanceFrame(lastFrameTime + 16.667, lastFrameTime, 60, 1.5)).toBe(true);

      // Slight lag: 18ms
      expect(shouldAdvanceFrame(lastFrameTime + 18.0, lastFrameTime, 60, 1.5)).toBe(true);
    });

    it('paces a continuous 120Hz tick stream to exactly 60 FPS over 1,000ms', () => {
      const dt120Hz = 1000 / 120; // 8.333ms per tick
      let lastRenderedTime = 0;
      let renderedFrames = 0;

      for (let i = 1; i <= 120; i++) {
        const now = i * dt120Hz;
        if (shouldAdvanceFrame(now, lastRenderedTime, 60, 1.5)) {
          renderedFrames++;
          lastRenderedTime = now;
        }
      }

      // Exactly 60 frames rendered out of 120 ticks (50% GPU load reduction)
      expect(renderedFrames).toBe(60);
    });

    it('preserves 100% throughput on a native 60Hz tick stream over 1,000ms', () => {
      const dt60Hz = 1000 / 60; // 16.667ms per tick
      let lastRenderedTime = 0;
      let renderedFrames = 0;

      for (let i = 1; i <= 60; i++) {
        const now = i * dt60Hz;
        if (shouldAdvanceFrame(now, lastRenderedTime, 60, 1.5)) {
          renderedFrames++;
          lastRenderedTime = now;
        }
      }

      // All 60 frames render without dropping any frame
      expect(renderedFrames).toBe(60);
    });

    it('handles variable or high-refresh rates (144Hz) cleanly', () => {
      const dt144Hz = 1000 / 144; // ~6.944ms
      let lastRenderedTime = 0;
      let renderedFrames = 0;

      for (let i = 1; i <= 144; i++) {
        const now = i * dt144Hz;
        if (shouldAdvanceFrame(now, lastRenderedTime, 60, 1.5)) {
          renderedFrames++;
          lastRenderedTime = now;
        }
      }

      // At 144Hz (6.94ms tick), ticks fire at 6.94ms, 13.89ms (skipped), and 20.83ms (fired),
      // yielding exactly 144 / 3 = 48 frames without jitter or missed cadence
      expect(renderedFrames).toBe(48);
    });

    it('paces ticks to 30 FPS when targetFps is set to 30', () => {
      const dt60Hz = 1000 / 60; // 16.667ms per tick
      let lastRenderedTime = 0;
      let renderedFrames = 0;

      for (let i = 1; i <= 60; i++) {
        const now = i * dt60Hz;
        if (shouldAdvanceFrame(now, lastRenderedTime, 30, 1.5)) {
          renderedFrames++;
          lastRenderedTime = now;
        }
      }

      // Exactly 30 frames rendered out of 60 ticks (50% power savings on battery saver)
      expect(renderedFrames).toBe(30);
    });

    it('paces ticks to 120 FPS when targetFps is set to 120 on high refresh screens', () => {
      const dt120Hz = 1000 / 120; // 8.333ms per tick
      let lastRenderedTime = 0;
      let renderedFrames = 0;

      for (let i = 1; i <= 120; i++) {
        const now = i * dt120Hz;
        if (shouldAdvanceFrame(now, lastRenderedTime, 120, 1.5)) {
          renderedFrames++;
          lastRenderedTime = now;
        }
      }

      // All 120 frames rendered
      expect(renderedFrames).toBe(120);
    });
  });

  describe('startFramePacingLoop execution', () => {
    it('advances initial frame immediately on startup with timestamp in seconds', () => {
      const advanceSpy = vi.fn();
      currentTime = 2000.0;

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        targetFps: 60,
        enabled: true,
      });

      // Initial frame advance
      expect(advanceSpy).toHaveBeenCalledTimes(1);
      expect(advanceSpy).toHaveBeenCalledWith(2.0); // 2000ms / 1000 = 2.0s

      stop();
    });

    it('paces 120Hz rAF ticks to 60 FPS render invocations', () => {
      const advanceSpy = vi.fn();
      currentTime = 1000.0;

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        targetFps: 60,
        enabled: true,
      });

      expect(advanceSpy).toHaveBeenCalledTimes(1); // initial frame
      expect(rafQueue.length).toBe(1);

      // Tick 1 at +8.33ms (120Hz intermediate vsync) -> should NOT advance
      currentTime = 1008.33;
      const callback1 = rafQueue.shift()!.callback;
      callback1(currentTime);

      expect(advanceSpy).toHaveBeenCalledTimes(1);
      expect(rafQueue.length).toBe(1); // next rAF queued

      // Tick 2 at +16.67ms (60Hz presentation vsync) -> should advance
      currentTime = 1016.67;
      const callback2 = rafQueue.shift()!.callback;
      callback2(currentTime);

      expect(advanceSpy).toHaveBeenCalledTimes(2);
      expect(advanceSpy).toHaveBeenLastCalledWith(1016.67 / 1000);

      // Tick 3 at +25.00ms (120Hz intermediate vsync) -> should NOT advance
      currentTime = 1025.0;
      const callback3 = rafQueue.shift()!.callback;
      callback3(currentTime);

      expect(advanceSpy).toHaveBeenCalledTimes(2);

      // Tick 4 at +33.34ms (60Hz presentation vsync) -> should advance
      currentTime = 1033.34;
      const callback4 = rafQueue.shift()!.callback;
      callback4(currentTime);

      expect(advanceSpy).toHaveBeenCalledTimes(3);
      expect(advanceSpy).toHaveBeenLastCalledWith(1033.34 / 1000);

      stop();
    });

    it('cancels the animation frame when cleanup function is invoked', () => {
      const advanceSpy = vi.fn();
      const cancelSpy = vi.mocked(globalThis.cancelAnimationFrame);

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        targetFps: 60,
        enabled: true,
      });

      expect(rafQueue.length).toBe(1);
      const pendingId = rafQueue[0].id;

      stop();
      expect(cancelSpy).toHaveBeenCalledWith(pendingId);
      expect(rafQueue.length).toBe(0);
    });

    it('does nothing and schedules no frames when enabled is false', () => {
      const advanceSpy = vi.fn();
      const rafSpy = vi.mocked(globalThis.requestAnimationFrame);

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        targetFps: 60,
        enabled: false,
      });

      expect(advanceSpy).not.toHaveBeenCalled();
      expect(rafSpy).not.toHaveBeenCalled();
      expect(rafQueue.length).toBe(0);

      expect(() => stop()).not.toThrow();
    });

    it('prevents clock delta explosion when resuming after tab backgrounding (> 200ms hiatus)', () => {
      const advanceSpy = vi.fn();
      const clockMock = { elapsedTime: 1.0 };
      currentTime = 1000.0;

      const stop = startFramePacingLoop({
        advance: advanceSpy,
        clock: clockMock,
        targetFps: 60,
        enabled: true,
      });

      // Advance initial frame
      expect(advanceSpy).toHaveBeenCalledTimes(1);

      // Simulate 5,000ms hiatus (user switched apps or tabs on mobile)
      currentTime = 6000.0;
      const resumeCallback = rafQueue.shift()!.callback;
      resumeCallback(currentTime);

      // Frame should advance
      expect(advanceSpy).toHaveBeenCalledTimes(2);
      expect(advanceSpy).toHaveBeenLastCalledWith(6.0); // 6000ms / 1000

      // Clock elapsedTime should be adjusted so delta = (now - interval) / 1000
      // interval = 1000 / 60 = 16.667ms -> adjusted time = (6000 - 16.667) / 1000 = ~5.9833s
      // preventing a 5-second physics explosion!
      const expectedAdjustedTime = (6000 - 1000 / 60) / 1000;
      expect(clockMock.elapsedTime).toBeCloseTo(expectedAdjustedTime, 4);

      stop();
    });
  });
});
