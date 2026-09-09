import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameRoom } from '../GameRoom.js';
import type { WebSocket } from 'ws';

function createMockWebSocket(): WebSocket {
  return {
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

function advanceTimeWithHeartbeat(room: GameRoom, ms: number): void {
  const step = 1000;
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    for (const session of room.players.values()) {
      session.lastSeen = Date.now();
    }
    vi.advanceTimersByTime(step);
  }
}

describe('GameRoom - Gymkhana Blitz Matchmaking, Spectator & Intermission Loop', () => {
  let room: GameRoom;

  beforeEach(() => {
    vi.useFakeTimers();
    room = new GameRoom({
      id: 'test_gymkhana_room',
      name: 'Gymkhana Arena Match',
      hostId: 'host_p1',
      hostNickname: 'DriftKing',
      levelId: 'level5_gymkhana',
      gameMode: 'gymkhana_blitz',
    });
  });

  afterEach(() => {
    room.destroy();
    vi.useRealTimers();
  });

  it('initializes in active phase with 60s round timer for gymkhana blitz', () => {
    expect(room.gameMode).toBe('gymkhana_blitz');
    expect(room.roundPhase).toBe('active');
    expect(room.roundTimer).toBe(60);
  });

  it('allows the first driver to join as an active player without spectating', () => {
    const ws1 = createMockWebSocket();
    const session1 = room.join(ws1, 'Driver1', 'apex_phantom_b');

    expect(session1).not.toBeNull();
    expect(session1?.isSpectator).toBe(false);
    expect(session1?.spectateTargetId).toBeNull();
  });

  it('assigns late joiners as spectators when round has started (< 57s remaining)', () => {
    const ws1 = createMockWebSocket();
    const session1 = room.join(ws1, 'Driver1', 'apex_phantom_b');
    expect(session1?.isSpectator).toBe(false);

    // Advance round by 10 seconds (50s remaining)
    advanceTimeWithHeartbeat(room, 10000);
    expect(room.roundTimer).toBe(50);

    // Second driver joins mid-match
    const ws2 = createMockWebSocket();
    const session2 = room.join(ws2, 'SpectatorDriver', 'zephyr_wr4');

    expect(session2).not.toBeNull();
    expect(session2?.isSpectator).toBe(true);
    expect(session2?.spectateTargetId).toBe(session1?.id);

    // Verify gymkhana_spectate message was sent to the late joiner
    expect(ws2.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"gymkhana_spectate"')
    );
    expect(ws2.send).toHaveBeenCalledWith(
      expect.stringContaining('"isSpectator":true')
    );
  });

  it('reassigns spectator to another active driver if the spectated driver leaves', () => {
    const ws1 = createMockWebSocket();
    const session1 = room.join(ws1, 'Driver1', 'apex_phantom_b');

    const ws2 = createMockWebSocket();
    const session2 = room.join(ws2, 'Driver2', 'vortex_b');

    // Advance round into active match
    advanceTimeWithHeartbeat(room, 10000);

    // Spectator joins
    const ws3 = createMockWebSocket();
    const session3 = room.join(ws3, 'Spectator', 'zephyr_wr4');
    expect(session3?.isSpectator).toBe(true);

    const targetId = session3?.spectateTargetId;
    expect(targetId).toBeTruthy();

    // The spectated driver disconnects
    if (targetId) {
      room.leave(targetId);
      const remainingTarget = targetId === session1?.id ? session2?.id : session1?.id;
      expect(session3?.spectateTargetId).toBe(remainingTarget);
    }
  });

  it('completes 60s round, compiles sorted leaderboard, and broadcasts 20s intermission', () => {
    const ws1 = createMockWebSocket();
    const session1 = room.join(ws1, 'DrifterA', 'apex_phantom_b');

    const ws2 = createMockWebSocket();
    const session2 = room.join(ws2, 'DrifterB', 'zephyr_wr4');

    // Simulate drift score telemetry
    if (session1 && session2) {
      room.handleTelemetry(session1.id, {
        seq: 1,
        time: Date.now(),
        pos: [0, 0, 0],
        rot: [0, 0, 0, 1],
        linVel: [0, 0, 0],
        angVel: [0, 0, 0],
        steer: 0,
        wheelRots: [0, 0, 0, 0],
        rpm: 4000,
        gear: 2,
        isDrifting: true,
        surface: 'tarmac',
        score: 85000,
      });

      room.handleTelemetry(session2.id, {
        seq: 1,
        time: Date.now(),
        pos: [0, 0, 0],
        rot: [0, 0, 0, 1],
        linVel: [0, 0, 0],
        angVel: [0, 0, 0],
        steer: 0,
        wheelRots: [0, 0, 0, 0],
        rpm: 3500,
        gear: 2,
        isDrifting: true,
        surface: 'tarmac',
        score: 120000,
      });
    }

    vi.clearAllMocks();

    // Advance match loop to round completion (60 seconds)
    advanceTimeWithHeartbeat(room, 60000);

    expect(room.roundPhase).toBe('intermission');
    expect(room.roundTimer).toBe(20);

    // Verify broadcast of gymkhana_round_ended with DrifterB in 1st place (120k) and DrifterA in 2nd (85k)
    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"gymkhana_round_ended"')
    );
    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('"score":120000')
    );
  });

  it('restarts Gymkhana Blitz round after 20s intermission and promotes spectators to active drivers', () => {
    const ws1 = createMockWebSocket();
    room.join(ws1, 'Active1', 'apex_phantom_b');

    advanceTimeWithHeartbeat(room, 10000);

    const ws2 = createMockWebSocket();
    const session2 = room.join(ws2, 'Spectator1', 'zephyr_wr4');
    expect(session2?.isSpectator).toBe(true);

    // Advance 50s to finish round -> transitions to intermission
    advanceTimeWithHeartbeat(room, 50000);
    expect(room.roundPhase).toBe('intermission');

    vi.clearAllMocks();

    // Advance 20s through intermission
    advanceTimeWithHeartbeat(room, 20000);

    // Round should now be active again!
    expect(room.roundPhase).toBe('active');
    expect(room.roundTimer).toBe(60);

    // Spectator is now promoted to active player
    expect(session2?.isSpectator).toBe(false);
    expect(session2?.spectateTargetId).toBeNull();
    expect(session2?.score).toBe(0);

    // Broadcast gymkhana_round_start sent to all drivers
    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"gymkhana_round_start"')
    );
    expect(ws2.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"gymkhana_round_start"')
    );
  });
});
