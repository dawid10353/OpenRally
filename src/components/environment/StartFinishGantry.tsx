import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import {
  RepeatWrapping,
  DoubleSide,
  CanvasTexture,
  MeshStandardMaterial,
  CylinderGeometry,
  BoxGeometry,
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
 * Isolated 5-Light Rally Start Array cluster.
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

const SF_FOUNDATION_GEO = new CylinderGeometry(1.1, 1.2, 12.0, 12);
SF_FOUNDATION_GEO.translate(0, -6.0, 0);

const SF_HAZARD_PAD_GEO = new BoxGeometry(1.6, 1.5, 1.6);
SF_HAZARD_PAD_GEO.translate(0, 0.75, 0);

const SF_PAD_CAP_GEO = new BoxGeometry(1.64, 0.08, 1.64);
SF_PAD_CAP_GEO.translate(0, 1.52, 0);

const sfHeaderGeoCache = new Map<number, BufferGeometry>();

function getStartFinishHeaderGeometry(width: number): BufferGeometry {
  const cached = sfHeaderGeoCache.get(width);
  if (cached) return cached;

  const topBarY = 8.35;
  const botBarY = 6.45;
  const trussParts: BufferGeometry[] = [];

  // Overhead Horizontal Crossbar Tubes (Top & Bottom, Front & Rear)
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

  const merged = BufferGeometryUtils.mergeGeometries(trussParts, false);
  sfHeaderGeoCache.set(width, merged);
  return merged;
}

const sfPillarGeoCache = new Map<number, BufferGeometry>();

function getStartFinishPillarGeometry(height: number): BufferGeometry {
  const roundedHeight = Math.max(0.5, Math.round(height * 10) / 10);
  const cached = sfPillarGeoCache.get(roundedHeight);
  if (cached) return cached;

  const trussParts: BufferGeometry[] = [];

  // Upright Truss Chords (4 vertical tubes per tower)
  const chordCyl = new CylinderGeometry(0.07, 0.07, roundedHeight, 8);
  [-0.4, 0.4].forEach((ox) => {
    [-0.38, 0.38].forEach((oz) => {
      const chord = chordCyl.clone();
      chord.translate(ox, roundedHeight / 2, oz);
      trussParts.push(chord);
    });
  });

  // Diagonal Truss Cross-Braces
  const numBraces = Math.max(1, Math.floor(roundedHeight / 1.0));
  const braceStep = roundedHeight / numBraces;
  const braceCyl = new CylinderGeometry(0.035, 0.035, Math.hypot(0.8, braceStep), 6);
  for (let idx = 0; idx < numBraces; idx++) {
    const brace = braceCyl.clone();
    brace.rotateX(0.45 * (idx % 2 === 0 ? 1 : -1));
    brace.translate(0, (idx + 0.5) * braceStep, 0);
    trussParts.push(brace);
  }

  const merged = BufferGeometryUtils.mergeGeometries(trussParts, false);
  sfPillarGeoCache.set(roundedHeight, merged);
  return merged;
}

function createStartFinishBannerTexture(isFront: boolean): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(canvas);

  // Background: Deep dark slate / carbon racing tone
  ctx.fillStyle = '#0e1520';
  ctx.fillRect(0, 0, 1024, 256);

  // High-performance rally carbon grid pattern
  ctx.fillStyle = '#141d2a';
  for (let y = 0; y < 256; y += 6) {
    ctx.fillRect(0, y, 1024, 3);
  }

  // Championship accent color
  const accentColor = isFront ? '#ffb700' : '#00e5ff';

  // Top & bottom framing borders
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 1024, 10);
  ctx.fillRect(0, 246, 1024, 10);

  // Flanking angled rally chevron graphics (Left & Right)
  const drawChevron = (xCenter: number, isLeft: boolean) => {
    ctx.save();
    ctx.translate(xCenter, 128);
    // Background block
    ctx.fillStyle = accentColor;
    ctx.fillRect(-45, -95, 90, 190);

    // Dark angled stripe cut
    ctx.beginPath();
    const dir = isLeft ? 1 : -1;
    ctx.moveTo(-dir * 20, -95);
    ctx.lineTo(dir * 25, 0);
    ctx.lineTo(-dir * 20, 95);
    ctx.lineTo(-dir * 45, 95);
    ctx.lineTo(0, 0);
    ctx.lineTo(-dir * 45, -95);
    ctx.closePath();
    ctx.fillStyle = '#0e1520';
    ctx.fill();
    ctx.restore();
  };

  drawChevron(65, true);
  drawChevron(1024 - 65, false);

  // Main Header Text: "START / FINISH" / "FINISH / TIMING"
  ctx.font = '900 78px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillText(isFront ? 'START / FINISH' : 'FINISH / TIMING', 512, 92);

  // Subtitle: "★ OPEN RALLY CHAMPIONSHIP ★"
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = 'bold 30px "Arial", "Helvetica", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isFront ? '★ OPEN RALLY CHAMPIONSHIP ★' : '★ OFFICIAL TIMING GATE ★', 512, 172);

  // Subtle separator line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(240, 206, 544, 2);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3D Rally Start/Finish Gantry & Starting Area Scenery with Adaptive Ground Anchoring.
 * Renders metallic truss architecture, start lights, digital timing screen,
 * sponsor banners, flags, and safety barriers with deep subterranean anchors and zero levitation.
 */
