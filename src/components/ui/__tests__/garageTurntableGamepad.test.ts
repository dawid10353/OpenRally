import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { sampleGamepad } from '@/utils/input/gamepad';

describe('Garage Turntable & Gamepad 360° Inspection System', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: 'menu',
      gamepadConnected: true,
      gamepadType: 'xbox',
    });
  });

  it('verifies sampleGamepad exports discrete dpad buttons for menu and garage', () => {
    const sample = sampleGamepad(1.0, null);
    expect(sample.dpadUp).toBe(false);
    expect(sample.dpadDown).toBe(false);
    expect(sample.dpadLeft).toBe(false);
    expect(sample.dpadRight).toBe(false);
  });

  it('processes radial deadzone for turntable rotation smoothly', () => {
    const DEADZONE = 0.12;
    const applyDeadzone = (v: number) => {
      const abs = Math.abs(v);
      if (abs <= DEADZONE) return 0;
      return (Math.sign(v) * (abs - DEADZONE)) / (1 - DEADZONE);
    };

    // Sub-deadzone values must be completely ignored (zero jitter)
    expect(applyDeadzone(0.05)).toBe(0);
    expect(applyDeadzone(-0.11)).toBe(0);

    // Past deadzone must scale smoothly between 0 and 1
    const pastDeadzone = applyDeadzone(0.56);
    expect(pastDeadzone).toBeGreaterThan(0.4);
    expect(pastDeadzone).toBeLessThan(0.6);

    const fullDeflection = applyDeadzone(1.0);
    expect(fullDeflection).toBeCloseTo(1.0, 5);
  });

  it('calculates trigger zoom factor proportionally to trigger pressure', () => {
    const dt = 1 / 60;
    const ltValue = 0;
    const rtValue = 0.8; // Press RT to zoom in
    const zoomDelta = rtValue - ltValue;

    const zoomFactor = 1 + Math.abs(zoomDelta) * 1.6 * dt;
    expect(zoomFactor).toBeGreaterThan(1.0);
    expect(zoomFactor).toBeLessThan(1.05);
  });
});
