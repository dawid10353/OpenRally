import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { InstancedMesh, Object3D, Color, Vector3, CanvasTexture, Quaternion } from 'three';

// Reusable objects for matrix composition (saves CPU and GC)
const _q = new Quaternion();
const _axisZ = new Vector3(0, 0, 1);
const _scale = new Vector3();

// Create soft particle texture outside component to avoid recreation
const createDustTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 32;
    const cy = 32;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
};

const dustTexture = createDustTexture();
import {
  MAX_PARTICLES,
  DUST_COLOR,
  SMOKE_COLOR,
  DRIFT_ANGVEL_THRESHOLD,
  DRIVING_SPEED_THRESHOLD,
  GROUND_OFFSET,
  DRIFT_PARTICLE_LIFETIME,
  DRIVE_PARTICLE_LIFETIME,
} from '@/config/particles';

interface Particle {
  active: boolean;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: Color;
  rotationAngle: number;
  rotationSpeed: number;
}

interface DustParticlesProps {
  wheelsRef: React.RefObject<(Object3D | null)[]>;
  chassisRef: React.RefObject<RapierRigidBody | null>;
}

export function DustParticles({ wheelsRef, chassisRef }: DustParticlesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const particleIndexRef = useRef(0);
  const timeAccumulator = useRef(0);

  // Opacity array for smooth fading
  const opacityArray = useMemo(() => new Float32Array(MAX_PARTICLES).fill(0), []);

  // Initialize particles pool
  const particles = useMemo(() => {
    return Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      position: new Vector3(),
      velocity: new Vector3(),
      life: 0,
      maxLife: 1,
      scale: 1,
      color: new Color(),
      rotationAngle: 0,
      rotationSpeed: 0,
    })) as Particle[];
  }, []);

  const dummy = useMemo(() => new Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current || !chassisRef.current || !wheelsRef.current) return;

    const body = chassisRef.current;
    const wheels = wheelsRef.current;

    // Check speed and drift
    const linvel = body.linvel();
    const speed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
    const angvel = body.angvel();
    const isDrifting = Math.abs(angvel.y) > DRIFT_ANGVEL_THRESHOLD && speed > DRIVING_SPEED_THRESHOLD;
    const isDriving = speed > DRIVING_SPEED_THRESHOLD;

    // Emit new particles using a time accumulator to guarantee continuous flow without gaps
    timeAccumulator.current += delta;
    const EMIT_RATE = isDrifting ? 0.02 : 0.05; // 50 particles/sec drift, 20 particles/sec drive

    if (isDriving || isDrifting) {
      let emissionsToDo = Math.floor(timeAccumulator.current / EMIT_RATE);
      // Cap at 3 per frame to prevent lag spikes if tab was in background
      emissionsToDo = Math.min(emissionsToDo, 3);

      if (emissionsToDo > 0) {
        timeAccumulator.current -= emissionsToDo * EMIT_RATE;

        for (let e = 0; e < emissionsToDo; e++) {
          // Emit from all wheels
          [0, 1, 2, 3].forEach((wheelIdx) => {
            const wheel = wheels[wheelIdx];
            if (!wheel) return;

            // Check if wheel is touching the ground (suspension compressed)
            const isGrounded = wheel.position.y > -0.49;
            if (!isGrounded) return;

            const p = particles[particleIndexRef.current];
            p.active = true;
            // Get wheel world position
            wheel.getWorldPosition(p.position);
            
            // Do not emit dust if the wheel is in the water
            if (p.position.y - 0.35 <= -8.0) {
              p.active = false;
              return;
            }
            p.position.y -= GROUND_OFFSET;

            // Burst velocity from wheel spinning
            p.velocity.set(
              (Math.random() - 0.5) * 4,
              Math.random() * 2 + 1,
              (Math.random() - 0.5) * 4
            );

            p.life = 0;
            p.maxLife = isDrifting ? DRIFT_PARTICLE_LIFETIME : DRIVE_PARTICLE_LIFETIME;
            p.scale = Math.random() * 0.3 + 0.1; // Even smaller for less volume
            p.color.copy(isDrifting ? SMOKE_COLOR : DUST_COLOR);
            p.rotationAngle = Math.random() * Math.PI * 2;
            p.rotationSpeed = (Math.random() - 0.5) * 2;

            particleIndexRef.current = (particleIndexRef.current + 1) % MAX_PARTICLES;
          });
        }
      }
    } else {
      // Prevent accumulator from building up when not moving
      timeAccumulator.current = 0;
    }

    // Update and render particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (p.active) {
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          // Hide it
          dummy.position.set(0, -1000, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
          opacityArray[i] = 0;
          continue;
        }

        // Air resistance (drag) and upward lift
        p.velocity.x *= Math.pow(0.05, delta); // slow down quickly laterally
        p.velocity.z *= Math.pow(0.05, delta);
        p.velocity.y += delta * 1.5; // slight upward drift

        p.position.addScaledVector(p.velocity, delta);
        p.rotationAngle += p.rotationSpeed * delta;
        
        const progress = p.life / p.maxLife;
        
        // Smooth fade in and fade out using opacity instead of imploding scale
        let currentOpacity = 0;
        if (progress < 0.2) {
          // Fade in (0 to 1)
          currentOpacity = progress / 0.2;
        } else if (progress > 0.6) {
          // Fade out smoothly (1 to 0) using an easing curve
          const t = (progress - 0.6) / 0.4;
          currentOpacity = 1 - (t * t); 
        } else {
          currentOpacity = 1;
        }

        // Keep expanding, don't shrink! (minimal expansion)
        const currentScale = p.scale * (1 + progress * 1.5);

        // Billboarding: face camera + individual particle rotation
        _q.setFromAxisAngle(_axisZ, p.rotationAngle);
        dummy.quaternion.copy(state.camera.quaternion).multiply(_q);
        
        _scale.set(currentScale, currentScale, currentScale);
        dummy.matrix.compose(p.position, dummy.quaternion, _scale);

        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, p.color);
        opacityArray[i] = currentOpacity;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (meshRef.current.geometry && meshRef.current.geometry.attributes.instanceOpacity) {
      meshRef.current.geometry.attributes.instanceOpacity.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <planeGeometry args={[1.5, 1.5]}>
        <instancedBufferAttribute
          attach="attributes-instanceOpacity"
          args={[opacityArray, 1]}
        />
      </planeGeometry>
      <meshBasicMaterial
        transparent
        map={dustTexture}
        depthWrite={false}
        opacity={0.8}
        onBeforeCompile={(shader) => {
          shader.vertexShader = `
            attribute float instanceOpacity;
            varying float vInstanceOpacity;
            ${shader.vertexShader}
          `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
             vInstanceOpacity = instanceOpacity;`
          );
          shader.fragmentShader = `
            varying float vInstanceOpacity;
            ${shader.fragmentShader}
          `.replace(
            `vec4 diffuseColor = vec4( diffuse, opacity );`,
            `vec4 diffuseColor = vec4( diffuse, opacity * vInstanceOpacity );`
          );
        }}
      />
    </instancedMesh>
  );
}
