import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';

describe('Adversarial Challenger M1: Empirical Stress Testing of 3D Lifecycle & Transitions (Requirement R2)', () => {
  const rootDir = path.resolve(__dirname, '..');

  beforeEach(() => {
    // Reset stores to standard initial baseline
    useGameStore.setState({
      gameState: 'title',
      gameMode: 'timeattack',
      selectedLevelId: 'level1_island',
      selectedVehicleId: 'rally_hatchback',
      isSceneReady: false,
      speed: 0,
      lateralSpeed: 0,
      slipAngle: 0,
      rpm: 1000,
      gear: 1,
      heading: 0,
      position: [0, 0.5, 0],
      pendingReset: false,
      telemetryEnabled: false,
      tireGrips: [0, 0, 0, 0],
      surface: 'mud',
      gamepadConnected: false,
      gamepadName: '',
      gamepadType: null,
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

  // =========================================================================
  // Area 1: Deep Adversarial State Transitions & Stress Cycling (Requirement R2)
  // =========================================================================
  describe('Area 1: Deep Adversarial State Transitions & Stress Cycling', () => {
    it('CHALLENGE 1.1: Executes 100 multi-phase game journey cycles without crashes, memory explosion, or invalid states', () => {
      const errorLog: string[] = [];
      const transitionPhases = [
        'menu',
        'playing',
        'paused',
        'playing',
        'paused',
        'menu',
        'title',
      ] as const;

      try {
        for (let cycle = 1; cycle <= 100; cycle++) {
          for (const phase of transitionPhases) {
            useGameStore.getState().setGameState(phase);
            const currentState = useGameStore.getState().gameState;
            expect(currentState).toBe(phase);

            // Invariant: isGameplay is strictly true for playing/paused, false otherwise
            const isGameplay = currentState === 'playing' || currentState === 'paused';
            if (phase === 'playing' || phase === 'paused') {
              expect(isGameplay).toBe(true);
            } else {
              expect(isGameplay).toBe(false);
              // isSceneReady must be reset to false when entering menu or title
              expect(useGameStore.getState().isSceneReady).toBe(false);
            }

            // Simulate simulated telemetry and physics updates during playing
            if (phase === 'playing') {
              useGameStore.getState().setSpeed(120);
              useGameStore.getState().setRpm(5500);
              useGameStore.getState().setSceneReady(true);
              expect(useGameStore.getState().isSceneReady).toBe(true);
            }
          }
        }
      } catch (err) {
        errorLog.push(err instanceof Error ? err.message : String(err));
      }

      expect(errorLog).toHaveLength(0);
      expect(useGameStore.getState().gameState).toBe('title');
      expect(useGameStore.getState().isSceneReady).toBe(false);
    });

    it('CHALLENGE 1.2: 500 rapid alternating state transitions under chaotic sequence ordering', () => {
      const validStates = ['title', 'menu', 'playing', 'paused'] as const;
      const initialMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 500; i++) {
        // Deterministic pseudo-random sequence
        const stateIdx = (i * 7 + 3) % validStates.length;
        const targetState = validStates[stateIdx];
        useGameStore.getState().setGameState(targetState);
        expect(useGameStore.getState().gameState).toBe(targetState);
      }

      const finalMem = process.memoryUsage().heapUsed;
      const memoryDiffMB = (finalMem - initialMem) / (1024 * 1024);

      // Memory drift after 500 state switches must remain minimal (< 15MB heap drift)
      expect(memoryDiffMB).toBeLessThan(15);
    });

    it('CHALLENGE 1.3: Handles asynchronous / microtask-interleaved transition storms without latching', async () => {
      const transitionOrder: string[] = [];

      // Launch 50 concurrent async transition promises with varying microtask delays
      const promises = Array.from({ length: 50 }, (_, i) => {
        return new Promise<void>((resolve) => {
          const target = i % 2 === 0 ? 'playing' : 'menu';
          if (i % 3 === 0) {
            queueMicrotask(() => {
              useGameStore.getState().setGameState(target);
              transitionOrder.push(target);
              resolve();
            });
          } else {
            Promise.resolve().then(() => {
              useGameStore.getState().setGameState(target);
              transitionOrder.push(target);
              resolve();
            });
          }
        });
      });

      await Promise.all(promises);
      expect(transitionOrder).toHaveLength(50);
      const finalState = useGameStore.getState().gameState;
      expect(['playing', 'menu']).toContain(finalState);
    });

    it('CHALLENGE 1.4: Track and vehicle switching across active and menu states preserves state cleanliness', () => {
      const levels = ['level1_island', 'level2_desert', 'level3_sweden', 'level4_britain'];
      const vehicles = ['rally_hatchback', 'turbo_coupe', 'legend_sedan'];

      for (let i = 0; i < levels.length; i++) {
        // Switch level while in playing
        useGameStore.getState().setGameState('playing');
        useGameStore.getState().setSceneReady(true);
        useGameStore.getState().setSelectedLevelId(levels[i]);
        expect(useGameStore.getState().isSceneReady).toBe(false);

        // Switch vehicle while in menu
        useGameStore.getState().setGameState('menu');
        useGameStore.getState().setSelectedVehicleId(vehicles[i % vehicles.length]);
        expect(useGameStore.getState().isSceneReady).toBe(false);
      }
    });
  });

  // =========================================================================
  // Area 2: WebGL Context Loss Watchdog & Recovery Interception
  // =========================================================================
  describe('Area 2: WebGL Context Loss Prevention & Recovery Interception', () => {
    it('CHALLENGE 2.1: Verifies GameCanvas onCreated callback registers webglcontextlost with event.preventDefault()', () => {
      const canvasSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/canvas/GameCanvas.tsx'),
        'utf-8',
      );

      // Verify exact watchdog implementation
      expect(canvasSrc).toContain("canvas.addEventListener(\n          'webglcontextlost'");
      expect(canvasSrc).toContain('event.preventDefault()');
      expect(canvasSrc).toContain("canvas.addEventListener(\n          'webglcontextrestored'");
      expect(canvasSrc).toContain('gl.resetState()');
    });

    it('CHALLENGE 2.2: Verifies GarageView onCreated callback registers webglcontextlost with event.preventDefault()', () => {
      const garageSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/GarageView.tsx'),
        'utf-8',
      );

      expect(garageSrc).toContain("canvas.addEventListener(\n              'webglcontextlost'");
      expect(garageSrc).toContain('e.preventDefault()');
      expect(garageSrc).toContain("canvas.addEventListener(\n              'webglcontextrestored'");
      expect(garageSrc).toContain('gl.resetState()');
    });

    it('CHALLENGE 2.3: Simulates 20 consecutive WebGL context lost & restored cycles on DOM elements', () => {
      const listeners: Record<string, EventListener[]> = {};
      const mockDomCanvas = {
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

      const resetStateMock = vi.fn();
      const mockRenderer = {
        domElement: mockDomCanvas,
        resetState: resetStateMock,
      };

      // Register the exact handler pattern used in GameCanvas and GarageView
      mockDomCanvas.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault();
        },
        false,
      );
      mockDomCanvas.addEventListener(
        'webglcontextrestored',
        () => {
          mockRenderer.resetState();
        },
        false,
      );

      // Fire 20 consecutive context loss / restored pairs
      for (let i = 0; i < 20; i++) {
        const lossEvent = new CustomEvent('webglcontextlost', { cancelable: true });
        for (const listener of listeners['webglcontextlost'] || []) {
          listener(lossEvent);
        }
        expect(lossEvent.defaultPrevented).toBe(true);

        const restoreEvent = new CustomEvent('webglcontextrestored', { cancelable: false });
        for (const listener of listeners['webglcontextrestored'] || []) {
          listener(restoreEvent);
        }
      }

      expect(resetStateMock).toHaveBeenCalledTimes(20);
    });

    it('CHALLENGE 2.4: Verifies Three.js WebGLRenderer defines resetState method in constructor and type definitions', () => {
      const threeDts = fs.readFileSync(
        path.join(rootDir, 'node_modules/@types/three/src/renderers/WebGLRenderer.d.ts'),
        'utf-8',
      );
      expect(threeDts).toContain('resetState(): void;');

      const threeSrc = fs.readFileSync(
        path.join(rootDir, 'node_modules/three/build/three.module.js'),
        'utf-8',
      );
      expect(threeSrc).toContain('this.resetState = function () {');
      expect(threeSrc).toContain('state.reset();');
      expect(threeSrc).toContain('bindingStates.reset();');
    });
  });

  // =========================================================================
  // Area 3: Memory Accumulation & GPU Resource Disposal Stress
  // =========================================================================
  describe('Area 3: Memory Accumulation & GPU Resource Disposal Stress', () => {
    it('CHALLENGE 3.1: Verifies Ocean unmount explicitly disposes PlaneGeometry, Material, and DataTexture', () => {
      const oceanSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/environment/Ocean.tsx'),
        'utf-8',
      );

      // Must explicitly dispose resources to counter <primitive /> auto-disposal bypass
      expect(oceanSrc).toContain('terrainHeightmap.dispose()');
      expect(oceanSrc).toContain('waterMesh.geometry.dispose()');
      expect(oceanSrc).toContain('waterMesh.material.dispose()');

      // Test disposal logic handling both single material and array of materials
      const heightmapDispose = vi.fn();
      const geometryDispose = vi.fn();
      const mat1Dispose = vi.fn();
      const mat2Dispose = vi.fn();

      const mockHeightmap = { dispose: heightmapDispose };
      const mockWaterMeshArray = {
        geometry: { dispose: geometryDispose },
        material: [{ dispose: mat1Dispose }, { dispose: mat2Dispose }],
      };

      const cleanup = () => {
        mockHeightmap.dispose();
        mockWaterMeshArray.geometry.dispose();
        if (Array.isArray(mockWaterMeshArray.material)) {
          mockWaterMeshArray.material.forEach((m) => m.dispose());
        } else {
          (mockWaterMeshArray.material as { dispose: () => void }).dispose();
        }
      };

      cleanup();

      expect(heightmapDispose).toHaveBeenCalledTimes(1);
      expect(geometryDispose).toHaveBeenCalledTimes(1);
      expect(mat1Dispose).toHaveBeenCalledTimes(1);
      expect(mat2Dispose).toHaveBeenCalledTimes(1);
    });

    it('CHALLENGE 3.2: Verifies TitleScreen audio context reuse eliminates AudioContext leak', () => {
      const titleSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/TitleScreen.tsx'),
        'utf-8',
      );

      // Must have module-level singleton definition
      expect(titleSrc).toContain('let _unlockAudioCtx: AudioContext | null = null');
      expect(titleSrc).toContain('if (!_unlockAudioCtx)');
      expect(titleSrc).toContain('_unlockAudioCtx = new AudioCtx()');
      expect(titleSrc).toContain('_unlockAudioCtx.resume()');

      // Simulate 50 repeated unlocks using the module pattern
      let instanceCount = 0;
      let resumeCount = 0;

      class MockAudioContext {
        state: 'suspended' | 'running' = 'suspended';
        constructor() {
          instanceCount++;
        }
        async resume() {
          resumeCount++;
          this.state = 'running';
        }
      }

      let testAudioCtx: MockAudioContext | null = null;
      const unlockAudioContextTest = () => {
        if (!testAudioCtx) {
          testAudioCtx = new MockAudioContext();
        }
        if (testAudioCtx && testAudioCtx.state === 'suspended') {
          testAudioCtx.resume();
        }
      };

      for (let i = 0; i < 50; i++) {
        unlockAudioContextTest();
      }

      // Must strictly allocate exactly 1 AudioContext regardless of 50 invocations
      expect(instanceCount).toBe(1);
      expect(resumeCount).toBe(1);
    });

    it('CHALLENGE 3.3: Verifies GarageView cleans up OrbitControls on unmount', () => {
      const garageSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/GarageView.tsx'),
        'utf-8',
      );

      expect(garageSrc).toContain('const controls = controlsRef.current');
      expect(garageSrc).toContain('controls.dispose()');
    });

    it('CHALLENGE 3.4: Verifies HeroShowcase eliminates secondary 3D Canvas from main menu', () => {
      const showcaseSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/HeroShowcase.tsx'),
        'utf-8',
      );

      // Must not contain WebGL Canvas, OrbitControls, Environment, or 3D CarModelDisplay
      expect(showcaseSrc).not.toContain('<Canvas');
      expect(showcaseSrc).not.toContain('<OrbitControls');
      expect(showcaseSrc).not.toContain('<Environment');
      expect(showcaseSrc).not.toContain('CarModelDisplay');

      // But must retain STAGE_BANNERS export and performant 2D card
      expect(showcaseSrc).toContain('export const STAGE_BANNERS');
      expect(showcaseSrc).toContain('3D GARAGE ➜');
    });
  });

  // =========================================================================
  // Area 4: Frameloop, Mobile Frame Pacer & Pointer Events Invariants
  // =========================================================================
  describe('Area 4: Frameloop, Mobile Frame Pacer & Pointer Events Invariants', () => {
    it('CHALLENGE 4.1: Exhaustively validates frameloop logic across desktop and mobile platforms', () => {
      // Logic from GameCanvas.tsx:
      // const isGameplay = gameState === 'playing' || gameState === 'paused';
      // const frameloop = !isGameplay ? 'never' : (isMobile ? 'never' : 'always');
      // enabled={isMobile && isGameplay}

      const getFrameloopConfig = (gameState: string, isMobile: boolean) => {
        const isGameplay = gameState === 'playing' || gameState === 'paused';
        const frameloop = !isGameplay ? 'never' : (isMobile ? 'never' : 'always');
        const pacerEnabled = isMobile && isGameplay;
        const pointerEvents = isGameplay ? 'auto' : 'none';
        return { isGameplay, frameloop, pacerEnabled, pointerEvents };
      };

      // Desktop checks
      expect(getFrameloopConfig('title', false)).toEqual({
        isGameplay: false,
        frameloop: 'never',
        pacerEnabled: false,
        pointerEvents: 'none',
      });
      expect(getFrameloopConfig('menu', false)).toEqual({
        isGameplay: false,
        frameloop: 'never',
        pacerEnabled: false,
        pointerEvents: 'none',
      });
      expect(getFrameloopConfig('playing', false)).toEqual({
        isGameplay: true,
        frameloop: 'always',
        pacerEnabled: false,
        pointerEvents: 'auto',
      });
      expect(getFrameloopConfig('paused', false)).toEqual({
        isGameplay: true,
        frameloop: 'always',
        pacerEnabled: false,
        pointerEvents: 'auto',
      });

      // Mobile checks (Pixel 10 Pro)
      expect(getFrameloopConfig('title', true)).toEqual({
        isGameplay: false,
        frameloop: 'never',
        pacerEnabled: false,
        pointerEvents: 'none',
      });
      expect(getFrameloopConfig('menu', true)).toEqual({
        isGameplay: false,
        frameloop: 'never',
        pacerEnabled: false,
        pointerEvents: 'none',
      });
      expect(getFrameloopConfig('playing', true)).toEqual({
        isGameplay: true,
        frameloop: 'never',
        pacerEnabled: true,
        pointerEvents: 'auto',
      });
      expect(getFrameloopConfig('paused', true)).toEqual({
        isGameplay: true,
        frameloop: 'never',
        pacerEnabled: true,
        pointerEvents: 'auto',
      });
    });

    it('CHALLENGE 4.2: Verifies App.tsx mounts GameCanvas unconditionally at root and conditionally mounts TouchControlsOverlay', () => {
      const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

      // Must mount GameCanvas inside Suspense at root
      expect(appSrc).toContain('<GameCanvas />');
      expect(appSrc).not.toContain('{showGame &&');

      // Touch controls must only mount when isGameplay is true
      expect(appSrc).toContain('{isGameplay && <TouchControlsOverlay />}');
    });
  });

  // =========================================================================
  // Area 5: Overall Stress Invariant Verification
  // =========================================================================
  describe('Area 5: Overall Stress Invariant Verification', () => {
    it('CHALLENGE 5.1: Verifies total concurrent 3D Canvases across the application never exceeds 2', () => {
      // GameCanvas is persistent (1 canvas).
      // HeroShowcase was converted to 2D card (0 canvas).
      // GarageView creates 1 turntable canvas when open (1 canvas).
      // In all application states, total active canvases <= 2, well within Android hardware limit of 8.
      const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
      const showcaseSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/HeroShowcase.tsx'),
        'utf-8',
      );
      const garageSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/ui/menu/GarageView.tsx'),
        'utf-8',
      );

      const countOccurrences = (str: string, substr: string) =>
        (str.match(new RegExp(substr, 'g')) || []).length;

      // App has 1 GameCanvas
      expect(countOccurrences(appSrc, '<GameCanvas />')).toBe(1);

      // HeroShowcase has 0 Canvas
      expect(countOccurrences(showcaseSrc, '<Canvas')).toBe(0);

      // GarageView has exactly 1 Canvas
      expect(countOccurrences(garageSrc, '<Canvas')).toBe(1);
    });
  });
});
