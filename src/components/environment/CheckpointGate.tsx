import { memo, useMemo } from 'react';
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';
import {
  CanvasTexture,
  MeshStandardMaterial,
  CylinderGeometry,
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  type BufferGeometry,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CheckpointData } from '@/types/racing';

interface CheckpointGateProps {
  readonly data: CheckpointData;
  readonly isTarget: boolean;
  readonly isPassed?: boolean;
}

// ─── Pre-rendered High-DPI Banner Textures (Zero-GC) ───
function createGateBannerCanvasTexture(isFront: boolean): CanvasTexture {
  if (typeof document === 'undefined') {
    return new CanvasTexture({} as unknown as HTMLCanvasElement);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark motorsport carbon background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 256);
    bgGrad.addColorStop(0, '#0c1017');
    bgGrad.addColorStop(0.5, '#151a24');
    bgGrad.addColorStop(1, '#090d13');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 256);

    // Carbon weave pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 0; x < 1024; x += 12) {
      for (let y = 0; y < 256; y += 12) {
        if ((x + y) % 24 === 0) ctx.fillRect(x, y, 12, 12);
      }
    }

    // Yellow motorsport racing frame
    ctx.fillStyle = '#ffb700';
    ctx.fillRect(0, 0, 1024, 12);
    ctx.fillRect(0, 244, 1024, 12);

    // Left & Right Racing Chevrons
    ctx.fillStyle = '#ffb700';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(100, 0); ctx.lineTo(140, 128); ctx.lineTo(100, 256); ctx.lineTo(0, 256);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1024, 0); ctx.lineTo(924, 0); ctx.lineTo(884, 128); ctx.lineTo(924, 256); ctx.lineTo(1024, 256);
    ctx.fill();

    // Dark chevron inset
    ctx.fillStyle = '#0c1017';
    ctx.beginPath();
    ctx.moveTo(0, 20); ctx.lineTo(75, 20); ctx.lineTo(110, 128); ctx.lineTo(75, 236); ctx.lineTo(0, 236);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1024, 20); ctx.lineTo(949, 20); ctx.lineTo(914, 128); ctx.lineTo(949, 236); ctx.lineTo(1024, 236);
    ctx.fill();

    // Typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isFront) {
      // Main Header
      ctx.font = '900 64px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText('CHECKPOINT', 512, 88);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('CHECKPOINT', 512, 84);

      // Sub-ribbon
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(260, 142, 504, 52);
      ctx.fillStyle = '#ffb700';
      ctx.fillRect(260, 190, 504, 4);

      ctx.font = '800 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#00e676';
      ctx.fillText('★ SECTOR TIMING ★', 512, 168);
    } else {
      ctx.font = '900 64px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText('OPEN RALLY', 512, 88);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('OPEN RALLY', 512, 84);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(260, 142, 504, 52);
      ctx.fillStyle = '#ffb700';
      ctx.fillRect(260, 190, 504, 4);

      ctx.font = '800 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('★ FIA WORLD RALLY ★', 512, 168);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

const FRONT_BANNER_TEXTURE = createGateBannerCanvasTexture(true);
const REAR_BANNER_TEXTURE = createGateBannerCanvasTexture(false);

// Shared reusable single geometries
const LAMP_LENS_GEO = new CircleGeometry(0.11, 12);
const SPOTLIGHT_LENS_GEO = new CircleGeometry(0.18, 12);

// Shared reusable materials (Zero-GC, Zero runtime allocation)
const STEEL_TRUSS_MAT = new MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.88, roughness: 0.25 });
const FOUNDATION_MAT = new MeshStandardMaterial({ color: '#212529', roughness: 0.9 });
const CRASH_PAD_MAT = new MeshStandardMaterial({ color: '#ca8a04', roughness: 0.7, metalness: 0.1 });
const BANNER_BOX_MAT = new MeshStandardMaterial({ color: '#14181f', roughness: 0.4, metalness: 0.7 });
const REAR_BANNER_MAT = new MeshStandardMaterial({ map: REAR_BANNER_TEXTURE, roughness: 0.4, metalness: 0.2 });
const FRONT_BANNER_MAT = new MeshStandardMaterial({ map: FRONT_BANNER_TEXTURE, roughness: 0.4, metalness: 0.2 });
const SHARED_BANNER_MATERIALS = [
  BANNER_BOX_MAT,
  BANNER_BOX_MAT,
  BANNER_BOX_MAT,
  BANNER_BOX_MAT,
  REAR_BANNER_MAT,
  FRONT_BANNER_MAT,
];

