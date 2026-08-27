import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { RepeatWrapping, DoubleSide, type Mesh } from 'three';
import { useRacingStore } from '@/store/racingStore';
import type { CheckpointData } from '@/types/racing';

interface StartFinishGantryProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
}

/**
 * Procedural Rally Teardrop / Feather Flag component with realistic AI-generated fabric texture.
 */
function RallyFlag({
  position,
  rotationY = 0,
}: {
  readonly position: [number, number, number];
  readonly rotationY?: number;
}) {
  const flagMeshRef = useRef<Mesh>(null);
  const flagTexture = useTexture('/textures/race/flag_sponsor.jpg');

  useFrame(({ clock }) => {
    if (flagMeshRef.current) {
      const t = clock.getElapsedTime();
      // Subtle wind flutter
      flagMeshRef.current.rotation.z = Math.sin(t * 3.5 + position[0]) * 0.08;
      flagMeshRef.current.rotation.y = Math.cos(t * 2.5 + position[2]) * 0.06;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Heavy base stand */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.55, 0.16, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Flag curved pole */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 5.2, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Realistic textured flag fabric */}
      <mesh ref={flagMeshRef} position={[0.55, 3.2, 0]} castShadow>
        <planeGeometry args={[1.1, 3.4, 6, 10]} />
        <meshStandardMaterial
          map={flagTexture}
          roughness={0.6}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Photorealistic Plastic/Concrete Rally Safety Barrier block.
 */
function SafetyBarrier({
  position,
  rotationY = 0,
}: {
  readonly position: [number, number, number];
  readonly rotationY?: number;
}) {
  const barrierTexture = useTexture('/textures/race/safety_barrier.jpg');

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Base footing */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshStandardMaterial color="#212529" roughness={0.9} />
      </mesh>

      {/* Main barrier body with high-res texture */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.1, 0.68]} />
        <meshStandardMaterial
          map={barrierTexture}
          roughness={0.65}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

/**
 * Rally Timing & Marshall Podium on the side of the start line.
 */
function MarshallPodium({
  position,
  rotationY = 0,
}: {
  readonly position: [number, number, number];
  readonly rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Platform */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.8, 2.4]} />
        <meshStandardMaterial color="#2c3437" roughness={0.7} metalness={0.5} />
      </mesh>
      {/* Marshall Desk */}
      <mesh position={[0, 1.2, -0.4]}>
        <boxGeometry args={[1.6, 0.8, 0.7]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Antenna / Timing Mast */}
      <mesh position={[1.2, 2.5, -0.8]}>
        <cylinderGeometry args={[0.03, 0.05, 4.2, 8]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Antenna Red Beacon */}
      <mesh position={[1.2, 4.65, -0.8]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ff1744" />
      </mesh>
      {/* Canopy / Roof */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[3.4, 0.1, 2.6]} />
        <meshStandardMaterial color="#ff9800" roughness={0.6} />
      </mesh>
      {/* Canopy Support Poles */}
      {([-1.5, 1.5] as const).map((x) =>
        ([-1.1, 1.1] as const).map((z) => (
          <mesh key={`${x}_${z}`} position={[x, 1.7, z]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
}

/**
 * 3D Rally Start/Finish Gantry & Starting Area Scenery.
 * Renders metallic truss architecture, start lights, digital timing screen,
 * ground start grid with realistic AI-generated asphalt decals, sponsor banners, flags, and safety barriers.
 * Free of arcade sky beacons or unnatural glowing ground circles.
 */
export function StartFinishGantry({ data }: StartFinishGantryProps) {
  const raceStatus = useRacingStore((s) => s.raceStatus);
  const countdown = useRacingStore((s) => s.countdown);
  const currentLapTime = useRacingStore((s) => s.currentLapTime);
  const bestLapTime = useRacingStore((s) => s.bestLapTime);

  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const pillarHeight = 8.6;
  const topBarY = 8.35;
  const botBarY = 6.45;
  const bannerCenterY = 7.4;
  const bannerHeight = 1.8;
  const bannerWidth = width * 0.82;
  const ledScreenY = 5.55;
  const startLightsY = 4.75;

  const isRacing = raceStatus === 'racing' || countdown === 0;

  const getLightColor = (index: number) => {
    if (isRacing) {
      return '#00e676'; // Bright green when racing or START
    }
    if (raceStatus === 'countdown' && countdown !== null) {
      if (countdown === 3 && index < 3) return '#ff1744';
      if (countdown === 2 && index < 4) return '#ff1744';
      if (countdown === 1) return '#ff1744';
      return '#1a2228'; // Unlit lamp
    }
    return '#ff1744';
  };

  // Load realistic AI-generated textures
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

  // Format timer for display on the gantry board
  const timerText = useMemo(() => {
    if (raceStatus === 'idle') return 'READY';
    const mins = Math.floor(currentLapTime / 60);
    const secs = (currentLapTime % 60).toFixed(1).padStart(4, '0');
    return `${mins}:${secs}`;
  }, [raceStatus, currentLapTime]);

  const bestText = useMemo(() => {
    if (!bestLapTime) return 'STAGE 01';
    const mins = Math.floor(bestLapTime / 60);
    const secs = (bestLapTime % 60).toFixed(2).padStart(5, '0');
    return `BEST ${mins}:${secs}`;
  }, [bestLapTime]);

  return (
    <group position={[x, y, z]} rotation={[0, data.rotationY, 0]}>
      {/* ─── 0. SOLID PHYSICS COLLIDERS ─── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Left Pillar Base & Column */}
        <CuboidCollider
          args={[0.8, pillarHeight / 2, 0.8]}
          position={[-halfWidth, pillarHeight / 2, 0]}
          friction={0.8}
        />
        {/* Right Pillar Base & Column */}
        <CuboidCollider
          args={[0.8, pillarHeight / 2, 0.8]}
          position={[halfWidth, pillarHeight / 2, 0]}
          friction={0.8}
        />
        {/* Overhead Truss & Header Banner */}
        <CuboidCollider
          args={[(width + 1.2) / 2, 1.1, 0.6]}
          position={[0, bannerCenterY, 0]}
          friction={0.8}
        />

        {/* Left Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, 0.6, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, 0.6, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, 0.6, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, 0.6, 3.5]} friction={0.8} />

        {/* Right Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, 0.6, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, 0.6, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, 0.6, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, 0.6, 3.5]} friction={0.8} />

        {/* Marshall Timing Podium */}
        <CuboidCollider args={[1.6, 1.4, 1.2]} position={[halfWidth + 4.8, 1.4, 0]} friction={0.8} />
      </RigidBody>

      {/* ─── 1. GANTRY VERTICAL TRUSS PILLARS ─── */}
      {/* Left Pillar Assembly */}
      <group position={[-halfWidth, 0, 0]}>
        {/* Sub-ground Foundation Anchor */}
        <mesh position={[0, -1.5, 0]}>
          <cylinderGeometry args={[1.1, 1.2, 3.5, 12]} />
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Crash Base Pad */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.5, 1.6]} />
          <meshStandardMaterial
            map={hazardTexture}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Dark accent cap */}
        <mesh position={[0, 1.52, 0]}>
          <boxGeometry args={[1.64, 0.08, 1.64]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Upright Truss Chords (4 vertical metal tubes) */}
        {([-0.4, 0.4] as const).map((ox) =>
          ([-0.38, 0.38] as const).map((oz) => (
            <mesh key={`lp_${ox}_${oz}`} position={[ox, pillarHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, pillarHeight, 8]} />
              <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Truss Cross-Braces */}
        {Array.from({ length: 6 }).map((_, idx) => (
          <mesh key={`diag_l_${idx}`} position={[0, 2.0 + idx * 1.0, 0]} rotation={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Right Pillar Assembly */}
      <group position={[halfWidth, 0, 0]}>
        {/* Sub-ground Foundation */}
        <mesh position={[0, -1.5, 0]}>
          <cylinderGeometry args={[1.1, 1.2, 3.5, 12]} />
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Crash Base Pad */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.5, 1.6]} />
          <meshStandardMaterial
            map={hazardTexture}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Dark accent cap */}
        <mesh position={[0, 1.52, 0]}>
          <boxGeometry args={[1.64, 0.08, 1.64]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Upright Truss Chords */}
        {([-0.4, 0.4] as const).map((ox) =>
          ([-0.38, 0.38] as const).map((oz) => (
            <mesh key={`rp_${ox}_${oz}`} position={[ox, pillarHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, pillarHeight, 8]} />
              <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Truss Cross-Braces */}
        {Array.from({ length: 6 }).map((_, idx) => (
          <mesh key={`diag_r_${idx}`} position={[0, 2.0 + idx * 1.0, 0]} rotation={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* ─── 3. OVERHEAD TRUSS CROSSBEAMS ─── */}
      {/* Top Crossbar Tubes */}
      {([-0.38, 0.38] as const).map((oz) => (
        <mesh key={`top_bar_${oz}`} position={[0, topBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, width + 1.2, 8]} />
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Bottom Crossbar Tubes */}
      {([-0.38, 0.38] as const).map((oz) => (
        <mesh key={`bot_bar_${oz}`} position={[0, botBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, width + 1.2, 8]} />
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* ─── 4. REALISTIC WRC HEADER BANNER (NO STRETCHING, NO FAKE TIMES) ─── */}
      <group position={[0, bannerCenterY, 0]}>
        {/* Main Banner Board Chassis */}
        <mesh castShadow>
          <boxGeometry args={[bannerWidth, bannerHeight, 0.42]} />
          <meshStandardMaterial color="#14181f" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Front Banner Face (facing oncoming vehicles approaching from -Z) */}
        <group position={[0, 0, -0.215]} rotation={[0, Math.PI, 0]}>
          {/* Carbon Fiber Background */}
          <mesh>
            <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
            <meshStandardMaterial
              map={carbonTexture}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>

          {/* Yellow Framing Borders */}
          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.035, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.06]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.035, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.06]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          {/* Left & Right Chevron Accents */}
          {([-1, 1] as const).map((side) => (
            <group key={`sf_chev_${side}`} position={[side * (bannerWidth * 0.44), 0, 0.006]}>
              <mesh>
                <planeGeometry args={[1.1, bannerHeight - 0.2]} />
                <meshBasicMaterial color="#ffb700" />
              </mesh>
              <mesh position={[-side * 0.18, 0, 0.001]} rotation={[0, 0, side * 0.35]}>
                <planeGeometry args={[0.4, bannerHeight * 0.8]} />
                <meshBasicMaterial color="#14181f" />
              </mesh>
            </group>
          ))}

          {/* Rally Sponsor Ribbon across bottom */}
          <mesh position={[0, -0.44, 0.006]}>
            <planeGeometry args={[bannerWidth * 0.78, 0.38]} />
            <meshStandardMaterial
              map={sponsorTexture}
              roughness={0.5}
            />
          </mesh>

          {/* Crisp 3D Vector Typography */}
          <Text
            position={[0, 0.34, 0.01]}
            fontSize={0.65}
            color="#ffb700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.035}
            outlineColor="#000000"
            letterSpacing={0.08}
          >
            START / FINISH
          </Text>

          <Text
            position={[0, -0.04, 0.01]}
            fontSize={0.30}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            ★ OPEN RALLY CHAMPIONSHIP ★
          </Text>
        </group>

        {/* Rear Banner Face */}
        <group position={[0, 0, 0.215]} rotation={[0, 0, 0]}>
          <mesh>
            <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
            <meshStandardMaterial
              map={carbonTexture}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>

          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.035, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.06]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.035, 0.005]}>
            <planeGeometry args={[bannerWidth - 0.1, 0.06]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          <mesh position={[0, -0.44, 0.006]}>
            <planeGeometry args={[bannerWidth * 0.78, 0.38]} />
            <meshStandardMaterial
              map={sponsorTexture}
              roughness={0.5}
            />
          </mesh>

          <Text
            position={[0, 0.34, 0.01]}
            fontSize={0.65}
            color="#ffb700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.035}
            outlineColor="#000000"
            letterSpacing={0.08}
          >
            FINISH / TIMING
          </Text>
          <Text
            position={[0, -0.04, 0.01]}
            fontSize={0.30}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            ★ OPEN RALLY CHAMPIONSHIP ★
          </Text>
        </group>
      </group>

      {/* ─── 5. DIGITAL TIMING LED SCREEN & FIA START LIGHTS ─── */}
      <group position={[0, ledScreenY, 0]}>
        {/* Support Struts */}
        {([-1.6, 1.6] as const).map((sx) => (
          <mesh key={`strut_${sx}`} position={[sx, (botBarY - ledScreenY) / 2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, botBarY - ledScreenY, 6]} />
            <meshStandardMaterial color="#455a64" metalness={0.8} />
          </mesh>
        ))}

        {/* LED Screen Chassis */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.6, 0.85, 0.32]} />
          <meshStandardMaterial color="#080808" roughness={0.4} metalness={0.9} />
        </mesh>

        {/* Front Face (facing oncoming vehicle at start, oriented towards -Z) */}
        <group position={[0, 0, -0.17]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <planeGeometry args={[4.4, 0.72]} />
            <meshBasicMaterial color="#05101a" />
          </mesh>
          <Text
            position={[1.15, 0, 0.01]}
            fontSize={0.36}
            color={isRacing ? '#00e676' : '#ffeb3b'}
            anchorX="center"
            anchorY="middle"
          >
            {timerText}
          </Text>
          <Text
            position={[-1.15, 0, 0.01]}
            fontSize={0.28}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            {bestText}
          </Text>
        </group>

        {/* Rear Face (for returning vehicles) */}
        <group position={[0, 0, 0.17]} rotation={[0, 0, 0]}>
          <mesh>
            <planeGeometry args={[4.4, 0.72]} />
            <meshBasicMaterial color="#05101a" />
          </mesh>
          <Text
            position={[-1.15, 0, 0.01]}
            fontSize={0.36}
            color={isRacing ? '#00e676' : '#ffeb3b'}
            anchorX="center"
            anchorY="middle"
          >
            {timerText}
          </Text>
          <Text
            position={[1.15, 0, 0.01]}
            fontSize={0.28}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            {bestText}
          </Text>
        </group>
      </group>

      {/* FIA Rally Starting Light Cluster (5-Light Array) */}
      <group position={[0, startLightsY, 0]}>
        {/* Light Housing Box */}
        <mesh>
          <boxGeometry args={[3.2, 0.42, 0.32]} />
          <meshStandardMaterial color="#1f1f1f" roughness={0.6} metalness={0.7} />
        </mesh>
        {/* 5 Light Units */}
        {([-1.2, -0.6, 0, 0.6, 1.2] as const).map((lx, i) => {
          const lightColor = getLightColor(i);
          return (
            <group key={`light_${i}`} position={[lx, 0, 0]}>
              {/* Front Light Bulb */}
              <mesh position={[0, 0, -0.17]}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshBasicMaterial color={lightColor} />
              </mesh>
              {/* Front Light Rim */}
              <mesh position={[0, 0, -0.16]} rotation={[0, Math.PI, 0]}>
                <ringGeometry args={[0.14, 0.18, 12]} />
                <meshStandardMaterial color="#111111" metalness={0.9} side={DoubleSide} />
              </mesh>
              {/* Rear Light Bulb */}
              <mesh position={[0, 0, 0.17]}>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshBasicMaterial color={lightColor} />
              </mesh>
              {/* Rear Light Rim */}
              <mesh position={[0, 0, 0.16]} rotation={[0, 0, 0]}>
                <ringGeometry args={[0.14, 0.18, 12]} />
                <meshStandardMaterial color="#111111" metalness={0.9} side={DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Overhead Gantry Down-Spotlights (Illuminating the start grid) */}
      {([-halfWidth * 0.6, 0, halfWidth * 0.6] as const).map((sx, idx) => (
        <group key={`spot_${idx}`} position={[sx, botBarY - 0.05, 0]}>
          <mesh rotation={[Math.PI / 6, 0, 0]}>
            <coneGeometry args={[0.25, 0.4, 8]} />
            <meshStandardMaterial color="#212121" metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2 + Math.PI / 6, 0, 0]}>
            <circleGeometry args={[0.22, 12]} />
            <meshStandardMaterial
              color="#fffde7"
              emissive="#fffde7"
              emissiveIntensity={0.6}
              roughness={0.2}
              side={DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* ─── 6. FLANKING SCENERY (FLAGS, BARRIERS & PODIUM) ─── */}
      {/* Left Teardrop Flags */}
      <RallyFlag position={[-halfWidth - 3.2, 0, -4.0]} rotationY={0.3} />
      <RallyFlag position={[-halfWidth - 3.2, 0, 4.0]} rotationY={-0.2} />

      {/* Right Teardrop Flags */}
      <RallyFlag position={[halfWidth + 3.2, 0, -4.0]} rotationY={-0.3} />
      <RallyFlag position={[halfWidth + 3.2, 0, 4.0]} rotationY={0.2} />

      {/* Safety Barriers Channeling the Start Area (Left & Right) */}
      <SafetyBarrier position={[-halfWidth - 1.2, 0, -3.5]} rotationY={0.08} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, -1.2]} rotationY={0} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, 1.2]} rotationY={0} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, 3.5]} rotationY={-0.08} />

      <SafetyBarrier position={[halfWidth + 1.2, 0, -3.5]} rotationY={-0.08} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, -1.2]} rotationY={0} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, 1.2]} rotationY={0} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, 3.5]} rotationY={0.08} />

      {/* Marshall Timing Podium on Right Side */}
      <MarshallPodium position={[halfWidth + 5.2, 0, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
}
