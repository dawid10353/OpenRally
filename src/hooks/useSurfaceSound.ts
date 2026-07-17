import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import {
  SURFACE_MAX_VOLUME,
  SURFACE_SPEED_FOR_MAX_VOL,
  SURFACE_MIN_SPEED,
  SURFACE_BASE_PITCH,
  SURFACE_PITCH_PER_KMH,
  AUDIO_RAMP_TIME,
  GAIN_RAMP_TIME,
} from '@/config/sound';

/** Augment Window for Safari's prefixed AudioContext */
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Procedural surface/tire rolling sound generator using Web Audio API.
 * Modulates volume based on vehicle speed and ground contact.
 */
export function useSurfaceSound(wheelsRef: React.RefObject<(Object3D | null)[]>) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Audio nodes
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  // Initialize audio on first 'playing' state
  useEffect(() => {
    if (gameState === 'playing' && !isInitialized) {
      const initAudio = async () => {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();

          // Master gain for surface sound
          const masterGain = ctx.createGain();
          masterGain.gain.value = 0; // Starts silent (speed is 0)
          masterGain.connect(ctx.destination);

          // Fetch and decode audio file
          const response = await fetch('/sounds/sand-loop.mp3');
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          // Audio buffer source for the surface loop
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = true;
          source.playbackRate.value = SURFACE_BASE_PITCH;
          source.connect(masterGain);
          source.start();

          ctxRef.current = ctx;
          sourceRef.current = source;
          gainRef.current = masterGain;

          setIsInitialized(true);
        } catch (e) {
          console.warn('Surface audio fetch/decode failed', e);
        }
      };

      initAudio();
    }
  }, [gameState, isInitialized]); // We intentionally do not include sfxVolume here to avoid re-init

  // Mute audio when paused
  useEffect(() => {
    if (ctxRef.current && gainRef.current) {
      if (gameState === 'playing') {
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
        // The volume itself is updated in useFrame, so we don't set it to max here.
      } else {
        // Mute when paused/menu
        gainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, GAIN_RAMP_TIME);
      }
    }
  }, [gameState, sfxVolume]);

  // Update volume based on speed, ground contact, and global sfxVolume
  useFrame(() => {
    if (!isInitialized || !sourceRef.current || !ctxRef.current || !gainRef.current || gameState !== 'playing') return;

    // Check if at least one wheel is touching the ground (suspension is compressed)
    let isGrounded = false;
    if (wheelsRef.current) {
      for (let i = 0; i < 4; i++) {
        const wheel = wheelsRef.current[i];
        if (wheel && wheel.position.y > -0.49) {
          isGrounded = true;
          break;
        }
      }
    }

    const speed = useGameStore.getState().speed;
    const absSpeed = Math.abs(speed);

    // Calculate volume: 0 below MIN_SPEED or if in the air
    let targetVolume = 0;
    if (isGrounded && absSpeed > SURFACE_MIN_SPEED) {
      const speedFactor = Math.min((absSpeed - SURFACE_MIN_SPEED) / (SURFACE_SPEED_FOR_MAX_VOL - SURFACE_MIN_SPEED), 1);
      targetVolume = speedFactor * SURFACE_MAX_VOLUME * sfxVolume;
    }

    // Faster ramp down when losing contact with ground, normal ramp otherwise
    const rampTime = isGrounded ? AUDIO_RAMP_TIME : 0.05; 
    gainRef.current.gain.setTargetAtTime(targetVolume, ctxRef.current.currentTime, rampTime);

    // Pitch increases slightly with speed for more realism
    const targetPitch = SURFACE_BASE_PITCH + absSpeed * SURFACE_PITCH_PER_KMH;
    sourceRef.current.playbackRate.setTargetAtTime(targetPitch, ctxRef.current.currentTime, AUDIO_RAMP_TIME);
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
