import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  ShaderMaterial,
  Color,
  Object3D,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  Vector3,
} from 'three';
import { createNoise2D } from 'simplex-noise';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useGameStore } from '@/store/gameStore';
import { mapRange } from '@/utils/math';
import {
  GRASS_COUNT,
  GRASS_HEIGHT_MIN,
  GRASS_HEIGHT_MAX,
  GRASS_WIDTH,
  GRASS_TIP_WIDTH,
  WIND_SPEED,
  WIND_STRENGTH,
  GRASS_MAX_TERRAIN_HEIGHT,
  GRASS_CLEARING_RADIUS,
  GRASS_EDGE_MARGIN,
  GRASS_COLOR_LIGHT,
  GRASS_COLOR_DARK,
} from '@/config/grass';

// ─── Vertex Shader ──────────────────────────────────────────────────
const grassVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_windSpeed;
  uniform float u_windStrength;
  uniform vec3 u_carPosition;

  attribute float bladeTip;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vBladeTip;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vColor = aColor;
    vBladeTip = bladeTip;
    vUv = uv;
    
    // Pass normal to fragment shader for basic lighting
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);

    vec3 pos = position;
    vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

    // Wind: gentle sway on blade tips only
    if (bladeTip > 0.5) {
      float phase = worldPos.x * 0.7 + worldPos.z * 1.1;
      pos.x += sin(u_time * u_windSpeed + phase) * u_windStrength;
      pos.z += cos(u_time * u_windSpeed * 0.6 + phase * 0.8) * u_windStrength * 0.5;
    }

    vec4 instanceWorldPos = instanceMatrix * vec4(pos, 1.0);

    // Car Interaction: bend grass away if car is near
    float distToCar = distance(instanceWorldPos.xyz, u_carPosition);
    float bendRadius = 2.0;
    if (distToCar < bendRadius && bladeTip > 0.1) {
      // Calculate push direction away from car
      vec3 pushDir = normalize(instanceWorldPos.xyz - u_carPosition);
      pushDir.y = 0.0; // Push horizontally only
      
      // The closer the car, the stronger the push
      float pushStrength = (1.0 - (distToCar / bendRadius)) * 0.8;
      
      // Apply push mainly to the tip
      pos.x += pushDir.x * pushStrength * bladeTip;
      pos.z += pushDir.z * pushStrength * bladeTip;
      pos.y -= pushStrength * 0.5 * bladeTip; // Flatten it a bit
    }

    vec4 mvPosition = viewMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ─── Fragment Shader ────────────────────────────────────────────────
const grassFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBladeTip;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Procedural Alpha: Carve a leaf shape using UVs
    // vUv.x goes 0 to 1 across the blade. vUv.y goes 0 (base) to 1 (tip).
    // Width of the leaf tapers quadratically towards the tip.
    float expectedWidth = 1.0 - pow(vUv.y, 2.5); 
    float distFromCenter = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges
    
    // Discard pixels outside the leaf shape to make it look like a blade, not a triangle
    if (distFromCenter > expectedWidth) {
      discard;
    }

    // Subtle darkening at base, brighter tips
    float gradient = mix(0.5, 1.05, vBladeTip);
    
    // Fake directional sunlight coming from above/angle
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    
    // Simple diffuse lighting, clamped to avoid pitch black
    float diffuse = max(0.4, dot(vNormal, lightDir));
    
    vec3 finalColor = vColor * gradient * diffuse;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Creates a grass tuft geometry: 2 crossed quads (at 90°),
 * Looks like a small grass clump from any angle.
 */
function createGrassTuftGeometry(colorData: Float32Array): BufferGeometry {
  const bw = GRASS_WIDTH * 0.5;
  const tw = bw * GRASS_TIP_WIDTH;
  const h = 1.0;

  const verts: number[] = [];
  const tips: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = []; // We will compute normals manually to point outwards slightly

  const angles = [0, Math.PI / 2];

  for (const angle of angles) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // Base and tip positions
    const blX = -bw * c, blZ = -bw * s;
    const brX =  bw * c, brZ =  bw * s;
    const tlX = -tw * c, tlZ = -tw * s;
    const trX =  tw * c, trZ =  tw * s;

    // Normal for this plane (perpendicular to the plane)
    // To make it look "fluffy", we point the normal slightly upwards as well
    const normX = -s, normZ = c; 

    // Tri 1: base-left → base-right → tip-right
    verts.push(blX, 0, blZ,  brX, 0, brZ,  trX, h, trZ);
    tips.push(0, 0, 1);
    uvs.push(0, 0,  1, 0,  1, 1);
    normals.push(normX, 0.2, normZ,  normX, 0.2, normZ,  normX, 0.5, normZ);

    // Tri 2: base-left → tip-right → tip-left
    verts.push(blX, 0, blZ,  trX, h, trZ,  tlX, h, tlZ);
    tips.push(0, 1, 1);
    uvs.push(0, 0,  1, 1,  0, 1);
    normals.push(normX, 0.2, normZ,  normX, 0.5, normZ,  normX, 0.5, normZ);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute('bladeTip', new Float32BufferAttribute(new Float32Array(tips), 1));
  geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(uvs), 2));
  geo.setAttribute('normal', new Float32BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('aColor', new InstancedBufferAttribute(colorData, 3));

  return geo;
}

