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

/** Augment Window for Safari's prefixed AudioContext */
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

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
          const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();

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

          if (!currentPlaying && ctx.state === 'running') {
            ctx.suspend();
          }

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
            ctxRef.current.resume();
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
          ctxRef.current.suspend();
        }
      }
    }
  }, [gameState, sfxVolume, isInitialized]);

  // Update pitch based on RPM and filter based on speed
  useFrame(() => {
    if (!isInitialized || !sourceRef.current || !ctxRef.current || !gainRef.current || gameState !== 'playing') {
      if (gainRef.current && gameState !== 'playing') {
        gainRef.current.gain.cancelScheduledValues(0);
        gainRef.current.gain.setValueAtTime(0, 0);
        gainRef.current.gain.value = 0;
      }
      return;
    }

    const store = useGameStore.getState();
    const speed = store.speed;
    const rpm = store.rpm;
    const absSpeed = Math.abs(speed);

    // Pitch increases with RPM (base pitch 0.6, up to ~2.2 at 8000 RPM)
    const targetPitch = 0.6 + (rpm / 8000) * 1.6;
    sourceRef.current.playbackRate.setTargetAtTime(targetPitch, ctxRef.current.currentTime, AUDIO_RAMP_TIME);

    // Filter opens up at higher speeds
    if (filterRef.current) {
      filterRef.current.frequency.setTargetAtTime(
        IDLE_FILTER_CUTOFF + absSpeed * FILTER_CUTOFF_PER_KMH,
        ctxRef.current.currentTime,
        AUDIO_RAMP_TIME,
      );
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {}
        ctxRef.current = null;
      }
    };
  }, []);
}
