import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SnapshotRingBuffer, RING_BUFFER_CAPACITY } from '../snapshotRingBuffer';
import type { EntitySnapshot } from '@/types/network';

function makeSnapshot(time: number, x: number, y: number, z: number): EntitySnapshot {
  return {
    time,
    pos: [x, y, z],
    rot: [0, 0, 0, 1],
    linVel: [10, 0, 0],
    angVel: [0, 0, 0],
    steer: 0.1,
    wheelRots: [1, 1, 1, 1],
    rpm: 3000,
    gear: 2,
    isDrifting: false,
    surface: 'tarmac',
  };
}

describe('SnapshotRingBuffer', () => {
  it('starts empty and reports null sample when no snapshots', () => {
    const buffer = new SnapshotRingBuffer();
    expect(buffer.getCount()).toBe(0);
    expect(buffer.getLatest()).toBeNull();

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();
    expect(buffer.sample(1000, outPos, outRot)).toBeNull();
  });

  it('handles single snapshot sampling cleanly', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 10, 5, 20));

    expect(buffer.getCount()).toBe(1);
    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();
    const sample = buffer.sample(1000, outPos, outRot);

    expect(sample).not.toBeNull();
    expect(outPos.x).toBeCloseTo(10);
    expect(outPos.y).toBeCloseTo(5);
    expect(outPos.z).toBeCloseTo(20);
    expect(sample?.rpm).toBe(3000);
  });

  it('interpolates smoothly between two snapshots', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 0, 0, 0));
    buffer.push(makeSnapshot(1100, 10, 0, 0));

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();

    // Sample exactly in the middle at t = 1050
    const sample = buffer.sample(1050, outPos, outRot);
    expect(sample).not.toBeNull();
    expect(outPos.x).toBeCloseTo(5); // 50% between 0 and 10
  });

  it('extrapolates using linear velocity when sample time exceeds latest snapshot', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 0, 0, 0));
    buffer.push(makeSnapshot(1100, 10, 0, 0)); // linVel is [10, 0, 0]

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();

    // Sample 50ms into future (t = 1150)
    const sample = buffer.sample(1150, outPos, outRot);
    expect(sample).not.toBeNull();
    // Position should advance forward from 10
    expect(outPos.x).toBeGreaterThan(10);
  });

  it('wraps around circular buffer without exceeding capacity or leaking', () => {
    const buffer = new SnapshotRingBuffer();
    for (let i = 0; i < RING_BUFFER_CAPACITY * 3; i++) {
      buffer.push(makeSnapshot(1000 + i * 50, i, 0, 0));
    }

    expect(buffer.getCount()).toBe(RING_BUFFER_CAPACITY);
    const latest = buffer.getLatest();
    expect(latest).not.toBeNull();
    expect(latest?.time).toBe(1000 + (RING_BUFFER_CAPACITY * 3 - 1) * 50);
  });
});
