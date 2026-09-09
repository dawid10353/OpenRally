import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { emitGameEvent } from '@/utils/events';

/**
 * Pure handler function for Android hardware back button and navigation gesture.
 * If in active gameplay, cleanly pauses the game.
 * If in menus or paused, dispatches 'android_back_pressed' to allow MenuOverlay
 * to step back through subviews (Garage, Options, Controls) or unpause.
 */
export function handleAndroidBackNavigation(): void {
  const { gameState, setGameState } = useGameStore.getState();

  if (gameState === 'playing') {
    setGameState('paused');
  } else {
    emitGameEvent('android_back_pressed', {});
  }
}

/**
 * Hook monitoring Android system Back button (Capacitor / Cordova WebView)
 * and mobile browser popstate / back gestures.
 */
export function useAndroidBackNavigation(): void {
  const onBackButton = useCallback((e?: Event) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    handleAndroidBackNavigation();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Capacitor native Android back button event
    let capacitorRemove: (() => void) | null = null;
    try {
      const capWindow = window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener: (event: string, callback: () => void) => Promise<{ remove: () => void }>;
            };
          };
        };
      };
      const appPlugin = capWindow.Capacitor?.Plugins?.App;
      if (appPlugin && typeof appPlugin.addListener === 'function') {
        appPlugin.addListener('backButton', () => {
          handleAndroidBackNavigation();
        }).then((handle) => {
          if (handle && typeof handle.remove === 'function') {
            capacitorRemove = () => handle.remove();
          }
        }).catch(() => {});
      }
    } catch {
      // Ignore in environments without native Capacitor runtime
    }

    // 2. Cordova / Legacy WebView native Android back button event
    document.addEventListener('backbutton', onBackButton);

    // 3. Mobile browser history popstate handling (prevents exiting game on edge swipe)
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleAndroidBackNavigation();
      try {
        window.history.pushState({ openrally: true }, '');
      } catch {
        // Ignore
      }
    };

    try {
      window.history.pushState({ openrally: true }, '');
      window.addEventListener('popstate', onPopState);
    } catch {
      // Ignore in environments where pushState is restricted
    }

    return () => {
      if (capacitorRemove) {
        try {
          capacitorRemove();
        } catch {
          // Ignore
        }
      }
      document.removeEventListener('backbutton', onBackButton);
      try {
        window.removeEventListener('popstate', onPopState);
      } catch {
        // Ignore
      }
    };
  }, [onBackButton]);
}
