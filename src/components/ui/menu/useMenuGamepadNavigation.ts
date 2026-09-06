import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { sampleGamepad } from '@/utils/input/gamepad';
import { getAvailableLevels } from '@/config/levelRegistry';
import { getAvailableVehicles } from '@/config/vehicleRegistry';
import type { GraphicsQuality, AntiAliasingMode } from '@/types';
import type { MenuView, ControlsTab, ResetConfirmState } from './types';

export interface MenuNavigationOptions {
  readonly view: MenuView;
  readonly focusedIndex: number;
  readonly previewVehicleId: string;
  readonly controlsTab: ControlsTab;
  readonly resetConfirmState: ResetConfirmState;
  readonly setView: (v: MenuView) => void;
  readonly setFocusedIndex: (idx: number) => void;
  readonly setPreviewVehicleId: (id: string) => void;
  readonly setControlsTab: (tab: ControlsTab) => void;
  readonly handleLaunchMode: (mode: 'freeroam' | 'timeattack') => void;
  readonly handleStartRace?: (vehicleId: string) => void;
  readonly handleReset: () => void;
  readonly handleSelectTrack: (levelId: string) => void;
  readonly handleReturnToMainMenu: () => void;
  readonly handleResetRecordsAction: () => void;
}

/**
 * Custom hook isolating gamepad and keyboard menu navigation loops and direction handlers.
 */
