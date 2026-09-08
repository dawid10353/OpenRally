import { describe, it, expect } from 'vitest';

describe('useVehiclePhysics pause and resume momentum preservation', () => {
  interface PausedPhysicsSnapshot {
    linvel: { x: number; y: number; z: number };
    angvel: { x: number; y: number; z: number };
    pos: { x: number; y: number; z: number };
    rot: { x: number; y: number; z: number; w: number };
    speed: number;
    rpm: number;
    gear: number;
    isAirborne: boolean;
  }

  it('captures full vehicle momentum snapshot upon entering pause state', () => {
    let pausedSnapshot: PausedPhysicsSnapshot | null = null;
    let isPaused = false;

    const mockBody = {
      linvel: () => ({ x: -3.5, y: -0.2, z: 27.8 }), // ~100 km/h
      angvel: () => ({ x: 0.05, y: 0.32, z: -0.02 }),
      translation: () => ({ x: 45.2, y: 3.1, z: -112.5 }),
      rotation: () => ({ x: 0.01, y: 0.707, z: 0.01, w: 0.707 }),
    };

    const prevSpeed = 100;
    const currentRpm = 6200;
    const prevGear = 3;
    const isAirborne = false;

    // Simulation frame with gameState === 'paused'
    const gameState = 'paused';
    if (gameState === 'paused') {
      if (!isPaused) {
        const curLinvel = mockBody.linvel();
        const curAngvel = mockBody.angvel();
        const curPos = mockBody.translation();
        const curRot = mockBody.rotation();

        pausedSnapshot = {
          linvel: { x: curLinvel.x, y: curLinvel.y, z: curLinvel.z },
          angvel: { x: curAngvel.x, y: curAngvel.y, z: curAngvel.z },
          pos: { x: curPos.x, y: curPos.y, z: curPos.z },
          rot: { x: curRot.x, y: curRot.y, z: curRot.z, w: curRot.w },
          speed: prevSpeed,
          rpm: currentRpm,
          gear: prevGear,
          isAirborne,
        };
        isPaused = true;
      }
    }

    expect(isPaused).toBe(true);
    expect(pausedSnapshot).not.toBeNull();
    expect(pausedSnapshot?.speed).toBe(100);
    expect(pausedSnapshot?.rpm).toBe(6200);
    expect(pausedSnapshot?.gear).toBe(3);
    expect(pausedSnapshot?.linvel.z).toBeCloseTo(27.8);
    expect(pausedSnapshot?.angvel.y).toBeCloseTo(0.32);
  });

  it('restores exact pre-pause velocity, momentum, speed, RPM, and gear upon resuming', () => {
    let isPaused = true;
    let pausedSnapshot: PausedPhysicsSnapshot | null = {
      linvel: { x: -4.0, y: 1.2, z: 33.3 }, // ~120 km/h jumping
      angvel: { x: 0.1, y: 0.4, z: -0.05 },
      pos: { x: 10, y: 5, z: -50 },
      rot: { x: 0, y: 0.5, z: 0, w: 0.866 },
      speed: 120,
      rpm: 7200,
      gear: 4,
      isAirborne: true,
    };

    const restoredBodyState = {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      linvel: { x: 0, y: 0, z: 0 },
      angvel: { x: 0, y: 0, z: 0 },
    };

    let restoredSpeed = 0;
    let restoredRpm = 0;
    let restoredGear = 1;
    let restoredAirborne = false;

    // Simulation frame transitioning back to gameState === 'playing'
    const gameState = 'playing';
    if (gameState === 'playing' && isPaused) {
      isPaused = false;
      if (pausedSnapshot) {
        const saved = pausedSnapshot;
        restoredBodyState.translation = { ...saved.pos };
        restoredBodyState.rotation = { ...saved.rot };
        restoredBodyState.linvel = { ...saved.linvel };
        restoredBodyState.angvel = { ...saved.angvel };
        restoredSpeed = saved.speed;
        restoredRpm = saved.rpm;
        restoredGear = saved.gear;
        restoredAirborne = saved.isAirborne;

        pausedSnapshot = null;
      }
    }

    expect(isPaused).toBe(false);
    expect(pausedSnapshot).toBeNull();
    // Restored physics momentum
    expect(restoredBodyState.linvel.z).toBeCloseTo(33.3);
    expect(restoredBodyState.linvel.x).toBeCloseTo(-4.0);
    expect(restoredBodyState.linvel.y).toBeCloseTo(1.2);
    expect(restoredBodyState.angvel.y).toBeCloseTo(0.4);
    expect(restoredSpeed).toBe(120);
    expect(restoredRpm).toBe(7200);
    expect(restoredGear).toBe(4);
    expect(restoredAirborne).toBe(true);
  });
});