// Status light materials (Zero runtime creation)
const TARGET_STATUS_LAMP_MAT = new MeshStandardMaterial({
  color: '#00e676',
  emissive: '#00c853',
  emissiveIntensity: 1.5,
  roughness: 0.2,
});
const PASSED_STATUS_LAMP_MAT = new MeshStandardMaterial({
  color: '#4fc3f7',
  emissive: '#0288d1',
  emissiveIntensity: 1.0,
  roughness: 0.2,
});
const INACTIVE_STATUS_LAMP_MAT = new MeshStandardMaterial({
  color: '#546e7a',
  emissive: '#263238',
  emissiveIntensity: 0.2,
  roughness: 0.2,
});

// Spotlight materials
const TARGET_SPOTLIGHT_LENS_MAT = new MeshStandardMaterial({
  color: '#fffde7',
  emissive: '#fffde7',
  emissiveIntensity: 1.0,
  roughness: 0.2,
  side: DoubleSide,
});
const INACTIVE_SPOTLIGHT_LENS_MAT = new MeshStandardMaterial({
  color: '#fffde7',
  emissive: '#fffde7',
  emissiveIntensity: 0.3,
  roughness: 0.2,
  side: DoubleSide,
});

interface GateMergedGeometries {
  trussGeo: BufferGeometry;
  foundationGeo: BufferGeometry;
  crashPadGeo: BufferGeometry;
  bannerGeo: BufferGeometry;
}

const mergedGateGeoCache = new Map<number, GateMergedGeometries>();

function createMergedGateGeometries(width: number): GateMergedGeometries {
  const cached = mergedGateGeoCache.get(width);
  if (cached) return cached;

  const halfWidth = width / 2;
  const gateHeight = 6.2;
  const topBarY = gateHeight + 0.9;
  const botBarY = gateHeight - 0.9;
  const bannerCenterY = gateHeight;
  const bannerHeight = 1.6;
  const bannerWidth = width * 0.72;

  const trussParts: BufferGeometry[] = [];

  // 1. Pillar vertical chords (Left & Right)
  const pillarCyl = new CylinderGeometry(0.055, 0.055, gateHeight, 8);
  [-halfWidth, halfWidth].forEach((px) => {
    [-0.32, 0.32].forEach((ox) => {
      [-0.3, 0.3].forEach((oz) => {
        const chord = pillarCyl.clone();
        chord.translate(px + ox, gateHeight / 2, oz);
        trussParts.push(chord);
      });
    });
  });

  // 2. Pillar diagonal cross-braces
  const braceCyl = new CylinderGeometry(0.028, 0.028, 0.95, 6);
  for (let idx = 0; idx < 5; idx++) {
    const lBrace = braceCyl.clone();
    lBrace.rotateX(0.42);
    lBrace.translate(-halfWidth, 1.8 + idx * 0.95, 0);
    trussParts.push(lBrace);

    const rBrace = braceCyl.clone();
    rBrace.rotateX(-0.42);
    rBrace.translate(halfWidth, 1.8 + idx * 0.95, 0);
    trussParts.push(rBrace);
  }

  // 3. Lamp housings (Left & Right)
  const lampHousingCyl = new CylinderGeometry(0.12, 0.14, 0.22, 10);
  const leftLampHousing = lampHousingCyl.clone();
  leftLampHousing.rotateZ(Math.PI / 2);
  leftLampHousing.translate(-halfWidth + 0.38, gateHeight * 0.72, 0);
  trussParts.push(leftLampHousing);

  const rightLampHousing = lampHousingCyl.clone();
  rightLampHousing.rotateZ(-Math.PI / 2);
  rightLampHousing.translate(halfWidth - 0.38, gateHeight * 0.72, 0);
  trussParts.push(rightLampHousing);

  // 4. Overhead crossbeams (Top & Bottom, Front & Rear)
  const crossbeamCyl = new CylinderGeometry(0.065, 0.065, width + 1.2, 8);
  [-0.3, 0.3].forEach((oz) => {
    const topBar = crossbeamCyl.clone();
    topBar.rotateZ(Math.PI / 2);
    topBar.translate(0, topBarY, oz);
    trussParts.push(topBar);

    const botBar = crossbeamCyl.clone();
    botBar.rotateZ(Math.PI / 2);
    botBar.translate(0, botBarY, oz);
    trussParts.push(botBar);
  });

  // 5. Overhead diagonal braces
  const topTrussDiagCyl = new CylinderGeometry(0.025, 0.025, 1.8, 6);
  for (let idx = 0; idx < 8; idx++) {
    const step = (width * 0.85) / 8;
    const posX = -width * 0.425 + idx * step + step / 2;
    const diag = topTrussDiagCyl.clone();
    diag.rotateZ(idx % 2 === 0 ? 0.65 : -0.65);
    diag.translate(posX, bannerCenterY, 0);
    trussParts.push(diag);
  }

  // 6. Spotlight housings
  const spotCone = new CylinderGeometry(0.02, 0.2, 0.32, 8);
  [-halfWidth * 0.55, 0, halfWidth * 0.55].forEach((sx) => {
    const spot = spotCone.clone();
    spot.rotateX(Math.PI / 8);
    spot.translate(sx, botBarY - 0.08, 0);
    trussParts.push(spot);
  });

  // Merge all metal truss components into 1 single BufferGeometry
  const mergedTruss = BufferGeometryUtils.mergeGeometries(trussParts, false);

  // Concrete foundations (Left & Right)
  const foundationCyl = new CylinderGeometry(0.7, 0.8, 3.0, 10);
  const leftFound = foundationCyl.clone();
  leftFound.translate(-halfWidth, -1.4, 0);
  const rightFound = foundationCyl.clone();
  rightFound.translate(halfWidth, -1.4, 0);
  const mergedFound = BufferGeometryUtils.mergeGeometries([leftFound, rightFound], false);

  // Crash pads (Left & Right)
  const padBox = new BoxGeometry(1.3, 1.3, 1.3);
  const leftPad = padBox.clone();
  leftPad.translate(-halfWidth, 0.65, 0);
  const rightPad = padBox.clone();
  rightPad.translate(halfWidth, 0.65, 0);
  const mergedPad = BufferGeometryUtils.mergeGeometries([leftPad, rightPad], false);

  // Banner box geometry
  const bannerGeo = new BoxGeometry(bannerWidth, bannerHeight, 0.28);

  const result: GateMergedGeometries = {
    trussGeo: mergedTruss,
    foundationGeo: mergedFound,
    crashPadGeo: mergedPad,
    bannerGeo,
  };

  mergedGateGeoCache.set(width, result);
  return result;
}

