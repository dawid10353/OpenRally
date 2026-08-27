import { useMemo } from 'react';
import { Text, useTexture } from '@react-three/drei';
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';
import { RepeatWrapping } from 'three';
import type { CheckpointData } from '@/types/racing';

interface CheckpointGateProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
  readonly isPassed?: boolean;
}

/**
 * Intermediate Rally Timing Checkpoint Gate.
 * Features realistic aluminum/steel truss architecture, textured carbon composite header beam,
 * authentic motorsport sponsor ribbons, heavy-duty hazard crash pads, and down-spotlights.
 * Free of fake static clock times, distorted aspect ratios, or arcade sky beacons.
 */
export function CheckpointGate({ data, isTarget, isPassed = false }: CheckpointGateProps) {
  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const gateHeight = 6.2;
  const topBarY = gateHeight + 0.9;
  const botBarY = gateHeight - 0.9;
  const bannerCenterY = gateHeight;
  const bannerHeight = 1.6;
  const bannerWidth = width * 0.72;

  // Load realistic AI-generated rally textures
  const carbonTexture = useTexture('/textures/race/carbon_fiber.jpg');
  const sponsorTexture = useTexture('/textures/race/sponsor_strip.jpg');
  const hazardTexture = useTexture('/textures/race/hazard_pad.jpg');

  useMemo(() => {
    carbonTexture.wrapS = RepeatWrapping;
    carbonTexture.wrapT = RepeatWrapping;
    carbonTexture.repeat.set(6, 1);
    carbonTexture.needsUpdate = true;

    hazardTexture.wrapS = RepeatWrapping;
    hazardTexture.wrapT = RepeatWrapping;
    hazardTexture.repeat.set(2, 1);
    hazardTexture.needsUpdate = true;
  }, [carbonTexture, hazardTexture]);

  const statusLightColor = isPassed ? '#4fc3f7' : isTarget ? '#00e676' : '#546e7a';
  const statusLightEmissive = isPassed ? '#0288d1' : isTarget ? '#00c853' : '#263238';
  const statusLightIntensity = isTarget ? 1.5 : isPassed ? 1.0 : 0.2;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, data.rotationY, 0]}
    >
      {/* ─── 0. SOLID PHYSICS COLLIDERS ─── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Left Pillar */}
        <CylinderCollider
          args={[gateHeight / 2, 0.55]}
          position={[-halfWidth, gateHeight / 2, 0]}
          friction={0.8}
        />
        {/* Right Pillar */}
        <CylinderCollider
          args={[gateHeight / 2, 0.55]}
          position={[halfWidth, gateHeight / 2, 0]}
          friction={0.8}
        />
        {/* Top Overhead Crossbeam & Banner */}
        <CuboidCollider
          args={[(width + 1.2) / 2, 1.0, 0.45]}
          position={[0, bannerCenterY, 0]}
          friction={0.8}
        />
      </RigidBody>

      {/* ─── 1. LEFT PILLAR ASSEMBLY ─── */}
      <group position={[-halfWidth, 0, 0]}>
        {/* Sub-ground Deep Concrete Foundation */}
        <mesh position={[0, -1.4, 0]}>
          <cylinderGeometry args={[0.7, 0.8, 3.0, 10]} />
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Heavy-Duty Crash Pad */}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshStandardMaterial
            map={hazardTexture}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Dark Mounting Ring */}
        <mesh position={[0, 1.32, 0]}>
          <boxGeometry args={[1.34, 0.08, 1.34]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Main Upright Truss Chords */}
        {([-0.32, 0.32] as const).map((ox) =>
          ([-0.3, 0.3] as const).map((oz) => (
            <mesh key={`lp_${ox}_${oz}`} position={[ox, gateHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, gateHeight, 8]} />
              <meshStandardMaterial color="#cfd8dc" metalness={0.88} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Cross-Bracing Struts */}
        {Array.from({ length: 5 }).map((_, idx) => (
          <mesh key={`l_brace_${idx}`} position={[0, 1.8 + idx * 0.95, 0]} rotation={[0.42, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.95, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}

        {/* Physical Status Indicator Lamp */}
        <group position={[0.38, gateHeight * 0.72, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.14, 0.22, 12]} />
            <meshStandardMaterial color="#212121" metalness={0.8} />
          </mesh>
          <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <circleGeometry args={[0.11, 12]} />
            <meshStandardMaterial
              color={statusLightColor}
              emissive={statusLightEmissive}
              emissiveIntensity={statusLightIntensity}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* ─── 2. RIGHT PILLAR ASSEMBLY ─── */}
      <group position={[halfWidth, 0, 0]}>
        {/* Sub-ground Foundation */}
        <mesh position={[0, -1.4, 0]}>
          <cylinderGeometry args={[0.7, 0.8, 3.0, 10]} />
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Crash Pad */}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshStandardMaterial
            map={hazardTexture}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Dark Mounting Ring */}
        <mesh position={[0, 1.32, 0]}>
          <boxGeometry args={[1.34, 0.08, 1.34]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Main Upright Truss Chords */}
        {([-0.32, 0.32] as const).map((ox) =>
          ([-0.3, 0.3] as const).map((oz) => (
            <mesh key={`rp_${ox}_${oz}`} position={[ox, gateHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, gateHeight, 8]} />
              <meshStandardMaterial color="#cfd8dc" metalness={0.88} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Cross-Bracing Struts */}
        {Array.from({ length: 5 }).map((_, idx) => (
          <mesh key={`r_brace_${idx}`} position={[0, 1.8 + idx * 0.95, 0]} rotation={[-0.42, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.95, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}

        {/* Physical Status Indicator Lamp */}
        <group position={[-0.38, gateHeight * 0.72, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.14, 0.22, 12]} />
            <meshStandardMaterial color="#212121" metalness={0.8} />
          </mesh>
          <mesh position={[-0.11, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.11, 12]} />
            <meshStandardMaterial
              color={statusLightColor}
              emissive={statusLightEmissive}
              emissiveIntensity={statusLightIntensity}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* ─── 3. OVERHEAD TRUSS CROSSBEAMS ─── */}
      {/* Top Crossbar Tubes */}
      {([-0.3, 0.3] as const).map((oz) => (
        <mesh key={`top_cross_${oz}`} position={[0, topBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, width + 1.2, 8]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Bottom Crossbar Tubes */}
      {([-0.3, 0.3] as const).map((oz) => (
        <mesh key={`bot_cross_${oz}`} position={[0, botBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, width + 1.2, 8]} />
          <meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Overhead Diagonal Truss Braces */}
      {Array.from({ length: 8 }).map((_, idx) => {
        const step = (width * 0.85) / 8;
        const posX = -width * 0.425 + idx * step + step / 2;
        return (
          <mesh
            key={`top_truss_diag_${idx}`}
            position={[posX, bannerCenterY, 0]}
            rotation={[0, 0, idx % 2 === 0 ? 0.65 : -0.65]}
          >
            <cylinderGeometry args={[0.025, 0.025, 1.8, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.3} />
          </mesh>
        );
      })}

      {/* ─── 4. REALISTIC OVERHEAD RALLY TIMING BANNER (NO STRETCHING, NO FAKE TIMES) ─── */}
      <group position={[0, bannerCenterY, 0]}>
        {/* Banner Frame / Chassis Box */}
        <mesh castShadow>
          <boxGeometry args={[bannerWidth, bannerHeight, 0.32]} />
          <meshStandardMaterial color="#14181f" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Front Banner Face (facing oncoming cars approaching from -Z) */}
        <group position={[0, 0, -0.165]} rotation={[0, Math.PI, 0]}>
          {/* Carbon Fiber Background */}
          <mesh>
            <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
            <meshStandardMaterial
              map={carbonTexture}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>

          {/* Yellow Racing Accent Trim Frame (Top & Bottom) */}
          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.03, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.05]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.03, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.05]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          {/* Left & Right Side Yellow Chevron Accents */}
          {([-1, 1] as const).map((side) => (
            <group key={`chev_${side}`} position={[side * (bannerWidth * 0.44), 0, 0.006]}>
              <mesh>
                <planeGeometry args={[0.9, bannerHeight - 0.2]} />
                <meshBasicMaterial color="#ffb700" />
              </mesh>
              <mesh position={[-side * 0.15, 0, 0.001]} rotation={[0, 0, side * 0.35]}>
                <planeGeometry args={[0.35, bannerHeight * 0.8]} />
                <meshBasicMaterial color="#14181f" />
              </mesh>
            </group>
          ))}

          {/* Rally Sponsor Logo Ribbon Strip across bottom of banner */}
          <mesh position={[0, -0.38, 0.006]}>
            <planeGeometry args={[bannerWidth * 0.78, 0.32]} />
            <meshStandardMaterial
              map={sponsorTexture}
              roughness={0.5}
            />
          </mesh>

          {/* Sharp High-Resolution Motorsport Typography */}
          <Text
            position={[0, 0.28, 0.01]}
            fontSize={0.52}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
            letterSpacing={0.08}
          >
            CHECKPOINT
          </Text>

          <Text
            position={[0, -0.05, 0.01]}
            fontSize={0.24}
            color="#00e676"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            ★ SECTOR TIMING ★
          </Text>
        </group>

        {/* Rear Banner Face (facing cars after passing) */}
        <group position={[0, 0, 0.165]} rotation={[0, 0, 0]}>
          <mesh>
            <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
            <meshStandardMaterial
              map={carbonTexture}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>

          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.03, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.05]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.03, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.05]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          <mesh position={[0, -0.38, 0.006]}>
            <planeGeometry args={[bannerWidth * 0.78, 0.32]} />
            <meshStandardMaterial
              map={sponsorTexture}
              roughness={0.5}
            />
          </mesh>

          <Text
            position={[0, 0.28, 0.01]}
            fontSize={0.52}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
            letterSpacing={0.08}
          >
            OPEN RALLY
          </Text>
          <Text
            position={[0, -0.05, 0.01]}
            fontSize={0.24}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            ★ FIA WORLD RALLY ★
          </Text>
        </group>
      </group>

      {/* ─── 5. DOWN-FACING ROAD ILLUMINATION SPOTLIGHTS ─── */}
      {([-halfWidth * 0.55, 0, halfWidth * 0.55] as const).map((sx, idx) => (
        <group key={`gate_spot_${idx}`} position={[sx, botBarY - 0.08, 0]}>
          {/* Spotlight Housing */}
          <mesh rotation={[Math.PI / 8, 0, 0]}>
            <coneGeometry args={[0.2, 0.32, 8]} />
            <meshStandardMaterial color="#212121" metalness={0.8} />
          </mesh>
          {/* Spotlight Lens */}
          <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2 + Math.PI / 8, 0, 0]}>
            <circleGeometry args={[0.18, 12]} />
            <meshStandardMaterial
              color="#fffde7"
              emissive="#fffde7"
              emissiveIntensity={isTarget ? 1.0 : 0.3}
              roughness={0.2}
              side={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
