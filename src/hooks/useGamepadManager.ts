import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { resetGamepadEdgeState, detectGamepadType, getActiveGamepad } from '@/utils/input/gamepad';

/**
 * Top-level hook that monitors Gamepad connection and disconnection events.
 * Mounted at App root to guarantee gamepads are detected without running conflicting polling loops.
 */
export function useGamepadManager(): void {
  const setGamepadConnected = useGameStore((s) => s.setGamepadConnected);

  useEffect(() => {
    // Initial check on mount
    const initialGp = getActiveGamepad();
    if (initialGp) {
      setGamepadConnected(true, initialGp.id, detectGamepadType(initialGp.id));
    }

    const onGamepadConnected = (e: GamepadEvent) => {
      const type = detectGamepadType(e.gamepad.id);
      setGamepadConnected(true, e.gamepad.id, type);
    };

    const onGamepadDisconnected = () => {
      setGamepadConnected(false, '', null);
      resetGamepadEdgeState();
    };

    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
    };
  }, [setGamepadConnected]);
}
