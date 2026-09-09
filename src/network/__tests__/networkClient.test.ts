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
});
