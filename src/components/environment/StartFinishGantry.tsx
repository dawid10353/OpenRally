import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import {
  RepeatWrapping,
  DoubleSide,
  CanvasTexture,
  MeshStandardMaterial,
  CylinderGeometry,
  SphereGeometry,
  RingGeometry,
  type BufferGeometry,
  type Mesh,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useRacingStore } from '@/store/racingStore';
import type { CheckpointData } from '@/types/racing';

interface StartFinishGantryProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
}

// ─── Shared Materials for Start Lights (Zero Runtime Allocation) ───
const UNLIT_LIGHT_MAT = new MeshStandardMaterial({ color: '#1a2228', roughness: 0.8, metalness: 0.2 });
const RED_LIGHT_MAT = new MeshStandardMaterial({
  color: '#ff1744',
  emissive: '#ff1744',
  emissiveIntensity: 1.6,
  roughness: 0.2,
});
const GREEN_LIGHT_MAT = new MeshStandardMaterial({
  color: '#00e676',
  emissive: '#00e676',
  emissiveIntensity: 1.6,
  roughness: 0.2,
});
const LIGHT_RIM_MAT = new MeshStandardMaterial({ color: '#111111', metalness: 0.9, side: DoubleSide });

const BULB_GEO = new SphereGeometry(0.14, 12, 12);
const RIM_GEO = new RingGeometry(0.14, 0.18, 12);

/**
 * Isolated FIA 5-Light Array cluster.
 * Subscribes to countdown and raceStatus in isolation so the rest of the gantry never re-renders.
 */
const StartLightsCluster = memo(function StartLightsCluster() {
  const raceStatus = useRacingStore((s) => s.raceStatus);
  const countdown = useRacingStore((s) => s.countdown);

  const isRacing = raceStatus === 'racing' || countdown === 0;

  const getBulbMaterial = (index: number) => {
    if (isRacing) {
      return GREEN_LIGHT_MAT;
    }
    if (raceStatus === 'countdown' && countdown !== null) {
      if (countdown === 3 && index < 3) return RED_LIGHT_MAT;
      if (countdown === 2 && index < 4) return RED_LIGHT_MAT;
      if (countdown === 1) return RED_LIGHT_MAT;
      return UNLIT_LIGHT_MAT;
    }
    return RED_LIGHT_MAT;
  };

  return (
    <group position={[0, 4.75, 0]}>
      {/* Light Housing Box */}
      <mesh>
        <boxGeometry args={[3.2, 0.42, 0.32]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.6} metalness={0.7} />
      </mesh>

      {/* 5 Light Units */}
      {([-1.2, -0.6, 0, 0.6, 1.2] as const).map((lx, i) => {
        const mat = getBulbMaterial(i);
        return (
          <group key={`light_${i}`} position={[lx, 0, 0]}>
            {/* Front Light Bulb */}
            <mesh position={[0, 0, -0.17]} geometry={BULB_GEO} material={mat} />
            {/* Front Light Rim */}
            <mesh position={[0, 0, -0.16]} rotation={[0, Math.PI, 0]} geometry={RIM_GEO} material={LIGHT_RIM_MAT} />
            {/* Rear Light Bulb */}
            <mesh position={[0, 0, 0.17]} geometry={BULB_GEO} material={mat} />
            {/* Rear Light Rim */}
            <mesh position={[0, 0, 0.16]} rotation={[0, 0, 0]} geometry={RIM_GEO} material={LIGHT_RIM_MAT} />
          </group>
        );
      })}
    </group>
  );
});

/**
 * High-performance LED Timing Display.
 * Uses an authentic digital 2D Canvas texture updated via useFrame when values change,
 * eliminating 60 FPS React re-renders and Troika-3D-Text SDF glyph regenerations.
 */
