import { describe, it, expect } from 'vitest';
import { shouldEnableCanvasShadows } from '@/components/canvas/GameCanvas';
import { canPropsCastShadow } from '@/components/terrain/PropsInstancer';
import { getClampedAnisotropy } from '@/utils/device';

describe('Adversarial Stress Suite M3 Iteration 2 (Challenger 1): Exported Helpers & Predicates', () => {
  // =========================================================================
  // SECTION 1: shouldEnableCanvasShadows PREDICATE STRESS TESTING
  // =========================================================================
  describe('Section 1: shouldEnableCanvasShadows Predicate Stress Testing', () => {
    it('1.1: canonical valid inputs produce expected booleans', () => {
      // shadowsEnabled = true
      expect(shouldEnableCanvasShadows(true, 'low')).toBe(false);
      expect(shouldEnableCanvasShadows(true, 'medium')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'high')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'very_high')).toBe(true);

      // shadowsEnabled = false (always false regardless of quality mode)
      expect(shouldEnableCanvasShadows(false, 'low')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'medium')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'high')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'very_high')).toBe(false);
    });

    it('1.2: boundary, empty, and unknown string inputs with shadowsEnabled=true', () => {
      // Empty string is not 'low', so shadows are enabled if shadowsEnabled is true
      expect(shouldEnableCanvasShadows(true, '')).toBe(true);
      // Unknown / custom quality strings
      expect(shouldEnableCanvasShadows(true, 'ultra')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'extreme')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'custom')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'unknown')).toBe(true);

      // Case variations (strict inequality !== 'low')
      expect(shouldEnableCanvasShadows(true, 'LOW')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'Low')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'lOw')).toBe(true);

      // Whitespace variations
      expect(shouldEnableCanvasShadows(true, ' low')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'low ')).toBe(true);
      expect(shouldEnableCanvasShadows(true, ' low ')).toBe(true);
      expect(shouldEnableCanvasShadows(true, '\tlow\n')).toBe(true);

      // Stringified keywords
      expect(shouldEnableCanvasShadows(true, 'null')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'undefined')).toBe(true);
      expect(shouldEnableCanvasShadows(true, 'false')).toBe(true);
      expect(shouldEnableCanvasShadows(true, '0')).toBe(true);
    });

    it('1.3: boundary, empty, and unknown string inputs with shadowsEnabled=false', () => {
      // With shadowsEnabled=false, must strictly remain false across all strings
      expect(shouldEnableCanvasShadows(false, '')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'ultra')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'extreme')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'LOW')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'invalid')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'null')).toBe(false);
      expect(shouldEnableCanvasShadows(false, 'undefined')).toBe(false);
    });

    it('1.4: nullish and non-standard type inputs', () => {
      // nullish graphicsQuality treated as not 'low'
      expect(shouldEnableCanvasShadows(true, null as unknown as string)).toBe(true);
      expect(shouldEnableCanvasShadows(true, undefined as unknown as string)).toBe(true);

      // nullish shadowsEnabled
      expect(Boolean(shouldEnableCanvasShadows(null as unknown as boolean, 'medium'))).toBe(false);
      expect(Boolean(shouldEnableCanvasShadows(undefined as unknown as boolean, 'medium'))).toBe(false);
      expect(Boolean(shouldEnableCanvasShadows(false, null as unknown as string))).toBe(false);
    });

    it('1.5: randomized fuzz generator confirms invariant: shadowsEnabled=false => always false', () => {
      const sampleTokens = [
        '', ' ', 'a', 'low', 'LOW', 'medium', 'high', 'ultra', '123',
        'null', 'undefined', '!@#$', 'very_high', 'max', 'min', 'auto'
      ];
      for (let i = 0; i < 100; i++) {
        const randStr = sampleTokens[Math.floor(Math.random() * sampleTokens.length)]
          + Math.random().toString(36).substring(2, 5);
        expect(shouldEnableCanvasShadows(false, randStr)).toBe(false);
        if (randStr === 'low') {
          expect(shouldEnableCanvasShadows(true, randStr)).toBe(false);
        } else {
          expect(shouldEnableCanvasShadows(true, randStr)).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // SECTION 2: canPropsCastShadow PREDICATE STRESS TESTING
  // =========================================================================
  describe('Section 2: canPropsCastShadow Predicate Stress Testing', () => {
    it('2.1: canonical valid inputs across mobile and desktop', () => {
      // On mobile: strictly false across all quality levels
      expect(canPropsCastShadow(true, 'low')).toBe(false);
      expect(canPropsCastShadow(true, 'medium')).toBe(false);
      expect(canPropsCastShadow(true, 'high')).toBe(false);
      expect(canPropsCastShadow(true, 'very_high')).toBe(false);

      // On desktop: enabled for non-low, disabled for low
      expect(canPropsCastShadow(false, 'low')).toBe(false);
      expect(canPropsCastShadow(false, 'medium')).toBe(true);
      expect(canPropsCastShadow(false, 'high')).toBe(true);
      expect(canPropsCastShadow(false, 'very_high')).toBe(true);
    });

    it('2.2: mobile invariant holds across boundary, empty, and unknown string inputs', () => {
      // Mobile MUST NEVER cast prop shadows under any quality string
      expect(canPropsCastShadow(true, '')).toBe(false);
      expect(canPropsCastShadow(true, 'ultra')).toBe(false);
      expect(canPropsCastShadow(true, 'extreme')).toBe(false);
      expect(canPropsCastShadow(true, 'LOW')).toBe(false);
      expect(canPropsCastShadow(true, 'invalid_mode')).toBe(false);
      expect(canPropsCastShadow(true, 'null')).toBe(false);
      expect(canPropsCastShadow(true, 'undefined')).toBe(false);
      expect(canPropsCastShadow(true, ' \t\n ')).toBe(false);
    });

    it('2.3: desktop behavior with boundary, empty, and unknown string inputs', () => {
      // On desktop, only exact 'low' disables prop shadows
      expect(canPropsCastShadow(false, '')).toBe(true);
      expect(canPropsCastShadow(false, 'ultra')).toBe(true);
      expect(canPropsCastShadow(false, 'extreme')).toBe(true);
      expect(canPropsCastShadow(false, 'LOW')).toBe(true);
      expect(canPropsCastShadow(false, 'Low')).toBe(true);
      expect(canPropsCastShadow(false, ' low ')).toBe(true);
      expect(canPropsCastShadow(false, 'custom')).toBe(true);
    });

    it('2.4: nullish and non-standard type inputs', () => {
      // Mobile with nullish quality
      expect(canPropsCastShadow(true, null as unknown as string)).toBe(false);
      expect(canPropsCastShadow(true, undefined as unknown as string)).toBe(false);

      // Desktop with nullish quality
      expect(canPropsCastShadow(false, null as unknown as string)).toBe(true);
      expect(canPropsCastShadow(false, undefined as unknown as string)).toBe(true);

      // Non-boolean isMobile coercion
      expect(canPropsCastShadow(null as unknown as boolean, 'medium')).toBe(true); // !null === true
      expect(canPropsCastShadow(undefined as unknown as boolean, 'medium')).toBe(true); // !undefined === true
      expect(canPropsCastShadow(1 as unknown as boolean, 'medium')).toBe(false); // !1 === false
      expect(canPropsCastShadow(0 as unknown as boolean, 'medium')).toBe(true); // !0 === true
    });

    it('2.5: randomized fuzz generator confirms mobile invariant: isMobile=true => strictly false', () => {
      const sampleTokens = [
        '', ' ', 'a', 'low', 'LOW', 'medium', 'high', 'ultra', '123',
        'null', 'undefined', '!@#$', 'very_high', 'max', 'min', 'auto'
      ];
      for (let i = 0; i < 100; i++) {
        const randStr = sampleTokens[Math.floor(Math.random() * sampleTokens.length)]
          + Math.random().toString(36).substring(2, 5);
        expect(canPropsCastShadow(true, randStr)).toBe(false);
        if (randStr === 'low') {
          expect(canPropsCastShadow(false, randStr)).toBe(false);
        } else {
          expect(canPropsCastShadow(false, randStr)).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // SECTION 3: getClampedAnisotropy ADVERSARIAL STRESS TESTING
  // =========================================================================
  describe('Section 3: getClampedAnisotropy Adversarial Stress Testing', () => {
    it('3.1: negative numbers safely return isotropic baseline (1)', () => {
      expect(getClampedAnisotropy(-1, true)).toBe(1);
      expect(getClampedAnisotropy(-1, false)).toBe(1);
      expect(getClampedAnisotropy(-10, true)).toBe(1);
      expect(getClampedAnisotropy(-100, false)).toBe(1);
      expect(getClampedAnisotropy(-1024, true)).toBe(1);
      expect(getClampedAnisotropy(-1e-10, true)).toBe(1);
      expect(getClampedAnisotropy(Number.MIN_SAFE_INTEGER, true)).toBe(1);
      expect(getClampedAnisotropy(Number.MIN_SAFE_INTEGER, false)).toBe(1);
      expect(getClampedAnisotropy(-Number.MAX_VALUE, true)).toBe(1);
    });

    it('3.2: zero and signed zeros safely return isotropic baseline (1)', () => {
      expect(getClampedAnisotropy(0, true)).toBe(1);
      expect(getClampedAnisotropy(0, false)).toBe(1);
      expect(getClampedAnisotropy(+0, true)).toBe(1);
      expect(getClampedAnisotropy(-0, false)).toBe(1);
    });

    it('3.3: IEEE 754 non-finite values (NaN, Infinity, -Infinity) return isotropic baseline (1)', () => {
      // NaN
      expect(getClampedAnisotropy(NaN, true)).toBe(1);
      expect(getClampedAnisotropy(NaN, false)).toBe(1);
      expect(getClampedAnisotropy(Number.NaN, true)).toBe(1);

      // Infinity
      expect(getClampedAnisotropy(Infinity, true)).toBe(1);
      expect(getClampedAnisotropy(Infinity, false)).toBe(1);
      expect(getClampedAnisotropy(Number.POSITIVE_INFINITY, true)).toBe(1);

      // -Infinity
      expect(getClampedAnisotropy(-Infinity, true)).toBe(1);
      expect(getClampedAnisotropy(-Infinity, false)).toBe(1);
      expect(getClampedAnisotropy(Number.NEGATIVE_INFINITY, false)).toBe(1);
    });

    it('3.4: fractional anisotropy values < 1 return 1', () => {
      expect(getClampedAnisotropy(0.00001, true)).toBe(1);
      expect(getClampedAnisotropy(0.00001, false)).toBe(1);
      expect(getClampedAnisotropy(0.5, true)).toBe(1);
      expect(getClampedAnisotropy(0.5, false)).toBe(1);
      expect(getClampedAnisotropy(0.99999, true)).toBe(1);
      expect(getClampedAnisotropy(0.99999, false)).toBe(1);
      expect(getClampedAnisotropy(Number.MIN_VALUE, true)).toBe(1);
      expect(getClampedAnisotropy(Number.MIN_VALUE, false)).toBe(1);
    });

    it('3.5: fractional anisotropy values >= 1 correctly clamp or preserve', () => {
      // Exactly 1
      expect(getClampedAnisotropy(1.0, true)).toBe(1.0);
      expect(getClampedAnisotropy(1.0, false)).toBe(1.0);

      // 1 < val < 2
      expect(getClampedAnisotropy(1.25, true)).toBe(1.25);
      expect(getClampedAnisotropy(1.25, false)).toBe(1.25);
      expect(getClampedAnisotropy(1.5, true)).toBe(1.5);
      expect(getClampedAnisotropy(1.5, false)).toBe(1.5);
      expect(getClampedAnisotropy(1.999, true)).toBe(1.999);
      expect(getClampedAnisotropy(1.999, false)).toBe(1.999);

      // Exactly 2
      expect(getClampedAnisotropy(2.0, true)).toBe(2.0);
      expect(getClampedAnisotropy(2.0, false)).toBe(2.0);

      // val > 2: clamped to 2 on mobile, preserved as float on desktop
      expect(getClampedAnisotropy(2.001, true)).toBe(2.0);
      expect(getClampedAnisotropy(2.001, false)).toBe(2.001);
      expect(getClampedAnisotropy(2.5, true)).toBe(2.0);
      expect(getClampedAnisotropy(2.5, false)).toBe(2.5);
      expect(getClampedAnisotropy(3.7, true)).toBe(2.0);
      expect(getClampedAnisotropy(3.7, false)).toBe(3.7);
      expect(getClampedAnisotropy(7.99, true)).toBe(2.0);
      expect(getClampedAnisotropy(7.99, false)).toBe(7.99);
      expect(getClampedAnisotropy(15.5, true)).toBe(2.0);
      expect(getClampedAnisotropy(15.5, false)).toBe(15.5);
    });

    it('3.6: extreme values (e.g. 1024, MAX_SAFE_INTEGER, MAX_VALUE) clamp to 2 on mobile, preserve on desktop', () => {
      // Standard power-of-two extremes
      expect(getClampedAnisotropy(16, true)).toBe(2);
      expect(getClampedAnisotropy(16, false)).toBe(16);

      expect(getClampedAnisotropy(32, true)).toBe(2);
      expect(getClampedAnisotropy(32, false)).toBe(32);

      expect(getClampedAnisotropy(64, true)).toBe(2);
      expect(getClampedAnisotropy(64, false)).toBe(64);

      expect(getClampedAnisotropy(128, true)).toBe(2);
      expect(getClampedAnisotropy(128, false)).toBe(128);

      expect(getClampedAnisotropy(256, true)).toBe(2);
      expect(getClampedAnisotropy(256, false)).toBe(256);

      expect(getClampedAnisotropy(512, true)).toBe(2);
      expect(getClampedAnisotropy(512, false)).toBe(512);

      // Requested extreme: 1024
      expect(getClampedAnisotropy(1024, true)).toBe(2);
      expect(getClampedAnisotropy(1024, false)).toBe(1024);

      expect(getClampedAnisotropy(65536, true)).toBe(2);
      expect(getClampedAnisotropy(65536, false)).toBe(65536);

      // JavaScript numeric maximums
      expect(getClampedAnisotropy(Number.MAX_SAFE_INTEGER, true)).toBe(2);
      expect(getClampedAnisotropy(Number.MAX_SAFE_INTEGER, false)).toBe(Number.MAX_SAFE_INTEGER);

      expect(getClampedAnisotropy(Number.MAX_VALUE, true)).toBe(2);
      expect(getClampedAnisotropy(Number.MAX_VALUE, false)).toBe(Number.MAX_VALUE);
    });

    it('3.7: nullish, non-numeric, and degenerate inputs safely recover to 1', () => {
      expect(getClampedAnisotropy(null as unknown as number, true)).toBe(1);
      expect(getClampedAnisotropy(undefined as unknown as number, true)).toBe(1);
      expect(getClampedAnisotropy('16' as unknown as number, true)).toBe(1);
      expect(getClampedAnisotropy({} as unknown as number, false)).toBe(1);
      expect(getClampedAnisotropy([] as unknown as number, true)).toBe(1);
    });

    it('3.8: ambient default parameter behavior (isMobile omitted)', () => {
      // Ambient device defaults to isMobileDevice()
      const result16 = getClampedAnisotropy(16);
      expect(result16).toBeGreaterThanOrEqual(1);
      expect(result16).toBeLessThanOrEqual(16);

      // Degenerate inputs with omitted isMobile still safely return 1
      expect(getClampedAnisotropy(-5)).toBe(1);
      expect(getClampedAnisotropy(0)).toBe(1);
      expect(getClampedAnisotropy(NaN)).toBe(1);
      expect(getClampedAnisotropy(Infinity)).toBe(1);
    });
  });
});