export function useMenuGamepadNavigation({
  view,
  focusedIndex,
  previewVehicleId,
  controlsTab,
  setView,
  setFocusedIndex,
  setPreviewVehicleId,
  setControlsTab,
  handleLaunchMode,
  handleStartRace,
  handleReset,
  handleSelectTrack,
  handleReturnToMainMenu,
  handleResetRecordsAction,
}: MenuNavigationOptions) {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useGameStore((s) => s.setSelectedVehicleId);

  const availableVehicles = getAvailableVehicles();
  const availableLevels = getAvailableLevels();

  const viewRef = useRef(view);
  viewRef.current = view;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  const controlsTabRef = useRef(controlsTab);
  controlsTabRef.current = controlsTab;
  const previewVehicleIdRef = useRef(previewVehicleId);
  previewVehicleIdRef.current = previewVehicleId;

  const getItemCount = useCallback((): number => {
    const curView = viewRef.current;
    if (curView === 'main') {
      return useGameStore.getState().gameState === 'paused' ? 4 : 4;
    }
    if (curView === 'tracks') return availableLevels.length + 1;
    if (curView === 'start_mode') return 3;
    if (curView === 'garage') return 2;
    if (curView === 'multiplayer') return 1;
    if (curView === 'options') {
      const isVib = useSettingsStore.getState().vibrationEnabled;
      return isVib ? 13 : 12;
    }
    if (curView === 'controls') return 1;
    if (curView === 'credits') return 2;
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
      const tabs: ControlsTab[] = ['dualsense', 'xbox', 'keyboard'];
      const tabIdx = tabs.indexOf(controlsTabRef.current);
      setControlsTab(tabs[(tabIdx - 1 + tabs.length) % tabs.length]);
    } else if (curView === 'options') {
      const settings = useSettingsStore.getState();
      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];
      const aaModes: AntiAliasingMode[] = ['off', 'msaa', 'smaa'];
      const scales = [0.5, 0.75, 1.0, 1.25, 1.5];

      if (curIdx === 0) {
        const qIdx = qualities.indexOf(settings.graphicsQuality);
        if (qIdx > 0) settings.setGraphicsQuality(qualities[qIdx - 1]);
      } else if (curIdx === 1) {
        const aaIdx = aaModes.indexOf(settings.antiAliasing);
        if (aaIdx > 0) settings.setAntiAliasing(aaModes[aaIdx - 1]);
      } else if (curIdx === 2) {
        const sIdx = scales.indexOf(settings.resolutionScale);
        if (sIdx > 0) settings.setResolutionScale(scales[sIdx - 1]);
      } else if (curIdx === 3) {
        settings.toggleShadows();
      } else if (curIdx === 4) {
        settings.togglePostProcessing();
      } else if (curIdx === 5) {
        settings.setSensitivity(Math.max(0.5, Math.min(2.0, settings.sensitivity - 0.1)));
      } else if (curIdx === 6) {
        settings.toggleVibration();
      } else if (settings.vibrationEnabled && curIdx === 7) {
        settings.setVibrationIntensity(Math.max(0.1, Math.min(1.0, settings.vibrationIntensity - 0.05)));
      } else {
        const musicOffset = settings.vibrationEnabled ? 8 : 7;
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
      const tabs: ControlsTab[] = ['dualsense', 'xbox', 'keyboard'];
      const tabIdx = tabs.indexOf(controlsTabRef.current);
      setControlsTab(tabs[(tabIdx + 1) % tabs.length]);
    } else if (curView === 'options') {
      const settings = useSettingsStore.getState();
      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'very_high'];
      const aaModes: AntiAliasingMode[] = ['off', 'msaa', 'smaa'];
      const scales = [0.5, 0.75, 1.0, 1.25, 1.5];

      if (curIdx === 0) {
        const qIdx = qualities.indexOf(settings.graphicsQuality);
        if (qIdx < qualities.length - 1) settings.setGraphicsQuality(qualities[qIdx + 1]);
      } else if (curIdx === 1) {
        const aaIdx = aaModes.indexOf(settings.antiAliasing);
        if (aaIdx < aaModes.length - 1) settings.setAntiAliasing(aaModes[aaIdx + 1]);
      } else if (curIdx === 2) {
        const sIdx = scales.indexOf(settings.resolutionScale);
        if (sIdx < scales.length - 1) settings.setResolutionScale(scales[sIdx + 1]);
      } else if (curIdx === 3) {
        settings.toggleShadows();
      } else if (curIdx === 4) {
        settings.togglePostProcessing();
      } else if (curIdx === 5) {
        settings.setSensitivity(Math.max(0.5, Math.min(2.0, settings.sensitivity + 0.1)));
      } else if (curIdx === 6) {
        settings.toggleVibration();
      } else if (settings.vibrationEnabled && curIdx === 7) {
        settings.setVibrationIntensity(Math.max(0.1, Math.min(1.0, settings.vibrationIntensity + 0.05)));
      } else {
        const musicOffset = settings.vibrationEnabled ? 8 : 7;
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
        else if (curIdx === 3) handleReturnToMainMenu();
      } else {
        if (curIdx === 0) setView('tracks');
        else if (curIdx === 1) setView('multiplayer');
        else if (curIdx === 2) setView('options');
        else if (curIdx === 3) setView('credits');
      }
    } else if (curView === 'tracks') {
      if (curIdx < availableLevels.length) {
        handleSelectTrack(availableLevels[curIdx].id);
      } else {
        setView('main');
      }
    } else if (curView === 'start_mode') {
      if (curIdx === 0) handleLaunchMode('freeroam');
      else if (curIdx === 1) handleLaunchMode('timeattack');
      else if (curIdx === 2) setView('tracks');
    } else if (curView === 'garage') {
      if (curIdx === 0) {
        if (handleStartRace) {
          handleStartRace(previewVehicleIdRef.current);
        } else {
          setSelectedVehicleId(previewVehicleIdRef.current);
          useGameStore.getState().triggerReset(true);
          setView('main');
          setGameState('playing');
        }
      } else if (curIdx === 1) {
        setView('start_mode');
      }
    } else if (curView === 'multiplayer') {
      setView('main');
    } else if (curView === 'options') {
      const isVib = useSettingsStore.getState().vibrationEnabled;
      const optionsCount = isVib ? 13 : 12;
      const resetIdx = isVib ? 11 : 10;
      if (curIdx === 3) {
        useSettingsStore.getState().toggleShadows();
      } else if (curIdx === 4) {
        useSettingsStore.getState().togglePostProcessing();
      } else if (curIdx === 6) {
        useSettingsStore.getState().toggleVibration();
      } else if (curIdx === resetIdx) {
        handleResetRecordsAction();
      } else if (curIdx === optionsCount - 1) {
        setView('main');
      }
    } else if (curView === 'controls') {
      setView('main');
    } else if (curView === 'credits') {
      if (curIdx === 0) {
        window.open('https://github.com/dawid10353/OpenRally', '_blank', 'noopener,noreferrer');
      } else {
        setView('main');
      }
    }
  }, [
    availableLevels,
    handleLaunchMode,
    handleReset,
    handleResetRecordsAction,
    handleReturnToMainMenu,
    handleSelectTrack,
    handleStartRace,
    selectedVehicleId,
    setGameState,
    setSelectedVehicleId,
    setPreviewVehicleId,
    setView,
  ]);

  const handleBack = useCallback(() => {
    const curView = viewRef.current;
    const isPaused = useGameStore.getState().gameState === 'paused';

    if (curView === 'garage') {
      setView('start_mode');
    } else if (curView === 'start_mode') {
      setView('tracks');
    } else if (curView !== 'main') {
      setView('main');
    } else if (isPaused) {
      setGameState('playing');
    }
  }, [setGameState, setView]);

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

  // Gamepad navigation controller loop across all menus
  useEffect(() => {
    if (gameState === 'playing') return;

    let animId: number;
    const pollMenuGamepad = () => {
      const gp = sampleGamepad();
      if (gp.connected) {
        if (gp.menuConfirm) {
          actionsRef.current.handleConfirm();
        } else if (gp.menuBack) {
          actionsRef.current.handleBack();
        } else if (gp.pauseToggle && useGameStore.getState().gameState === 'paused') {
          actionsRef.current.handleBack();
        }

        if (gp.menuUp) {
          actionsRef.current.handleNavUp();
        } else if (gp.menuDown) {
          actionsRef.current.handleNavDown();
        }

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

  return {
    handleNavUp,
    handleNavDown,
    handleNavLeft,
    handleNavRight,
    handleConfirm,
    handleBack,
  };
}
