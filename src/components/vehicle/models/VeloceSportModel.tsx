import { useMemo } from 'react';
import {
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Color,
} from 'three';
import {
  createSportCoupeLiveryTexture,
  createCarbonFiberTexture,
} from '@/utils/textures/vehicleLiveries';

interface VeloceSportModelProps {
  position?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * 3D visual model of Veloce Sport Coupe — RWD GT Drift Supercar.
 * Features low-slung aerodynamic chassis, GT wing spoiler, carbon front splitter & diffuser,
 * tinted greenhouse glass, quad titanium exhausts, and LED lights.
 */
export function VeloceSportModel({
  position = [0, 0, 0],
  scale = [1, 1, 1],
}: VeloceSportModelProps) {
  // Generate high-resolution procedural textures
  const liveryTexture = useMemo(() => createSportCoupeLiveryTexture(), []);
  const carbonTexture = useMemo(() => createCarbonFiberTexture(), []);

  // Materials
  const bodyPaintMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: liveryTexture,
        roughness: 0.22,
        metalness: 0.65,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.9,
      }),
    [liveryTexture],
  );

  const carbonMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: carbonTexture,
        roughness: 0.45,
        metalness: 0.2,
      }),
    [carbonTexture],
  );

  const glassMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color('#0f172a'),
        roughness: 0.08,
        metalness: 0.95,
        transmission: 0.6,
        transparent: true,
        opacity: 0.88,
      }),
    [],
  );

  const headlightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#e0f2fe'),
        emissive: new Color('#38bdf8'),
        emissiveIntensity: 2.2,
        roughness: 0.1,
      }),
    [],
  );

  const taillightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#ff0033'),
        emissive: new Color('#ff0044'),
        emissiveIntensity: 2.8,
        roughness: 0.1,
      }),
    [],
  );

  const trimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#141414'),
        roughness: 0.7,
        metalness: 0.1,
      }),
    [],
  );

  const titaniumExhaustMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#475569'),
        metalness: 0.95,
        roughness: 0.2,
      }),
    [],
  );

  return (
    <group position={position} scale={scale}>
      {/* ─── 1. Main Lower Chassis & Fenders ───────────────────────────── */}
      {/* Central lower body tub */}
      <mesh position={[0, 0.28, 0]} material={bodyPaintMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.82, 0.32, 3.9]} />
      </mesh>

      {/* Front Hood / Bonnet (sloping down toward nose) */}
      <mesh position={[0, 0.44, 0.95]} rotation={[-0.07, 0, 0]} material={bodyPaintMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.68, 0.18, 1.45]} />
      </mesh>

      {/* Front Nose Cone / Bumper */}
      <mesh position={[0, 0.32, 1.82]} material={bodyPaintMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.74, 0.34, 0.38]} />
      </mesh>

      {/* Front Lower Air Intake Grille */}
      <mesh position={[0, 0.22, 1.98]} material={trimMaterial}>
        <boxGeometry args={[1.2, 0.18, 0.08]} />
      </mesh>

      {/* Front Carbon Fiber Splitter */}
      <mesh position={[0, 0.12, 1.88]} material={carbonMaterial} castShadow>
        <boxGeometry args={[1.92, 0.04, 0.55]} />
      </mesh>
      {/* Splitter Endplate Canards */}
      <mesh position={[-0.96, 0.20, 1.88]} material={carbonMaterial}>
        <boxGeometry args={[0.04, 0.18, 0.32]} />
      </mesh>
      <mesh position={[0.96, 0.20, 1.88]} material={carbonMaterial}>
        <boxGeometry args={[0.04, 0.18, 0.32]} />
      </mesh>

      {/* ─── 2. Wide Aerodynamic Wheel Arches ─────────────────────────── */}
      {/* Front Left Arch */}
      <mesh position={[-0.88, 0.38, 1.15]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.88]} />
      </mesh>
      {/* Front Right Arch */}
      <mesh position={[0.88, 0.38, 1.15]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.88]} />
      </mesh>
      {/* Rear Left Wide Fender (Muscular GT Arch) */}
      <mesh position={[-0.92, 0.42, -1.05]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.42, 0.98]} />
      </mesh>
      {/* Rear Right Wide Fender */}
      <mesh position={[0.92, 0.42, -1.05]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[0.22, 0.42, 0.98]} />
      </mesh>

      {/* Aerodynamic Side Skirts */}
      <mesh position={[-0.92, 0.16, 0]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.08, 0.06, 1.85]} />
      </mesh>
      <mesh position={[0.92, 0.16, 0]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.08, 0.06, 1.85]} />
      </mesh>

      {/* ─── 3. Cockpit & Fastback Greenhouse ─────────────────────────── */}
      {/* Roof Panel (Carbon/Paint) */}
      <mesh position={[0, 0.86, -0.22]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[1.34, 0.06, 1.25]} />
      </mesh>

      {/* Front Windshield (sloped raked glass) */}
      <mesh position={[0, 0.68, 0.48]} rotation={[-0.52, 0, 0]} material={glassMaterial}>
        <boxGeometry args={[1.38, 0.05, 0.72]} />
      </mesh>

      {/* Fastback Rear Window */}
      <mesh position={[0, 0.67, -0.92]} rotation={[0.48, 0, 0]} material={glassMaterial}>
        <boxGeometry args={[1.32, 0.05, 0.88]} />
      </mesh>

      {/* Left Side Window Glass */}
      <mesh position={[-0.67, 0.68, -0.22]} rotation={[0, 0, 0.12]} material={glassMaterial}>
        <boxGeometry args={[0.04, 0.38, 1.28]} />
      </mesh>
      {/* Right Side Window Glass */}
      <mesh position={[0.67, 0.68, -0.22]} rotation={[0, 0, -0.12]} material={glassMaterial}>
        <boxGeometry args={[0.04, 0.38, 1.28]} />
      </mesh>

      {/* A-Pillars & C-Pillars */}
      <mesh position={[-0.68, 0.68, 0.48]} rotation={[-0.52, 0, 0]} material={bodyPaintMaterial}>
        <boxGeometry args={[0.08, 0.08, 0.74]} />
      </mesh>
      <mesh position={[0.68, 0.68, 0.48]} rotation={[-0.52, 0, 0]} material={bodyPaintMaterial}>
        <boxGeometry args={[0.08, 0.08, 0.74]} />
      </mesh>

      {/* Aerodynamic Wing Mirrors */}
      <mesh position={[-0.84, 0.62, 0.42]} material={carbonMaterial}>
        <boxGeometry args={[0.18, 0.08, 0.12]} />
      </mesh>
      <mesh position={[0.84, 0.62, 0.42]} material={carbonMaterial}>
        <boxGeometry args={[0.18, 0.08, 0.12]} />
      </mesh>

      {/* ─── 4. Rear Deck, Diffuser & GT Wing Spoiler ─────────────────── */}
      {/* Trunk Deck */}
      <mesh position={[0, 0.52, -1.45]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[1.62, 0.22, 0.68]} />
      </mesh>

      {/* Rear Bumper Fascia */}
      <mesh position={[0, 0.34, -1.82]} material={bodyPaintMaterial} castShadow>
        <boxGeometry args={[1.78, 0.32, 0.28]} />
      </mesh>

      {/* Rear Carbon Diffuser with Strakes */}
      <mesh position={[0, 0.18, -1.86]} material={carbonMaterial} castShadow>
        <boxGeometry args={[1.65, 0.14, 0.38]} />
      </mesh>
      {/* Diffuser vertical aerodynamic fins */}
      {[-0.5, -0.2, 0.2, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.16, -1.94]} material={carbonMaterial}>
          <boxGeometry args={[0.03, 0.16, 0.22]} />
        </mesh>
      ))}

      {/* GT Wing Pylons (Twin Aero Uprights) */}
      <mesh position={[-0.52, 0.78, -1.55]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.04, 0.34, 0.22]} />
      </mesh>
      <mesh position={[0.52, 0.78, -1.55]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.04, 0.34, 0.22]} />
      </mesh>

      {/* Main GT Wing Blade (High Downforce Airfoil) */}
      <mesh position={[0, 0.96, -1.58]} rotation={[-0.08, 0, 0]} material={carbonMaterial} castShadow>
        <boxGeometry args={[1.98, 0.05, 0.36]} />
      </mesh>
      {/* GT Wing Endplates */}
      <mesh position={[-0.99, 0.96, -1.58]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.04, 0.22, 0.44]} />
      </mesh>
      <mesh position={[0.99, 0.96, -1.58]} material={carbonMaterial} castShadow>
        <boxGeometry args={[0.04, 0.22, 0.44]} />
      </mesh>

      {/* Quad Titanium Exhaust Tips */}
      <mesh position={[-0.45, 0.18, -1.96]} rotation={[Math.PI / 2, 0, 0]} material={titaniumExhaustMaterial}>
        <cylinderGeometry args={[0.055, 0.055, 0.18, 16]} />
      </mesh>
      <mesh position={[-0.32, 0.18, -1.96]} rotation={[Math.PI / 2, 0, 0]} material={titaniumExhaustMaterial}>
        <cylinderGeometry args={[0.055, 0.055, 0.18, 16]} />
      </mesh>
      <mesh position={[0.32, 0.18, -1.96]} rotation={[Math.PI / 2, 0, 0]} material={titaniumExhaustMaterial}>
        <cylinderGeometry args={[0.055, 0.055, 0.18, 16]} />
      </mesh>
      <mesh position={[0.45, 0.18, -1.96]} rotation={[Math.PI / 2, 0, 0]} material={titaniumExhaustMaterial}>
        <cylinderGeometry args={[0.055, 0.055, 0.18, 16]} />
      </mesh>

      {/* ─── 5. Lighting Elements ─────────────────────────────────────── */}
      {/* Front Angular LED Headlights */}
      <mesh position={[-0.62, 0.38, 1.88]} rotation={[0, 0.2, 0]} material={headlightMaterial}>
        <boxGeometry args={[0.34, 0.09, 0.12]} />
      </mesh>
      <mesh position={[0.62, 0.38, 1.88]} rotation={[0, -0.2, 0]} material={headlightMaterial}>
        <boxGeometry args={[0.34, 0.09, 0.12]} />
      </mesh>

      {/* Rear Full-Width Continuous LED Tail Light Bar */}
      <mesh position={[0, 0.46, -1.86]} material={taillightMaterial}>
        <boxGeometry args={[1.56, 0.07, 0.06]} />
      </mesh>
    </group>
  );
}
