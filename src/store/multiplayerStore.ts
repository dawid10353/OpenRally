import { create } from 'zustand';
import type { ConnectionStatus, RemotePlayerSummary, RoomSummary } from '@/types/network';

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
  rooms: RoomSummary[];
  currentRoom: RoomSummary | null;
  isHost: boolean;
  remotePlayers: Record<string, RemotePlayerSummary>;
  ping: number;
  error: string | null;

  // Actions
  setNickname: (name: string) => void;
  setStatus: (status: ConnectionStatus) => void;
  setSelfId: (id: string, room: string, slotIndex?: number, roomSummary?: RoomSummary) => void;
  setRooms: (rooms: RoomSummary[]) => void;
  setCurrentRoom: (room: RoomSummary | null) => void;
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
  rooms: [],
  currentRoom: null,
  isHost: false,
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

  setSelfId: (selfId: string, roomName: string, slotIndex: number = 0, roomSummary?: RoomSummary) =>
    set((state) => {
      const isHost = roomSummary ? roomSummary.hostId === selfId : state.isHost;
      return {
        selfId,
        roomName,
        slotIndex,
        currentRoom: roomSummary ?? state.currentRoom,
        isHost,
        status: 'in_lobby',
        error: null,
      };
    }),

  setRooms: (rooms: RoomSummary[]) => set({ rooms }),

  setCurrentRoom: (currentRoom: RoomSummary | null) =>
    set((state) => ({
      currentRoom,
      isHost: currentRoom && state.selfId ? currentRoom.hostId === state.selfId : false,
    })),

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
      currentRoom: null,
      isHost: false,
      remotePlayers: {},
      ping: 0,
      error: null,
    }),
}));
