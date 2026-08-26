import { useMemo } from 'react';
import {
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Color,
} from 'three';
import { createBajaTruckLiveryTexture } from '@/utils/textures/vehicleLiveries';

interface BajaTruckModelProps {
  position?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * 3D visual model of Baja Dune Runner — AWD Desert Trophy Truck.
 * Features lifted chassis, tubular steel roll cage, front bull-bar, skid plate,
 * 6-lamp roof LED light bar, dual rear spare wheels, and matte desert camo livery.
 */
export function BajaTruckModel({
  position = [0, 0, 0],
  scale = [1, 1, 1],
}: BajaTruckModelProps) {
  // Generate high-resolution procedural desert camo texture
  const liveryTexture = useMemo(() => createBajaTruckLiveryTexture(), []);

  // Materials
  const bodyPaintMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: liveryTexture,
        roughness: 0.65,
        metalness: 0.15,
      }),
    [liveryTexture],
  );

  const rollCageMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#d97706'), // Vibrant Baja safety orange steel
        roughness: 0.4,
        metalness: 0.7,
      }),
    [],
  );

  const skidPlateMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#94a3b8'), // Brushed aluminum
        roughness: 0.35,
        metalness: 0.85,
      }),
    [],
  );

  const glassMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#1e293b'),
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.82,
      }),
    [],
  );

  const amberLightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#fbbf24'),
        emissive: new Color('#f59e0b'),
        emissiveIntensity: 2.5,
        roughness: 0.1,
      }),
    [],
  );

  const roofLightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#ffffff'),
        emissive: new Color('#f8fafc'),
        emissiveIntensity: 3.2,
        roughness: 0.05,
      }),
    [],
  );

  const taillightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#ef4444'),
        emissive: new Color('#dc2626'),
        emissiveIntensity: 2.4,
        roughness: 0.1,
      }),
    [],
  );

  const spareTireRubberMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#1c1917'),
        roughness: 0.92,
        metalness: 0.05,
      }),
    [],
  );

  const spareWheelRimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#d97706'),
        roughness: 0.3,
        metalness: 0.8,
      }),
    [],
  );

  const tieDownStrapMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#dc2626'),
        roughness: 0.8,
        metalness: 0.1,
      }),
    [],
  );

  const steelTrimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#1e293b'),
        roughness: 0.6,
        metalness: 0.8,
      }),
    [],
  );

  return (
    <group position={position} scale={scale}>
      {/* ─── 1. Main Cab & High-Clearance Body ─────────────────────────── */}
      {/* Main Cabin lower body */}
      <mesh position={[0, 0.46, 0.15]} material={bodyPaintMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.88, 0.44, 2.1]} />
      </mesh>

      {/* Front High-Clearance Hood */}
      <mesh position={[0, 0.62, 1.25]} rotation={[-0.05, 0, 0]} material={bodyPaintMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.76, 0.28, 1.35]} />
      </mesh>

      {/* Front Nose & Radiator Core */}
      <mesh position={[0, 0.52, 1.96]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[1.72, 0.42, 0.18]} />
      </mesh>

      {/* Flared Off-Road Front Wheel Arches */}
      <mesh position={[-0.96, 0.55, 1.35]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.42, 1.05]} />
      </mesh>
      <mesh position={[0.96, 0.55, 1.35]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.42, 1.05]} />
      </mesh>

      {/* Flared Rear Off-Road Wheel Arches */}
      <mesh position={[-0.98, 0.58, -1.05]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.48, 1.15]} />
      </mesh>
      <mesh position={[0.98, 0.58, -1.05]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.48, 1.15]} />
      </mesh>

      {/* Cabin Roof Panel */}
      <mesh position={[0, 1.16, 0.05]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[1.56, 0.08, 1.25]} />
      </mesh>

      {/* Windshield (Steep Dakar Angle) */}
      <mesh position={[0, 0.92, 0.62]} rotation={[-0.42, 0, 0]} material={glassMaterial}>
        <boxGeometry args={[1.52, 0.05, 0.68]} />
      </mesh>

      {/* Cabin Rear Window Glass */}
      <mesh position={[0, 0.94, -0.52]} material={glassMaterial}>
        <boxGeometry args={[1.42, 0.44, 0.04]} />
      </mesh>

      {/* Side Windows */}
      <mesh position={[-0.79, 0.94, 0.05]} material={glassMaterial}>
        <boxGeometry args={[0.04, 0.44, 1.18]} />
      </mesh>
      <mesh position={[0.79, 0.94, 0.05]} material={glassMaterial}>
        <boxGeometry args={[0.04, 0.44, 1.18]} />
      </mesh>

      {/* Snorkel Air Intake (Right A-Pillar) */}
      <mesh position={[0.88, 0.95, 0.52]} rotation={[-0.42, 0, 0]} material={steelTrimMaterial}>
        <cylinderGeometry args={[0.045, 0.045, 0.85, 12]} />
      </mesh>
      {/* Snorkel Ram Head Cap */}
      <mesh position={[0.88, 1.28, 0.22]} rotation={[0, 0, 0]} material={steelTrimMaterial}>
        <boxGeometry args={[0.14, 0.12, 0.16]} />
      </mesh>

      {/* ─── 2. Front Heavy-Duty Bull Bar & Aluminum Skid Plate ───────── */}
      {/* Heavy-duty steel bull bar bumper */}
      <mesh position={[0, 0.38, 2.08]} material={rollCageMaterial} castShadow>
        <boxGeometry args={[1.88, 0.12, 0.14]} />
      </mesh>
      {/* Bull bar vertical uprights */}
      <mesh position={[-0.45, 0.58, 2.12]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 0.38, 12]} />
      </mesh>
      <mesh position={[0.45, 0.58, 2.12]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 0.38, 12]} />
      </mesh>
      {/* Bull bar upper loop */}
      <mesh position={[0, 0.74, 2.14]} rotation={[0, 0, Math.PI / 2]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.04, 0.04, 0.98, 12]} />
      </mesh>

      {/* Angled Brushed Aluminum Skid Plate */}
      <mesh position={[0, 0.24, 1.75]} rotation={[-0.48, 0, 0]} material={skidPlateMaterial} castShadow>
        <boxGeometry args={[1.35, 0.04, 0.85]} />
      </mesh>

      {/* 4 Round Amber Rally Fog Lamps in Grille */}
      {[-0.48, -0.16, 0.16, 0.48].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 2.06]} rotation={[Math.PI / 2, 0, 0]} material={amberLightMaterial}>
          <cylinderGeometry args={[0.085, 0.085, 0.08, 16]} />
        </mesh>
      ))}

      {/* ─── 3. Roof 6-Lamp LED Offroad Light Bar ─────────────────────── */}
      <mesh position={[0, 1.28, 0.48]} material={steelTrimMaterial}>
        <boxGeometry args={[1.52, 0.08, 0.12]} />
      </mesh>
      {[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 1.28, 0.56]} material={roofLightMaterial}>
          <boxGeometry args={[0.18, 0.07, 0.04]} />
        </mesh>
      ))}

      {/* ─── 4. External Tubular Steel Roll Cage & Bed Trusses ─────────── */}
      {/* A-Pillar Roll Cage Tubes */}
      <mesh position={[-0.82, 0.94, 0.60]} rotation={[-0.42, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 0.78, 12]} />
      </mesh>
      <mesh position={[0.82, 0.94, 0.60]} rotation={[-0.42, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 0.78, 12]} />
      </mesh>

      {/* Roof Longitudinal Bars */}
      <mesh position={[-0.80, 1.22, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 1.22, 12]} />
      </mesh>
      <mesh position={[0.80, 1.22, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 1.22, 12]} />
      </mesh>

      {/* B-Pillar Vertical Support Bar */}
      <mesh position={[-0.80, 0.94, -0.52]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 0.62, 12]} />
      </mesh>
      <mesh position={[0.80, 0.94, -0.52]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 0.62, 12]} />
      </mesh>

      {/* Diagonal Rear Bed Truss Bars */}
      <mesh position={[-0.78, 0.88, -1.22]} rotation={[0.48, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 1.55, 12]} />
      </mesh>
      <mesh position={[0.78, 0.88, -1.22]} rotation={[0.48, 0, 0]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.038, 0.038, 1.55, 12]} />
      </mesh>
      {/* Cross Brace */}
      <mesh position={[0, 0.88, -1.22]} rotation={[0, 0, Math.PI / 2]} material={rollCageMaterial}>
        <cylinderGeometry args={[0.035, 0.035, 1.56, 12]} />
      </mesh>

      {/* ─── 5. Open Trophy Bed with Dual Spare Wheels ─────────────────── */}
      {/* Bed Floor (Diamond Plate Metal) */}
      <mesh position={[0, 0.38, -1.25]} material={steelTrimMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.72, 0.12, 1.62]} />
      </mesh>

      {/* Left Spare Off-Road Wheel */}
      <group position={[-0.42, 0.72, -1.20]} rotation={[0.45, 0, 0]}>
        {/* Knobby Tire Tread */}
        <mesh material={spareTireRubberMaterial} castShadow>
          <cylinderGeometry args={[0.40, 0.40, 0.26, 20]} />
        </mesh>
        {/* Beadlock Rim */}
        <mesh material={spareWheelRimMaterial}>
          <cylinderGeometry args={[0.22, 0.22, 0.28, 16]} />
        </mesh>
        {/* Red Ratchet Tie-Down Strap */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={tieDownStrapMaterial}>
          <boxGeometry args={[0.06, 0.86, 0.06]} />
        </mesh>
      </group>

      {/* Right Spare Off-Road Wheel */}
      <group position={[0.42, 0.72, -1.20]} rotation={[0.45, 0, 0]}>
        <mesh material={spareTireRubberMaterial} castShadow>
          <cylinderGeometry args={[0.40, 0.40, 0.26, 20]} />
        </mesh>
        <mesh material={spareWheelRimMaterial}>
          <cylinderGeometry args={[0.22, 0.22, 0.28, 16]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={tieDownStrapMaterial}>
          <boxGeometry args={[0.06, 0.86, 0.06]} />
        </mesh>
      </group>

      {/* ─── 6. Rear Tail Lights & Dual High-Exit Exhausts ────────────── */}
      {/* Rear High-Visibility Taillight Blocks */}
      <mesh position={[-0.78, 0.62, -1.98]} material={taillightMaterial}>
        <boxGeometry args={[0.22, 0.16, 0.06]} />
      </mesh>
      <mesh position={[0.78, 0.62, -1.98]} material={taillightMaterial}>
        <boxGeometry args={[0.22, 0.16, 0.06]} />
      </mesh>

      {/* Amber Dust Strobe Lights on Bed Header */}
      <mesh position={[-0.35, 1.18, -0.58]} material={amberLightMaterial}>
        <boxGeometry args={[0.12, 0.08, 0.06]} />
      </mesh>
      <mesh position={[0.35, 1.18, -0.58]} material={amberLightMaterial}>
        <boxGeometry args={[0.12, 0.08, 0.06]} />
      </mesh>

      {/* Dual High-Exit Side Exhausts */}
      <mesh position={[-0.92, 0.44, -0.62]} rotation={[0, 0, Math.PI / 3]} material={steelTrimMaterial}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 16]} />
      </mesh>
      <mesh position={[0.92, 0.44, -0.62]} rotation={[0, 0, -Math.PI / 3]} material={steelTrimMaterial}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 16]} />
      </mesh>
    </group>
  );
}
