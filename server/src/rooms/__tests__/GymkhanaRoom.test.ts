import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GymkhanaRoom, MAX_PLAYERS } from '../GymkhanaRoom';
import type { WebSocket } from 'ws';

function createMockWebSocket(): WebSocket {
  return {
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

describe('GymkhanaRoom', () => {
  let room: GymkhanaRoom;

  beforeEach(() => {
    room = new GymkhanaRoom();
  });

  afterEach(() => {
    room.destroy();
  });

  it('allows a driver to join, assigns a slot and sends lobby_joined', () => {
    const ws = createMockWebSocket();
    const session = room.join(ws, 'RallyAce', 'rally_wrc');

    expect(session).not.toBeNull();
    expect(session?.nickname).toBe('RallyAce');
    expect(session?.vehicleId).toBe('rally_wrc');
    expect(session?.slotIndex).toBe(0);
    expect(room.getPlayerCount()).toBe(1);

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"lobby_joined"')
    );
  });

  it('broadcasts player_joined to existing drivers when new driver joins', () => {
    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();

    room.join(ws1, 'Driver1', 'rally_hatchback');
    vi.clearAllMocks();

    room.join(ws2, 'Driver2', 'rally_wrc');

    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"player_joined"')
    );
  });

  it('handles telemetry updates without crashing or allocating unbound memory', () => {
    const ws = createMockWebSocket();
    const session = room.join(ws, 'DriftMaster', 'rally_wrc');
    expect(session).not.toBeNull();

    if (session) {
      room.handleTelemetry(session.id, {
        seq: 1,
        time: Date.now(),
        pos: [1, 2, 3],
        rot: [0, 0, 0, 1],
        linVel: [0, 0, 0],
        angVel: [0, 0, 0],
        steer: 0,
        wheelRots: [0, 0, 0, 0],
        rpm: 1000,
        gear: 1,
        isDrifting: false,
        surface: 'tarmac',
      });

      const updated = room.getPlayer(session.id);
      expect(updated?.latestSnapshot).not.toBeNull();
      expect(updated?.latestSnapshot?.pos).toEqual([1, 2, 3]);
    }
  });

  it('removes player cleanly and frees their slot', () => {
    const ws1 = createMockWebSocket();
    const session1 = room.join(ws1, 'D1', 'rally_wrc');
    expect(session1).not.toBeNull();

    room.leave(session1!.id, 'voluntary');
    expect(room.getPlayerCount()).toBe(0);

    // Slot 0 should be re-assigned to the next joiner
    const ws2 = createMockWebSocket();
    const session2 = room.join(ws2, 'D2', 'rally_hatchback');
    expect(session2?.slotIndex).toBe(0);
  });

  it('rejects joining when room is at maximum capacity', () => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const ws = createMockWebSocket();
      expect(room.join(ws, `Driver_${i}`, 'rally_wrc')).not.toBeNull();
    }

    expect(room.getPlayerCount()).toBe(MAX_PLAYERS);

    // 13th driver should be rejected
    const extraWs = createMockWebSocket();
    const rejected = room.join(extraWs, 'Driver_Extra', 'rally_hatchback');
    expect(rejected).toBeNull();
    expect(extraWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"code":"ROOM_FULL"')
    );
  });
});
