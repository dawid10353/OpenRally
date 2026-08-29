import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRacingStore } from '@/store/racingStore';
import { getAvailableVehicles, getVehiclePreset } from '@/config/vehicleRegistry';
import { getAvailableLevels, getLevelPreset } from '@/config/levelRegistry';
import { resetGamepadEdgeState } from '@/utils/input/gamepad';
import {
  menuStyles,
  MainView,
  StartModeView,
  GarageView,
  TrackSelectView,
  SettingsView,
  ControlsView,
  useMenuGamepadNavigation,
  type MenuView,
  type ControlsTab,
  type ResetConfirmState,
} from './menu';

/**
 * Overlay rendering the Main Menu or Pause Menu.
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

  const [view, setViewInternal] = useState<MenuView>('main');
  const [previewVehicleId, setPreviewVehicleIdInternal] = useState(selectedVehicleId);
  const [controlsTab, setControlsTabInternal] = useState<ControlsTab>('dualsense');
  const [focusedIndex, setFocusedIndexInternal] = useState(0);
  const [resetConfirmState, setResetConfirmState] = useState<ResetConfirmState>('idle');
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  const setView = useCallback((nextView: MenuView) => {
    resetGamepadEdgeState();
    setViewInternal(nextView);
    setFocusedIndexInternal(0);
    setResetConfirmState('idle');
  }, []);

  const setFocusedIndex = useCallback((index: number) => {
    setFocusedIndexInternal(index);
  }, []);

  const setPreviewVehicleId = useCallback((id: string) => {
    setPreviewVehicleIdInternal(id);
  }, []);

  const setControlsTab = useCallback((tab: ControlsTab) => {
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
    antiAliasing, setAntiAliasing,
    resolutionScale, setResolutionScale,
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
    setView('main');
  }, [setSelectedLevelId, setView, syncBestLapForLevel]);

  const handleReturnToMainMenu = useCallback(() => {
    resetGamepadEdgeState();
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

  // Attach gamepad & keyboard navigation loop hook
  useMenuGamepadNavigation({
    view,
    focusedIndex,
    previewVehicleId,
    controlsTab,
    resetConfirmState,
    setView,
    setFocusedIndex,
    setPreviewVehicleId,
    setControlsTab,
    handleLaunchMode,
    handleReset,
    handleSelectTrack,
    handleReturnToMainMenu,
    handleResetRecordsAction,
  });

  if (gameState !== 'menu' && gameState !== 'paused') {
    return null;
  }

  const textColor = '#333333';
  const subtitleColor = '#666666';
  const selectedLevelBest = getBestLapForLevel(selectedLevelId);

  return (
    <div style={menuStyles.overlayMenu} onPointerDown={ensureAudioPlayback}>
      <audio ref={audioRef} src="/sounds/menu-music.mp3" autoPlay loop />
      <div style={{ ...menuStyles.cardMenu, color: textColor }}>
        
        {/* Game Logo */}
        <div style={menuStyles.logoContainer}>
          <img src="/openrally_logo.png" alt="OpenRally Logo" style={menuStyles.logoImage} />
        </div>

        {isPause && view === 'main' && (
          <h1 style={menuStyles.pauseTitle}>PAUSED</h1>
        )}

        {view === 'main' && (
          <p style={{ ...menuStyles.subtitle, color: subtitleColor }}>
            {isPause ? 'Take a break or adjust your ride.' : 'Select a mode to hit the dirt!'}
          </p>
        )}

        {view === 'main' && (
          <MainView
            isPause={isPause}
            focusedIndex={focusedIndex}
            textColor={textColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSelectView={setView}
            onResume={() => setGameState('playing')}
            onReset={handleReset}
            onReturnToMainMenu={handleReturnToMainMenu}
            onOpenGarage={() => {
              setPreviewVehicleId(selectedVehicleId);
              setView('garage');
            }}
          />
        )}

        {!isPause && view === 'start_mode' && (
          <StartModeView
            currentLevelPreset={currentLevelPreset}
            gameMode={gameMode}
            selectedLevelBest={selectedLevelBest}
            focusedIndex={focusedIndex}
            textColor={textColor}
            onPointerMoveItem={handlePointerMoveItem}
            onLaunchMode={handleLaunchMode}
            onSelectView={setView}
          />
        )}

        {!isPause && view === 'garage' && (
          <GarageView
            availableVehicles={availableVehicles}
            previewVehicleId={previewVehicleId}
            selectedVehicleId={selectedVehicleId}
            previewPreset={previewPreset}
            focusedIndex={focusedIndex}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSelectPreviewVehicle={setPreviewVehicleId}
            onEquipVehicle={(id) => {
              setSelectedVehicleId(id);
              useGameStore.getState().triggerReset(true);
            }}
            onSelectView={setView}
          />
        )}

        {!isPause && view === 'tracks' && (
          <TrackSelectView
            availableLevels={availableLevels}
            selectedLevelId={selectedLevelId}
            bestLapTimes={bestLapTimes}
            focusedIndex={focusedIndex}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSelectTrack={handleSelectTrack}
            onSelectView={setView}
          />
        )}

        {view === 'options' && (
          <SettingsView
            graphicsQuality={graphicsQuality}
            antiAliasing={antiAliasing}
            resolutionScale={resolutionScale}
            shadowsEnabled={shadowsEnabled}
            postProcessingEnabled={postProcessingEnabled}
            sensitivity={sensitivity}
            vibrationEnabled={vibrationEnabled}
            vibrationIntensity={vibrationIntensity}
            menuMusicVolume={menuMusicVolume}
            gameMusicVolume={gameMusicVolume}
            sfxVolume={sfxVolume}
            resetConfirmState={resetConfirmState}
            focusedIndex={focusedIndex}
            textColor={textColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSetGraphicsQuality={setGraphicsQuality}
            onSetAntiAliasing={setAntiAliasing}
            onSetResolutionScale={setResolutionScale}
            onToggleShadows={toggleShadows}
            onTogglePostProcessing={togglePostProcessing}
            onSetSensitivity={setSensitivity}
            onToggleVibration={toggleVibration}
            onSetVibrationIntensity={setVibrationIntensity}
            onSetMenuMusicVolume={setMenuMusicVolume}
            onSetGameMusicVolume={setGameMusicVolume}
            onSetSfxVolume={setSfxVolume}
            onResetRecords={handleResetRecordsAction}
            onSelectView={setView}
          />
        )}

        {view === 'controls' && (
          <ControlsView
            gamepadConnected={gamepadConnected}
            gamepadName={gamepadName}
            gamepadType={gamepadType}
            controlsTab={controlsTab}
            focusedIndex={focusedIndex}
            textColor={textColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSetControlsTab={setControlsTab}
            onSelectView={setView}
          />
        )}

        {/* Gamepad Navigation Hint Footer */}
        <div style={menuStyles.gamepadNavFooter}>
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
