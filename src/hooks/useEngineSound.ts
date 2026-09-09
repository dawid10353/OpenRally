import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFrame } from '@react-three/fiber';
import { getOrLoadAudioBuffer } from '@/utils/audioCache';
import {
  ENGINE_VOLUME,
  IDLE_PITCH,
  IDLE_FILTER_CUTOFF,
  FILTER_CUTOFF_PER_KMH,
  AUDIO_RAMP_TIME,
} from '@/config/sound';

import { getSharedAudioContext } from '@/utils/audio/audioContext';
import { useMultiplayerStore } from '@/store/multiplayerStore';

/**
 * Procedural engine sound generator using Web Audio API.
 * Modulates pitch and filter based on vehicle speed.
 */
export function useEngineSound() {
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  // Audio nodes
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  const sfxVolumeRef = useRef(sfxVolume);
  sfxVolumeRef.current = sfxVolume;

  // Initialize audio on first 'playing' state (user gesture required)
  useEffect(() => {
    if (gameState === 'playing' && !isInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;

      const initAudio = async () => {
        try {
          const ctx = getSharedAudioContext();
          if (!ctx) return;

          const currentPlaying = useGameStore.getState().gameState === 'playing';

          // Master gain
          const masterGain = ctx.createGain();
          masterGain.gain.value = currentPlaying ? ENGINE_VOLUME * sfxVolumeRef.current : 0;
          if (currentPlaying) {
            masterGain.connect(ctx.destination);
          }

          // Engine Filter to make it sound muffled/bassy
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = IDLE_FILTER_CUTOFF;
          filter.connect(masterGain);

          // Fetch and decode audio file (cached)
          const audioBuffer = await getOrLoadAudioBuffer('/sounds/engine-loop.mp3', ctx);

          // Audio buffer source for the engine loop
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = true;
          source.playbackRate.value = IDLE_PITCH;
          source.connect(filter);
          source.start();

          ctxRef.current = ctx;
          sourceRef.current = source;
          gainRef.current = masterGain;
          filterRef.current = filter;

          setIsInitialized(true);
        } catch (e) {
          console.warn('AudioContext or audio fetching failed', e);
          isInitializingRef.current = false;
        }
      };

      initAudio();
    }
  }, [gameState, isInitialized]);

  // Mute/Resume audio based on game state and global sfx volume
  useEffect(() => {
    if (ctxRef.current && gainRef.current) {
      if (gameState === 'playing') {
        try {
          if (ctxRef.current.state === 'suspended') {
            ctxRef.current.resume().catch(() => {});
          }
          gainRef.current.disconnect();
          gainRef.current.connect(ctxRef.current.destination);
        } catch {
          // ignore
        }
        gainRef.current.gain.cancelScheduledValues(0);
        gainRef.current.gain.setValueAtTime(ENGINE_VOLUME * sfxVolume, ctxRef.current.currentTime);
      } else {
        // Mute, disconnect, and suspend immediately when paused or in menu
        gainRef.current.gain.cancelScheduledValues(0);
        gainRef.current.gain.setValueAtTime(0, ctxRef.current.currentTime);
        gainRef.current.gain.value = 0;
        try {
          gainRef.current.disconnect();
        } catch {
          // ignore
        }
        if (ctxRef.current.state === 'running') {
          ctxRef.current.suspend().catch(() => {});
        }
      }
    }
  }, [gameState, sfxVolume, isInitialized]);

  // Update pitch based on RPM and filter based on speed
  useFrame(() => {
    const isSpectating = useMultiplayerStore.getState().isSpectating;
    if (!isInitialized || !sourceRef.current || !ctxRef.current || !gainRef.current || gameState !== 'playing' || isSpectating) {
      if (gainRef.current && (gameState !== 'playing' || isSpectating)) {
        try {
          gainRef.current.gain.cancelScheduledValues(0);
          gainRef.current.gain.value = 0;
        } catch {
          // Ignore
        }
      }
      return;
    }

    if (ctxRef.current.state === 'closed') {
      ctxRef.current = null;
      sourceRef.current = null;
      gainRef.current = null;
      filterRef.current = null;
      isInitializingRef.current = false;
      setIsInitialized(false);
      return;
    }

    const store = useGameStore.getState();
    const speed = store.speed;
    const rpm = store.rpm;
    const absSpeed = Math.abs(speed);

    const safeRpm = Number.isFinite(rpm) ? Math.max(0, Math.min(8500, rpm)) : 1000;
    const safeSpeed = Number.isFinite(absSpeed) ? absSpeed : 0;

    // Pitch increases with RPM (base pitch 0.6, up to ~2.2 at 8000 RPM)
    const targetPitch = 0.6 + (safeRpm / 8000) * 1.6;
    if (Number.isFinite(targetPitch) && ctxRef.current.currentTime >= 0) {
      sourceRef.current.playbackRate.setTargetAtTime(targetPitch, ctxRef.current.currentTime, AUDIO_RAMP_TIME);
    }

    // Filter opens up dynamically with both RPM and vehicle speed for crisp, roaring high-rev acoustics
    if (filterRef.current) {
      const rpmFraction = Math.max(0, (safeRpm - 1000) / 7000);
      const targetCutoff = IDLE_FILTER_CUTOFF + rpmFraction * 3200 + safeSpeed * FILTER_CUTOFF_PER_KMH;
      if (Number.isFinite(targetCutoff) && ctxRef.current.currentTime >= 0) {
        filterRef.current.frequency.setTargetAtTime(
          targetCutoff,
          ctxRef.current.currentTime,
          AUDIO_RAMP_TIME,
        );
      }
    }
  });

  // Cleanup on unmount (disconnect nodes without closing shared AudioContext)
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
          sourceRef.current.disconnect();
        } catch {}
        sourceRef.current = null;
      }
      if (filterRef.current) {
        try {
          filterRef.current.disconnect();
        } catch {}
        filterRef.current = null;
      }
      if (gainRef.current) {
        try {
          gainRef.current.disconnect();
        } catch {}
        gainRef.current = null;
      }
      ctxRef.current = null;
    };
  }, []);
}
