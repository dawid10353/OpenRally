import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useFrame } from '@react-three/fiber';
import {
  ENGINE_VOLUME,
  IDLE_FREQUENCY,
  FREQUENCY_PER_KMH,
  IDLE_FILTER_CUTOFF,
  FILTER_CUTOFF_PER_KMH,
  AUDIO_RAMP_TIME,
  GAIN_RAMP_TIME,
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

  // Audio nodes
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);

  // Initialize audio on first 'playing' state (user gesture required)
  useEffect(() => {
    if (gameState === 'playing' && !isInitialized) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        // Master gain
        const masterGain = ctx.createGain();
        masterGain.gain.value = ENGINE_VOLUME;
        masterGain.connect(ctx.destination);

        // Engine Filter to make it sound muffled/bassy
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = IDLE_FILTER_CUTOFF;
        filter.connect(masterGain);

        // Oscillator for the engine hum
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = IDLE_FREQUENCY;
        osc.connect(filter);
        osc.start();

        ctxRef.current = ctx;
        oscRef.current = osc;
        gainRef.current = masterGain;
        filterRef.current = filter;

        setIsInitialized(true);
      } catch (e) {
        console.warn('AudioContext creation failed', e);
      }
    }
  }, [gameState, isInitialized]);

  // Mute/Resume audio based on game state
  useEffect(() => {
    if (ctxRef.current && gainRef.current) {
      if (gameState === 'playing') {
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
        gainRef.current.gain.setTargetAtTime(ENGINE_VOLUME, ctxRef.current.currentTime, GAIN_RAMP_TIME);
      } else {
        // Mute when paused/menu
        gainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, GAIN_RAMP_TIME);
      }
    }
  }, [gameState]);

  // Update pitch based on speed
  useFrame(() => {
    if (!isInitialized || !oscRef.current || !ctxRef.current) return;

    const speed = useGameStore.getState().speed;
    const absSpeed = Math.abs(speed);

    // Pitch increases with speed
    const targetFreq = IDLE_FREQUENCY + absSpeed * FREQUENCY_PER_KMH;
    oscRef.current.frequency.setTargetAtTime(targetFreq, ctxRef.current.currentTime, AUDIO_RAMP_TIME);

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
        ctxRef.current.close();
      }
    };
  }, []);
}
