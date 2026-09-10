import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFrame } from '@react-three/fiber';
import { Object3D } from 'three';
import { getOrLoadAudioBuffer } from '@/utils/audioCache';
import {
  SURFACE_MAX_VOLUME,
  SURFACE_SPEED_FOR_MAX_VOL,
  SURFACE_MIN_SPEED,
  SURFACE_BASE_PITCH,
  SURFACE_PITCH_PER_KMH,
  AUDIO_RAMP_TIME,
} from '@/config/sound';

import { getSharedAudioContext } from '@/utils/audio/audioContext';

/**
 * Procedural surface/tire rolling sound generator using Web Audio API.
 * Modulates volume based on vehicle speed and ground contact.
 */
export function useSurfaceSound(wheelsRef: React.RefObject<(Object3D | null)[]>) {
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);

  // Audio nodes
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  // Initialize audio on first 'playing' state
  useEffect(() => {
    if (gameState === 'playing' && !isInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;

      const initAudio = async () => {
        try {
          const ctx = getSharedAudioContext();
          if (!ctx) return;

          const currentPlaying = useGameStore.getState().gameState === 'playing';

          // Master gain for surface sound
          const masterGain = ctx.createGain();
          masterGain.gain.value = 0; // Starts silent (speed is 0)
          if (currentPlaying) {
            masterGain.connect(ctx.destination);
          }

          // Fetch and decode audio file (cached)
          const audioBuffer = await getOrLoadAudioBuffer('/sounds/sand-loop.mp3', ctx);

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
          isInitializingRef.current = false;
        }
      };

      initAudio();
    }
  }, [gameState, isInitialized]);

  // Mute audio when paused
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
  }, [gameState, sfxVolume, isInitialized]);

  // Update volume based on speed, ground contact, and global sfxVolume
  useFrame(() => {
    if (!isInitialized || !sourceRef.current || !ctxRef.current || !gainRef.current || gameState !== 'playing') {
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
      isInitializingRef.current = false;
      setIsInitialized(false);
      return;
    }

    // Check if at least one wheel is touching the ground (not airborne and has physical contact)
    const isAirborne = useGameStore.getState().isAirborne;
    let isGrounded = !isAirborne;
    if (isGrounded && wheelsRef.current) {
      let anyWheelContact = false;
      for (let i = 0; i < 4; i++) {
        const wheel = wheelsRef.current[i];
        if (wheel && wheel.userData.isGrounded !== false) {
          anyWheelContact = true;
          break;
        }
      }
      isGrounded = anyWheelContact;
    }

    const speed = useGameStore.getState().speed;
    const absSpeed = Math.abs(speed);
    const safeSpeed = Number.isFinite(absSpeed) ? absSpeed : 0;
    const safeSfxVolume = Number.isFinite(sfxVolume) ? Math.max(0, Math.min(1, sfxVolume)) : 0.8;

    // Calculate volume: 0 below MIN_SPEED or if in the air
    let targetVolume = 0;
    if (isGrounded && safeSpeed > SURFACE_MIN_SPEED) {
      const speedFactor = Math.min((safeSpeed - SURFACE_MIN_SPEED) / (SURFACE_SPEED_FOR_MAX_VOL - SURFACE_MIN_SPEED), 1);
      targetVolume = speedFactor * SURFACE_MAX_VOLUME * safeSfxVolume;
    }

    // Faster ramp down when losing contact with ground, normal ramp otherwise
    const rampTime = isGrounded ? AUDIO_RAMP_TIME : 0.05; 
    if (Number.isFinite(targetVolume) && ctxRef.current.currentTime >= 0) {
      gainRef.current.gain.setTargetAtTime(targetVolume, ctxRef.current.currentTime, rampTime);
    }

    // Pitch increases slightly with speed for more realism
    const targetPitch = SURFACE_BASE_PITCH + safeSpeed * SURFACE_PITCH_PER_KMH;
    if (Number.isFinite(targetPitch) && ctxRef.current.currentTime >= 0) {
      sourceRef.current.playbackRate.setTargetAtTime(targetPitch, ctxRef.current.currentTime, AUDIO_RAMP_TIME);
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
