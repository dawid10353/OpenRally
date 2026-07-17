import { Suspense } from 'react';
import { GameCanvas } from '@/components/canvas/GameCanvas';
import { HUD } from '@/components/ui/HUD';
import { MenuOverlay } from '@/components/ui/MenuOverlay';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { useGameStore } from '@/store/gameStore';

/**
 * Root application component.
 * Renders the 3D game canvas with HUD overlay and loading screen.
 */
function App() {
  const gameState = useGameStore((s) => s.gameState);
  
  // Only render the 3D scene when we are in a gameplay mode (or pause menu).
  // This prevents the map from loading unnecessarily in the main menu.
  const showGame = gameState === 'playing' || gameState === 'paused';

  return (
    <ErrorBoundary>
      <div className="game-container">
        {showGame && (
          <Suspense fallback={null}>
            <GameCanvas />
          </Suspense>
        )}
        <HUD />
        <MenuOverlay />
        <LoadingScreen />
      </div>
    </ErrorBoundary>
  );
}

export default App;
