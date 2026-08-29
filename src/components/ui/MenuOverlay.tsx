import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRacingStore } from '@/store/racingStore';
import { Canvas } from '@react-three/fiber';
import { useGLTF, PresentationControls, Clone, Environment } from '@react-three/drei';
import { Wheel } from '@/components/vehicle/Wheel';
import { getAvailableVehicles, getVehiclePreset } from '@/config/vehicleRegistry';
import { getAvailableLevels, getLevelPreset } from '@/config/levelRegistry';
import type { GraphicsQuality, VehiclePreset } from '@/types';
import { sampleGamepad, resetGamepadEdgeState } from '@/utils/input/gamepad';

function formatLapTime(seconds: number): string {
  if (seconds <= 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

function CarModelDisplay({ preset }: { preset: VehiclePreset }) {
  const { scene } = useGLTF(preset.modelPath);
  const offset = preset.modelPositionOffset ?? [0, 0.2, 0.1];
  const scale = preset.modelScale ?? [4.5, 4.5, 4.5];

  return (
    <group>
      <Clone 
        object={scene} 
        position={offset} 
        scale={scale} 
        castShadow 
        receiveShadow 
      />
      {preset.config.wheels.map((wheel, index) => {
        // Account for suspension rest length compression under vehicle weight
        // so wheels sit accurately inside the wheel arches without clipping into the body
        const restLength = wheel.suspensionRestLength ?? 0.32;
        const restSuspensionOffset = restLength * 0.75;
        const wheelY = wheel.position[1] - restSuspensionOffset;

        return (
          <group key={index} position={[wheel.position[0], wheelY, wheel.position[2]]}>
            <Wheel isRightSide={wheel.position[0] > 0} radius={wheel.radius} />
          </group>
        );
      })}
    </group>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(Math.max((value / 10) * 100, 5), 100);
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <div style={styles.statTrack}>
        <div style={{ ...styles.statFill, width: `${percent}%` }} />
      </div>
      <span style={styles.statValue}>{value.toFixed(1)}</span>
    </div>
  );
}

/**
 * Overlay rendering the Main Menu or Pause Menu
 * Features game mode selection (Free Roam / Time Attack), track records,
 * garage car selector, track selector, audio/graphics options, and controls.
 */
export function MenuOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useGameStore((s) => s.setSelectedVehicleId);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const setSelectedLevelId = useGameStore((s) => s.setSelectedLevelId);
  const gamepadConnected = useGameStore((s) => s.gamepadConnected);
  const gamepadName = useGameStore((s) => s.gamepadName);
  const gamepadType = useGameStore((s) => s.gamepadType);

  const bestLapTimes = useRacingStore((s) => s.bestLapTimes);
  const getBestLapForLevel = useRacingStore((s) => s.getBestLapForLevel);
  const syncBestLapForLevel = useRacingStore((s) => s.syncBestLapForLevel);
  const resetAllTrackRecords = useRacingStore((s) => s.resetAllTrackRecords);

  const [view, setViewInternal] = useState<'main' | 'start_mode' | 'options' | 'controls' | 'garage' | 'tracks'>('main');
  const [previewVehicleId, setPreviewVehicleIdInternal] = useState(selectedVehicleId);
  const [controlsTab, setControlsTabInternal] = useState<'dualsense' | 'xbox' | 'keyboard'>('dualsense');
  const [focusedIndex, setFocusedIndexInternal] = useState(0);
  const [resetConfirmState, setResetConfirmState] = useState<'idle' | 'confirming' | 'done'>('idle');
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  const controlsTabRef = useRef(controlsTab);
  controlsTabRef.current = controlsTab;
  const previewVehicleIdRef = useRef(previewVehicleId);
  previewVehicleIdRef.current = previewVehicleId;

  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  const setView = useCallback((nextView: 'main' | 'start_mode' | 'options' | 'controls' | 'garage' | 'tracks') => {
    resetGamepadEdgeState();
    viewRef.current = nextView;
    focusedIndexRef.current = 0;
    setViewInternal(nextView);
    setFocusedIndexInternal(0);
    setResetConfirmState('idle');
  }, []);

  const setFocusedIndex = useCallback((index: number) => {
    focusedIndexRef.current = index;
    setFocusedIndexInternal(index);
  }, []);

  const setPreviewVehicleId = useCallback((id: string) => {
    previewVehicleIdRef.current = id;
    setPreviewVehicleIdInternal(id);
  }, []);

  const setControlsTab = useCallback((tab: 'dualsense' | 'xbox' | 'keyboard') => {
    controlsTabRef.current = tab;
    setControlsTabInternal(tab);
  }, []);

  // Filter out synthetic pointer events caused by CSS transform animations
  const handlePointerMoveItem = useCallback((index: number, e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - lastPointerPosRef.current.x);
    const dy = Math.abs(e.clientY - lastPointerPosRef.current.y);
    if (lastPointerPosRef.current.x !== -1 && dx < 3 && dy < 3) {
      return;
    }
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    setFocusedIndex(index);
  }, [setFocusedIndex]);

  // Auto-switch to connected gamepad tab
  useEffect(() => {
    if (gamepadType === 'dualsense') {
      setControlsTab('dualsense');
    } else if (gamepadType === 'xbox') {
      setControlsTab('xbox');
    }
  }, [gamepadType, setControlsTab]);

  const { 
    graphicsQuality, setGraphicsQuality, 
    shadowsEnabled, toggleShadows, 
    postProcessingEnabled, togglePostProcessing,
    sfxVolume, setSfxVolume,
    menuMusicVolume, setMenuMusicVolume,
    gameMusicVolume, setGameMusicVolume,
    sensitivity, setSensitivity,
    vibrationEnabled, toggleVibration,
    vibrationIntensity, setVibrationIntensity,
  } = useSettingsStore();

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = menuMusicVolume;
    }
  }, [menuMusicVolume, gameState]);

  // Handle browser autoplay policy by starting menu music on any user interaction
  useEffect(() => {
    const playMenuMusic = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', playMenuMusic, { passive: true });
    window.addEventListener('keydown', playMenuMusic, { passive: true });
    window.addEventListener('touchstart', playMenuMusic, { passive: true });

    playMenuMusic();

    return () => {
      window.removeEventListener('pointerdown', playMenuMusic);
      window.removeEventListener('keydown', playMenuMusic);
      window.removeEventListener('touchstart', playMenuMusic);
    };
  }, [gameState]);

  const ensureAudioPlayback = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  // Always reset view & focus to 'main' whenever entering pause menu or main menu
  useEffect(() => {
    if (gameState === 'paused' || gameState === 'menu') {
      resetGamepadEdgeState();
      viewRef.current = 'main';
      focusedIndexRef.current = 0;
      setViewInternal('main');
      setFocusedIndexInternal(0);
    }
  }, [gameState]);

  const isPause = gameState === 'paused';
  const availableVehicles = getAvailableVehicles();
  const availableLevels = getAvailableLevels();
  const previewPreset = getVehiclePreset(previewVehicleId);
  const currentLevelPreset = getLevelPreset(selectedLevelId);

  const handleLaunchMode = useCallback((mode: 'freeroam' | 'timeattack') => {
    resetGamepadEdgeState();
    setGameMode(mode);
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
    syncBestLapForLevel(selectedLevelId);
    if (mode === 'timeattack') {
      useRacingStore.getState().startCountdown();
    }
    setView('main');
    setGameState('playing');
  }, [selectedLevelId, setGameMode, setGameState, setView, syncBestLapForLevel]);

  const handleReset = useCallback(() => {
    resetGamepadEdgeState();
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
    syncBestLapForLevel(selectedLevelId);
    if (gameMode === 'timeattack') {
      useRacingStore.getState().startCountdown();
    }
    setView('main');
    setGameState('playing');
  }, [gameMode, selectedLevelId, setGameState, setView, syncBestLapForLevel]);

  const handleSelectTrack = useCallback((levelId: string) => {
    setSelectedLevelId(levelId);
    syncBestLapForLevel(levelId);
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
  }, [setSelectedLevelId, syncBestLapForLevel]);

  const handleReturnToMainMenu = useCallback(() => {
    resetGamepadEdgeState();
    focusedIndexRef.current = 0;
    setFocusedIndexInternal(0);
    const spawnPos = currentLevelPreset.spawnPosition;
    useGameStore.setState({
      speed: 0,
      lateralSpeed: 0,
      slipAngle: 0,
      rpm: 1000,
      gear: 1,
      heading: currentLevelPreset.spawnRotationY,
      position: [spawnPos[0], spawnPos[1], spawnPos[2]],
    });
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
    syncBestLapForLevel(selectedLevelId);
    setView('main');
    setGameState('menu');
  }, [currentLevelPreset, selectedLevelId, setGameState, setView, syncBestLapForLevel]);

  // Clean up confirmation timer on unmount
  useEffect(() => {
    return () => {
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
    };
  }, []);

  const handleResetRecordsAction = useCallback(() => {
    if (resetConfirmState === 'idle') {
      setResetConfirmState('confirming');
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
      resetConfirmTimerRef.current = setTimeout(() => {
        setResetConfirmState('idle');
      }, 4000);
    } else if (resetConfirmState === 'confirming') {
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
      resetAllTrackRecords();
      setResetConfirmState('done');
      resetConfirmTimerRef.current = setTimeout(() => {
        setResetConfirmState('idle');
      }, 2500);
    }
  }, [resetAllTrackRecords, resetConfirmState]);

  const getItemCount = useCallback((): number => {
    const curView = viewRef.current;
    if (curView === 'main') return 5;
    if (curView === 'start_mode') return 3;
    if (curView === 'garage') return 2;
    if (curView === 'tracks') return availableLevels.length + 1;
    if (curView === 'options') {
      const isVib = useSettingsStore.getState().vibrationEnabled;
      return isVib ? 11 : 10;
    }
    if (curView === 'controls') return 1;
    return 1;
  }, [availableLevels.length]);

  const handleNavUp = useCallback(() => {
    const count = getItemCount();
    const next = (focusedIndexRef.current - 1 + count) % count;
    setFocusedIndex(next);
  }, [getItemCount, setFocusedIndex]);

  const handleNavDown = useCallback(() => {
    const count = getItemCount();
    const next = (focusedIndexRef.current + 1) % count;
    setFocusedIndex(next);
  }, [getItemCount, setFocusedIndex]);

  const handleNavLeft = useCallback(() => {
    const curView = viewRef.current;
    const curIdx = focusedIndexRef.current;

    if (curView === 'start_mode') {
      setFocusedIndex(0);
    } else if (curView === 'garage') {
      const currentIndex = availableVehicles.findIndex((v) => v.id === previewVehicleIdRef.current);
      const nextIdx = (currentIndex - 1 + availableVehicles.length) % availableVehicles.length;
      setPreviewVehicleId(availableVehicles[nextIdx].id);
    } else if (curView === 'controls') {
      const tabs: ('dualsense' | 'xbox' | 'keyboard')[] = ['dualsense', 'xbox', 'keyboard'];
      const tabIdx = tabs.indexOf(controlsTabRef.current);
      setControlsTab(tabs[(tabIdx - 1 + tabs.length) % tabs.length]);
    } else if (curView === 'options') {
      const settings = useSettingsStore.getState();
      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];
      if (curIdx === 0) {
        const qIdx = qualities.indexOf(settings.graphicsQuality);
        if (qIdx > 0) settings.setGraphicsQuality(qualities[qIdx - 1]);
      } else if (curIdx === 1) {
        settings.toggleShadows();
      } else if (curIdx === 2) {
        settings.togglePostProcessing();
      } else if (curIdx === 3) {
        settings.setSensitivity(Math.max(0.5, Math.min(2.0, settings.sensitivity - 0.1)));
      } else if (curIdx === 4) {
        settings.toggleVibration();
      } else if (settings.vibrationEnabled && curIdx === 5) {
        settings.setVibrationIntensity(Math.max(0.1, Math.min(1.0, settings.vibrationIntensity - 0.05)));
      } else {
        const musicOffset = settings.vibrationEnabled ? 6 : 5;
        if (curIdx === musicOffset) {
          settings.setMenuMusicVolume(Math.max(0, Math.min(1, settings.menuMusicVolume - 0.05)));
        } else if (curIdx === musicOffset + 1) {
          settings.setGameMusicVolume(Math.max(0, Math.min(1, settings.gameMusicVolume - 0.05)));
        } else if (curIdx === musicOffset + 2) {
          settings.setSfxVolume(Math.max(0, Math.min(1, settings.sfxVolume - 0.05)));
        }
      }
    }
  }, [availableVehicles, setControlsTab, setFocusedIndex, setPreviewVehicleId]);

  const handleNavRight = useCallback(() => {
    const curView = viewRef.current;
    const curIdx = focusedIndexRef.current;

    if (curView === 'start_mode') {
      setFocusedIndex(1);
    } else if (curView === 'garage') {
      const currentIndex = availableVehicles.findIndex((v) => v.id === previewVehicleIdRef.current);
      const nextIdx = (currentIndex + 1) % availableVehicles.length;
      setPreviewVehicleId(availableVehicles[nextIdx].id);
    } else if (curView === 'controls') {
      const tabs: ('dualsense' | 'xbox' | 'keyboard')[] = ['dualsense', 'xbox', 'keyboard'];
      const tabIdx = tabs.indexOf(controlsTabRef.current);
      setControlsTab(tabs[(tabIdx + 1) % tabs.length]);
    } else if (curView === 'options') {
      const settings = useSettingsStore.getState();
      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];
      if (curIdx === 0) {
        const qIdx = qualities.indexOf(settings.graphicsQuality);
        if (qIdx < qualities.length - 1) settings.setGraphicsQuality(qualities[qIdx + 1]);
      } else if (curIdx === 1) {
        settings.toggleShadows();
      } else if (curIdx === 2) {
        settings.togglePostProcessing();
      } else if (curIdx === 3) {
        settings.setSensitivity(Math.max(0.5, Math.min(2.0, settings.sensitivity + 0.1)));
      } else if (curIdx === 4) {
        settings.toggleVibration();
      } else if (settings.vibrationEnabled && curIdx === 5) {
        settings.setVibrationIntensity(Math.max(0.1, Math.min(1.0, settings.vibrationIntensity + 0.05)));
      } else {
        const musicOffset = settings.vibrationEnabled ? 6 : 5;
        if (curIdx === musicOffset) {
          settings.setMenuMusicVolume(Math.max(0, Math.min(1, settings.menuMusicVolume + 0.05)));
        } else if (curIdx === musicOffset + 1) {
          settings.setGameMusicVolume(Math.max(0, Math.min(1, settings.gameMusicVolume + 0.05)));
        } else if (curIdx === musicOffset + 2) {
          settings.setSfxVolume(Math.max(0, Math.min(1, settings.sfxVolume + 0.05)));
        }
      }
    }
  }, [availableVehicles, setControlsTab, setFocusedIndex, setPreviewVehicleId]);

  const handleConfirm = useCallback(() => {
    const curView = viewRef.current;
    const curIdx = focusedIndexRef.current;
    const isPaused = useGameStore.getState().gameState === 'paused';

    if (curView === 'main') {
      if (isPaused) {
        if (curIdx === 0) setGameState('playing');
        else if (curIdx === 1) handleReset();
        else if (curIdx === 2) setView('options');
        else if (curIdx === 3) setView('controls');
        else if (curIdx === 4) handleReturnToMainMenu();
      } else {
        if (curIdx === 0) setView('start_mode');
        else if (curIdx === 1) {
          setPreviewVehicleId(selectedVehicleId);
          setView('garage');
        } else if (curIdx === 2) setView('tracks');
        else if (curIdx === 3) setView('options');
        else if (curIdx === 4) setView('controls');
      }
    } else if (curView === 'start_mode') {
      if (curIdx === 0) handleLaunchMode('freeroam');
      else if (curIdx === 1) handleLaunchMode('timeattack');
      else if (curIdx === 2) setView('main');
    } else if (curView === 'garage') {
      if (curIdx === 0) {
        setSelectedVehicleId(previewVehicleIdRef.current);
        useGameStore.getState().triggerReset(true);
      } else if (curIdx === 1) {
        setView('main');
      }
    } else if (curView === 'tracks') {
      if (curIdx < availableLevels.length) {
        handleSelectTrack(availableLevels[curIdx].id);
      } else {
        setView('main');
      }
    } else if (curView === 'options') {
      const isVib = useSettingsStore.getState().vibrationEnabled;
      const optionsCount = isVib ? 11 : 10;
      const resetIdx = isVib ? 9 : 8;
      if (curIdx === 1) {
        useSettingsStore.getState().toggleShadows();
      } else if (curIdx === 2) {
        useSettingsStore.getState().togglePostProcessing();
      } else if (curIdx === 4) {
        useSettingsStore.getState().toggleVibration();
      } else if (curIdx === resetIdx) {
        handleResetRecordsAction();
      } else if (curIdx === optionsCount - 1) {
        setView('main');
      }
    } else if (curView === 'controls') {
      setView('main');
    }
  }, [
    availableLevels,
    handleLaunchMode,
    handleReset,
    handleResetRecordsAction,
    handleReturnToMainMenu,
    handleSelectTrack,
    selectedVehicleId,
    setGameState,
    setSelectedVehicleId,
    setPreviewVehicleId,
    setView,
  ]);

  const handleBack = useCallback(() => {
    const curView = viewRef.current;
    const isPaused = useGameStore.getState().gameState === 'paused';

    if (curView !== 'main') {
      setView('main');
    } else if (isPaused) {
      setGameState('playing');
    }
  }, [setGameState, setView]);

  // Keep actions ref updated for the persistent RAF and keyboard listeners
  const actionsRef = useRef({
    handleNavUp,
    handleNavDown,
    handleNavLeft,
    handleNavRight,
    handleConfirm,
    handleBack,
  });
  actionsRef.current = {
    handleNavUp,
    handleNavDown,
    handleNavLeft,
    handleNavRight,
    handleConfirm,
    handleBack,
  };

  // Keyboard navigation listener across all menus
  useEffect(() => {
    if (gameState === 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        actionsRef.current.handleNavUp();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        actionsRef.current.handleNavDown();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        actionsRef.current.handleNavLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        actionsRef.current.handleNavRight();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        actionsRef.current.handleConfirm();
      } else if (e.code === 'Escape' || e.code === 'Backspace') {
        e.preventDefault();
        actionsRef.current.handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Gamepad navigation controller across all menus
  useEffect(() => {
    if (gameState === 'playing') return;

    let animId: number;
    const pollMenuGamepad = () => {
      const gp = sampleGamepad();
      if (gp.connected) {
        // 1. Primary Action Buttons (Confirm / Back / Pause Toggle)
        if (gp.menuConfirm) {
          actionsRef.current.handleConfirm();
        } else if (gp.menuBack) {
          actionsRef.current.handleBack();
        } else if (gp.pauseToggle && useGameStore.getState().gameState === 'paused') {
          actionsRef.current.handleBack();
        }

        // 2. Vertical Navigation (Up / Down) - independent of Confirm/Back
        if (gp.menuUp) {
          actionsRef.current.handleNavUp();
        } else if (gp.menuDown) {
          actionsRef.current.handleNavDown();
        }

        // 3. Horizontal Navigation (Left / Right) - independent of Vertical & Actions
        if (gp.menuLeft) {
          actionsRef.current.handleNavLeft();
        } else if (gp.menuRight) {
          actionsRef.current.handleNavRight();
        }
      }
      animId = requestAnimationFrame(pollMenuGamepad);
    };

    animId = requestAnimationFrame(pollMenuGamepad);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  const currentOverlayStyle = styles.overlayMenu;
  const currentCardStyle = styles.cardMenu;
  const textColor = '#333333';
  const subtitleColor = '#666666';

  const getFocusStyle = (isFocused: boolean): React.CSSProperties => {
    if (!isFocused) return {};
    return {
      outline: '3px solid #00d4ff',
      boxShadow: '0 0 20px rgba(0, 212, 255, 0.75), 0 4px 16px rgba(0, 0, 0, 0.35)',
      transform: 'scale(1.025)',
      zIndex: 3,
      transition: 'transform 0.12s ease, box-shadow 0.12s ease, outline 0.12s ease',
    };
  };

  const renderMainView = () => (
    <div style={styles.buttonGroup}>
      {isPause ? (
        <>
          <button 
            style={{ ...styles.button, ...getFocusStyle(focusedIndex === 0) }} 
            onPointerMove={(e) => handlePointerMoveItem(0, e)}
            onClick={() => setGameState('playing')}
          >
            Resume (ESC)
          </button>
          
          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 1),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(1, e)}
            onClick={handleReset}
          >
            Restart / Reset Vehicle
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 2),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(2, e)}
            onClick={() => setView('options')}
          >
            Options
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 3),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(3, e)}
            onClick={() => setView('controls')}
          >
            Controls
          </button>
          
          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: '#dc2626',
              borderColor: 'rgba(220, 38, 38, 0.3)',
              ...getFocusStyle(focusedIndex === 4),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(4, e)}
            onClick={handleReturnToMainMenu}
          >
            Return to Main Menu
          </button>
        </>
      ) : (
        <>
          <button 
            style={{
              ...styles.button,
              fontSize: '18px',
              padding: '18px 24px',
              boxShadow: '0 6px 20px rgba(227, 24, 55, 0.4)',
              letterSpacing: '1px',
              ...getFocusStyle(focusedIndex === 0),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(0, e)}
            onClick={() => setView('start_mode')}
          >
            ▶ START GAME
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 1),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(1, e)}
            onClick={() => {
              setPreviewVehicleId(selectedVehicleId);
              setView('garage');
            }}
          >
            Garage (Vehicles)
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 2),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(2, e)}
            onClick={() => setView('tracks')}
          >
            Tracks & Stages
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 3),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(3, e)}
            onClick={() => setView('options')}
          >
            Options
          </button>

          <button 
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 4),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(4, e)}
            onClick={() => setView('controls')}
          >
            Controls
          </button>
        </>
      )}
    </div>
  );

  const renderStartModeView = () => {
    const selectedLevelBest = getBestLapForLevel(selectedLevelId);

    return (
      <div style={{ ...styles.subView, color: textColor, width: '100%', minWidth: '560px' }}>
        <h2 style={{ ...styles.subViewTitle, marginBottom: '6px' }}>Select Game Mode</h2>
        
        {/* Selected Track Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.04)',
          padding: '6px 14px',
          borderRadius: '20px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#555',
        }}>
          <span>Active Track: <strong>{currentLevelPreset.name}</strong></span>
          <button 
            style={{ border: 'none', background: 'transparent', color: '#E31837', fontWeight: 700, cursor: 'pointer', fontSize: '12px', padding: 0 }}
            onClick={() => setView('tracks')}
          >
            (Change Track)
          </button>
        </div>        {/* Mode Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
          {/* 1. Free Roam Card */}
          <div 
            style={{
              ...styles.modeCard,
              borderColor: gameMode === 'freeroam' ? '#10b981' : 'rgba(0,0,0,0.12)',
              background: 'rgba(16, 185, 129, 0.04)',
              cursor: 'pointer',
              ...getFocusStyle(focusedIndex === 0),
            }}
            onPointerMove={(e) => handlePointerMoveItem(0, e)}
            onClick={() => handleLaunchMode('freeroam')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ ...styles.modeBadge, background: '#10b981' }}>🌿 OPEN WORLD</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Free Roam
            </h3>
            <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1 }}>
              Drive freely across open hills and valleys. No checkpoint gates, no timer pressure — pure driving enjoyment.
            </p>
            <button
              style={{
                ...styles.button,
                background: 'linear-gradient(90deg, #059669, #10b981)',
                padding: '12px 16px',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLaunchMode('freeroam');
              }}
            >
              Launch Free Roam
            </button>
          </div>

          {/* 2. Time Attack Card */}
          <div 
            style={{
              ...styles.modeCard,
              borderColor: gameMode === 'timeattack' ? '#E31837' : 'rgba(0,0,0,0.12)',
              background: 'rgba(227, 24, 55, 0.04)',
              cursor: 'pointer',
              ...getFocusStyle(focusedIndex === 1),
            }}
            onPointerMove={(e) => handlePointerMoveItem(1, e)}
            onClick={() => handleLaunchMode('timeattack')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ ...styles.modeBadge, background: '#E31837' }}>⚡ RALLY STAGE</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Time Attack
            </h3>
            <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.4, margin: '0 0 10px 0' }}>
              Pass through all checkpoint gates and set the fastest lap record on the circuit.
            </p>
            
            {/* Record Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.06)',
              marginBottom: '16px',
              fontSize: '12px',
              fontWeight: 700,
              color: selectedLevelBest ? '#d97706' : '#6b7280',
            }}>
              <span>🏆 Track Record:</span>
              <span>{selectedLevelBest ? formatLapTime(selectedLevelBest) : 'No time set yet'}</span>
            </div>

            <button
              style={{
                ...styles.button,
                background: 'linear-gradient(90deg, #1B365D, #E31837)',
                padding: '12px 16px',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLaunchMode('timeattack');
              }}
            >
              Start Time Attack
            </button>
          </div>
        </div>

        <button 
          style={{ 
            ...styles.button, 
            ...styles.secondaryButton, 
            color: textColor, 
            borderColor: 'rgba(0,0,0,0.2)', 
            width: '100%', 
            marginTop: '16px',
            ...getFocusStyle(focusedIndex === 2),
          }} 
          onPointerMove={(e) => handlePointerMoveItem(2, e)}
          onClick={() => setView('main')}
        >
          Back
        </button>
      </div>
    );
  };

  const renderGarageView = () => {
    const isEquipped = selectedVehicleId === previewVehicleId;

    return (
      <div style={{ ...styles.subView, color: textColor, width: '100%', minWidth: '520px' }}>
        <h2 style={styles.subViewTitle}>Garage</h2>

        {/* Vehicle Selection Tabs */}
        <div style={styles.tabContainer}>
          {availableVehicles.map((veh) => (
            <button
              key={veh.id}
              style={{
                ...styles.tabButton,
                ...(previewVehicleId === veh.id ? styles.activeTabButton : {}),
              }}
              onClick={() => setPreviewVehicleId(veh.id)}
            >
              {veh.name}
            </button>
          ))}
        </div>

        {/* 3D Preview Canvas */}
        <div style={{ width: '100%', height: '240px', background: 'rgba(0,0,0,0.04)', borderRadius: '12px', overflow: 'hidden', cursor: 'grab' }}>
          <Canvas shadows dpr={[1, 2]} camera={{ position: [4, 2.5, -6], fov: 45 }}>
            <color attach="background" args={['#e8ecf0']} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[10, 10, 10]} intensity={1.5} />
            <PresentationControls speed={1.5} global zoom={0.8} polar={[-0.1, Math.PI / 4]}>
              <group position={[0, 0.2, 0]}>
                <CarModelDisplay preset={previewPreset} />
              </group>
            </PresentationControls>
            <Environment preset="city" />
          </Canvas>
        </div>

        {/* Specs and Description */}
        <div style={styles.garageDetails}>
          <div style={styles.garageHeader}>
            <span style={styles.garageVehicleName}>{previewPreset.name}</span>
            <span style={styles.driveBadge}>{previewPreset.stats.driveType}</span>
          </div>
          <p style={{ ...styles.subtitle, color: subtitleColor, margin: '4px 0 12px 0', fontSize: '13px' }}>
            {previewPreset.description}
          </p>

          <div style={styles.statsContainer}>
            <StatBar label="Top Speed" value={previewPreset.stats.topSpeed} />
            <StatBar label="Acceleration" value={previewPreset.stats.acceleration} />
            <StatBar label="Handling" value={previewPreset.stats.handling} />
            <StatBar label="Offroad" value={previewPreset.stats.offroad} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
          <button
            style={{
              ...styles.button,
              flex: 1,
              background: isEquipped ? '#10b981' : 'linear-gradient(90deg, #1B365D, #E31837)',
              ...getFocusStyle(focusedIndex === 0),
            }}
            onPointerMove={(e) => handlePointerMoveItem(0, e)}
            onClick={() => {
              setSelectedVehicleId(previewVehicleId);
              useGameStore.getState().triggerReset(true);
            }}
          >
            {isEquipped ? '✓ Equipped' : 'Equip Vehicle'}
          </button>
          <button
            style={{ 
              ...styles.button, 
              ...styles.secondaryButton, 
              color: textColor, 
              borderColor: 'rgba(0,0,0,0.2)', 
              width: '100px',
              ...getFocusStyle(focusedIndex === 1),
            }} 
            onPointerMove={(e) => handlePointerMoveItem(1, e)}
            onClick={() => setView('main')}
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderTracksView = () => (
    <div style={{ ...styles.subView, color: textColor, width: '100%', minWidth: '500px' }}>
      <h2 style={styles.subViewTitle}>Tracks & Stages</h2>
      <p style={{ ...styles.subtitle, color: subtitleColor, margin: '0 0 16px 0' }}>
        Select a rally course and view stage lap records.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {availableLevels.map((lvl, index) => {
          const isSelected = selectedLevelId === lvl.id;
          const bestTime = bestLapTimes[lvl.id] ?? null;

          return (
            <div
              key={lvl.id}
              style={{
                ...styles.trackCard,
                borderColor: isSelected ? '#E31837' : 'rgba(0,0,0,0.1)',
                background: isSelected ? 'rgba(227, 24, 55, 0.05)' : 'rgba(0,0,0,0.02)',
                ...getFocusStyle(focusedIndex === index),
              }}
              onPointerMove={(e) => handlePointerMoveItem(index, e)}
              onClick={() => handleSelectTrack(lvl.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>{lvl.name}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    ...styles.difficultyBadge,
                    background: lvl.difficulty === 'easy' ? '#10b981' : lvl.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                  }}>
                    {lvl.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Surface & Track Record Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  Surface: {lvl.surfaceDescription}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: bestTime ? '#d97706' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  🏆 {bestTime ? formatLapTime(bestTime) : '--:--.--'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#555', margin: '2px 0 0 0' }}>
                {lvl.description}
              </p>
              {isSelected && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#E31837', marginTop: '6px' }}>
                  ✓ Selected Stage
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button 
        style={{ 
          ...styles.button, 
          marginTop: '20px', 
          width: '100%',
          ...getFocusStyle(focusedIndex === availableLevels.length),
        }} 
        onPointerMove={(e) => handlePointerMoveItem(availableLevels.length, e)}
        onClick={() => setView('main')}
      >
        Back
      </button>
    </div>
  );

  const renderOptionsView = () => {
    let optIdx = 0;
    const gqIdx = optIdx++;
    const shIdx = optIdx++;
    const ppIdx = optIdx++;
    const sensIdx = optIdx++;
    const vibIdx = optIdx++;
    const vibIntIdx = vibrationEnabled ? optIdx++ : -1;
    const mmIdx = optIdx++;
    const gmIdx = optIdx++;
    const sfxIdx = optIdx++;
    const resetIdx = optIdx++;
    const backIdx = optIdx++;

    return (
      <div style={{ ...styles.subView, color: textColor }}>
        <h2 style={styles.subViewTitle}>Options</h2>
        
        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === gqIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(gqIdx, e)}
        >
          <span>Graphics Quality</span>
          <select 
            value={graphicsQuality} 
            onChange={(e) => setGraphicsQuality(e.target.value as GraphicsQuality)}
            style={styles.select}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="very_high">Very High</option>
          </select>
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === shIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(shIdx, e)}
        >
          <span>Real-time Shadows</span>
          <input 
            type="checkbox" 
            checked={shadowsEnabled} 
            onChange={toggleShadows}
            style={styles.checkbox}
          />
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === ppIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(ppIdx, e)}
        >
          <span>Post Processing</span>
          <input 
            type="checkbox" 
            checked={postProcessingEnabled} 
            onChange={togglePostProcessing}
            style={styles.checkbox}
          />
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === sensIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(sensIdx, e)}
        >
          <span>Steering Sensitivity ({sensitivity.toFixed(1)}x)</span>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === vibIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(vibIdx, e)}
        >
          <span>Controller Vibration (Rumble)</span>
          <input 
            type="checkbox" 
            checked={vibrationEnabled} 
            onChange={toggleVibration}
            style={styles.checkbox}
          />
        </div>

        {vibrationEnabled && (
          <div 
            style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === vibIntIdx) }}
            onPointerMove={(e) => handlePointerMoveItem(vibIntIdx, e)}
          >
            <span>Vibration Intensity ({Math.round(vibrationIntensity * 100)}%)</span>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.05"
              value={vibrationIntensity}
              onChange={(e) => setVibrationIntensity(parseFloat(e.target.value))}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === mmIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(mmIdx, e)}
        >
          <span>Menu Music</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            value={menuMusicVolume}
            onChange={(e) => setMenuMusicVolume(parseFloat(e.target.value))}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === gmIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(gmIdx, e)}
        >
          <span>Game Music</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            value={gameMusicVolume}
            onChange={(e) => setGameMusicVolume(parseFloat(e.target.value))}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === sfxIdx) }}
          onPointerMove={(e) => handlePointerMoveItem(sfxIdx, e)}
        >
          <span>SFX Volume</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div 
          style={{ 
            ...styles.optionRow, 
            justifyContent: 'space-between',
            border: resetConfirmState === 'confirming' 
              ? '1px solid #E31837' 
              : resetConfirmState === 'done' 
                ? '1px solid #10b981' 
                : '1px solid transparent',
            background: resetConfirmState === 'confirming' 
              ? 'rgba(227, 24, 55, 0.08)' 
              : resetConfirmState === 'done' 
                ? 'rgba(16, 185, 129, 0.08)' 
                : 'rgba(0,0,0,0.1)',
            ...getFocusStyle(focusedIndex === resetIdx),
          }}
          onPointerMove={(e) => handlePointerMoveItem(resetIdx, e)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <span>Reset Track Records</span>
            <span style={{ fontSize: '11px', color: '#666666', fontWeight: 400 }}>
              Wipe all saved best lap times across all stages
            </span>
          </div>
          <button
            type="button"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: resetConfirmState === 'confirming' ? '1px solid #E31837' : 'none',
              background: resetConfirmState === 'confirming'
                ? '#E31837'
                : resetConfirmState === 'done'
                  ? '#10b981'
                  : 'rgba(227, 24, 55, 0.12)',
              color: resetConfirmState === 'confirming' || resetConfirmState === 'done' ? '#ffffff' : '#E31837',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={handleResetRecordsAction}
          >
            {resetConfirmState === 'confirming' && '⚠️ Click to Confirm'}
            {resetConfirmState === 'done' && '✓ Records Cleared!'}
            {resetConfirmState === 'idle' && '🗑️ Reset Records'}
          </button>
        </div>

        <button 
          style={{ 
            ...styles.button, 
            marginTop: '20px', 
            width: '100%',
            ...getFocusStyle(focusedIndex === backIdx),
          }} 
          onPointerMove={(e) => handlePointerMoveItem(backIdx, e)}
          onClick={() => setView('main')}
        >
          Back
        </button>
      </div>
    );
  };

  const renderControlsView = () => (
    <div style={{ ...styles.subView, color: textColor }}>
      <h2 style={styles.subViewTitle}>Controls</h2>

      {/* Gamepad Status Banner */}
      <div style={{
        ...styles.gamepadStatusBanner,
        background: gamepadConnected 
          ? (gamepadType === 'dualsense' ? 'rgba(0, 112, 209, 0.15)' : 'rgba(16, 185, 129, 0.15)')
          : 'rgba(255, 255, 255, 0.05)',
        border: gamepadConnected 
          ? (gamepadType === 'dualsense' ? '1px solid rgba(0, 112, 209, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)')
          : '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: gamepadConnected 
            ? (gamepadType === 'dualsense' ? '#0070d1' : '#10b981')
            : '#888888',
          boxShadow: gamepadConnected 
            ? (gamepadType === 'dualsense' ? '0 0 8px #0070d1' : '0 0 8px #10b981')
            : 'none',
        }} />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>
          {gamepadConnected
            ? (gamepadType === 'dualsense'
                ? `🎮 DualSense (PS5) Connected: ${gamepadName || 'Sony DualSense'}`
                : `🎮 Xbox Controller Connected: ${gamepadName || 'XInput Controller'}`)
            : '🎮 No Active Controller — Press any button on your gamepad to connect!'}
        </span>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', marginBottom: '8px' }}>
        <button
          style={{
            ...styles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'dualsense' ? styles.activeTabButton : {}),
          }}
          onClick={() => setControlsTab('dualsense')}
        >
          🎮 DualSense (PS5)
        </button>
        <button
          style={{
            ...styles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'xbox' ? styles.activeTabButton : {}),
          }}
          onClick={() => setControlsTab('xbox')}
        >
          🎮 Xbox
        </button>
        <button
          style={{
            ...styles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'keyboard' ? styles.activeTabButton : {}),
          }}
          onClick={() => setControlsTab('keyboard')}
        >
          ⌨️ Keyboard
        </button>
      </div>

      {controlsTab === 'dualsense' ? (
        <div style={{
          ...styles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={styles.controlRow}>
            <strong>🕹️ Left Stick (L3)</strong>
            <span>Steering (Analog)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🎥 Right Stick (R3)</strong>
            <span>Free Look Orbit Camera (360°)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🏎️ R2 (Right Trigger)</strong>
            <span>Throttle / Gas (Analog)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🛑 L2 (Left Trigger)</strong>
            <span>Brake / Reverse (Analog)</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#0070d1', fontWeight: 800 }}>✕</span> Cross / R1</strong>
            <span>Handbrake / Drift</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#4caf50', fontWeight: 800 }}>△</span> Triangle / L1</strong>
            <span>Change Camera Mode</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#e53935', fontWeight: 800 }}>◯</span> Circle / R3 Click</strong>
            <span>Look Back (Instant)</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#e91e63', fontWeight: 800 }}>▢</span> Square / Create</strong>
            <span>Reset Position</span>
          </div>
          <div style={styles.controlRow}>
            <strong>⏸️ Options</strong>
            <span>Pause / Unpause</span>
          </div>
          <div style={styles.controlRow}>
            <strong>📊 Create (Share) / L3</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🧭 D-Pad</strong>
            <span>Directional Controls</span>
          </div>
        </div>
      ) : controlsTab === 'xbox' ? (
        <div style={{
          ...styles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={styles.controlRow}>
            <strong>🕹️ Left Stick (Analog)</strong>
            <span>Steering</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🎥 Right Stick (Analog)</strong>
            <span>Free Look Orbit Camera (360°)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🏎️ RT (Right Trigger)</strong>
            <span>Throttle / Gas (Analog)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🛑 LT (Left Trigger)</strong>
            <span>Brake / Reverse (Analog)</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#107c10', fontWeight: 800 }}>A</span> / RB</strong>
            <span>Handbrake / Drift</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#ffb900', fontWeight: 800 }}>Y</span> / LB</strong>
            <span>Change Camera Mode</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#d83b01', fontWeight: 800 }}>B</span> / RS Click</strong>
            <span>Look Back (Instant)</span>
          </div>
          <div style={styles.controlRow}>
            <strong><span style={{ color: '#0078d7', fontWeight: 800 }}>X</span> / View</strong>
            <span>Reset Position</span>
          </div>
          <div style={styles.controlRow}>
            <strong>⏸️ Menu (Start)</strong>
            <span>Pause / Unpause</span>
          </div>
          <div style={styles.controlRow}>
            <strong>📊 View / LS Click</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={styles.controlRow}>
            <strong>🧭 D-Pad</strong>
            <span>Directional Controls</span>
          </div>
        </div>
      ) : (
        <div style={{
          ...styles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={styles.controlRow}>
            <strong>WASD / Arrows</strong>
            <span>Steering & Gas / Brake</span>
          </div>
          <div style={styles.controlRow}>
            <strong>Space</strong>
            <span>Handbrake</span>
          </div>
          <div style={styles.controlRow}>
            <strong>C</strong>
            <span>Change Camera</span>
          </div>
          <div style={styles.controlRow}>
            <strong>B</strong>
            <span>Look Back (Hold)</span>
          </div>
          <div style={styles.controlRow}>
            <strong>T</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={styles.controlRow}>
            <strong>R</strong>
            <span>Reset Position</span>
          </div>
          <div style={styles.controlRow}>
            <strong>ESC</strong>
            <span>Pause / Menu</span>
          </div>
        </div>
      )}

      <button 
        style={{ 
          ...styles.button, 
          marginTop: '20px', 
          width: '100%',
          ...getFocusStyle(focusedIndex === 0),
        }} 
        onPointerMove={(e) => handlePointerMoveItem(0, e)}
        onClick={() => setView('main')}
      >
        Back
      </button>
    </div>
  );


  if (gameState !== 'menu' && gameState !== 'paused') {
    return null;
  }

  return (
    <div style={currentOverlayStyle} onPointerDown={ensureAudioPlayback}>
      <audio ref={audioRef} src="/sounds/menu-music.mp3" autoPlay loop />
      <div style={{ ...currentCardStyle, color: textColor }}>
        
        {/* Game Logo */}
        <div style={styles.logoContainer}>
          <img src="/openrally_logo.png" alt="OpenRally Logo" style={styles.logoImage} />
        </div>

        {isPause && view === 'main' && (
          <h1 style={styles.pauseTitle}>PAUSED</h1>
        )}

        {view === 'main' && (
          <p style={{ ...styles.subtitle, color: subtitleColor }}>
            {isPause ? 'Take a break or adjust your ride.' : 'Select a mode to hit the dirt!'}
          </p>
        )}

        {view === 'main' && renderMainView()}
        {!isPause && view === 'start_mode' && renderStartModeView()}
        {!isPause && view === 'garage' && renderGarageView()}
        {!isPause && view === 'tracks' && renderTracksView()}
        {view === 'options' && renderOptionsView()}
        {view === 'controls' && renderControlsView()}

        {/* Gamepad Navigation Hint Footer */}
        <div style={styles.gamepadNavFooter}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>🕹️</span> D-Pad / Stick: <strong>Navigate</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: gamepadType === 'dualsense' ? '#0070d1' : '#107c10',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
            }}>
              {gamepadType === 'dualsense' ? '✕' : 'A'}
            </span>
            <strong>Select / Toggle</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: gamepadType === 'dualsense' ? '#e53935' : '#d83b01',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
            }}>
              {gamepadType === 'dualsense' ? '◯' : 'B'}
            </span>
            <strong>Back</strong>
          </span>
          <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
            v1.0.0
          </span>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlayMenu: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FEFFFD',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  cardMenu: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '400px',
    gap: '8px',
  },
  logoContainer: {
    marginBottom: '10px',
  },
  logoImage: {
    maxWidth: '400px',
    maxHeight: '200px',
    objectFit: 'contain',
  },
  pauseTitle: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 10px 0',
    background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: '14px',
    marginBottom: '30px',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    marginBottom: '40px',
  },
  button: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(90deg, #1B365D, #E31837)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, filter 0.2s',
    outline: 'none',
    boxShadow: '0 4px 15px rgba(227, 24, 55, 0.3)',
  },
  secondaryButton: {
    background: 'transparent',
    boxShadow: 'none',
    border: '1px solid',
  },
  modeCard: {
    padding: '18px',
    borderRadius: '12px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.2s, transform 0.2s',
  },
  modeBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginBottom: '12px',
  },
  tabButton: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'rgba(0,0,0,0.03)',
    color: '#444',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  activeTabButton: {
    background: '#1B365D',
    color: '#fff',
    borderColor: '#1B365D',
  },
  garageDetails: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    marginTop: '12px',
  },
  garageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  garageVehicleName: {
    fontSize: '18px',
    fontWeight: 700,
  },
  driveBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#E31837',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statLabel: {
    width: '90px',
    color: '#666',
  },
  statTrack: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #1B365D, #E31837)',
  },
  statValue: {
    width: '30px',
    textAlign: 'right',
    color: '#333',
  },
  trackCard: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  difficultyBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  controlsHelp: {
    width: '100%',
    borderRadius: '12px',
    padding: '20px',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: 0,
  },
  subView: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  subViewTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: 600,
  },
  optionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
  },
  select: {
    padding: '6px 12px',
    borderRadius: '6px',
    background: '#fff',
    color: '#000',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  gamepadStatusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  gamepadNavFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
    padding: '10px 14px',
    marginTop: '16px',
    background: 'rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#555555',
    flexWrap: 'wrap',
  },
};

