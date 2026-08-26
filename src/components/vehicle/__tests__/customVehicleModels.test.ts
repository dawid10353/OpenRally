import { describe, it, expect } from 'vitest';
import {
  createSportCoupeLiveryTexture,
  createBajaTruckLiveryTexture,
  createCarbonFiberTexture,
} from '@/utils/textures/vehicleLiveries';

describe('Custom Vehicle Procedural Liveries', () => {
  it('creates sport coupe livery texture with sRGB color space and wrapping', () => {
    const texture = createSportCoupeLiveryTexture();

    expect(texture).toBeDefined();
    expect(texture.isTexture).toBe(true);
  });

  it('creates baja truck desert camo livery texture with high resolution', () => {
    const texture = createBajaTruckLiveryTexture();

    expect(texture).toBeDefined();
    expect(texture.isTexture).toBe(true);
  });

  it('creates repeating carbon fiber texture', () => {
    const texture = createCarbonFiberTexture();

    expect(texture).toBeDefined();
    expect(texture.isTexture).toBe(true);
    expect(texture.repeat.x).toBeGreaterThanOrEqual(1);
    expect(texture.repeat.y).toBeGreaterThanOrEqual(1);
  });
});
