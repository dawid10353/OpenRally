import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useRacingStore } from '@/store/racingStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { networkClient } from '@/network/networkClient';
import { getLevelPreset } from '@/config/levelRegistry';
import { returnToMainMenu } from '../navigationActions';

describe('Menu Return Safety & Navigation Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'gymkhana_blitz',
      selectedLevelId: 'level5_gymkhana',
      speed: 120,
      lateralSpeed: 15,
      slipAngle: 0.45,
      rpm: 7200,
      gear: 3,
      position: [120, 8.5, -45],
      pendingReset: false,
      isSceneReady: true,
      loadingTarget: 'gameplay',
    });
    useGymkhanaStore.getState().resetBlitz();
    useRacingStore.getState().resetRace();
    useMultiplayerStore.getState().reset();
  });

  it('returnToMainMenu resets multiplayer, game modes, telemetry, and sets loadingTarget to menu', () => {
    const leaveSpy = vi.spyOn(networkClient, 'leaveRoom').mockImplementation(() => {});
    const disconnectSpy = vi.spyOn(networkClient, 'disconnect').mockImplementation(() => {});

    useMultiplayerStore.setState({
      status: 'in_lobby',
      currentRoom: {
        id: 'room_gymkhana_1',
        name: 'Apex Arena',
        hostId: 'p_other',
        hostNickname: 'Rival',
        playerCount: 2,
        maxPlayers: 8,
        gameMode: 'gymkhana_blitz',
        levelId: 'level5_gymkhana',
        createdAt: Date.now(),
      },
      isHost: false,
    });

    useGymkhanaStore.setState({
      showResultsModal: true,
      status: 'completed',
      totalScore: 45000,
    });

    returnToMainMenu();

    expect(leaveSpy).toHaveBeenCalledWith('room_gymkhana_1');
    expect(disconnectSpy).toHaveBeenCalled();

    // Mode stores reset
    expect(useGymkhanaStore.getState().showResultsModal).toBe(false);
    expect(useGymkhanaStore.getState().status).toBe('idle');
    expect(useMultiplayerStore.getState().status).toBe('disconnected');

    // Telemetry & positioning sanitized to level spawn
    const level = getLevelPreset('level5_gymkhana');
    const state = useGameStore.getState();
    expect(state.speed).toBe(0);
    expect(state.lateralSpeed).toBe(0);
    expect(state.slipAngle).toBe(0);
    expect(state.rpm).toBe(1000);
    expect(state.gear).toBe(1);
    expect(state.position).toEqual(level.spawnPosition);
    expect(state.heading).toBe(level.spawnRotationY);
    expect(state.pendingReset).toBe(true);
    expect(state.isSceneReady).toBe(false);
    expect(state.loadingTarget).toBe('menu');
    expect(state.gameState).toBe('loading');
  });

  it('returnToMainMenu deletes custom room if caller is host with deleteRoomId', () => {
    const deleteSpy = vi.spyOn(networkClient, 'deleteRoom').mockImplementation(() => {});
    vi.spyOn(networkClient, 'disconnect').mockImplementation(() => {});

    useMultiplayerStore.setState({
      status: 'in_lobby',
      selfId: 'p_host123',
      currentRoom: {
        id: 'room_custom_host',
        name: 'My Room',
        hostId: 'p_host123',
        hostNickname: 'HostPlayer',
        playerCount: 1,
        maxPlayers: 8,
        gameMode: 'freeroam',
        levelId: 'level5_gymkhana',
        createdAt: Date.now(),
      },
      isHost: true,
    });

    returnToMainMenu({ deleteRoomId: 'room_custom_host' });

    expect(deleteSpy).toHaveBeenCalledWith('room_custom_host');
  });

  it('setGameState defensively sanitizes state and sets pendingReset when transitioning from playing to menu', () => {
    useGameStore.setState({
      gameState: 'playing',
      selectedLevelId: 'level1_island',
      speed: 95,
      position: [-50, -2, 100],
      pendingReset: false,
    });

    useGameStore.getState().setGameState('menu');

    const level = getLevelPreset('level1_island');
    const state = useGameStore.getState();
    expect(state.gameState).toBe('menu');
    expect(state.pendingReset).toBe(true);
    expect(state.speed).toBe(0);
    expect(state.position).toEqual(level.spawnPosition);
    expect(state.loadingTarget).toBe('menu');
  });

  it('setGameState defensively sanitizes state when transitioning from paused to menu', () => {
    useGameStore.setState({
      gameState: 'paused',
      selectedLevelId: 'level2_canyon',
      speed: 60,
      position: [20, 15, -80],
      pendingReset: false,
    });

    useGameStore.getState().setGameState('menu');

    const level = getLevelPreset('level2_canyon');
    const state = useGameStore.getState();
    expect(state.gameState).toBe('menu');
    expect(state.pendingReset).toBe(true);
    expect(state.speed).toBe(0);
    expect(state.position).toEqual(level.spawnPosition);
  });
});
