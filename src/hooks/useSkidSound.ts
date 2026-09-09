import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFrame } from '@react-three/fiber';

import { getSharedAudioContext } from '@/utils/audio/audioContext';

/**
 * Procedural tire skid & screech sound generator using Web Audio API white noise + bandpass filtering.
 * Modulates volume and pitch based on slipAngle, lateralSpeed, and ground contact.
 */
export function useSkidSound() {
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  useEffect(() => {
    if (gameState === 'playing' && !isInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;

      const initSkidAudio = () => {
        try {
          const ctx = getSharedAudioContext();
          if (!ctx) return;

          const currentPlaying = useGameStore.getState().gameState === 'playing';

          // Generate 1-second white noise buffer
          const bufferSize = ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          whiteNoise.loop = true;

          // Bandpass filter for tire screech resonant frequencies (~800Hz - 2200Hz)
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1200;
          filter.Q.value = 4.0;

          const gain = ctx.createGain();
          gain.gain.value = 0;

          whiteNoise.connect(filter);
          filter.connect(gain);
          if (currentPlaying) {
            gain.connect(ctx.destination);
          }
          whiteNoise.start();

          ctxRef.current = ctx;
          sourceRef.current = whiteNoise;
          gainRef.current = gain;
          filterRef.current = filter;
          setIsInitialized(true);
        } catch (e) {
          console.warn('Skid sound initialization failed', e);
          isInitializingRef.current = false;
        }
      };

      initSkidAudio();
    }
  }, [gameState, isInitialized]);

  // Mute and suspend audio when paused or in menu
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
  }, [gameState, isInitialized]);

  useFrame(() => {
    if (!isInitialized || !ctxRef.current || !gainRef.current || !filterRef.current || gameState !== 'playing') {
      if (gainRef.current && gameState !== 'playing') {
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

    const { speed, lateralSpeed, slipAngle } = useGameStore.getState();
    const absSpeed = Math.abs(speed);
    const absLatSpeed = Math.abs(lateralSpeed);
    const absSlip = Math.abs(slipAngle);

    const safeSpeed = Number.isFinite(absSpeed) ? absSpeed : 0;
    const safeLatSpeed = Number.isFinite(absLatSpeed) ? absLatSpeed : 0;
    const safeSlip = Number.isFinite(absSlip) ? absSlip : 0;
    const safeSfxVolume = Number.isFinite(sfxVolume) ? Math.max(0, Math.min(1, sfxVolume)) : 0.8;

    // Skid triggers when sliding laterally with sufficient speed
    const isSkidding = safeSpeed > 15 && (safeLatSpeed > 2.5 || safeSlip > 0.25);

    let targetVolume = 0;
    if (isSkidding) {
      const intensity = Math.min((safeLatSpeed - 2.0) / 8.0, 1.0);
      targetVolume = intensity * 0.25 * safeSfxVolume;

      // Modulate screech pitch with speed
      const targetFreq = 1000 + Math.min(safeSpeed * 10, 1200);
      if (Number.isFinite(targetFreq) && ctxRef.current.currentTime >= 0) {
        filterRef.current.frequency.setTargetAtTime(targetFreq, ctxRef.current.currentTime, 0.05);
      }
    }

    if (Number.isFinite(targetVolume) && ctxRef.current.currentTime >= 0) {
      gainRef.current.gain.setTargetAtTime(targetVolume, ctxRef.current.currentTime, 0.06);
    }
  });

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
