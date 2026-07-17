import { Suspense } from 'react';
import { GameCanvas } from '@/components/canvas/GameCanvas';
import { HUD } from '@/components/ui/HUD';
import { MenuOverlay } from '@/components/ui/MenuOverlay';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Root application component.
 * Renders the 3D game canvas with HUD overlay and loading screen.
 */
function App() {
  return (
    <ErrorBoundary>
      <div className="game-container">
        <Suspense fallback={null}>
          <GameCanvas />
        </Suspense>
        <HUD />
        <MenuOverlay />
        <LoadingScreen />
      </div>
    </ErrorBoundary>
  );
}

export default App;
