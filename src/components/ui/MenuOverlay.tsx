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
  CreditsView,
  HeroShowcase,
  STAGE_BANNERS,
  formatLapTime,
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
    targetFps, setTargetFps,
    drawDistance, setDrawDistance,
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

  const textColor = '#F1F5F9';
  const subtitleColor = '#94A3B8';
  const selectedLevelBest = getBestLapForLevel(selectedLevelId);
  const activeVehiclePreset = getVehiclePreset(selectedVehicleId);

  return (
    <div
      className="overlay-menu-container"
      style={isPause ? menuStyles.pauseOverlayMenu : menuStyles.overlayMenu}
      onPointerDown={ensureAudioPlayback}
    >
      <audio ref={audioRef} src="/sounds/menu-music.mp3" autoPlay loop />
      <div
        className={`menu-scalable-container ${isPause && view === 'main' ? 'pause-card-compact' : ''}`}
        style={{ ...(isPause && view === 'main' ? menuStyles.pauseCardMenu : menuStyles.cardMenu), color: textColor }}
      >
        
        {/* Main Menu Dashboard View */}
        {!isPause && view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
            {/* Top Brand Header */}
            <div
              className="menu-brand-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  className="menu-brand-logo"
                  src="/openrally_logo_dark.png"
                  alt="OpenRally"
                  style={{
                    maxHeight: '62px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 16px rgba(227, 24, 55, 0.35))',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '5px 14px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}>
                  v1.0.0
                </span>
              </div>
            </div>

            {/* Split Dashboard: Navigation on left, Showcase on right */}
            <div className="menu-dashboard-layout" style={menuStyles.dashboardLayout}>
              {/* Left: Navigation Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                  marginBottom: '2px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', color: '#94A3B8', textTransform: 'uppercase' }}>
                    ACTION HUB
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                    SELECT WITH [A] / ENTER
                  </span>
                </div>

                <MainView
                  isPause={false}
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
              </div>

              {/* Right: Dynamic Hero Showcase */}
              <HeroShowcase
                vehicle={activeVehiclePreset}
                level={currentLevelPreset}
                bestLapTime={selectedLevelBest}
                gamepadConnected={gamepadConnected}
                gamepadName={gamepadName}
                gamepadType={gamepadType}
                onOpenGarage={() => {
                  setPreviewVehicleId(selectedVehicleId);
                  setView('garage');
                }}
                onOpenTracks={() => setView('tracks')}
              />
            </div>
          </div>
        )}

        {/* Pause Menu View */}
        {isPause && view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
            {/* Header with neon pause bars */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px',
                    boxShadow: '0 0 10px rgba(227, 24, 55, 0.8)',
                  }} />
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#E31837',
                    borderRadius: '2px',
                    boxShadow: '0 0 10px rgba(227, 24, 55, 0.8)',
                  }} />
                </div>
                <h1 style={{ ...menuStyles.pauseTitle, margin: 0, fontSize: '20px' }}>STAGE PAUSED</h1>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(227, 24, 55, 0.15)',
                border: '1px solid rgba(227, 24, 55, 0.35)',
                color: '#F87171',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
              }}>
                {gameMode === 'timeattack' ? 'TIME ATTACK' : 'FREE ROAM'}
              </span>
            </div>

            {/* Split content: Left banner & stats, Right action buttons */}
            <div className="pause-split-layout" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
              {/* Stage Preview Banner Card */}
              <div
                className="pause-banner-card"
                style={{
                  width: '100%',
                  height: '84px',
                  borderRadius: '12px',
                  backgroundImage: `
                    linear-gradient(90deg, rgba(10, 14, 25, 0.95) 0%, rgba(10, 14, 25, 0.72) 55%, rgba(10, 14, 25, 0.4) 100%),
                    url('${STAGE_BANNERS[currentLevelPreset.id] || '/images/stages/island_circuit.jpg'}')
                  `,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '12px 18px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.5px' }}>
                    {currentLevelPreset.name}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#38BDF8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                  }}>
                    {selectedLevelBest && selectedLevelBest > 0
                      ? `RECORD: ${formatLapTime(selectedLevelBest)}`
                      : 'RECORD: --:--.--'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                    Surface: <strong style={{ color: '#CBD5E1' }}>{currentLevelPreset.surfaceDescription}</strong>
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                    Machine: <strong style={{ color: '#CBD5E1' }}>{activeVehiclePreset.name}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <MainView
                isPause={true}
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
            </div>
          </div>
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
            targetFps={targetFps}
            drawDistance={drawDistance}
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
            onSetTargetFps={setTargetFps}
            onSetDrawDistance={setDrawDistance}
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

        {view === 'credits' && (
          <CreditsView
            focusedIndex={focusedIndex}
            textColor={textColor}
            onPointerMoveItem={handlePointerMoveItem}
            onSelectView={setView}
          />
        )}

        {/* Gamepad Navigation Hint Footer */}
        <div style={{
          ...menuStyles.gamepadNavFooter,
          flexDirection: isPause ? 'column' : 'row',
          gap: isPause ? '10px' : '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: isPause ? 'center' : 'flex-start',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                color: '#CBD5E1',
              }}>
                D-PAD
              </span>
              <span>Stick: <strong>Navigate</strong></span>
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
              <strong>{isPause && view === 'main' ? 'Resume' : 'Back'}</strong>
            </span>
          </div>

          <span style={{
            marginLeft: isPause ? '0' : 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.85,
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}>
            <span>Game by <strong style={{ color: '#FFFFFF' }}>dawid10353 (Dawid Warzocha)</strong></span>
            <span>•</span>
            <span style={{ color: '#E31837', fontWeight: 700 }}>OpenRally v1.0.0</span>
          </span>
        </div>

      </div>
    </div>
  );
}
