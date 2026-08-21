import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { Mesh } from 'three';
import { useRacingStore } from '@/store/racingStore';
import type { CheckpointData } from '@/types/racing';

interface StartFinishGantryProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
}

/**
 * Procedural Rally Teardrop / Feather Flag component.
 */
function RallyFlag({
  position,
  rotationY = 0,
  flagColor = '#ffb700',
}: {
  readonly position: [number, number, number];
  readonly rotationY?: number;
  readonly flagColor?: string;
}) {
  const flagMeshRef = useRef<Mesh>(null);

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
      {/* Base stand */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.16, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Flag pole (curved tip) */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 5.2, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Flag fabric */}
      <mesh ref={flagMeshRef} position={[0.45, 3.2, 0]}>
        <planeGeometry args={[0.85, 3.2, 4, 8]} />
        <meshStandardMaterial
          color={flagColor}
          roughness={0.6}
          side={2}
        />
      </mesh>
      {/* Flag inner stripe / logo strip */}
      <mesh position={[0.45, 3.2, 0.01]}>
        <planeGeometry args={[0.3, 2.8]} />
        <meshBasicMaterial color="#ffffff" side={2} />
      </mesh>
    </group>
  );
}

/**
 * Concrete & plastic Rally Safety Barrier block with warning chevrons.
 */
function SafetyBarrier({
  position,
  rotationY = 0,
  isRed = true,
}: {
  readonly position: [number, number, number];
  readonly rotationY?: number;
  readonly isRed?: boolean;
}) {
  const color = isRed ? '#d32f2f' : '#f5f5f5';

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main barrier body */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.0, 0.65]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Base footing */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      {/* Reflective top stripe */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2.22, 0.12, 0.67]} />
        <meshStandardMaterial
          color={isRed ? '#ffc107' : '#212121'}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * Rally Timing & Marshall Podium on the side of the start line.
 */
