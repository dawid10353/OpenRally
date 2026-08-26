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
  const offset = preset.modelPositionOffset ?? [0, 0.45, 0.1];
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
      {preset.config.wheels.map((wheel, index) => (
        <group key={index} position={wheel.position as [number, number, number]}>
          <Wheel isRightSide={wheel.position[0] > 0} radius={wheel.radius} />
        </group>
      ))}
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

  const [view, setView] = useState<'main' | 'start_mode' | 'options' | 'controls' | 'garage' | 'tracks'>('main');
  const [previewVehicleId, setPreviewVehicleId] = useState(selectedVehicleId);
  const [controlsTab, setControlsTab] = useState<'dualsense' | 'xbox' | 'keyboard'>('dualsense');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Auto-switch to connected gamepad tab
  useEffect(() => {
    if (gamepadType === 'dualsense') {
      setControlsTab('dualsense');
    } else if (gamepadType === 'xbox') {
      setControlsTab('xbox');
    }
  }, [gamepadType]);

  // Reset focus when view or gameState changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [view, gameState]);

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
      setView('main');
      setFocusedIndex(0);
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
    setView('main');
    setGameState('playing');
  }, [selectedLevelId, setGameMode, setGameState, syncBestLapForLevel]);

  const handleReset = useCallback(() => {
    resetGamepadEdgeState();
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
    syncBestLapForLevel(selectedLevelId);
    setView('main');
    setGameState('playing');
  }, [selectedLevelId, setGameState, syncBestLapForLevel]);

  const handleSelectTrack = useCallback((levelId: string) => {
    setSelectedLevelId(levelId);
    syncBestLapForLevel(levelId);
    useGameStore.getState().triggerReset(true);
    useRacingStore.getState().resetRace();
  }, [setSelectedLevelId, syncBestLapForLevel]);

  const handleReturnToMainMenu = useCallback(() => {
    resetGamepadEdgeState();
    setFocusedIndex(0);
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
  }, [currentLevelPreset, selectedLevelId, setGameState, syncBestLapForLevel]);

  // Gamepad navigation controller across all menus
  useEffect(() => {
    if (gameState === 'playing') return;

    let animId: number;
    const pollMenuGamepad = () => {
      const gp = sampleGamepad();
      if (gp.connected) {
        // Universal Back button (Circle / B)
        if (gp.menuBack) {
          if (view !== 'main') {
            setView('main');
          } else if (gameState === 'paused') {
            setGameState('playing');
          }
        }

        // Universal Options/Start button: resume if paused
        if (gp.pauseToggle && gameState === 'paused') {
          setGameState('playing');
        }

        // 1. MAIN MENU & PAUSE MENU
        if (view === 'main') {
          const itemCount = 5;
          if (gp.menuDown) setFocusedIndex((prev) => (prev + 1) % itemCount);
          if (gp.menuUp) setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);

          if (gp.menuConfirm) {
            if (isPause) {
              if (focusedIndex === 0) setGameState('playing');
              else if (focusedIndex === 1) handleReset();
              else if (focusedIndex === 2) setView('options');
              else if (focusedIndex === 3) setView('controls');
              else if (focusedIndex === 4) handleReturnToMainMenu();
            } else {
              if (focusedIndex === 0) setView('start_mode');
              else if (focusedIndex === 1) {
                setPreviewVehicleId(selectedVehicleId);
                setView('garage');
              } else if (focusedIndex === 2) setView('tracks');
              else if (focusedIndex === 3) setView('options');
              else if (focusedIndex === 4) setView('controls');
            }
          }
        }
        // 2. START MODE SELECTOR
        else if (view === 'start_mode') {
          const itemCount = 3;
          if (gp.menuDown) setFocusedIndex((prev) => (prev + 1) % itemCount);
          if (gp.menuUp) setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          if (gp.menuLeft) setFocusedIndex(0);
          if (gp.menuRight) setFocusedIndex(1);

          if (gp.menuConfirm) {
            if (focusedIndex === 0) handleLaunchMode('freeroam');
            else if (focusedIndex === 1) handleLaunchMode('timeattack');
            else if (focusedIndex === 2) setView('main');
          }
        }
        // 3. GARAGE (VEHICLE SELECTOR)
        else if (view === 'garage') {
          const currentIndex = availableVehicles.findIndex((v) => v.id === previewVehicleId);
          if (gp.menuLeft) {
            const nextIdx = (currentIndex - 1 + availableVehicles.length) % availableVehicles.length;
            setPreviewVehicleId(availableVehicles[nextIdx].id);
          } else if (gp.menuRight) {
            const nextIdx = (currentIndex + 1) % availableVehicles.length;
            setPreviewVehicleId(availableVehicles[nextIdx].id);
          }

          const itemCount = 2; // 0: Equip, 1: Back
          if (gp.menuDown) setFocusedIndex((prev) => (prev + 1) % itemCount);
          if (gp.menuUp) setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);

          if (gp.menuConfirm) {
            if (focusedIndex === 0) {
              setSelectedVehicleId(previewVehicleId);
              useGameStore.getState().triggerReset(true);
            } else if (focusedIndex === 1) {
              setView('main');
            }
          }
        }
        // 4. TRACKS SELECTOR
        else if (view === 'tracks') {
          const itemCount = availableLevels.length + 1; // All tracks + Back
          if (gp.menuDown) setFocusedIndex((prev) => (prev + 1) % itemCount);
          if (gp.menuUp) setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);

          if (gp.menuConfirm) {
            if (focusedIndex < availableLevels.length) {
              handleSelectTrack(availableLevels[focusedIndex].id);
            } else {
              setView('main');
            }
          }
        }
        // 5. OPTIONS VIEW
        else if (view === 'options') {
          const optionsCount = vibrationEnabled ? 10 : 9;
          if (gp.menuDown) setFocusedIndex((prev) => (prev + 1) % optionsCount);
          if (gp.menuUp) setFocusedIndex((prev) => (prev - 1 + optionsCount) % optionsCount);

          const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];
          if (focusedIndex === 0) {
            // Graphics Quality
            const curIdx = qualities.indexOf(graphicsQuality);
            if (gp.menuLeft && curIdx > 0) setGraphicsQuality(qualities[curIdx - 1]);
            if (gp.menuRight && curIdx < qualities.length - 1) setGraphicsQuality(qualities[curIdx + 1]);
          } else if (focusedIndex === 1) {
            // Shadows
            if (gp.menuConfirm || gp.menuLeft || gp.menuRight) toggleShadows();
          } else if (focusedIndex === 2) {
            // Post Processing
            if (gp.menuConfirm || gp.menuLeft || gp.menuRight) togglePostProcessing();
          } else if (focusedIndex === 3) {
            // Sensitivity
            if (gp.menuLeft) setSensitivity(Math.max(0.5, Math.min(2.0, sensitivity - 0.1)));
            if (gp.menuRight) setSensitivity(Math.max(0.5, Math.min(2.0, sensitivity + 0.1)));
          } else if (focusedIndex === 4) {
            // Vibration
            if (gp.menuConfirm || gp.menuLeft || gp.menuRight) toggleVibration();
          } else if (vibrationEnabled && focusedIndex === 5) {
            // Vibration Intensity
            if (gp.menuLeft) setVibrationIntensity(Math.max(0.1, Math.min(1.0, vibrationIntensity - 0.05)));
            if (gp.menuRight) setVibrationIntensity(Math.max(0.1, Math.min(1.0, vibrationIntensity + 0.05)));
          } else {
            const musicOffset = vibrationEnabled ? 6 : 5;
            if (focusedIndex === musicOffset) {
              // Menu Music
              if (gp.menuLeft) setMenuMusicVolume(Math.max(0, Math.min(1, menuMusicVolume - 0.05)));
              if (gp.menuRight) setMenuMusicVolume(Math.max(0, Math.min(1, menuMusicVolume + 0.05)));
            } else if (focusedIndex === musicOffset + 1) {
              // Game Music
              if (gp.menuLeft) setGameMusicVolume(Math.max(0, Math.min(1, gameMusicVolume - 0.05)));
              if (gp.menuRight) setGameMusicVolume(Math.max(0, Math.min(1, gameMusicVolume + 0.05)));
            } else if (focusedIndex === musicOffset + 2) {
              // SFX Volume
              if (gp.menuLeft) setSfxVolume(Math.max(0, Math.min(1, sfxVolume - 0.05)));
              if (gp.menuRight) setSfxVolume(Math.max(0, Math.min(1, sfxVolume + 0.05)));
            } else if (focusedIndex === optionsCount - 1 && gp.menuConfirm) {
              setView('main');
            }
          }
        }
        // 6. CONTROLS VIEW
        else if (view === 'controls') {
          const tabs: ('dualsense' | 'xbox' | 'keyboard')[] = ['dualsense', 'xbox', 'keyboard'];
          const curTabIdx = tabs.indexOf(controlsTab);
          if (gp.menuLeft) {
            setControlsTab(tabs[(curTabIdx - 1 + tabs.length) % tabs.length]);
          } else if (gp.menuRight) {
            setControlsTab(tabs[(curTabIdx + 1) % tabs.length]);
          }

          if (gp.menuConfirm) {
            setView('main');
          }
        }
      }
      animId = requestAnimationFrame(pollMenuGamepad);
    };

    animId = requestAnimationFrame(pollMenuGamepad);
    return () => cancelAnimationFrame(animId);
  }, [
    gameState,
    view,
    isPause,
    focusedIndex,
    controlsTab,
    selectedVehicleId,
    previewVehicleId,
    availableVehicles,
    availableLevels,
    selectedLevelId,
    graphicsQuality,
    shadowsEnabled,
    postProcessingEnabled,
    sensitivity,
    vibrationEnabled,
    vibrationIntensity,
    menuMusicVolume,
    gameMusicVolume,
    sfxVolume,
    setGameState,
    setSelectedVehicleId,
    setGraphicsQuality,
    toggleShadows,
    togglePostProcessing,
    setSensitivity,
    toggleVibration,
    setVibrationIntensity,
    setMenuMusicVolume,
    setGameMusicVolume,
    setSfxVolume,
    handleLaunchMode,
    handleReset,
    handleSelectTrack,
    handleReturnToMainMenu,
  ]);

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
            onPointerEnter={() => setFocusedIndex(0)}
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
            onPointerEnter={() => setFocusedIndex(1)}
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
            onPointerEnter={() => setFocusedIndex(2)}
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
            onPointerEnter={() => setFocusedIndex(3)}
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
            onPointerEnter={() => setFocusedIndex(4)}
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
            onPointerEnter={() => setFocusedIndex(0)}
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
            onPointerEnter={() => setFocusedIndex(1)}
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
            onPointerEnter={() => setFocusedIndex(2)}
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
            onPointerEnter={() => setFocusedIndex(3)}
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
            onPointerEnter={() => setFocusedIndex(4)}
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
        </div>

        {/* Mode Cards Grid */}
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
            onPointerEnter={() => setFocusedIndex(0)}
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
            onPointerEnter={() => setFocusedIndex(1)}
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
          onPointerEnter={() => setFocusedIndex(2)}
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
            onPointerEnter={() => setFocusedIndex(0)}
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
            onPointerEnter={() => setFocusedIndex(1)}
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
              onPointerEnter={() => setFocusedIndex(index)}
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
        onPointerEnter={() => setFocusedIndex(availableLevels.length)}
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
    const backIdx = optIdx++;

    return (
      <div style={{ ...styles.subView, color: textColor }}>
        <h2 style={styles.subViewTitle}>Options</h2>
        
        <div 
          style={{ ...styles.optionRow, ...getFocusStyle(focusedIndex === gqIdx) }}
          onPointerEnter={() => setFocusedIndex(gqIdx)}
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
          onPointerEnter={() => setFocusedIndex(shIdx)}
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
          onPointerEnter={() => setFocusedIndex(ppIdx)}
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
          onPointerEnter={() => setFocusedIndex(sensIdx)}
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
          onPointerEnter={() => setFocusedIndex(vibIdx)}
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
            onPointerEnter={() => setFocusedIndex(vibIntIdx)}
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
          onPointerEnter={() => setFocusedIndex(mmIdx)}
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
          onPointerEnter={() => setFocusedIndex(gmIdx)}
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
          onPointerEnter={() => setFocusedIndex(sfxIdx)}
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

        <button 
          style={{ 
            ...styles.button, 
            marginTop: '20px', 
            width: '100%',
            ...getFocusStyle(focusedIndex === backIdx),
          }} 
          onPointerEnter={() => setFocusedIndex(backIdx)}
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
        onPointerEnter={() => setFocusedIndex(0)}
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