/** Seeded PRNG */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Simple determinism wrapper for noise */
function getSeededRandomFn(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getInterpolatedHeight(
  worldX: number,
  worldZ: number,
  heights: Float32Array,
  rows: number,
  cols: number,
  mapWidth: number,
  mapDepth: number,
): number {
  const nx = (worldX + mapWidth / 2) / mapWidth;
  const nz = (worldZ + mapDepth / 2) / mapDepth;
  const gx = nx * (cols - 1);
  const gz = nz * (rows - 1);
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = Math.min(x0 + 1, cols - 1);
  const z1 = Math.min(z0 + 1, rows - 1);
  const fx = gx - x0;
  const fz = gz - z0;

  if (x0 < 0 || x0 >= cols || z0 < 0 || z0 >= rows) return 0;

  const h00 = heights[z0 * cols + x0];
  const h10 = heights[z0 * cols + x1];
  const h01 = heights[z1 * cols + x0];
  const h11 = heights[z1 * cols + x1];

  const h0 = h00 + (h10 - h00) * fx;
  const h1 = h01 + (h11 - h01) * fx;
  return h0 + (h1 - h0) * fz;
}

export function GrassField() {
  const { heightmapData, config } = useTerrainData();
  const materialRef = useRef<ShaderMaterial>(null);
  
  // Track car position using zustand transient subscription (no re-renders)
  const carPosRef = useRef(new Vector3(0, 0, 0));

  const { mesh, material } = useMemo(() => {
    const { heights, rows, cols, minHeight, maxHeight } = heightmapData;
    const mapWidth = config.width;
    const mapDepth = config.depth;

    const colorFloats: number[] = [];
    const dummy = new Object3D();
    const tempColor = new Color();
    const instanceMatrices: number[][] = [];

    // Create noise generator for clumping (grass patches)
    const rng = getSeededRandomFn(999);
    const clumpNoise = createNoise2D(rng);

    let placed = 0;
    let attempt = 0;
    const maxAttempts = GRASS_COUNT * 8; // Increased attempts to allow for noise culling

    while (placed < GRASS_COUNT && attempt < maxAttempts) {
      attempt++;
      const seed = attempt * 7 + 13;

      const x = (seededRandom(seed) - 0.5) * mapWidth * GRASS_EDGE_MARGIN;
      const z = (seededRandom(seed + 1) - 0.5) * mapDepth * GRASS_EDGE_MARGIN;

      // Noise Clumping: evaluate noise at this position
      // Scale coordinates so noise isn't too dense or sparse
      const noiseVal = clumpNoise(x * 0.05, z * 0.05); 
      // If noise is low, this area is a "bald spot" (sand), skip grass
      if (noiseVal < -0.1) {
        continue;
      }

      // Skip spawn zone
      if (Math.abs(x) < GRASS_CLEARING_RADIUS && Math.abs(z) < GRASS_CLEARING_RADIUS) {
        continue;
      }

      const y = getInterpolatedHeight(x, z, heights, rows, cols, mapWidth, mapDepth);

      const normalizedHeight = mapRange(y, minHeight, maxHeight, 0, 1);
      if (normalizedHeight > GRASS_MAX_TERRAIN_HEIGHT) {
        continue;
      }

      if (y < -5) continue; // Underwater

      // Scale and rotation
      // Multiply scale by noiseVal so grass is smaller at the edges of patches
      const patchScale = mapRange(noiseVal, -0.1, 1.0, 0.4, 1.2); 
      
      const scaleY = (GRASS_HEIGHT_MIN + seededRandom(seed + 2) * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN)) * patchScale;
      const scaleXZ = (0.7 + seededRandom(seed + 3) * 0.6) * patchScale; 
      const rotY = seededRandom(seed + 4) * Math.PI * 2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();

      instanceMatrices.push(Array.from(dummy.matrix.elements));

      const colorT = seededRandom(seed + 5);
      tempColor.lerpColors(GRASS_COLOR_DARK, GRASS_COLOR_LIGHT, colorT);
      colorFloats.push(tempColor.r, tempColor.g, tempColor.b);

      placed++;
    }

    const totalInstances = instanceMatrices.length;
    const geo = createGrassTuftGeometry(new Float32Array(colorFloats));

    const mat = new ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_windSpeed: { value: WIND_SPEED },
        u_windStrength: { value: WIND_STRENGTH },
        u_carPosition: { value: new Vector3(0, 0, 0) },
      },
      side: DoubleSide,
      transparent: true,
      alphaTest: 0.5, // Important for depth sorting and clipping the procedural shape
    });

    const iMesh = new InstancedMesh(geo, mat, totalInstances);
    for (let i = 0; i < totalInstances; i++) {
      const el = instanceMatrices[i];
      for (let j = 0; j < 16; j++) {
        iMesh.instanceMatrix.array[i * 16 + j] = el[j];
      }
    }
    iMesh.instanceMatrix.needsUpdate = true;
    iMesh.frustumCulled = false;

    return { mesh: iMesh, material: mat };
  }, [heightmapData, config]);

  // Animate wind and interact with car
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
      
      // Update car position uniform without triggering React re-renders
      const carPosArray = useGameStore.getState().position;
      carPosRef.current.set(carPosArray[0], carPosArray[1], carPosArray[2]);
      materialRef.current.uniforms.u_carPosition.value.copy(carPosRef.current);
    }
  });

  return <primitive object={mesh} material={material} ref={(node: any) => {
    if (node) materialRef.current = node.material;
  }} />;
}
