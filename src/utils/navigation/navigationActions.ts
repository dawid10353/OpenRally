import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useRacingStore } from '@/store/racingStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useTagStore } from '@/store/tagStore';
import { networkClient } from '@/network/networkClient';
import { getLevelPreset } from '@/config/levelRegistry';
import { resetGamepadEdgeState } from '@/utils/input/gamepad';

export interface ReturnToMainMenuOptions {
  /** If provided and player is room host, deletes the multiplayer room on exit */
  deleteRoomId?: string;
}

/**
 * Enterprise-grade, centralized navigation flow for returning to the Main Menu.
 * Cleans up multiplayer sessions, resets mode stores, sanitizes vehicle telemetry,
 * repositions the car at the active level spawn position, and transitions smoothly
 * through the loading sequence to eliminate falling-out-of-bounds glitches.
 */
export function returnToMainMenu(options?: ReturnToMainMenuOptions): void {
  resetGamepadEdgeState();

  // 1. Clean up active multiplayer session
  const mpState = useMultiplayerStore.getState();
  if (options?.deleteRoomId && mpState.isHost) {
    networkClient.deleteRoom(options.deleteRoomId);
  } else if (mpState.currentRoom) {
    networkClient.leaveRoom(mpState.currentRoom.id);
  }
  networkClient.disconnect();
  mpState.reset();

  // 2. Clean up game mode stores & completion modals
  useRacingStore.getState().resetRace();
  useGymkhanaStore.getState().dismissResultsModal();
  useGymkhanaStore.getState().resetBlitz();
  useTagStore.getState().dismissResultsModal();
  useTagStore.getState().reset();

  // 3. Prepare level and vehicle position for menu showcase
  const gameStore = useGameStore.getState();
  const levelPreset = getLevelPreset(gameStore.selectedLevelId);
  const spawnPos = levelPreset.spawnPosition;

  useGameStore.setState({
    speed: 0,
    lateralSpeed: 0,
    slipAngle: 0,
    rpm: 1000,
    gear: 1,
    heading: levelPreset.spawnRotationY,
    position: [spawnPos[0], spawnPos[1], spawnPos[2]],
    isSceneReady: false,
    loadingTarget: 'menu',
  });

  // 4. Signal physics controller to reset RigidBody transforms and settle cleanly
  gameStore.triggerReset(true);
  gameStore.setGameState('loading');
}
