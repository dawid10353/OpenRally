import { describe, it, expect } from 'vitest';
import {
  SURFACE_REGISTRY,
  getSurfaceDefinition,
  getAllSurfaces,
} from '@/config/surfaceRegistry';
import { validateSurfaceDefinition } from '@/utils/validation/surfaceValidator';

describe('Surface Registry', () => {
  it('contains all required surface types', () => {
    const requiredSurfaces = ['tarmac', 'mud', 'grass', 'sand', 'snow', 'gravel'] as const;
    for (const s of requiredSurfaces) {
      expect(SURFACE_REGISTRY[s]).toBeDefined();
    }
  });

  it('validates every surface definition correctly', () => {
    const surfaces = getAllSurfaces();
    expect(surfaces.length).toBeGreaterThanOrEqual(6);

    for (const surface of surfaces) {
      const validation = validateSurfaceDefinition(surface);
      expect(validation.valid, `Surface ${surface.id} failed validation: ${validation.errors.join(', ')}`).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it('falls back to grass when requesting unknown surface', () => {
    // @ts-expect-error test unknown fallback
    const fallback = getSurfaceDefinition('unknown_surface');
    expect(fallback.id).toBe('grass');
  });
});