/**
 * Intermediate Rally Timing Checkpoint Gate.
 * Features pre-merged high-performance architecture, textured motorsport header beam,
 * heavy-duty hazard crash pads, and down-spotlights with zero per-frame CPU/GPU churn.
 */
export const CheckpointGate = memo(function CheckpointGate({
  data,
  isTarget,
  isPassed = false,
}: CheckpointGateProps) {
  const [x, y, z] = data.position;
  const width = data.width;
  const halfWidth = width / 2;
  const gateHeight = 6.2;
  const botBarY = gateHeight - 0.9;
  const bannerCenterY = gateHeight;

  const geometries = useMemo(() => createMergedGateGeometries(width), [width]);

  const statusLampMat = isPassed
    ? PASSED_STATUS_LAMP_MAT
    : isTarget
    ? TARGET_STATUS_LAMP_MAT
    : INACTIVE_STATUS_LAMP_MAT;

  const spotlightMat = isTarget ? TARGET_SPOTLIGHT_LENS_MAT : INACTIVE_SPOTLIGHT_LENS_MAT;

  return (
    <group position={[x, y, z]} rotation={[0, data.rotationY, 0]}>
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

      {/* ─── 1. PRE-MERGED STRUCTURAL ARCHITECTURE (1 single draw call for all steel trusswork) ─── */}
      <mesh geometry={geometries.trussGeo} material={STEEL_TRUSS_MAT} castShadow />

      {/* ─── 2. PRE-MERGED FOUNDATIONS ─── */}
      <mesh geometry={geometries.foundationGeo} material={FOUNDATION_MAT} />

      {/* ─── 3. PRE-MERGED CRASH PADS ─── */}
      <mesh geometry={geometries.crashPadGeo} material={CRASH_PAD_MAT} castShadow receiveShadow />

      {/* ─── 4. OVERHEAD RALLY TIMING BANNER ─── */}
      <mesh
        position={[0, bannerCenterY, 0]}
        geometry={geometries.bannerGeo}
        material={SHARED_BANNER_MATERIALS}
        castShadow
      />

      {/* ─── 5. STATUS INDICATOR LIGHT LENSES (Left & Right) ─── */}
      <mesh
        position={[-halfWidth + 0.49, gateHeight * 0.72, 0]}
        rotation={[0, 0, Math.PI / 2]}
        geometry={LAMP_LENS_GEO}
        material={statusLampMat}
      />
      <mesh
        position={[halfWidth - 0.49, gateHeight * 0.72, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        geometry={LAMP_LENS_GEO}
        material={statusLampMat}
      />

      {/* ─── 6. DOWN-FACING ROAD ILLUMINATION SPOTLIGHT LENSES ─── */}
      {([-halfWidth * 0.55, 0, halfWidth * 0.55] as const).map((sx, idx) => (
        <mesh
          key={`gate_spot_lens_${idx}`}
          position={[sx, botBarY - 0.24, 0]}
          rotation={[Math.PI / 2 + Math.PI / 8, 0, 0]}
          geometry={SPOTLIGHT_LENS_GEO}
          material={spotlightMat}
        />
      ))}
    </group>
  );
});
