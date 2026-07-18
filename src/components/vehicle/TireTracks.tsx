import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { InstancedMesh, Object3D, Vector3, Quaternion, CanvasTexture, RepeatWrapping } from 'three';

// Create a procedural tire track texture (sand displacement + tread pattern)
const createTrackTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Fill with transparent white
    ctx.clearRect(0, 0, 64, 64);

    // Soft horizontal gradient for the track edges
    const gradient = ctx.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.15, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.85, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    // Darker tread pattern (chevrons)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.globalCompositeOperation = 'source-atop'; // Clip to the gradient
    for (let i = -16; i < 80; i += 16) {
      ctx.beginPath();
      ctx.moveTo(8, i);
      ctx.lineTo(32, i + 12);
      ctx.lineTo(56, i);
      ctx.lineTo(56, i + 8);
      ctx.lineTo(32, i + 20);
      ctx.lineTo(8, i + 8);
      ctx.fill();
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
};

const trackTexture = createTrackTexture();
import {
  MAX_TRACKS,
  TRACK_WIDTH,
  TRACK_LIFETIME,
  TRACK_COLOR,
  TRACK_MIN_DISTANCE
} from '@/config/particles';

interface TrackSegment {
  active: boolean;
  life: number;
}

interface TireTracksProps {
  wheelsRef: React.RefObject<(Object3D | null)[]>;
  chassisRef: React.RefObject<RapierRigidBody | null>;
}

export function TireTracks({ wheelsRef, chassisRef }: TireTracksProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const trackIndexRef = useRef(0);

  // Stores the last position of each wheel (0-3)
  const lastWheelPositions = useRef<Vector3[]>([
    new Vector3(), new Vector3(), new Vector3(), new Vector3()
  ]);

  const segments = useMemo(() => {
    return Array.from({ length: MAX_TRACKS }, () => ({
      active: false,
      life: 0,
    })) as TrackSegment[];
  }, []);

  const opacityArray = useMemo(() => new Float32Array(MAX_TRACKS).fill(0), []);
  const dummy = useMemo(() => new Object3D(), []);
  const currentPos = useMemo(() => new Vector3(), []);
  const midPoint = useMemo(() => new Vector3(), []);
  const carUp = useMemo(() => new Vector3(0, 1, 0), []);
  const carQuat = useMemo(() => new Quaternion(), []);

  useFrame((_, delta) => {
    if (!meshRef.current || !chassisRef.current || !wheelsRef.current) return;

    const body = chassisRef.current;
    const wheels = wheelsRef.current;

    const linvel = body.linvel();
    const speed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
    
    const rot = body.rotation();
    carQuat.set(rot.x, rot.y, rot.z, rot.w);
    carUp.set(0, 1, 0).applyQuaternion(carQuat);
    
    // Emit new tracks continuously if moving, to simulate driving on sand
    const isMoving = speed > 0.5;

    if (isMoving) {
      for (let i = 0; i < 4; i++) {
        const wheel = wheels[i];
        if (!wheel) continue;

        // Ensure wheel is touching the ground (roughly)
        const isGrounded = wheel.position.y > -0.49;
        if (!isGrounded) continue;

        wheel.getWorldPosition(currentPos);
        
        // Ground contact point (wheel radius is 0.35)
        // We set it exactly at the wheel's bottom edge. polygonOffset in the material handles z-fighting.
        currentPos.addScaledVector(carUp, -0.35);

        const lastPos = lastWheelPositions.current[i];
        
        // Initialize last position
        if (lastPos.lengthSq() === 0) {
          lastPos.copy(currentPos);
          continue;
        }

        const distance = currentPos.distanceTo(lastPos);

        if (distance > TRACK_MIN_DISTANCE) {
          // If distance is unnaturally huge (teleport/respawn), just reset
          if (distance > 5) {
             lastPos.copy(currentPos);
             continue;
          }

          const idx = trackIndexRef.current;
          const segment = segments[idx];

          segment.active = true;
          segment.life = 0;

          // Midpoint for the mesh position
          midPoint.addVectors(currentPos, lastPos).multiplyScalar(0.5);

          dummy.position.copy(midPoint);
          // Orient the mesh to face the current position
          dummy.up.copy(carUp);
          dummy.lookAt(currentPos);
          // Rotate to lie flat on the ground.
          // PlaneGeometry is on the XY plane. After rotateX(-90deg), it lies on XZ.
          // Its local Y axis now points forward, and Z points UP.
          dummy.rotateX(-Math.PI / 2);
          
          // Scale: X = width, Y = length (forward), Z = thickness (doesn't matter for plane)
          // Length is distance * 1.05 to slightly overlap and prevent gaps
          dummy.scale.set(TRACK_WIDTH, distance * 1.05, 1);
          dummy.updateMatrix();

          meshRef.current.setMatrixAt(idx, dummy.matrix);
          opacityArray[idx] = 0.35; // Max opacity of tracks

          lastPos.copy(currentPos);
          trackIndexRef.current = (idx + 1) % MAX_TRACKS;
        }
      }
    } else {
      // If not slipping, continually update lastPos so a line isn't drawn between separate drifts
      for (let i = 0; i < 4; i++) {
        const wheel = wheels[i];
        if (wheel) {
           wheel.getWorldPosition(currentPos);
           currentPos.addScaledVector(carUp, -0.35);
           lastWheelPositions.current[i].copy(currentPos);
        }
      }
    }

    // Update opacity for fading tracks
    let needsUpdate = false;
    for (let i = 0; i < MAX_TRACKS; i++) {
      const seg = segments[i];
      if (seg.active) {
        seg.life += delta;
        if (seg.life >= TRACK_LIFETIME) {
          // Track expired
          seg.active = false;
          opacityArray[i] = 0;
          dummy.position.set(0, -1000, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
        } else {
          // Fade out during the last 30% of its lifetime
          const progress = seg.life / TRACK_LIFETIME;
          if (progress > 0.7) {
             const fadeProgress = (progress - 0.7) / 0.3; // 0 to 1
             opacityArray[i] = 0.35 * (1 - fadeProgress);
          }
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.geometry && meshRef.current.geometry.attributes.instanceOpacity) {
        meshRef.current.geometry.attributes.instanceOpacity.needsUpdate = true;
      }
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_TRACKS]} frustumCulled={false}>
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute
          attach="attributes-instanceOpacity"
          args={[opacityArray, 1]}
        />
      </planeGeometry>
      <meshBasicMaterial
        transparent
        depthWrite={false}
        map={trackTexture}
        polygonOffset={true}
        polygonOffsetFactor={-10}
        polygonOffsetUnits={-10}
        color={TRACK_COLOR}
        opacity={1} // Base opacity handled by attribute
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
