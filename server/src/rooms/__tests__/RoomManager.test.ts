import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoomManager } from '../RoomManager.js';
import type { WebSocket } from 'ws';

function createMockWebSocket(): WebSocket {
  return {
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  it('initializes with default persistent room "Apex Arena (Official)"', () => {
    const rooms = manager.getRoomsList();
    expect(rooms.length).toBe(1);
    expect(rooms[0].id).toBe('gymkhana_freeroam');
    expect(rooms[0].name).toBe('Apex Arena (Official)');
    expect(rooms[0].levelId).toBe('level5_gymkhana');
    expect(rooms[0].gameMode).toBe('freeroam');
    expect(rooms[0].isPersistent).toBe(true);
    expect(rooms[0].playerCount).toBe(0);
  });

  it('subscribes a client to lobby and sends initial rooms_list', () => {
    const ws = createMockWebSocket();
    manager.subscribeLobby(ws);

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"rooms_list"')
    );
  });

  it('creates a custom room with specified track and game mode', () => {
    const hostWs = createMockWebSocket();
    const room = manager.createRoom(
      hostWs,
      'Desert Sprint',
      'SpeedyHost',
      'vortex_b',
      'level2_desert',
      'timeattack'
    );

    expect(room).not.toBeNull();
    expect(room?.name).toBe('Desert Sprint');
    expect(room?.hostNickname).toBe('SpeedyHost');
    expect(room?.levelId).toBe('level2_desert');
    expect(room?.gameMode).toBe('timeattack');
    expect(room?.getPlayerCount()).toBe(1);

    const rooms = manager.getRoomsList();
    expect(rooms.length).toBe(2);
    const createdSummary = rooms.find((r) => r.id === room?.id);
    expect(createdSummary?.levelId).toBe('level2_desert');
    expect(createdSummary?.gameMode).toBe('timeattack');

    expect(hostWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"room_created"')
    );
    expect(hostWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"room_joined"')
    );
  });

  it('allows another driver to join the custom room', () => {
    const hostWs = createMockWebSocket();
    const guestWs = createMockWebSocket();

    const room = manager.createRoom(hostWs, 'Tandem Arena', 'HostDriver', 'zephyr_wr4');
    expect(room).not.toBeNull();

    const guestSession = manager.joinRoom(guestWs, room!.id, 'GuestDriver', 'apex_phantom_b');
    expect(guestSession).not.toBeNull();
    expect(guestSession?.nickname).toBe('GuestDriver');
    expect(guestSession?.slotIndex).toBe(1);
    expect(room?.getPlayerCount()).toBe(2);
  });

  it('prevents non-host driver from deleting the room', () => {
    const hostWs = createMockWebSocket();
    const guestWs = createMockWebSocket();

    const room = manager.createRoom(hostWs, 'Private Track', 'HostDriver', 'bantam_turbo');
    expect(room).not.toBeNull();

    manager.joinRoom(guestWs, room!.id, 'GuestDriver', 'shadowfire_rs');
    const guestPlayerId = manager.getPlayerId(guestWs);
    expect(guestPlayerId).toBeDefined();

    const success = manager.deleteRoom(room!.id, guestPlayerId!);
    expect(success).toBe(false);
    expect(manager.getRoom(room!.id)).toBeDefined();
  });

  it('allows the host to delete the room, notifying all players and cleaning up', () => {
    const hostWs = createMockWebSocket();
    const guestWs = createMockWebSocket();

    const room = manager.createRoom(hostWs, 'Drift Kings', 'HostDriver', 'vanguard_gt');
    expect(room).not.toBeNull();

    manager.joinRoom(guestWs, room!.id, 'GuestDriver', 'kodiak_raid');
    const hostPlayerId = manager.getPlayerId(hostWs);
    expect(hostPlayerId).toBeDefined();

    const success = manager.deleteRoom(room!.id, hostPlayerId!);
    expect(success).toBe(true);
    expect(manager.getRoom(room!.id)).toBeUndefined();

    // Guest should receive room_deleted message
    expect(guestWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"room_deleted"')
    );

    // Only default room remains
    expect(manager.getRoomsList().length).toBe(1);
  });

  it('prohibits deleting the official persistent room', () => {
    const success = manager.deleteRoom('gymkhana_freeroam', 'some_player');
    expect(success).toBe(false);
    expect(manager.getRoom('gymkhana_freeroam')).toBeDefined();
  });

  it('automatically cleans up custom room when host leaves', () => {
    const hostWs = createMockWebSocket();
    const room = manager.createRoom(hostWs, 'Temporary Lobby', 'HostDriver', 'zephyr_wr4');
    expect(room).not.toBeNull();

    manager.handleDisconnect(hostWs);
    expect(manager.getRoom(room!.id)).toBeUndefined();
    expect(manager.getRoomsList().length).toBe(1);
  });
});
