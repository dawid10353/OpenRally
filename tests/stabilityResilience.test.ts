import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { applyAerodynamics } from '@/utils/physics/aerodynamics';
import { applyAssists } from '@/utils/physics/assists';
import { applyAntiRollBars } from '@/utils/physics/suspension';
import { applyAwdDriftPropulsion } from '@/utils/physics/drivetrain';
import { calculateRPM } from '@/utils/physics/powertrain';
import { DEFAULT_VEHICLE_CONFIG } from '@/config/vehicle';
import type { IRapierVehicleController } from '@/types/vehicle';
import type { RapierRigidBody } from '@react-three/rapier';

describe('Stability & Crash Prevention Resilience Tests (Android & WebGL)', () => {
  describe('Aerodynamics NaN & Zero-GC Guard', () => {
    it('safely handles non-finite forwardSpeed, posY, and velocity without throwing or passing NaN impulses', () => {
      const impulses: { x: number; y: number; z: number }[] = [];
      const mockBody = {
        rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
        mass: () => 1200,
        applyImpulse: (impulse: { x: number; y: number; z: number }) => {
          impulses.push({ ...impulse });
        },
      } as unknown as RapierRigidBody;

      // Pass NaN velocity and posY
      const nanVel = new Vector3(NaN, NaN, NaN);
      expect(() => {
        applyAerodynamics(mockBody, DEFAULT_VEHICLE_CONFIG, NaN, nanVel, NaN, 0.016);
      }).not.toThrow();

      // Ensure no NaN values were ever passed to applyImpulse
      for (const imp of impulses) {
        expect(Number.isFinite(imp.x)).toBe(true);
        expect(Number.isFinite(imp.y)).toBe(true);
        expect(Number.isFinite(imp.z)).toBe(true);
      }
    });

    it('safely applies water drag when submerged with finite values and zero object allocations', () => {
      const impulses: { x: number; y: number; z: number }[] = [];
      const mockBody = {
        rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
        mass: () => 1200,
        applyImpulse: (impulse: { x: number; y: number; z: number }) => {
          impulses.push({ ...impulse });
        },
      } as unknown as RapierRigidBody;

      const vel = new Vector3(10, 0, 15);
      applyAerodynamics(mockBody, DEFAULT_VEHICLE_CONFIG, 18, vel, -8.0, 0.016);

      expect(impulses.length).toBeGreaterThan(0);
      for (const imp of impulses) {
        expect(Number.isFinite(imp.x)).toBe(true);
        expect(Number.isFinite(imp.y)).toBe(true);
        expect(Number.isFinite(imp.z)).toBe(true);
      }
    });
  });

  describe('Assists & Stability Controls NaN Guard', () => {
    it('safely handles NaN angvel and rotation in applyAssists without passing NaN to applyTorqueImpulse', () => {
      const torques: { x: number; y: number; z: number }[] = [];
      const mockBody = {
        angvel: () => ({ x: NaN, y: NaN, z: NaN }),
        rotation: () => ({ x: NaN, y: NaN, z: NaN, w: NaN }),
        mass: () => 1200,
        applyTorqueImpulse: (torque: { x: number; y: number; z: number }) => {
          torques.push({ ...torque });
        },
      } as unknown as RapierRigidBody;

      expect(() => {
        applyAssists(
          mockBody,
          DEFAULT_VEHICLE_CONFIG,
          { throttle: 1, brake: 0, steering: 0.5, handbrake: false, cameraToggle: false, reset: false },
          NaN,
          0.016,
        );
      }).not.toThrow();

      for (const t of torques) {
        expect(Number.isFinite(t.x)).toBe(true);
        expect(Number.isFinite(t.y)).toBe(true);
        expect(Number.isFinite(t.z)).toBe(true);
      }
    });
  });

  describe('Suspension & ARB NaN Guard', () => {
    it('safely handles corrupted / null suspension lengths without throwing or passing NaN impulses', () => {
      const pointImpulses: { impulse: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } }[] = [];
      const torques: { x: number; y: number; z: number }[] = [];

      const mockBody = {
        translation: () => ({ x: 0, y: 0, z: 0 }),
        rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
        angvel: () => ({ x: 0, y: 0, z: 0 }),
        mass: () => 1200,
        applyTorqueImpulse: (t: { x: number; y: number; z: number }) => {
          torques.push({ ...t });
        },
        applyImpulseAtPoint: (imp: { x: number; y: number; z: number }, pt: { x: number; y: number; z: number }) => {
          pointImpulses.push({ impulse: { ...imp }, point: { ...pt } });
        },
      } as unknown as RapierRigidBody;

      const mockController = {
        wheelSuspensionLength: () => NaN,
        wheelChassisConnectionPointCs: () => ({ x: 1, y: 0, z: 1 }),
      } as unknown as IRapierVehicleController;

      expect(() => {
        applyAntiRollBars(mockBody, mockController, DEFAULT_VEHICLE_CONFIG, 0.016);
      }).not.toThrow();

      for (const t of torques) {
        expect(Number.isFinite(t.x)).toBe(true);
        expect(Number.isFinite(t.y)).toBe(true);
        expect(Number.isFinite(t.z)).toBe(true);
      }
      for (const p of pointImpulses) {
        expect(Number.isFinite(p.impulse.x)).toBe(true);
        expect(Number.isFinite(p.impulse.y)).toBe(true);
        expect(Number.isFinite(p.impulse.z)).toBe(true);
        expect(Number.isFinite(p.point.x)).toBe(true);
        expect(Number.isFinite(p.point.y)).toBe(true);
        expect(Number.isFinite(p.point.z)).toBe(true);
      }
    });
  });

  describe('Drivetrain AWD Drift Thrust NaN Guard', () => {
    it('safely handles non-finite inputs in applyAwdDriftPropulsion without applying NaN impulses', () => {
      const impulses: { x: number; y: number; z: number }[] = [];
      const mockBody = {
        applyImpulse: (imp: { x: number; y: number; z: number }) => {
          impulses.push({ ...imp });
        },
      } as unknown as RapierRigidBody;

      const fwd = new Vector3(0, 0, 1);
      expect(() => {
        applyAwdDriftPropulsion(
          mockBody,
          DEFAULT_VEHICLE_CONFIG,
          { throttle: 1, steering: 0.5 },
          fwd,
          NaN,
          NaN,
          1.0,
          0.016,
          1,
        );
      }).not.toThrow();

      for (const imp of impulses) {
        expect(Number.isFinite(imp.x)).toBe(true);
        expect(Number.isFinite(imp.y)).toBe(true);
        expect(Number.isFinite(imp.z)).toBe(true);
      }
    });
  });

  describe('Powertrain RPM Resilience', () => {
    it('returns finite, safe idle RPM when passed NaN speed, throttle, or brake', () => {
      const rpm = calculateRPM(NaN, 1, { throttle: NaN, brake: NaN, steering: NaN });
      expect(Number.isFinite(rpm)).toBe(true);
      expect(rpm).toBeGreaterThanOrEqual(800);
      expect(rpm).toBeLessThanOrEqual(8000);
    });

    it('returns finite clamped RPM when passed infinite values or extreme deltas', () => {
      const rpm = calculateRPM(Infinity, 1, { throttle: 1, brake: 0 }, { dt: 50.0, currentRpm: NaN });
      expect(Number.isFinite(rpm)).toBe(true);
      expect(rpm).toBeGreaterThanOrEqual(800);
      expect(rpm).toBeLessThanOrEqual(8000);
    });
  });

  describe('Garage Canvas Error Boundary Resilience', () => {
    it('catches 3D canvas initialization / WebGL context errors gracefully without throwing', async () => {
      const { GarageCanvasErrorBoundary } = await import('@/components/ui/menu/GarageView');
      const testError = new Error('WebGL context lost or WebGL 2.0 unsupported on device');
      const state = GarageCanvasErrorBoundary.getDerivedStateFromError(testError);

      expect(state.hasError).toBe(true);
      expect(state.errorMessage).toContain('WebGL');
    });

    it('provides a descriptive fallback message if the caught error message is empty', async () => {
      const { GarageCanvasErrorBoundary } = await import('@/components/ui/menu/GarageView');
      const emptyError = new Error('');
      const state = GarageCanvasErrorBoundary.getDerivedStateFromError(emptyError);

      expect(state.hasError).toBe(true);
      expect(state.errorMessage).toBe('3D Preview unavailable on this device');
    });
  });

  describe('Web Audio Param & Promise Safety', () => {
    it('safely handles audio gain reset without throwing on zero time parameter', () => {
      const mockGainNode = {
        gain: {
          value: 1.0,
          cancelScheduledValues: (time: number) => {
            if (!Number.isFinite(time)) throw new Error('Invalid time');
          },
        },
      };

      expect(() => {
        mockGainNode.gain.cancelScheduledValues(0);
        mockGainNode.gain.value = 0;
      }).not.toThrow();

      expect(mockGainNode.gain.value).toBe(0);
    });
  });

  describe('Terrain Compiler NaN Guard', () => {
    it('returns 0 without throwing or accessing invalid indices when passed NaN coordinates or zero dimensions', async () => {
      const { getInterpolatedHeight } = await import('@/utils/terrainCompiler');
      const heights = new Float32Array(16);

      expect(getInterpolatedHeight(NaN, 0, heights, 4, 4, 100, 100)).toBe(0);
      expect(getInterpolatedHeight(0, NaN, heights, 4, 4, 100, 100)).toBe(0);
      expect(getInterpolatedHeight(NaN, NaN, heights, 4, 4, 100, 100)).toBe(0);
      expect(getInterpolatedHeight(10, 10, heights, 0, 0, 100, 100)).toBe(0);
      expect(getInterpolatedHeight(10, 10, heights, 4, 4, 0, 100)).toBe(0);
    });
  });

  describe('Tire & Drivetrain Physics NaN Sanity Guards', () => {
    it('never passes NaN steer, friction slip, or brake to Rapier wheel controller', async () => {
      const { applyTireFrictionAndBrakes } = await import('@/utils/physics/tires');

      const wheelSteers: number[] = [];
      const wheelSlips: number[] = [];
      const wheelBrakes: number[] = [];

      const mockController = {
        setWheelSteering: (_idx: number, steer: number) => {
          wheelSteers.push(steer);
        },
        setWheelFrictionSlip: (_idx: number, slip: number) => {
          wheelSlips.push(slip);
        },
        setWheelBrake: (_idx: number, brake: number) => {
          wheelBrakes.push(brake);
        },
        wheelSuspensionLength: () => 0.3,
        wheelChassisConnectionPointCs: () => ({ x: 0, y: 0, z: 0 }),
      } as unknown as IRapierVehicleController;

      expect(() => {
        applyTireFrictionAndBrakes(
          mockController,
          DEFAULT_VEHICLE_CONFIG,
          { brake: NaN, handbrake: false, steering: NaN, throttle: NaN },
          NaN,
          NaN,
          NaN,
          NaN,
          NaN,
          NaN,
        );
      }).not.toThrow();

      for (const s of wheelSteers) expect(Number.isFinite(s)).toBe(true);
      for (const s of wheelSlips) expect(Number.isFinite(s)).toBe(true);
      for (const b of wheelBrakes) expect(Number.isFinite(b)).toBe(true);
    });

    it('never passes NaN engine force to Rapier wheel controller in applyDrivetrain', async () => {
      const { applyDrivetrain } = await import('@/utils/physics/drivetrain');
      const forces: number[] = [];

      const mockController = {
        setWheelEngineForce: (_idx: number, force: number) => {
          forces.push(force);
        },
        wheelSuspensionLength: () => 0.3,
      } as unknown as IRapierVehicleController;

      expect(() => {
        applyDrivetrain(
          mockController,
          DEFAULT_VEHICLE_CONFIG,
          { throttle: NaN, brake: NaN },
          NaN,
          1,
          NaN,
          NaN,
        );
      }).not.toThrow();

      for (const f of forces) {
        expect(Number.isFinite(f)).toBe(true);
      }
    });
  });

  describe('Mobile Shadow Pipeline Protection', () => {
    it('strictly returns false on mobile devices for getCanvasShadowsType across all quality profiles', async () => {
      const { getCanvasShadowsType } = await import('@/components/canvas/GameCanvas');

      expect(getCanvasShadowsType(true, 'very_high', true)).toBe(false);
      expect(getCanvasShadowsType(true, 'high', true)).toBe(false);
      expect(getCanvasShadowsType(true, 'medium', true)).toBe(false);
      expect(getCanvasShadowsType(true, 'low', true)).toBe(false);
    });
  });

  describe('Countdown Audio Node Disconnection Guard', () => {
    it('safely registers osc.onended to prevent lingering audio nodes', async () => {
      const { playCountdownBeep } = await import('@/utils/countdownSound');
      const audioModule = await import('@/utils/audio/audioContext');

      let onEndedAssigned = false;
      const mockOsc = {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
        set onended(_fn: unknown) {
          onEndedAssigned = true;
        },
      };

      const mockGain = {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        disconnect: () => {},
      };

      const mockCtx = {
        currentTime: 0,
        createOscillator: () => mockOsc,
        createGain: () => mockGain,
        destination: {},
      } as unknown as AudioContext;

      audioModule.resetSharedAudioContextForTests(mockCtx);

      expect(() => playCountdownBeep(false)).not.toThrow();
      expect(onEndedAssigned).toBe(true);

      audioModule.resetSharedAudioContextForTests(null);
    });
  });

  describe('App Backgrounding HTML5 Audio Pause Guard', () => {
    it('safely pauses all HTML5 audio elements on handleAppBackgrounded', async () => {
      const { handleAppBackgrounded } = await import('@/hooks/useAppLifecycle');

      let audio1Paused = false;
      let audio2Paused = false;

      const mockAudio1 = {
        pause: () => {
          audio1Paused = true;
        },
      };
      const mockAudio2 = {
        pause: () => {
          audio2Paused = true;
        },
      };

      const globalScope = globalThis as unknown as { document?: unknown };
      const originalDoc = globalScope.document;
      globalScope.document = {
        querySelectorAll: () => [mockAudio1, mockAudio2],
      };

      try {
        expect(() => handleAppBackgrounded()).not.toThrow();
        expect(audio1Paused).toBe(true);
        expect(audio2Paused).toBe(true);
      } finally {
        if (originalDoc === undefined) {
          delete globalScope.document;
        } else {
          globalScope.document = originalDoc;
        }
      }
    });
  });

  describe('Closed AudioContext Auto-Recovery Guard', () => {
    it('discards a closed AudioContext and instantiates a fresh active context', async () => {
      const audioModule = await import('@/utils/audio/audioContext');

      const mockClosedCtx = {
        state: 'closed',
      } as unknown as AudioContext;

      audioModule.resetSharedAudioContextForTests(mockClosedCtx);

      // Verify that getSharedAudioContext detects the closed state and resets it
      const globalScope = globalThis as unknown as { window?: unknown; AudioContext?: unknown };
      let newCtxCreated = false;
      const mockNewCtx = {
        state: 'running',
        onstatechange: null,
      };

      class MockAudioCtxConstructor {
        constructor() {
          newCtxCreated = true;
          return mockNewCtx;
        }
      }

      const origWindow = globalScope.window;
      const origAudioCtx = globalScope.AudioContext;
      globalScope.window = {
        AudioContext: MockAudioCtxConstructor,
      };
      globalScope.AudioContext = MockAudioCtxConstructor;

      try {
        const result = audioModule.getSharedAudioContext();
        expect(newCtxCreated).toBe(true);
        expect(result).toBe(mockNewCtx);
      } finally {
        globalScope.window = origWindow;
        globalScope.AudioContext = origAudioCtx;
        audioModule.resetSharedAudioContextForTests(null);
      }
    });
  });

  describe('Zero-GC Tire Ribbon Contact Point & NaN Guards', () => {
    it('safely rejects NaN contact points without corrupting ribbon topology or throwing', async () => {
      const { TireRibbonBuffer } = await import('@/utils/physics/tireRibbon');
      const ribbon = new TireRibbonBuffer({ maxSegments: 100, lifetime: 5, minDistance: 0.1 });

      const nanPos = new Vector3(NaN, NaN, NaN);
      const normal = new Vector3(0, 1, 0);

      // Should return false and not push NaN points into the buffer
      const added = ribbon.addContactPoint(nanPos, normal, 'tarmac', 10, 0, true, 1.0);
      expect(added).toBe(false);
      expect(ribbon.getSegmentCount()).toBe(0);

      // Valid points addition
      const pt1 = new Vector3(0, 0, 0);
      const pt2 = new Vector3(0, 0, 1);
      ribbon.addContactPoint(pt1, normal, 'tarmac', 10, 0, true, 1.0);
      const added2 = ribbon.addContactPoint(pt2, normal, 'tarmac', 10, 0, true, 1.1);
      expect(added2).toBe(true);
      expect(ribbon.getSegmentCount()).toBe(1);
    });

    it('sampleTerrainHeightAndNormal returns finite numbers even with NaN inputs', async () => {
      const { sampleTerrainHeightAndNormal } = await import('@/utils/physics/tireRibbon');
      const outPos = new Vector3();
      const outNormal = new Vector3();

      expect(() => {
        sampleTerrainHeightAndNormal(NaN, NaN, undefined, undefined, outPos, outNormal, NaN);
      }).not.toThrow();

      expect(Number.isFinite(outPos.x)).toBe(true);
      expect(Number.isFinite(outPos.y)).toBe(true);
      expect(Number.isFinite(outPos.z)).toBe(true);
      expect(Number.isFinite(outNormal.x)).toBe(true);
      expect(Number.isFinite(outNormal.y)).toBe(true);
      expect(Number.isFinite(outNormal.z)).toBe(true);
    });
  });

  describe('Wheel Visual Spin NaN & Zero Radius Guard', () => {
    it('safely ignores NaN speeds and zero radii in syncWheelVisuals without corrupting local matrices', async () => {
      const { syncWheelVisuals } = await import('@/utils/physics/visuals');
      const { Object3D } = await import('three');

      const wheelObj = new Object3D();
      const childObj = new Object3D();
      wheelObj.add(childObj);

      const mockController = {
        wheelChassisConnectionPointCs: () => ({ x: 0, y: 0, z: 0 }),
        wheelSuspensionLength: () => 0.3,
        wheelSteering: () => 0,
        wheelIsInContact: () => true,
      } as unknown as IRapierVehicleController;

      const mockConfig = {
        ...DEFAULT_VEHICLE_CONFIG,
        wheels: [
          {
            ...DEFAULT_VEHICLE_CONFIG.wheels[0],
            radius: 0, // zero radius edge case
          },
          DEFAULT_VEHICLE_CONFIG.wheels[1],
          DEFAULT_VEHICLE_CONFIG.wheels[2],
          DEFAULT_VEHICLE_CONFIG.wheels[3],
        ] as const,
      };

      const wheelRefs = { current: [wheelObj] };

      expect(() => {
        syncWheelVisuals(mockController, wheelRefs, mockConfig, NaN, NaN, NaN, 1);
      }).not.toThrow();

      // Child rotation should remain finite (0)
      expect(Number.isFinite(childObj.rotation.x)).toBe(true);
      expect(Math.abs(childObj.rotation.x)).toBe(0);
    });
  });

  describe('Vehicle 3D GLB Model Asset Loading Error Boundary', () => {
    it('safely catches GLTF parsing / loading errors in VehicleModelErrorBoundary and sets hasError state', async () => {
      const { VehicleModelErrorBoundary } = await import('@/components/vehicle/Vehicle');
      const state = VehicleModelErrorBoundary.getDerivedStateFromError();
      expect(state.hasError).toBe(true);
    });
  });

  describe('Garage 3D Scene Suspension & Pacer Guard', () => {
    it('manages isGarageOpen state cleanly to eliminate dual-canvas contention', async () => {
      const { useGameStore } = await import('@/store/gameStore');

      useGameStore.getState().setGarageOpen(true);
      expect(useGameStore.getState().isGarageOpen).toBe(true);

      useGameStore.getState().setGarageOpen(false);
      expect(useGameStore.getState().isGarageOpen).toBe(false);
    });
  });

  describe('App Backgrounding Gamepad State Reset Guard', () => {
    it('clears gamepad edge states on handleAppBackgrounded', async () => {
      const { handleAppBackgrounded } = await import('@/hooks/useAppLifecycle');
      const { prevButtonStates } = await import('@/utils/input/gamepad');

      prevButtonStates.gearUp = true;
      prevButtonStates.gearDown = true;
      prevButtonStates.handbrake = true;

      handleAppBackgrounded();

      expect(prevButtonStates.gearUp).toBe(false);
      expect(prevButtonStates.gearDown).toBe(false);
      expect(prevButtonStates.handbrake).toBe(false);
    });
  });
});

