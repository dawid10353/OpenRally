import { describe, it, expect } from 'vitest';
import { LEVEL1_DATA } from '@/config/level1';
import { LEVEL4_BRITAIN_DATA } from '@/config/levels/highlandCastle';
import { compileTerrain } from '@/utils/terrainCompiler';
import { categorizeProps, usePropsData } from '../usePropsData';

describe('categorizeProps & usePropsData', () => {
  it('correctly categorizes props into structured collections and populates spatialGrid for Island Circuit', () => {
    const heightmapData = compileTerrain(LEVEL1_DATA);
    const result = categorizeProps(heightmapData, LEVEL1_DATA);

    expect(result).toBeDefined();
    expect(result.pineTrees).toBeInstanceOf(Array);
    expect(result.rocks).toBeInstanceOf(Array);
    expect(result.cabins).toBeInstanceOf(Array);
    expect(result.fences).toBeInstanceOf(Array);
    expect(result.spatialGrid).toBeInstanceOf(Map);

    // Verify matrix validity on props
    if (result.pineTrees.length > 0) {
      const tree = result.pineTrees[0];
      expect(tree.matrix).toBeDefined();
      expect(tree.position.length).toBe(3);
      expect(Number.isFinite(tree.position[1])).toBe(true);
    }
  });

  it('correctly categorizes advanced castle, cottage, wall, and bridge props for Highland Castle', () => {
    const heightmapData = compileTerrain(LEVEL4_BRITAIN_DATA);
    const result = categorizeProps(heightmapData, LEVEL4_BRITAIN_DATA);

    expect(result.castleTowers.length).toBeGreaterThan(0);
    expect(result.castleWalls.length).toBeGreaterThan(0);
    expect(result.stoneWalls.length).toBeGreaterThan(0);
    expect(result.highlandCottages.length).toBeGreaterThan(0);
    expect(result.standingStones.length).toBeGreaterThan(0);
    expect(result.stoneBridges.length).toBeGreaterThan(0);

    // Verify multi-point ground snapping for large keep
    if (result.castleKeeps.length > 0) {
      const keep = result.castleKeeps[0];
      expect(Number.isFinite(keep.position[1])).toBe(true);
    }
  });

  it('exports usePropsData hook function', () => {
    expect(typeof usePropsData).toBe('function');
  });
});