const DigitalTimingScreen = memo(function DigitalTimingScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<CanvasTexture | null>(null);
  const lastRenderedTextRef = useRef('');

  const canvasTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    canvasRef.current = canvas;

    const tex = new CanvasTexture(canvas);
    tex.anisotropy = 4;
    textureRef.current = tex;
    return tex;
  }, []);

  useFrame(() => {
    const { raceStatus, currentLapTime, bestLapTime } = useRacingStore.getState();

    let timerStr = 'READY';
    if (raceStatus === 'racing' || raceStatus === 'completed') {
      const mins = Math.floor(currentLapTime / 60);
      const secs = (currentLapTime % 60).toFixed(1).padStart(4, '0');
      timerStr = `${mins}:${secs}`;
    }

    let bestStr = 'STAGE 01';
    if (bestLapTime) {
      const mins = Math.floor(bestLapTime / 60);
      const secs = (bestLapTime % 60).toFixed(2).padStart(5, '0');
      bestStr = `BEST ${mins}:${secs}`;
    }

    const stateKey = `${timerStr}|${bestStr}|${raceStatus}`;
    if (stateKey === lastRenderedTextRef.current) return;
    lastRenderedTextRef.current = stateKey;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark stadium LCD/LED background
    ctx.fillStyle = '#05101a';
    ctx.fillRect(0, 0, 512, 128);

    // Subtle LED matrix grid pattern
    ctx.fillStyle = 'rgba(0, 212, 255, 0.03)';
    for (let x = 0; x < 512; x += 8) {
      for (let y = 0; y < 128; y += 8) {
        ctx.fillRect(x, y, 6, 6);
      }
    }

    // Border divider line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(255, 12, 2, 104);

    // Left Box: Best Time / Stage
    ctx.font = 'bold 28px "Courier New", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText(bestStr, 128, 64);

    // Right Box: Current Lap Timer / Ready Status
    ctx.font = 'bold 36px "Courier New", monospace, sans-serif';
    ctx.fillStyle = raceStatus === 'racing' ? '#00e676' : '#ffeb3b';
    ctx.fillText(timerStr, 384, 64);

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 5.55, 0]}>
      {/* Support Struts */}
      {([-1.6, 1.6] as const).map((sx) => (
        <mesh key={`strut_${sx}`} position={[sx, (6.45 - 5.55) / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 6.45 - 5.55, 6]} />
          <meshStandardMaterial color="#455a64" metalness={0.8} />
        </mesh>
      ))}

      {/* LED Screen Chassis */}
      <mesh>
        <boxGeometry args={[4.6, 0.85, 0.32]} />
        <meshStandardMaterial color="#080808" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* Front LED Screen Face (facing -Z) */}
      <mesh position={[0, 0, -0.17]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.4, 0.72]} />
        <meshBasicMaterial map={canvasTexture} />
      </mesh>

      {/* Rear LED Screen Face (facing +Z) */}
      <mesh position={[0, 0, 0.17]} rotation={[0, 0, 0]}>
        <planeGeometry args={[4.4, 0.72]} />
        <meshBasicMaterial map={canvasTexture} />
      </mesh>
    </group>
  );
});

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
      {([-1.5, 1.5] as const).map((px) =>
        ([-1.1, 1.1] as const).map((pz) => (
          <mesh key={`${px}_${pz}`} position={[px, 1.7, pz]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
}

interface GantryMergedGeometries {
  trussGeo: BufferGeometry;
  foundationGeo: BufferGeometry;
}

const gantryGeoCache = new Map<number, GantryMergedGeometries>();

function createMergedGantryGeometries(width: number): GantryMergedGeometries {
  const cached = gantryGeoCache.get(width);
  if (cached) return cached;

  const halfWidth = width / 2;
  const pillarHeight = 8.6;
  const topBarY = 8.35;
  const botBarY = 6.45;

  const trussParts: BufferGeometry[] = [];

  // 1. Upright Truss Chords (4 vertical tubes per pillar)
  const chordCyl = new CylinderGeometry(0.07, 0.07, pillarHeight, 8);
  [-halfWidth, halfWidth].forEach((px) => {
    [-0.4, 0.4].forEach((ox) => {
      [-0.38, 0.38].forEach((oz) => {
        const chord = chordCyl.clone();
        chord.translate(px + ox, pillarHeight / 2, oz);
        trussParts.push(chord);
      });
    });
  });

  // 2. Diagonal Truss Cross-Braces (6 per pillar)
  const braceCyl = new CylinderGeometry(0.035, 0.035, 1.2, 6);
  for (let idx = 0; idx < 6; idx++) {
    const lBrace = braceCyl.clone();
    lBrace.rotateX(0.45);
    lBrace.translate(-halfWidth, 2.0 + idx * 1.0, 0);
    trussParts.push(lBrace);

    const rBrace = braceCyl.clone();
    rBrace.rotateX(-0.45);
    rBrace.translate(halfWidth, 2.0 + idx * 1.0, 0);
    trussParts.push(rBrace);
  }

  // 3. Overhead Horizontal Crossbar Tubes (Top & Bottom, Front & Rear)
  const crossbarCyl = new CylinderGeometry(0.08, 0.08, width + 1.2, 8);
  [-0.38, 0.38].forEach((oz) => {
    const topBar = crossbarCyl.clone();
    topBar.rotateZ(Math.PI / 2);
    topBar.translate(0, topBarY, oz);
    trussParts.push(topBar);

    const botBar = crossbarCyl.clone();
    botBar.rotateZ(Math.PI / 2);
    botBar.translate(0, botBarY, oz);
    trussParts.push(botBar);
  });

  const mergedTruss = BufferGeometryUtils.mergeGeometries(trussParts, false);

  // Concrete foundation anchors
  const foundCyl = new CylinderGeometry(1.1, 1.2, 3.5, 12);
  const leftFound = foundCyl.clone();
  leftFound.translate(-halfWidth, -1.5, 0);
  const rightFound = foundCyl.clone();
  rightFound.translate(halfWidth, -1.5, 0);
  const mergedFound = BufferGeometryUtils.mergeGeometries([leftFound, rightFound], false);

  const result: GantryMergedGeometries = {
    trussGeo: mergedTruss,
    foundationGeo: mergedFound,
  };

  gantryGeoCache.set(width, result);
  return result;
}

/**
 * 3D Rally Start/Finish Gantry & Starting Area Scenery.
 * Renders metallic truss architecture, start lights, digital timing screen,
 * sponsor banners, flags, and safety barriers with zero 60 FPS re-renders.
 */
export const StartFinishGantry = memo(function StartFinishGantry({ data }: StartFinishGantryProps) {
  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const pillarHeight = 8.6;
  const bannerCenterY = 7.4;
  const bannerHeight = 1.8;
  const bannerWidth = width * 0.82;
  const botBarY = 6.45;

  const geometries = useMemo(() => createMergedGantryGeometries(width), [width]);

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

      {/* ─── 1. PRE-MERGED GANTRY STRUCTURE (1 draw call for all truss tubes) ─── */}
      <mesh geometry={geometries.trussGeo} castShadow>
        <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* ─── 2. PRE-MERGED FOUNDATIONS ─── */}
      <mesh geometry={geometries.foundationGeo}>
        <meshStandardMaterial color="#212529" roughness={0.9} />
      </mesh>

      {/* ─── 3. HAZARD CRASH PADS (Left & Right) ─── */}
      {[-halfWidth, halfWidth].map((px) => (
        <group key={`hazard_pad_${px}`} position={[px, 0, 0]}>
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 1.5, 1.6]} />
            <meshStandardMaterial map={hazardTexture} roughness={0.7} metalness={0.1} />
          </mesh>
          <mesh position={[0, 1.52, 0]}>
            <boxGeometry args={[1.64, 0.08, 1.64]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ─── 4. STATIC WRC HEADER BANNER ─── */}
      <group position={[0, bannerCenterY, 0]}>
        {/* Main Banner Board Chassis */}
        <mesh castShadow>
          <boxGeometry args={[bannerWidth, bannerHeight, 0.42]} />
          <meshStandardMaterial color="#14181f" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Front Banner Face (facing oncoming vehicles approaching from -Z) */}
        <group position={[0, 0, -0.215]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
            <meshStandardMaterial map={carbonTexture} roughness={0.4} metalness={0.2} />
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
            <meshStandardMaterial map={sponsorTexture} roughness={0.5} />
          </mesh>

          {/* Static Crisp 3D Vector Typography */}
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
            <meshStandardMaterial map={carbonTexture} roughness={0.4} metalness={0.2} />
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
            <meshStandardMaterial map={sponsorTexture} roughness={0.5} />
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

      {/* ─── 5. HIGH-PERFORMANCE DIGITAL TIMING LED SCREEN ─── */}
      <DigitalTimingScreen />

      {/* ─── 6. FIA RALLY START LIGHT CLUSTER ─── */}
      <StartLightsCluster />

      {/* Overhead Gantry Down-Spotlights */}
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

      {/* ─── 7. FLANKING SCENERY (FLAGS, BARRIERS & PODIUM) ─── */}
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
});
