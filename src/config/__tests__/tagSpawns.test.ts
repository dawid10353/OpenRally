import { describe, it, expect } from 'vitest';
import { LEVEL1_DATA } from '../levels/islandCircuit';
import { LEVEL2_DESERT_DATA } from '../levels/desertCanyon';
import { LEVEL3_SWEDEN_DATA } from '../levels/swedenSnow';
import { LEVEL4_BRITAIN_DATA } from '../levels/highlandCastle';
import { LEVEL5_GYMKHANA_DATA } from '../levels/gymkhanaIsland';
import { TAG_LEVEL_SPAWNS } from '../tagSpawns';

describe('Tag Spawns Verification', () => {
  it('verifies 12 safe points for all 5 levels without prop collisions', () => {
    const levels = [
      { id: 'level1_island', data: LEVEL1_DATA },
      { id: 'level2_desert', data: LEVEL2_DESERT_DATA },
      { id: 'level3_sweden', data: LEVEL3_SWEDEN_DATA },
      { id: 'level4_britain', data: LEVEL4_BRITAIN_DATA },
      { id: 'level5_gymkhana', data: LEVEL5_GYMKHANA_DATA },
    ];

    for (const lvl of levels) {
      const spawns = TAG_LEVEL_SPAWNS[lvl.id];
      expect(spawns).toBeDefined();
      expect(spawns).toHaveLength(12);

      // Verify no spawn is colliding with any prop (< 3.0m)
      for (const sp of spawns) {
        expect(sp.position).toHaveLength(3);
        expect(Number.isFinite(sp.position[0])).toBe(true);
        expect(Number.isFinite(sp.position[1])).toBe(true);
        expect(Number.isFinite(sp.position[2])).toBe(true);
        expect(Number.isFinite(sp.rotationY)).toBe(true);

        for (const prop of lvl.data.props) {
          const dx = sp.position[0] - prop.position[0];
          const dz = sp.position[2] - prop.position[2];
          const dist = Math.hypot(dx, dz);
          expect(dist).toBeGreaterThan(3.0);
        }
      }
    }
  });
});
