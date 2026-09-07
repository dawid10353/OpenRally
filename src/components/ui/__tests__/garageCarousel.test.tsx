import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getAvailableVehicles, getVehiclePreset } from '@/config/vehicleRegistry';

describe('Garage Vehicle Carousel System', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const garageViewPath = path.join(rootDir, 'src/components/ui/menu/GarageView.tsx');

  it('provides all 7 registered vehicles with unique identifiers', () => {
    const vehicles = getAvailableVehicles();
    expect(vehicles).toHaveLength(7);

    const ids = vehicles.map((v) => v.id);
    expect(ids).toContain('zephyr_wr4');
    expect(ids).toContain('apex_phantom_b');
    expect(ids).toContain('bantam_turbo');
    expect(ids).toContain('vortex_b');
    expect(ids).toContain('vanguard_gt');
    expect(ids).toContain('shadowfire_rs');
    expect(ids).toContain('kodiak_raid');
  });

  it('guarantees extreme performance vehicles have higher speed and force than standard rally car', () => {
    const zephyr = getVehiclePreset('zephyr_wr4');
    const phantom = getVehiclePreset('apex_phantom_b');

    // Phantom B-Spec
    expect(phantom.config.engine.maxSpeed).toBeGreaterThan(zephyr.config.engine.maxSpeed);
    expect(phantom.config.engine.maxForce).toBeGreaterThan(zephyr.config.engine.maxForce);
    expect(phantom.stats.topSpeed).toBeGreaterThan(zephyr.stats.topSpeed);
  });


  it('verifies GarageView carousel navigation buttons satisfy >= 44x44px touch targets', () => {
    const content = fs.readFileSync(garageViewPath, 'utf-8');
    // Carousel navigation buttons
    expect(content).toContain('carouselNavButton');
    expect(content).toMatch(/carouselNavButton:\s*\{[^}]*width:\s*['"]44px['"]/);
    expect(content).toMatch(/carouselNavButton:\s*\{[^}]*height:\s*['"]44px['"]/);
    expect(content).toMatch(/carouselNavButton:\s*\{[^}]*minWidth:\s*['"]44px['"]/);
    expect(content).toMatch(/carouselNavButton:\s*\{[^}]*minHeight:\s*['"]44px['"]/);
  });

  it('verifies horizontal carousel strip has scroll snapping and auto-scroll ref', () => {
    const content = fs.readFileSync(garageViewPath, 'utf-8');
    expect(content).toContain('garage-carousel-strip');
    expect(content).toContain('scrollSnapType');
    expect(content).toContain('activeCardRef');
    expect(content).toContain('scrollIntoView');
  });

  it('simulates cyclical carousel navigation math for all 7 vehicles', () => {
    const vehicles = getAvailableVehicles();
    const count = vehicles.length;
    expect(count).toBe(7);


    let idx = 0;
    // Step through each vehicle
    for (let i = 1; i < count; i++) {
      idx = (idx + 1) % count;
      expect(idx).toBe(i);
      expect(vehicles[idx].id).toBeDefined();
    }

    // Wraparound to first
    idx = (idx + 1) % count;
    expect(idx).toBe(0);
    expect(vehicles[idx].id).toBe(vehicles[0].id);

    // Previous wraparound
    const prevIdx = (0 - 1 + count) % count;
    expect(prevIdx).toBe(count - 1);
    expect(vehicles[prevIdx].id).toBe(vehicles[count - 1].id);
  });
});
