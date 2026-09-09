import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { RemoteVehicle } from './RemoteVehicle';

/**
 * Manages the collection of active remote vehicles in the 3D scene.
 * Dynamically mounts and unmounts RemoteVehicle components as peers join and leave.
 * Strictly inactive outside active gameplay (e.g. main menu or loading screen).
 */
export function RemoteVehicleManager() {
  const gameState = useGameStore((s) => s.gameState);
  const remotePlayers = useMultiplayerStore((s) => s.remotePlayers);
  const selfId = useMultiplayerStore((s) => s.selfId);
  const status = useMultiplayerStore((s) => s.status);

  // Never render remote vehicles or overhead badges in main menu, title or loading screens
  if (gameState !== 'playing' || status === 'disconnected' || !selfId) {
    return null;
  }

  const peerList = Object.values(remotePlayers).filter((p) => p.id !== selfId);
  if (peerList.length === 0) {
    return null;
  }

  return (
    <group name="remote-vehicles">
      {peerList.map((player) => (
        <RemoteVehicle key={player.id} player={player} />
      ))}
    </group>
  );
}
