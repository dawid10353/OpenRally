import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkClient, getWebSocketEndpoint } from '../networkClient';
import { useMultiplayerStore } from '@/store/multiplayerStore';

describe('NetworkClient', () => {
  beforeEach(() => {
    useMultiplayerStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves default ws endpoint in local dev', () => {
    const endpoint = getWebSocketEndpoint();
    expect(endpoint).toBeDefined();
    expect(typeof endpoint).toBe('string');
  });

  it('initializes and manages entity buffers', () => {
    const client = new NetworkClient();
    const buf1 = client.getEntityBuffer('peer1');
    const buf2 = client.getEntityBuffer('peer2');
    const buf1Again = client.getEntityBuffer('peer1');

    expect(buf1).toBe(buf1Again);
    expect(buf1).not.toBe(buf2);
    expect(client.entityBuffers.size).toBe(2);

    client.disconnect();
    expect(client.entityBuffers.size).toBe(0);
  });

  it('supports room management message payloads without throwing', () => {
    const client = new NetworkClient();
    const sendSpy = vi.fn();
    (client as unknown as { ws: { readyState: number; send: typeof sendSpy } }).ws = {
      readyState: 1, // OPEN
      send: sendSpy,
    };

    client.requestRooms();
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"request_rooms"'));

    client.createRoom('Apex Track', 'Racer1', 'vortex_b');
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"create_room"'));
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"name":"Apex Track"'));

    client.joinRoom('room_123', 'Racer1', 'vortex_b');
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"join_room"'));
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"roomId":"room_123"'));

    client.deleteRoom('room_123');
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"delete_room"'));

    client.leaveRoom('room_123');
    expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"leave_room"'));
  });
});

