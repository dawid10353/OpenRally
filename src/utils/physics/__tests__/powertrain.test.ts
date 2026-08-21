import { describe, it, expect } from 'vitest';
import { updateGearbox, calculateRPM } from '../powertrain';

describe('powertrain physics', () => {
  const baseInput = {
    throttle: 0,
    brake: 0,
    reset: false,
    steering: 0,
    handbrake: false,
  };

  describe('updateGearbox', () => {
    it('selects reverse gear (-1) when braking at low or negative speed', () => {
      const gear = updateGearbox(0, 0, { ...baseInput, brake: 1 }, 1);
      expect(gear).toBe(-1);
    });

    it('stays in forward gear when braking at high forward speed', () => {
      const gear = updateGearbox(60, 16.6, { ...baseInput, brake: 1 }, 2);
      expect(gear).toBe(2);
    });

    it('defaults to 1st gear when stationary with no input', () => {
      const gear = updateGearbox(0.5, 0, baseInput, -1);
      expect(gear).toBe(1);
    });

    it('shifts up as speed exceeds gear thresholds', () => {
      let gear = 1;
      // 1st to 2nd (threshold: 40 km/h)
      gear = updateGearbox(45, 12.5, { ...baseInput, throttle: 1 }, gear);
      expect(gear).toBe(2);

      // 2nd to 3rd (threshold: 80 km/h)
      gear = updateGearbox(85, 23.6, { ...baseInput, throttle: 1 }, gear);
      expect(gear).toBe(3);

      // 3rd to 4th (threshold: 130 km/h)
      gear = updateGearbox(135, 37.5, { ...baseInput, throttle: 1 }, gear);
      expect(gear).toBe(4);

      // 4th to 5th (threshold: 180 km/h)
      gear = updateGearbox(185, 51.4, { ...baseInput, throttle: 1 }, gear);
      expect(gear).toBe(5);
    });

    it('shifts down as speed drops below gear downshift thresholds', () => {
      let gear = 5;
      // 5th to 4th (threshold: 170 km/h)
      gear = updateGearbox(160, 44.4, baseInput, gear);
      expect(gear).toBe(4);

      // 4th to 3rd (threshold: 120 km/h)
      gear = updateGearbox(110, 30.5, baseInput, gear);
      expect(gear).toBe(3);
    });
  });

  describe('calculateRPM', () => {
    it('returns idle RPM when vehicle is stationary with no throttle', () => {
      const rpm = calculateRPM(0, 1, baseInput);
      expect(rpm).toBeGreaterThanOrEqual(800);
      expect(rpm).toBeLessThan(1200);
    });

    it('blips RPM when throttle is pressed from standstill', () => {
      const rpm = calculateRPM(0, 1, { ...baseInput, throttle: 1 });
      expect(rpm).toBeGreaterThan(2000);
    });

    it('clamps RPM within realistic limits (800 - 8000 RPM)', () => {
      const highRpm = calculateRPM(300, 5, { ...baseInput, throttle: 1 });
      expect(highRpm).toBeLessThanOrEqual(8000);

      const lowRpm = calculateRPM(0, 1, baseInput);
      expect(lowRpm).toBeGreaterThanOrEqual(800);
    });

    it('calculates RPM for reverse gear appropriately', () => {
      const reverseRpm = calculateRPM(20, -1, { ...baseInput, brake: 1 });
      expect(reverseRpm).toBeGreaterThan(1500);
      expect(reverseRpm).toBeLessThanOrEqual(8000);
    });
  });
});
