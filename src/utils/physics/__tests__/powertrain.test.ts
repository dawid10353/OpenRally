import { describe, it, expect } from 'vitest';
import { updateGearbox, calculateRPM, IDLE_RPM, MAX_RPM } from '../powertrain';

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

    it('locks gear when airborne regardless of speed changes', () => {
      // Car in 3rd gear jumping at high or low speed should maintain 3rd gear
      expect(updateGearbox(200, 55, { ...baseInput, throttle: 1 }, 3, true)).toBe(3);
      expect(updateGearbox(20, 5, baseInput, 3, true)).toBe(3);
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
      expect(highRpm).toBeLessThanOrEqual(MAX_RPM);

      const lowRpm = calculateRPM(0, 1, baseInput);
      expect(lowRpm).toBeGreaterThanOrEqual(800);
    });

    it('calculates RPM for reverse gear appropriately', () => {
      const reverseRpm = calculateRPM(20, -1, { ...baseInput, brake: 1 });
      expect(reverseRpm).toBeGreaterThan(1500);
      expect(reverseRpm).toBeLessThanOrEqual(MAX_RPM);
    });

    describe('airborne dynamics', () => {
      it('revs up to redline when airborne with throttle pressed', () => {
        // Airborne in 2nd gear at 40 km/h with 100% throttle
        const airborneRpm = calculateRPM(40, 2, { ...baseInput, throttle: 1 }, { isAirborne: true });
        expect(airborneRpm).toBeGreaterThanOrEqual(7500);
        expect(airborneRpm).toBeLessThanOrEqual(MAX_RPM);
      });

      it('drops to idle RPM when airborne with no throttle', () => {
        // Airborne with 0 throttle should decay towards idle
        const airborneIdleRpm = calculateRPM(100, 4, baseInput, { isAirborne: true });
        expect(airborneIdleRpm).toBeGreaterThanOrEqual(800);
        expect(airborneIdleRpm).toBeLessThanOrEqual(1200);
      });

      it('integrates RPM over time smoothly during a jump', () => {
        let currentRpm = IDLE_RPM;
        const dt = 0.016; // ~60fps step

        // Accelerate in air for 15 frames (~0.25s) with full throttle
        for (let i = 0; i < 15; i++) {
          currentRpm = calculateRPM(60, 3, { ...baseInput, throttle: 1 }, {
            currentRpm,
            dt,
            isAirborne: true,
          });
        }

        // RPM should have climbed significantly above grounded gear RPM (60kmh in 3rd gear is ~2000-3000 RPM)
        expect(currentRpm).toBeGreaterThan(4000);

        // Continue holding throttle in air for another 20 frames -> reaches redline
        for (let i = 0; i < 20; i++) {
          currentRpm = calculateRPM(60, 3, { ...baseInput, throttle: 1 }, {
            currentRpm,
            dt,
            isAirborne: true,
          });
        }
        expect(currentRpm).toBeGreaterThanOrEqual(7500);
      });

      it('revs up in reverse when airborne with brake applied', () => {
        const reverseAirRpm = calculateRPM(10, -1, { ...baseInput, brake: 1 }, { isAirborne: true });
        expect(reverseAirRpm).toBeGreaterThanOrEqual(7500);
      });

      it('smoothly pulls down to grounded gear speed upon touchdown', () => {
        let currentRpm = 7900; // was revving at redline in air
        const dt = 0.016;

        // Vehicle touches down at 50 km/h in 3rd gear (normal grounded RPM is ~2500)
        for (let i = 0; i < 30; i++) {
          currentRpm = calculateRPM(50, 3, baseInput, {
            currentRpm,
            dt,
            isAirborne: false,
            groundedRatio: 1.0,
          });
        }

        // RPM should have settled back down to transmission speed (~2500 RPM)
        expect(currentRpm).toBeLessThan(3500);
        expect(currentRpm).toBeGreaterThanOrEqual(800);
      });
    });
  });
});
