import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFrame } from '@react-three/fiber';

/** Augment Window for Safari's prefixed AudioContext */
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Procedural tire skid & screech sound generator using Web Audio API white noise + bandpass filtering.
 * Modulates volume and pitch based on slipAngle, lateralSpeed, and ground contact.
 */
export function useSkidSound() {
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  useEffect(() => {
    if (gameState === 'playing' && !isInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;

      const initSkidAudio = () => {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();

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

          if (!currentPlaying && ctx.state === 'running') {
            ctx.suspend();
          }

          ctxRef.current = ctx;
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
            ctxRef.current.resume();
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
          ctxRef.current.suspend();
        }
      }
    }
  }, [gameState, isInitialized]);

  useFrame(() => {
    if (!isInitialized || !ctxRef.current || !gainRef.current || !filterRef.current || gameState !== 'playing') {
      if (gainRef.current && gameState !== 'playing') {
        gainRef.current.gain.cancelScheduledValues(0);
        gainRef.current.gain.setValueAtTime(0, 0);
        gainRef.current.gain.value = 0;
      }
      return;
    }

    const { speed, lateralSpeed, slipAngle } = useGameStore.getState();
    const absSpeed = Math.abs(speed);
    const absLatSpeed = Math.abs(lateralSpeed);
    const absSlip = Math.abs(slipAngle);

    // Skid triggers when sliding laterally with sufficient speed
    const isSkidding = absSpeed > 15 && (absLatSpeed > 2.5 || absSlip > 0.25);

    let targetVolume = 0;
    if (isSkidding) {
      const intensity = Math.min((absLatSpeed - 2.0) / 8.0, 1.0);
      targetVolume = intensity * 0.25 * sfxVolume;

      // Modulate screech pitch with speed
      const targetFreq = 1000 + Math.min(absSpeed * 10, 1200);
      filterRef.current.frequency.setTargetAtTime(targetFreq, ctxRef.current.currentTime, 0.05);
    }

    gainRef.current.gain.setTargetAtTime(targetVolume, ctxRef.current.currentTime, 0.06);
  });

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
