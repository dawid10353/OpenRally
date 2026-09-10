import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseClientMessage,
  parseServerMessage,
  isValidRoomSummary,
} from '../packetValidator';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { networkClient } from '../networkClient';
import type { RoomSummary } from '@/types/network';

describe('Multiplayer Track & Gamemode Selection', () => {
  beforeEach(() => {
    useGameStore.setState({
      selectedLevelId: 'level1_island',
      gameMode: 'timeattack',
    });
    useMultiplayerStore.getState().reset();
  });

  describe('Client packet validation for create_room', () => {
    it('accepts valid timeattack room on circuit track', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Island Circuit Cup',
        nickname: 'ApexRacer',
        vehicleId: 'zephyr_wr4',
        levelId: 'level1_island',
        gameMode: 'timeattack',
      });

      expect(msg).not.toBeNull();
      if (msg && msg.type === 'create_room') {
        expect(msg.name).toBe('Island Circuit Cup');
        expect(msg.levelId).toBe('level1_island');
        expect(msg.gameMode).toBe('timeattack');
      }
    });

    it('accepts valid gymkhana_blitz room on gymkhana arena', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Drift Arena Battles',
        nickname: 'Drifter99',
        vehicleId: 'shadowfire_rs',
        levelId: 'level5_gymkhana',
        gameMode: 'gymkhana_blitz',
      });

      expect(msg).not.toBeNull();
      if (msg && msg.type === 'create_room') {
        expect(msg.levelId).toBe('level5_gymkhana');
        expect(msg.gameMode).toBe('gymkhana_blitz');
      }
    });

    it('clamps gymkhana_blitz to freeroam when chosen on non-gymkhana circuit', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Desert Rally',
        nickname: 'SandDriver',
        vehicleId: 'kodiak_raid',
        levelId: 'level2_desert',
        gameMode: 'gymkhana_blitz', // Invalid for desert
      });

      expect(msg).not.toBeNull();
      if (msg && msg.type === 'create_room') {
        expect(msg.levelId).toBe('level2_desert');
        expect(msg.gameMode).toBe('freeroam');
      }
    });

    it('clamps timeattack to freeroam when chosen on gymkhana arena', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Gymkhana Race',
        nickname: 'SlideKing',
        vehicleId: 'bantam_turbo',
        levelId: 'level5_gymkhana',
        gameMode: 'timeattack', // Invalid for gymkhana
      });

      expect(msg).not.toBeNull();
      if (msg && msg.type === 'create_room') {
        expect(msg.levelId).toBe('level5_gymkhana');
        expect(msg.gameMode).toBe('freeroam');
      }
    });

    it('falls back to level1_island and freeroam when invalid level or mode provided', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Wild Card',
        nickname: 'RacerX',
        vehicleId: 'zephyr_wr4',
        levelId: 'non_existent_map_99',
        gameMode: 'deathmatch_invalid',
      });

      expect(msg).not.toBeNull();
      if (msg && msg.type === 'create_room') {
        expect(msg.levelId).toBe('level1_island');
        expect(msg.gameMode).toBe('freeroam');
      }
    });
  });

  describe('Server message validation with gameMode & track', () => {
    it('validates RoomSummary containing gameMode and levelId', () => {
      const validRoom: RoomSummary = {
        id: 'room_123',
        name: 'Sweden Snow Stage',
        hostId: 'p_1',
        hostNickname: 'WinterDriver',
        levelId: 'level3_sweden',
        gameMode: 'timeattack',
        playerCount: 3,
        maxPlayers: 12,
        createdAt: Date.now(),
        isPersistent: false,
      };

      expect(isValidRoomSummary(validRoom)).toBe(true);

      const invalidRoom = {
        ...validRoom,
        gameMode: 'unsupported_mode',
      };
      expect(isValidRoomSummary(invalidRoom)).toBe(false);
    });

    it('parses server rooms_list with diverse tracks and modes', () => {
      const raw = {
        type: 'rooms_list',
        rooms: [
          {
            id: 'gymkhana_freeroam',
            name: 'Apex Arena (Official)',
            hostId: 'system',
            hostNickname: 'Official Server',
            levelId: 'level5_gymkhana',
            gameMode: 'freeroam',
            playerCount: 4,
            maxPlayers: 12,
            createdAt: 1000,
            isPersistent: true,
          },
          {
            id: 'room_custom_1',
            name: 'Highland Castle Time Attack',
            hostId: 'p_99',
            hostNickname: 'CastleKing',
            levelId: 'level4_britain',
            gameMode: 'timeattack',
            playerCount: 2,
            maxPlayers: 12,
            createdAt: 2000,
          },
        ],
      };

      const parsed = parseServerMessage(raw);
      expect(parsed).not.toBeNull();
      if (parsed && parsed.type === 'rooms_list') {
        expect(parsed.rooms.length).toBe(2);
        expect(parsed.rooms[0].gameMode).toBe('freeroam');
        expect(parsed.rooms[1].gameMode).toBe('timeattack');
        expect(parsed.rooms[1].levelId).toBe('level4_britain');
      }
    });
  });

  describe('NetworkClient gameStore synchronization', () => {
    it('synchronizes selectedLevelId and gameMode when room_joined is received', () => {
      const incomingRoom: RoomSummary = {
        id: 'room_blitz_test',
        name: 'Gymkhana Blitz Challenge',
        hostId: 'p_host',
        hostNickname: 'GymHost',
        levelId: 'level5_gymkhana',
        gameMode: 'gymkhana_blitz',
        playerCount: 1,
        maxPlayers: 12,
        createdAt: Date.now(),
      };

      // Dispatch room_joined through networkClient message handler
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'room_joined',
          selfId: 'p_me',
          room: incomingRoom,
          players: [
            {
              id: 'p_me',
              nickname: 'Me',
              vehicleId: 'zephyr_wr4',
              slotIndex: 0,
              ping: 20,
            },
          ],
        }),
      });

      // Call public handler
      networkClient.handleMessage(messageEvent);

      expect(useGameStore.getState().selectedLevelId).toBe('level5_gymkhana');
      expect(useGameStore.getState().gameMode).toBe('gymkhana_blitz');
      expect(useMultiplayerStore.getState().currentRoom?.name).toBe('Gymkhana Blitz Challenge');
    });

    it('syncs gameStore and tag mode when room_joined for Rally Tag is received', () => {
      const incomingRoom: RoomSummary = {
        id: 'room_tag_test',
        name: 'Island Tag Chase',
        hostId: 'p_tag_host',
        hostNickname: 'TagHost',
        levelId: 'level1_island',
        gameMode: 'tag',
        playerCount: 1,
        maxPlayers: 12,
        createdAt: Date.now(),
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'room_joined',
          selfId: 'p_tag_me',
          room: incomingRoom,
          players: [
            {
              id: 'p_tag_me',
              nickname: 'TagMe',
              vehicleId: 'zephyr_wr4',
              slotIndex: 0,
              ping: 15,
            },
          ],
        }),
      });

      networkClient.handleMessage(messageEvent);

      expect(useGameStore.getState().selectedLevelId).toBe('level1_island');
      expect(useGameStore.getState().gameMode).toBe('tag');
      expect(useMultiplayerStore.getState().currentRoom?.name).toBe('Island Tag Chase');
      expect(useMultiplayerStore.getState().currentRoom?.gameMode).toBe('tag');
      expect(useMultiplayerStore.getState().status).toBe('in_lobby');
    });
  });
});

