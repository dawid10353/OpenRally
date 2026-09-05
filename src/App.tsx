import { Suspense, useEffect } from 'react';
import { GameCanvas } from '@/components/canvas/GameCanvas';
import { HUD } from '@/components/ui/HUD';
import { TouchControlsOverlay } from '@/components/ui/TouchControlsOverlay';
import { MenuOverlay } from '@/components/ui/MenuOverlay';
import { TitleScreen } from '@/components/ui/TitleScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { useGameStore } from '@/store/gameStore';
import { useGamepadManager } from '@/hooks/useGamepadManager';
import { clearAudioBufferCache } from '@/utils/audioCache';

/**
 * Root application component.
 * Renders the 3D game canvas with HUD overlay, menu, title screen, and loading screen.
 */
function App() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  
  // Continuously monitor gamepad connections & state at root level
  useGamepadManager();

  // Clear uncompressed linear PCM audio buffers when entering gameplay to reclaim up to 150MB RAM
  useEffect(() => {
    if (gameState === 'playing') {
      clearAudioBufferCache();
    }
  }, [gameState, selectedLevelId]);
  
  // Persistent 3D GameCanvas stays mounted across all menu and gameplay transitions
  // to avoid creating and destroying WebGL contexts, eliminating context exhaustion crashes.
  const isGameplay = gameState === 'playing' || gameState === 'paused';

  return (
    <ErrorBoundary>
      <div className="game-container">
        <Suspense fallback={null}>
          <GameCanvas />
        </Suspense>
        <HUD />
        {isGameplay && <TouchControlsOverlay />}
        <MenuOverlay />
        <TitleScreen />
        <LoadingScreen />
      </div>
    </ErrorBoundary>
  );
}

export default App;