function MarshallPodium({ position, rotationY = 0 }: { readonly position: [number, number, number]; readonly rotationY?: number }) {
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
 * ground start grid decals, sponsor banners, flags, and safety barriers.
 */
export function StartFinishGantry({ data, isTarget }: StartFinishGantryProps) {
  const raceStatus = useRacingStore((s) => s.raceStatus);
  const currentLapTime = useRacingStore((s) => s.currentLapTime);
  const bestLapTime = useRacingStore((s) => s.bestLapTime);

  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const pillarHeight = 8.4;
  const topBarY = 8.15;
  const botBarY = 6.45;
  const bannerCenterY = 7.3;
  const bannerHeight = 1.5;
  const ledScreenY = 5.65;
  const startLightsY = 4.85;

  const isRacing = raceStatus === 'racing';
  const startLightColor = isRacing ? '#00e676' : '#ff1744';

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

  const beaconMeshRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (beaconMeshRef.current && isTarget) {
      const t = clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 4) * 0.08;
      beaconMeshRef.current.scale.set(scale, 1, scale);
    }
  });

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
          args={[(width + 1.2) / 2, 1.0, 0.6]}
          position={[0, bannerCenterY, 0]}
          friction={0.8}
        />

        {/* Left Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[-halfWidth - 1.2, 0.5, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[-halfWidth - 1.2, 0.5, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[-halfWidth - 1.2, 0.5, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[-halfWidth - 1.2, 0.5, 3.5]} friction={0.8} />

        {/* Right Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[halfWidth + 1.2, 0.5, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[halfWidth + 1.2, 0.5, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[halfWidth + 1.2, 0.5, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.5, 0.35]} position={[halfWidth + 1.2, 0.5, 3.5]} friction={0.8} />

        {/* Marshall Timing Podium */}
        <CuboidCollider args={[1.6, 1.4, 1.2]} position={[halfWidth + 4.8, 1.4, 0]} friction={0.8} />
      </RigidBody>

      {/* ─── 1. GROUND START LINE & GRID BOXES ─── */}
      {/* Start Line Tarmac Base Strip */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, 3.2]} />
        <meshStandardMaterial color="#1a1c1e" roughness={0.9} />
      </mesh>

      {/* Main Checkered Start/Finish Line */}
      <group position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* White start line bar */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width * 0.95, 0.7]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Black checker overlay blocks */}
        {Array.from({ length: 14 }).map((_, idx) => {
          const step = (width * 0.9) / 14;
          const posX = -width * 0.45 + idx * step + step / 2;
          return idx % 2 === 0 ? (
            <mesh key={idx} position={[posX, 0, 0.002]}>
              <planeGeometry args={[step, 0.7]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
          ) : null;
        })}
      </group>

      {/* Yellow Starting Grid Launch Box (Behind start line) */}
      <group position={[0, 0.025, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Left grid box border */}
        <mesh position={[-2.2, 0, 0]}>
          <planeGeometry args={[0.25, 4.5]} />
          <meshBasicMaterial color="#ffc107" />
        </mesh>
        {/* Right grid box border */}
        <mesh position={[2.2, 0, 0]}>
          <planeGeometry args={[0.25, 4.5]} />
          <meshBasicMaterial color="#ffc107" />
        </mesh>
        {/* Front launch limit bar */}
        <mesh position={[0, 2.2, 0]}>
          <planeGeometry args={[4.65, 0.25]} />
          <meshBasicMaterial color="#ffc107" />
        </mesh>
        {/* Rear launch limit bar */}
        <mesh position={[0, -2.2, 0]}>
          <planeGeometry args={[4.65, 0.25]} />
          <meshBasicMaterial color="#ffc107" />
        </mesh>
        {/* Launch Arrow */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.2, 1.6]} />
          <meshBasicMaterial color="#ffc107" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Embedded Timing Sensor Loop Wires */}
      <mesh position={[0, 0.035, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.9, 0.1]} />
        <meshBasicMaterial color="#ff3d00" />
      </mesh>
      <mesh position={[0, 0.035, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.9, 0.1]} />
        <meshBasicMaterial color="#ff3d00" />
      </mesh>

      {/* ─── 2. GANTRY VERTICAL TRUSS PILLARS ─── */}
      {/* Left Pillar Assembly */}
      <group position={[-halfWidth, 0, 0]}>
        {/* Sub-ground Foundation / Anchor (prevent floating on slopes) */}
        <mesh position={[0, -1.5, 0]}>
          <cylinderGeometry args={[1.1, 1.2, 3.5, 12]} />
          <meshStandardMaterial color="#2e3338" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Crash Base Pad */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial color="#ffb700" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Dark accent band on base */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.62, 0.4, 1.62]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Upright Truss Chords (4 vertical metal tubes) */}
        {([-0.4, 0.4] as const).map((ox) =>
          ([-0.38, 0.38] as const).map((oz) => (
            <mesh key={`lp_${ox}_${oz}`} position={[ox, pillarHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, pillarHeight, 8]} />
              <meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Truss Cross-Braces */}
        {Array.from({ length: 6 }).map((_, idx) => (
          <mesh key={`diag_l_${idx}`} position={[0, 1.8 + idx * 1.0, 0]} rotation={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}

        {/* Glowing Neon Strip on Pillar */}
        <mesh position={[0.45, pillarHeight / 2, 0]}>
          <boxGeometry args={[0.05, pillarHeight - 1.6, 0.1]} />
          <meshBasicMaterial color={isRacing ? '#00e676' : '#ffb700'} />
        </mesh>
      </group>

      {/* Right Pillar Assembly */}
      <group position={[halfWidth, 0, 0]}>
        {/* Sub-ground Foundation / Anchor */}
        <mesh position={[0, -1.5, 0]}>
          <cylinderGeometry args={[1.1, 1.2, 3.5, 12]} />
          <meshStandardMaterial color="#2e3338" roughness={0.9} />
        </mesh>

        {/* Hazard Striped Crash Base Pad */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial color="#ffb700" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Dark accent band on base */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.62, 0.4, 1.62]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>

        {/* Upright Truss Chords */}
        {([-0.4, 0.4] as const).map((ox) =>
          ([-0.38, 0.38] as const).map((oz) => (
            <mesh key={`rp_${ox}_${oz}`} position={[ox, pillarHeight / 2, oz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, pillarHeight, 8]} />
              <meshStandardMaterial color="#b0bec5" metalness={0.9} roughness={0.25} />
            </mesh>
          )),
        )}

        {/* Diagonal Truss Cross-Braces */}
        {Array.from({ length: 6 }).map((_, idx) => (
          <mesh key={`diag_r_${idx}`} position={[0, 1.8 + idx * 1.0, 0]} rotation={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
            <meshStandardMaterial color="#78909c" metalness={0.8} roughness={0.35} />
          </mesh>
        ))}

        {/* Glowing Neon Strip on Pillar */}
        <mesh position={[-0.45, pillarHeight / 2, 0]}>
          <boxGeometry args={[0.05, pillarHeight - 1.6, 0.1]} />
          <meshBasicMaterial color={isRacing ? '#00e676' : '#ffb700'} />
        </mesh>
      </group>

      {/* ─── 3. OVERHEAD TRUSS CROSSBEAMS (Framing the banner above & below) ─── */}
      {/* Top Crossbar Tubes (horizontal along X axis above banner top edge) */}
      {([-0.38, 0.38] as const).map((oz) => (
        <mesh key={`top_bar_${oz}`} position={[0, topBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, width + 1.2, 8]} />
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Bottom Crossbar Tubes (horizontal along X axis below banner bottom edge) */}
      {([-0.38, 0.38] as const).map((oz) => (
        <mesh key={`bot_bar_${oz}`} position={[0, botBarY, oz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, width + 1.2, 8]} />
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* ─── 4. RALLY SPONSOR / CHAMPIONSHIP HEADER BANNER ─── */}
      <group position={[0, bannerCenterY, 0]}>
        {/* Main Banner Board Chassis (mounted flush inside the truss frame) */}
        <mesh castShadow>
          <boxGeometry args={[width * 0.84, bannerHeight, 0.45]} />
          <meshStandardMaterial color="#10151c" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Front Banner Face (facing oncoming vehicles approaching from -Z) */}
        <group position={[0, 0, -0.23]} rotation={[0, Math.PI, 0]}>
          {/* Dark Background Plate */}
          <mesh>
            <planeGeometry args={[width * 0.82, bannerHeight - 0.1]} />
            <meshStandardMaterial
              color="#0d1b2a"
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>

          {/* Clean Yellow Accent Border Frame */}
          {/* Top border bar */}
          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.04, 0.005]}>
            <planeGeometry args={[width * 0.8, 0.035]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Bottom border bar */}
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.04, 0.005]}>
            <planeGeometry args={[width * 0.8, 0.035]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Left border bar */}
          <mesh position={[-(width * 0.8) / 2 + 0.0175, 0, 0.005]}>
            <planeGeometry args={[0.035, bannerHeight - 0.18]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Right border bar */}
          <mesh position={[(width * 0.8) / 2 - 0.0175, 0, 0.005]}>
            <planeGeometry args={[0.035, bannerHeight - 0.18]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          {/* Front Banner Typography (completely unobstructed by truss crossbeams) */}
          <Text
            position={[0, 0.22, 0.01]}
            fontSize={0.52}
            color="#ffb700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            START / FINISH
          </Text>

          <Text
            position={[0, -0.28, 0.01]}
            fontSize={0.26}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            ★ OPEN RALLY CHAMPIONSHIP ★
          </Text>
        </group>

        {/* Rear Banner Face (facing finished/returning vehicles looking towards -Z) */}
        <group position={[0, 0, 0.23]} rotation={[0, 0, 0]}>
          {/* Dark Background Plate */}
          <mesh>
            <planeGeometry args={[width * 0.82, bannerHeight - 0.1]} />
            <meshStandardMaterial color="#0d1b2a" roughness={0.4} />
          </mesh>

          {/* Clean Yellow Accent Border Frame */}
          {/* Top border bar */}
          <mesh position={[0, (bannerHeight - 0.1) / 2 - 0.04, 0.005]}>
            <planeGeometry args={[width * 0.8, 0.035]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Bottom border bar */}
          <mesh position={[0, -(bannerHeight - 0.1) / 2 + 0.04, 0.005]}>
            <planeGeometry args={[width * 0.8, 0.035]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Left border bar */}
          <mesh position={[-(width * 0.8) / 2 + 0.0175, 0, 0.005]}>
            <planeGeometry args={[0.035, bannerHeight - 0.18]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>
          {/* Right border bar */}
          <mesh position={[(width * 0.8) / 2 - 0.0175, 0, 0.005]}>
            <planeGeometry args={[0.035, bannerHeight - 0.18]} />
            <meshBasicMaterial color="#ffb700" />
          </mesh>

          <Text
            position={[0, 0.22, 0.01]}
            fontSize={0.52}
            color="#ffb700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            FINISH / LAP TIME
          </Text>
          <Text
            position={[0, -0.28, 0.01]}
            fontSize={0.26}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            ★ OPEN RALLY CHAMPIONSHIP ★
          </Text>
        </group>
      </group>

      {/* ─── 5. DIGITAL TIMING LED SCREEN & START LIGHTS ─── */}
      <group position={[0, ledScreenY, 0]}>
        {/* Support Struts connecting bottom truss crossbar to LED screen */}
        {([-1.6, 1.6] as const).map((sx) => (
          <mesh key={`strut_${sx}`} position={[sx, (botBarY - ledScreenY) / 2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, botBarY - ledScreenY, 6]} />
            <meshStandardMaterial color="#455a64" metalness={0.8} />
          </mesh>
        ))}

        {/* LED Screen Chassis */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.4, 0.85, 0.32]} />
          <meshStandardMaterial color="#080808" roughness={0.4} metalness={0.9} />
        </mesh>

        {/* Front Face (facing oncoming vehicle at start, oriented towards -Z) */}
        <group position={[0, 0, -0.17]} rotation={[0, Math.PI, 0]}>
          {/* Glowing Screen Face */}
          <mesh>
            <planeGeometry args={[4.2, 0.72]} />
            <meshBasicMaterial color="#05101a" />
          </mesh>
          {/* Live Timer Text (local +X rotates to driver's left) */}
          <Text
            position={[1.1, 0, 0.01]}
            fontSize={0.34}
            color={isRacing ? '#00e676' : '#ffeb3b'}
            anchorX="center"
            anchorY="middle"
          >
            {timerText}
          </Text>
          {/* Stage / Best Lap Info Text (local -X rotates to driver's right) */}
          <Text
            position={[-1.1, 0, 0.01]}
            fontSize={0.26}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            {bestText}
          </Text>
        </group>

        {/* Rear Face (for returning vehicles looking towards -Z) */}
        <group position={[0, 0, 0.17]} rotation={[0, 0, 0]}>
          <mesh>
            <planeGeometry args={[4.2, 0.72]} />
            <meshBasicMaterial color="#05101a" />
          </mesh>
          <Text
            position={[-1.1, 0, 0.01]}
            fontSize={0.34}
            color={isRacing ? '#00e676' : '#ffeb3b'}
            anchorX="center"
            anchorY="middle"
          >
            {timerText}
          </Text>
          <Text
            position={[1.1, 0, 0.01]}
            fontSize={0.26}
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
        {([-1.2, -0.6, 0, 0.6, 1.2] as const).map((lx, i) => (
          <group key={`light_${i}`} position={[lx, 0, 0]}>
            {/* Front Light Bulb */}
            <mesh position={[0, 0, -0.17]}>
              <sphereGeometry args={[0.14, 12, 12]} />
              <meshBasicMaterial color={startLightColor} />
            </mesh>
            {/* Front Light Rim */}
            <mesh position={[0, 0, -0.16]} rotation={[0, Math.PI, 0]}>
              <ringGeometry args={[0.14, 0.18, 12]} />
              <meshStandardMaterial color="#111111" metalness={0.9} side={2} />
            </mesh>
            {/* Rear Light Bulb */}
            <mesh position={[0, 0, 0.17]}>
              <sphereGeometry args={[0.14, 12, 12]} />
              <meshBasicMaterial color={startLightColor} />
            </mesh>
            {/* Rear Light Rim */}
            <mesh position={[0, 0, 0.16]} rotation={[0, 0, 0]}>
              <ringGeometry args={[0.14, 0.18, 12]} />
              <meshStandardMaterial color="#111111" metalness={0.9} side={2} />
            </mesh>
          </group>
        ))}
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
            <meshBasicMaterial color="#fffde7" side={2} />
          </mesh>
        </group>
      ))}

      {/* ─── 6. SKY BEACON & ACTIVE TARGET AURA ─── */}
      {isTarget && (
        <>
          {/* Vertical Atmospheric Light Column */}
          <mesh ref={beaconMeshRef} position={[0, 20, 0]}>
            <cylinderGeometry args={[halfWidth * 0.35, halfWidth * 0.7, 40, 16, 1, true]} />
            <meshBasicMaterial
              color="#ffb700"
              transparent
              opacity={0.18}
              side={2}
              depthWrite={false}
            />
          </mesh>

          {/* Ground Trigger Aura Ring */}
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, halfWidth * 0.95, 32]} />
            <meshBasicMaterial
              color="#ffb700"
              transparent
              opacity={0.35}
              side={2}
            />
          </mesh>
        </>
      )}

      {/* ─── 7. FLANKING SCENERY (FLAGS, BARRIERS & PODIUM) ─── */}
      {/* Left Teardrop Flags */}
      <RallyFlag position={[-halfWidth - 2.8, 0, -4.0]} rotationY={0.3} flagColor="#ff9800" />
      <RallyFlag position={[-halfWidth - 2.8, 0, 4.0]} rotationY={-0.2} flagColor="#00d4ff" />

      {/* Right Teardrop Flags */}
      <RallyFlag position={[halfWidth + 2.8, 0, -4.0]} rotationY={-0.3} flagColor="#00d4ff" />
      <RallyFlag position={[halfWidth + 2.8, 0, 4.0]} rotationY={0.2} flagColor="#ff9800" />

      {/* Safety Barriers Channeling the Start Area (Left & Right) */}
      <SafetyBarrier position={[-halfWidth - 1.2, 0, -3.5]} rotationY={0.08} isRed={true} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, -1.2]} rotationY={0} isRed={false} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, 1.2]} rotationY={0} isRed={true} />
      <SafetyBarrier position={[-halfWidth - 1.2, 0, 3.5]} rotationY={-0.08} isRed={false} />

      <SafetyBarrier position={[halfWidth + 1.2, 0, -3.5]} rotationY={-0.08} isRed={false} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, -1.2]} rotationY={0} isRed={true} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, 1.2]} rotationY={0} isRed={false} />
      <SafetyBarrier position={[halfWidth + 1.2, 0, 3.5]} rotationY={0.08} isRed={true} />

      {/* Marshall Timing Podium on Right Side */}
      <MarshallPodium position={[halfWidth + 4.8, 0, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
}
