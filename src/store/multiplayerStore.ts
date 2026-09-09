import { create } from 'zustand';
import type { ConnectionStatus, RemotePlayerSummary } from '@/types/network';

const NICKNAME_STORAGE_KEY = 'openrally_mp_nickname';

function loadSavedNickname(): string {
  try {
    const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (saved && saved.trim().length >= 2) {
      return saved.trim().slice(0, 16);
    }
  } catch {
    // Suppress storage error (private browsing / security sandbox)
  }
  return `Apex_${Math.floor(100 + Math.random() * 900)}`;
}

export interface MultiplayerState {
  status: ConnectionStatus;
  nickname: string;
  selfId: string | null;
  roomName: string;
  slotIndex: number;
  remotePlayers: Record<string, RemotePlayerSummary>;
  ping: number;
  error: string | null;

  // Actions
  setNickname: (name: string) => void;
  setStatus: (status: ConnectionStatus) => void;
  setSelfId: (id: string, room: string, slotIndex?: number) => void;
  setPlayers: (players: RemotePlayerSummary[]) => void;
  addPlayer: (player: RemotePlayerSummary) => void;
  removePlayer: (playerId: string) => void;
  updatePing: (ping: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set) => ({
  status: 'disconnected',
  nickname: loadSavedNickname(),
  selfId: null,
  roomName: 'gymkhana_freeroam',
  slotIndex: 0,
  remotePlayers: {},
  ping: 0,
  error: null,

  setNickname: (nickname: string) => {
    const sanitized = nickname.trim().slice(0, 16);
    try {
      localStorage.setItem(NICKNAME_STORAGE_KEY, sanitized);
    } catch {
      // Ignore
    }
    set({ nickname: sanitized });
  },

  setStatus: (status: ConnectionStatus) => set({ status }),

  setSelfId: (selfId: string, roomName: string, slotIndex: number = 0) =>
    set({ selfId, roomName, slotIndex, status: 'in_lobby', error: null }),

  setPlayers: (players: RemotePlayerSummary[]) => {
    const map: Record<string, RemotePlayerSummary> = {};
    for (const p of players) {
      map[p.id] = p;
    }
    set({ remotePlayers: map });
  },

  addPlayer: (player: RemotePlayerSummary) =>
    set((state) => ({
      remotePlayers: {
        ...state.remotePlayers,
        [player.id]: player,
      },
    })),

  removePlayer: (playerId: string) =>
    set((state) => {
      const copy = { ...state.remotePlayers };
      delete copy[playerId];
      return { remotePlayers: copy };
    }),

  updatePing: (ping: number) => set({ ping }),

  setError: (error: string | null) => set({ error }),

  reset: () =>
    set({
      status: 'disconnected',
      selfId: null,
      remotePlayers: {},
      ping: 0,
      error: null,
    }),
}));