export const StartFinishGantry = memo(function StartFinishGantry({ data }: StartFinishGantryProps) {
  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const topBarY = 8.35;
  const bannerCenterY = 7.4;
  const bannerHeight = 1.8;
  const bannerWidth = width * 0.82;
  const botBarY = 6.45;

  const leftOffset = data.leftGroundOffset ?? 0;
  const rightOffset = data.rightGroundOffset ?? 0;

  const leftColHeight = Math.max(0.5, topBarY - (leftOffset + 1.5));
  const rightColHeight = Math.max(0.5, topBarY - (rightOffset + 1.5));

  const headerGeo = useMemo(() => getStartFinishHeaderGeometry(width), [width]);
  const leftPillarGeo = useMemo(() => getStartFinishPillarGeometry(leftColHeight), [leftColHeight]);
  const rightPillarGeo = useMemo(() => getStartFinishPillarGeometry(rightColHeight), [rightColHeight]);

  const frontBannerTexture = useMemo(() => createStartFinishBannerTexture(true), []);
  const rearBannerTexture = useMemo(() => createStartFinishBannerTexture(false), []);
  const hazardTexture = useTexture('/textures/race/hazard_pad.jpg');

  useMemo(() => {
    hazardTexture.wrapS = RepeatWrapping;
    hazardTexture.wrapT = RepeatWrapping;
    hazardTexture.repeat.set(2, 1);
    hazardTexture.needsUpdate = true;
  }, [hazardTexture]);

  const leftColliderHeight = Math.max(1.0, topBarY - leftOffset);
  const rightColliderHeight = Math.max(1.0, topBarY - rightOffset);

  return (
    <group position={[x, y, z]} rotation={[0, data.rotationY, 0]}>
      {/* ─── 0. SOLID PHYSICS COLLIDERS ─── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Left Pillar Base & Column */}
        <CuboidCollider
          args={[0.8, leftColliderHeight / 2, 0.8]}
          position={[-halfWidth, (leftOffset + topBarY) / 2, 0]}
          friction={0.8}
        />
        {/* Right Pillar Base & Column */}
        <CuboidCollider
          args={[0.8, rightColliderHeight / 2, 0.8]}
          position={[halfWidth, (rightOffset + topBarY) / 2, 0]}
          friction={0.8}
        />
        {/* Overhead Truss & Header Banner */}
        <CuboidCollider
          args={[(width + 1.2) / 2, 1.1, 0.6]}
          position={[0, bannerCenterY, 0]}
          friction={0.8}
        />

        {/* Left Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, leftOffset + 0.6, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, leftOffset + 0.6, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, leftOffset + 0.6, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[-halfWidth - 1.2, leftOffset + 0.6, 3.5]} friction={0.8} />

        {/* Right Side Safety Barriers */}
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, rightOffset + 0.6, -3.5]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, rightOffset + 0.6, -1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, rightOffset + 0.6, 1.2]} friction={0.8} />
        <CuboidCollider args={[1.1, 0.6, 0.35]} position={[halfWidth + 1.2, rightOffset + 0.6, 3.5]} friction={0.8} />

        {/* Marshall Timing Podium */}
        <CuboidCollider args={[1.6, 1.4, 1.2]} position={[halfWidth + 4.8, rightOffset + 1.4, 0]} friction={0.8} />
      </RigidBody>

      {/* ─── 1. PRE-MERGED OVERHEAD HORIZONTAL TRUSS ─── */}
      <mesh geometry={headerGeo} castShadow>
        <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* ─── 2. ADAPTIVE LEFT TOWER & GROUND ANCHORS ─── */}
      <group position={[-halfWidth, leftOffset, 0]}>
        {/* 12m deep concrete subterranean foundation */}
        <mesh geometry={SF_FOUNDATION_GEO}>
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>
        {/* Hazard crash pad resting on terrain */}
        <mesh geometry={SF_HAZARD_PAD_GEO} castShadow receiveShadow>
          <meshStandardMaterial map={hazardTexture} roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh geometry={SF_PAD_CAP_GEO}>
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        {/* Steel column extending up to overhead crossbeams */}
        <mesh position={[0, 1.5, 0]} geometry={leftPillarGeo} castShadow>
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* ─── 3. ADAPTIVE RIGHT TOWER & GROUND ANCHORS ─── */}
      <group position={[halfWidth, rightOffset, 0]}>
        {/* 12m deep concrete subterranean foundation */}
        <mesh geometry={SF_FOUNDATION_GEO}>
          <meshStandardMaterial color="#212529" roughness={0.9} />
        </mesh>
        {/* Hazard crash pad resting on terrain */}
        <mesh geometry={SF_HAZARD_PAD_GEO} castShadow receiveShadow>
          <meshStandardMaterial map={hazardTexture} roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh geometry={SF_PAD_CAP_GEO}>
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        {/* Steel column extending up to overhead crossbeams */}
        <mesh position={[0, 1.5, 0]} geometry={rightPillarGeo} castShadow>
          <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* ─── 4. STATIC RALLY HEADER BANNER (Zero Z-Fighting, Single Quad) ─── */}
      <group position={[0, bannerCenterY, 0]}>
        {/* Main Banner Board Chassis */}
        <mesh castShadow>
          <boxGeometry args={[bannerWidth, bannerHeight, 0.42]} />
          <meshStandardMaterial color="#14181f" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Front Banner Face (facing oncoming vehicles approaching from -Z) */}
        <mesh position={[0, 0, -0.215]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
          <meshBasicMaterial map={frontBannerTexture} />
        </mesh>

        {/* Rear Banner Face (facing departing vehicles facing +Z) */}
        <mesh position={[0, 0, 0.215]} rotation={[0, 0, 0]}>
          <planeGeometry args={[bannerWidth - 0.1, bannerHeight - 0.1]} />
          <meshBasicMaterial map={rearBannerTexture} />
        </mesh>
      </group>

      {/* ─── 5. HIGH-PERFORMANCE DIGITAL TIMING LED SCREEN ─── */}
      <DigitalTimingScreen />

      {/* ─── 6. 5-LIGHT RALLY START LIGHT CLUSTER ─── */}
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
      <RallyFlag position={[-halfWidth - 3.2, leftOffset, -4.0]} rotationY={0.3} />
      <RallyFlag position={[-halfWidth - 3.2, leftOffset, 4.0]} rotationY={-0.2} />

      {/* Right Teardrop Flags */}
      <RallyFlag position={[halfWidth + 3.2, rightOffset, -4.0]} rotationY={-0.3} />
      <RallyFlag position={[halfWidth + 3.2, rightOffset, 4.0]} rotationY={0.2} />

      {/* Safety Barriers Channeling the Start Area (Left & Right) */}
      <SafetyBarrier position={[-halfWidth - 1.2, leftOffset, -3.5]} rotationY={0.08} />
      <SafetyBarrier position={[-halfWidth - 1.2, leftOffset, -1.2]} rotationY={0} />
      <SafetyBarrier position={[-halfWidth - 1.2, leftOffset, 1.2]} rotationY={0} />
      <SafetyBarrier position={[-halfWidth - 1.2, leftOffset, 3.5]} rotationY={-0.08} />

      <SafetyBarrier position={[halfWidth + 1.2, rightOffset, -3.5]} rotationY={-0.08} />
      <SafetyBarrier position={[halfWidth + 1.2, rightOffset, -1.2]} rotationY={0} />
      <SafetyBarrier position={[halfWidth + 1.2, rightOffset, 1.2]} rotationY={0} />
      <SafetyBarrier position={[halfWidth + 1.2, rightOffset, 3.5]} rotationY={0.08} />

      {/* Marshall Timing Podium on Right Side */}
      <MarshallPodium position={[halfWidth + 5.2, rightOffset, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
});
