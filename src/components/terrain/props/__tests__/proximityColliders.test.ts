import { describe, it, expect } from 'vitest';
import { Matrix4 } from 'three';
import {
  createEmptyCollidersState,
  resetCollidersState,
  cloneCollidersState,
  hasPropListChanged,
  hasCollidersStateChanged,
  queryNearbyProps,
  type ActiveCollidersState,
} from '../ProximityColliders';
import type { PropItem } from '../types';

function createMockProp(id: string, type: PropItem['type'], x: number, z: number): PropItem {
  return {
    id,
    type,
    position: [x, 0, z],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    matrix: new Matrix4(),
  };
}

describe('ProximityColliders core logic & memory safety', () => {
  it('resetCollidersState empties all 18 prop categories including shipping containers and drift pylons', () => {
    const state = createEmptyCollidersState();

    state.trees.push(createMockProp('t1', 'tree_pine', 0, 0));
    state.rocks.push(createMockProp('r1', 'rock_granite', 0, 0));
    state.cabins.push(createMockProp('c1', 'cabin', 0, 0));
    state.fences.push(createMockProp('f1', 'fence', 0, 0));
    state.castleTowers.push(createMockProp('ct1', 'castle_tower', 0, 0));
    state.castleWalls.push(createMockProp('cw1', 'castle_wall', 0, 0));
    state.castleGates.push(createMockProp('cg1', 'castle_gate', 0, 0));
    state.castleKeeps.push(createMockProp('ck1', 'castle_keep', 0, 0));
    state.castleArches.push(createMockProp('ca1', 'castle_arch', 0, 0));
    state.stoneWalls.push(createMockProp('sw1', 'stone_wall', 0, 0));
    state.standingStones.push(createMockProp('ss1', 'standing_stone', 0, 0));
    state.highlandCottages.push(createMockProp('hc1', 'highland_cottage', 0, 0));
    state.stoneCairns.push(createMockProp('sc1', 'stone_cairn', 0, 0));
    state.hayBales.push(createMockProp('hb1', 'hay_bale', 0, 0));
    state.rallySigns.push(createMockProp('rs1', 'rally_sign', 0, 0));
    state.stoneBridges.push(createMockProp('sb1', 'stone_bridge', 0, 0));
    state.shippingContainers.push(createMockProp('cont1', 'shipping_container', 0, 0));
    state.driftPylons.push(createMockProp('pylon1', 'drift_pylon', 0, 0));

    expect(state.shippingContainers.length).toBe(1);
    expect(state.driftPylons.length).toBe(1);

    resetCollidersState(state);

    expect(state.trees.length).toBe(0);
    expect(state.rocks.length).toBe(0);
    expect(state.cabins.length).toBe(0);
    expect(state.fences.length).toBe(0);
    expect(state.castleTowers.length).toBe(0);
    expect(state.castleWalls.length).toBe(0);
    expect(state.castleGates.length).toBe(0);
    expect(state.castleKeeps.length).toBe(0);
    expect(state.castleArches.length).toBe(0);
    expect(state.stoneWalls.length).toBe(0);
    expect(state.standingStones.length).toBe(0);
    expect(state.highlandCottages.length).toBe(0);
    expect(state.stoneCairns.length).toBe(0);
    expect(state.hayBales.length).toBe(0);
    expect(state.rallySigns.length).toBe(0);
    expect(state.stoneBridges.length).toBe(0);
    expect(state.shippingContainers.length).toBe(0);
    expect(state.driftPylons.length).toBe(0);
  });

  it('queryNearbyProps does NOT accumulate duplicate shipping containers or drift pylons over successive queries (prevents memory and physics leak)', () => {
    const grid = new Map<string, PropItem[]>();
    const CELL_SIZE = 50;

    // Place 2 containers and 2 pylons in cell 0_0
    const contA = createMockProp('container_A', 'shipping_container', 10, 10);
    const contB = createMockProp('container_B', 'shipping_container', 20, 20);
    const pylonA = createMockProp('pylon_A', 'drift_pylon', 5, 5);
    const pylonB = createMockProp('pylon_B', 'drift_pylon', -10, -10);

    // Far-away container in cell 4_4 (approx 200m away)
    const contFar = createMockProp('container_Far', 'shipping_container', 200, 200);

    grid.set('0_0', [contA, contB, pylonA, pylonB]);
    const farKey = `${Math.floor(200 / CELL_SIZE)}_${Math.floor(200 / CELL_SIZE)}`;
    grid.set(farKey, [contFar]);

    const scratch = createEmptyCollidersState();
    const queryRadiusSq = 95 * 95;

    // Simulate 20 consecutive movements near the origin
    for (let step = 0; step < 20; step++) {
      const carPos: [number, number, number] = [step * 0.5, 0, step * 0.5];
      queryNearbyProps(grid, carPos, queryRadiusSq, scratch);

      // Must strictly contain exactly 2 containers and 2 pylons, never 40 or 400!
      expect(scratch.shippingContainers.length).toBe(2);
      expect(scratch.driftPylons.length).toBe(2);
      expect(scratch.shippingContainers.map((c) => c.id)).toEqual(['container_A', 'container_B']);
      expect(scratch.driftPylons.map((p) => p.id)).toEqual(['pylon_A', 'pylon_B']);
    }
  });

  it('hasPropListChanged accurately detects changes in prop identity and length', () => {
    const p1 = createMockProp('p1', 'drift_pylon', 0, 0);
    const p2 = createMockProp('p2', 'drift_pylon', 10, 0);
    const p3 = createMockProp('p3', 'drift_pylon', 20, 0);

    expect(hasPropListChanged([p1, p2], [p1, p2])).toBe(false);
    expect(hasPropListChanged([p1, p2], [p1])).toBe(true);
    expect(hasPropListChanged([p1, p2], [p1, p3])).toBe(true);
  });

  it('hasCollidersStateChanged detects shipping container and pylon changes even with 0 trees', () => {
    const stateA: ActiveCollidersState = createEmptyCollidersState();
    const stateB: ActiveCollidersState = createEmptyCollidersState();

    expect(hasCollidersStateChanged(stateA, stateB)).toBe(false);

    stateB.shippingContainers.push(createMockProp('c1', 'shipping_container', 15, 15));
    expect(hasCollidersStateChanged(stateA, stateB)).toBe(true);

    const cloned = cloneCollidersState(stateB);
    expect(hasCollidersStateChanged(stateB, cloned)).toBe(false);

    cloned.driftPylons.push(createMockProp('dp1', 'drift_pylon', 5, 5));
    expect(hasCollidersStateChanged(stateB, cloned)).toBe(true);
  });
});
