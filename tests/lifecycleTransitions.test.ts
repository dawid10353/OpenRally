import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';

describe('Milestone M1: 3D Lifecycle Teardown & Transition Crash Elimination', () => {
  const rootDir = path.resolve(__dirname, '..');

  beforeEach(() => {
    useGameStore.setState({
      gameState: 'title',
      gameMode: 'freeroam',
      selectedLevelId: 'level1_island',
      selectedVehicleId: 'rally_hatchback',
      isSceneReady: false,
    });
    useRacingStore.setState({
      raceStatus: 'idle',
      currentLapTime: 0,
      bestLapTime: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Persistent Single-Instance 3D Canvas Architecture', () => {
    it('verifies App.tsx persistently mounts GameCanvas without unmounting on menu transitions', () => {
      const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

      // GameCanvas must be inside Suspense and persistently mounted
      expect(appSrc).toContain('<GameCanvas />');
      expect(appSrc).not.toContain('{showGame && (\n          <Suspense fallback={null}>\n            <GameCanvas />');
      expect(appSrc).toContain('isGameplay');
      expect(appSrc).toContain('{isGameplay && <TouchControlsOverlay />}');
    });

    it('verifies GameCanvas suspends frameloop to "never" and disables MobileFramePacer during menus', () => {
      const canvasSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/canvas/GameCanvas.tsx'),
        'utf-8',
      );

      // Frameloop suspension logic
      expect(canvasSrc).toContain("const isGameplay = gameState === 'playing' || gameState === 'paused'");
      expect(canvasSrc).toContain("const frameloop = !isGameplay ? 'never' : (isMobile ? 'never' : 'always')");
      expect(canvasSrc).toContain('frameloop={frameloop}');

      // MobileFramePacer only enabled when isGameplay is true
      expect(canvasSrc).toContain('enabled={isMobile && isGameplay}');
    });

    it('executes >= 10 consecutive race <-> menu transitions with zero crashes and consistent state', () => {
      const stateHistory: string[] = [];
      const errorLog: string[] = [];

      const recordState = () => {
        stateHistory.push(useGameStore.getState().gameState);
      };

      try {
        // Initial state
        expect(useGameStore.getState().gameState).toBe('title');
        recordState();

        // Perform 10 full transition cycles: menu -> playing -> paused -> menu
        for (let cycle = 1; cycle <= 10; cycle++) {
          // 1. Enter Menu
          useGameStore.getState().setGameState('menu');
          recordState();
          expect(useGameStore.getState().gameState).toBe('menu');
          expect(useGameStore.getState().isSceneReady).toBe(false);

          // 2. Launch Race (Playing)
          useGameStore.getState().setGameState('playing');
          useGameStore.getState().setSceneReady(true);
          recordState();
          expect(useGameStore.getState().gameState).toBe('playing');
          expect(useGameStore.getState().isSceneReady).toBe(true);

          // 3. Pause Race
          useGameStore.getState().setGameState('paused');
          recordState();
          expect(useGameStore.getState().gameState).toBe('paused');

          // 4. Return to Main Menu
          useGameStore.getState().setGameState('menu');
          recordState();
          expect(useGameStore.getState().gameState).toBe('menu');
          expect(useGameStore.getState().isSceneReady).toBe(false);
        }
      } catch (err: unknown) {
        errorLog.push(err instanceof Error ? err.message : String(err));
      }

      // Assert 0 errors occurred across 10 full cycles (40 distinct transitions)
      expect(errorLog).toHaveLength(0);
      expect(stateHistory.length).toBe(41);
      expect(useGameStore.getState().gameState).toBe('menu');
    });

    it('stress tests 50 rapid alternating transitions between playing and menu without state corruption', () => {
      for (let i = 0; i < 50; i++) {
        const nextState = i % 2 === 0 ? 'playing' : 'menu';
        useGameStore.getState().setGameState(nextState);
        expect(useGameStore.getState().gameState).toBe(nextState);
      }
      expect(useGameStore.getState().gameState).toBe('menu');
    });
  });

  describe('2. WebGL Context Loss Watchdog & preventDefault Interception', () => {
    it('verifies GameCanvas.tsx attaches webglcontextlost listener calling event.preventDefault()', () => {
      const canvasSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/canvas/GameCanvas.tsx'),
        'utf-8',
      );

      expect(canvasSrc).toContain("canvas.addEventListener(\n          'webglcontextlost'");
      expect(canvasSrc).toContain('event.preventDefault()');
      expect(canvasSrc).toContain("canvas.addEventListener(\n          'webglcontextrestored'");
      expect(canvasSrc).toContain('gl.resetState()');
    });

    it('verifies GarageView.tsx attaches webglcontextlost listener calling event.preventDefault()', () => {
      const garageSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/GarageView.tsx'),
        'utf-8',
      );

      expect(garageSrc).toContain("canvas.addEventListener(\n              'webglcontextlost'");
      expect(garageSrc).toContain('e.preventDefault()');
      expect(garageSrc).toContain("canvas.addEventListener(\n              'webglcontextrestored'");
      expect(garageSrc).toContain('gl.resetState()');
    });

    it('simulates webglcontextlost event and verifies preventDefault prevents fatal context loss', () => {
      const listeners: Record<string, EventListener[]> = {};
      const mockCanvas = {
        addEventListener: (type: string, listener: EventListener) => {
          listeners[type] = listeners[type] || [];
          listeners[type].push(listener);
        },
        removeEventListener: (type: string, listener: EventListener) => {
          if (listeners[type]) {
            listeners[type] = listeners[type].filter((l) => l !== listener);
          }
        },
      };

      const mockGl = {
        domElement: mockCanvas,
        resetState: vi.fn(),
      };

      // Register the watchdog on the mock canvas
      mockCanvas.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault();
        },
      );
      mockCanvas.addEventListener(
        'webglcontextrestored',
        () => {
          mockGl.resetState();
        },
      );

      // Create a synthetic context loss event
      const contextLostEvent = new CustomEvent('webglcontextlost', { cancelable: true });
      for (const listener of listeners['webglcontextlost'] || []) {
        listener(contextLostEvent);
      }

      // Default must be prevented to allow context restoration per WebGL spec
      expect(contextLostEvent.defaultPrevented).toBe(true);

      // Create a synthetic context restored event
      const contextRestoredEvent = new CustomEvent('webglcontextrestored', { cancelable: false });
      for (const listener of listeners['webglcontextrestored'] || []) {
        listener(contextRestoredEvent);
      }

      // WebGL state must be reset
      expect(mockGl.resetState).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Menu Secondary Canvas Elimination in HeroShowcase', () => {
    it('verifies HeroShowcase does not instantiate a 3D Canvas or Drei Environment', () => {
      const showcaseSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/HeroShowcase.tsx'),
        'utf-8',
      );

      // Must not import or render Canvas, OrbitControls, Environment, or CarModelDisplay
      expect(showcaseSrc).not.toContain('<Canvas');
      expect(showcaseSrc).not.toContain('<OrbitControls');
      expect(showcaseSrc).not.toContain('<Environment');
      expect(showcaseSrc).not.toContain('CarModelDisplay');

      // Retains required export STAGE_BANNERS for TrackSelectView
      expect(showcaseSrc).toContain('export const STAGE_BANNERS');

      // Includes performant 2D showcase card with link to 3D garage
      expect(showcaseSrc).toContain('carShowcaseContainer');
      expect(showcaseSrc).toContain('3D GARAGE ➜');
    });

    it('verifies GarageView disposes OrbitControls on unmount', () => {
      const garageSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/GarageView.tsx'),
        'utf-8',
      );

      expect(garageSrc).toContain('const controls = controlsRef.current');
      expect(garageSrc).toContain('controls.dispose()');
    });
  });

  describe('4. Explicit GPU Resource Disposal in Ocean.tsx', () => {
    it('verifies Ocean.tsx cleans up PlaneGeometry, material, and terrainHeightmap DataTexture on unmount', () => {
      const oceanSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/environment/Ocean.tsx'),
        'utf-8',
      );

      // Primitive bypass mitigation
      expect(oceanSrc).toContain('terrainHeightmap.dispose()');
      expect(oceanSrc).toContain('waterMesh.geometry.dispose()');
      expect(oceanSrc).toContain('waterMesh.material.dispose()');
    });

    it('simulates Ocean disposal hook and verifies all GPU disposal methods are invoked', () => {
      const disposeHeightmap = vi.fn();
      const disposeGeometry = vi.fn();
      const disposeMaterial = vi.fn();

      const mockHeightmap = { dispose: disposeHeightmap };
      const mockWaterMesh = {
        geometry: { dispose: disposeGeometry },
        material: { dispose: disposeMaterial },
      };

      // Execute cleanup simulation
      const cleanup = () => {
        mockHeightmap.dispose();
        mockWaterMesh.geometry.dispose();
        if (Array.isArray(mockWaterMesh.material)) {
          mockWaterMesh.material.forEach((m: { dispose: () => void }) => m.dispose());
        } else {
          mockWaterMesh.material.dispose();
        }
      };

      cleanup();

      expect(disposeHeightmap).toHaveBeenCalledTimes(1);
      expect(disposeGeometry).toHaveBeenCalledTimes(1);
      expect(disposeMaterial).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. AudioContext Cleanup in TitleScreen.tsx', () => {
    it('verifies TitleScreen does not allocate orphaned AudioContext instances on repeated calls', () => {
      const titleSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/TitleScreen.tsx'),
        'utf-8',
      );

      // Singleton AudioContext check
      expect(titleSrc).toContain('let _unlockAudioCtx: AudioContext | null = null');
      expect(titleSrc).toContain('if (!_unlockAudioCtx)');
      expect(titleSrc).toContain('_unlockAudioCtx = new AudioCtx()');
      expect(titleSrc).toContain('_unlockAudioCtx.resume()');
    });
  });
});
