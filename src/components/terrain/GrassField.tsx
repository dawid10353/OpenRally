import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  Object3D,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  MeshLambertMaterial,
  InstancedMesh,
  type IUniform,
} from 'three';
import { createNoise2D } from 'simplex-noise';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { mapRange } from '@/utils/math';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';
import {
  GRASS_HEIGHT_MIN,
  GRASS_HEIGHT_MAX,
  WIND_SPEED,
  WIND_STRENGTH,
  GRASS_MAX_TERRAIN_HEIGHT,
  GRASS_CLEARING_RADIUS,
  GRASS_EDGE_MARGIN,
  GRASS_COLOR_LIGHT,
  GRASS_COLOR_DARK,
  DESERT_GRASS_COLOR_LIGHT,
  DESERT_GRASS_COLOR_DARK,
  GRASS_CHUNKS,
} from '@/config/grass';

/**
 * Creates a base multi-blade procedural grass cluster geometry.
 * Comprises 6 tapered, curved blade ribbons radiating in an organic fan
 * with upward-biased normals for soft ambient light distribution.
 */
export function createGrassTuftGeometry(): BufferGeometry {
  const verts: number[] = [];
  const tips: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  const NUM_BLADES = 6;
  const BLADE_WIDTH = 0.055;

  for (let b = 0; b < NUM_BLADES; b++) {
    const angle = (b / NUM_BLADES) * Math.PI * 2 + ((b * 13) % 7) * 0.15;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // Perpendicular vector for blade width
    const perpX = -s * BLADE_WIDTH * 0.5;
    const perpZ = c * BLADE_WIDTH * 0.5;

    // Outward curvature curve
    const lean = 0.18 + ((b * 17) % 5) * 0.04;
    const leanX = c * lean;
    const leanZ = s * lean;

    // Segment 0: Base (Y = 0)
    const bLX = -perpX, bLZ = -perpZ, bY = 0.0;
    const bRX = perpX, bRZ = perpZ;

    // Segment 1: Mid (Y = 0.5)
    const mScale = 0.8;
    const mLX = leanX * 0.35 - perpX * mScale, mLZ = leanZ * 0.35 - perpZ * mScale, mY = 0.5;
    const mRX = leanX * 0.35 + perpX * mScale, mRZ = leanZ * 0.35 + perpZ * mScale;

    // Segment 2: Tip (Y = 1.0)
    const tScale = 0.25;
    const tLX = leanX - perpX * tScale, tLZ = leanZ - perpZ * tScale, tY = 1.0;
    const tRX = leanX + perpX * tScale, tRZ = leanZ + perpZ * tScale;

    // Upward-biased smooth normals
    const normX = c * 0.3;
    const normY = 0.85;
    const normZ = s * 0.3;

    // Quad 1: Base to Mid
    // Tri 1
    verts.push(bLX, bY, bLZ,  bRX, bY, bRZ,  mRX, mY, mRZ);
    tips.push(0.0, 0.0, 0.5);
    uvs.push(0, 0,  1, 0,  1, 0.5);
    normals.push(normX, normY, normZ,  normX, normY, normZ,  normX, normY, normZ);

    // Tri 2
    verts.push(bLX, bY, bLZ,  mRX, mY, mRZ,  mLX, mY, mLZ);
    tips.push(0.0, 0.5, 0.5);
    uvs.push(0, 0,  1, 0.5,  0, 0.5);
    normals.push(normX, normY, normZ,  normX, normY, normZ,  normX, normY, normZ);

    // Quad 2: Mid to Tip
    // Tri 1
    verts.push(mLX, mY, mLZ,  mRX, mY, mRZ,  tRX, tY, tRZ);
    tips.push(0.5, 0.5, 1.0);
    uvs.push(0, 0.5,  1, 0.5,  1, 1.0);
    normals.push(normX, normY, normZ,  normX, normY, normZ,  normX, normY, normZ);

    // Tri 2
    verts.push(mLX, mY, mLZ,  tRX, tY, tRZ,  tLX, tY, tLZ);
    tips.push(0.5, 1.0, 1.0);
    uvs.push(0, 0.5,  1, 1.0,  0, 1.0);
    normals.push(normX, normY, normZ,  normX, normY, normZ,  normX, normY, normZ);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute('bladeTip', new Float32BufferAttribute(new Float32Array(tips), 1));
  geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(uvs), 2));
  geo.setAttribute('normal', new Float32BufferAttribute(new Float32Array(normals), 3));

  return geo;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeededRandomFn(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GrassChunkData {
  matrices: number[][];
  colors: Color[];
  center: Vector3;
}

interface GrassChunkMeshProps {
  geometry: BufferGeometry;
  material: MeshLambertMaterial;
  chunk: GrassChunkData;
  onMeshRegister: (mesh: InstancedMesh | null) => void;
}

function GrassChunkMesh({ geometry, material, chunk, onMeshRegister }: GrassChunkMeshProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const count = chunk.matrices.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    const dummy = new Object3D();
    for (let i = 0; i < count; i++) {
      dummy.matrix.fromArray(chunk.matrices[i]);
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, chunk.colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();

    onMeshRegister(mesh);
    return () => onMeshRegister(null);
  }, [chunk, count, onMeshRegister]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={true}
    />
  );
}

export function GrassField() {
  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  const isDesert = levelData.id.toLowerCase().includes('desert');

  const shaderUniformsRef = useRef<Record<string, IUniform>[]>([]);
  const carPosRef = useRef(new Vector3(0, 0, 0));

  const frameCountRef = useRef(0);
  const lastCamPosRef = useRef(new Vector3(9999, 9999, 9999));

  // References to instanced meshes for LOD culling
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);

  const { chunksData, geometry } = useMemo(() => {
    const { heights, trackMasks, rows, cols, minHeight, maxHeight } = heightmapData;
    const mapWidth = levelData.terrainBase.width;
    const mapDepth = levelData.terrainBase.depth;

    const dummy = new Object3D();
    const tempColor = new Color();
    const rng = getSeededRandomFn(999);
    const clumpNoise = createNoise2D(rng);

    const chunkWidth = mapWidth / GRASS_CHUNKS;
    const chunkDepth = mapDepth / GRASS_CHUNKS;

    const darkColor = isDesert ? DESERT_GRASS_COLOR_DARK : GRASS_COLOR_DARK;
    const lightColor = isDesert ? DESERT_GRASS_COLOR_LIGHT : GRASS_COLOR_LIGHT;

    // Initialize chunks
    const chunks: GrassChunkData[] = Array.from({ length: GRASS_CHUNKS * GRASS_CHUNKS }, () => ({
      matrices: [],
      colors: [],
      center: new Vector3(),
    }));

    let placed = 0;
    let attempt = 0;

    const targetGrassCount =
      graphicsQuality === 'low'
        ? 12000
        : graphicsQuality === 'medium'
        ? 32000
        : graphicsQuality === 'high'
        ? 60000
        : 95000;
    const maxAttempts = targetGrassCount * 8;

    while (placed < targetGrassCount && attempt < maxAttempts) {
      attempt++;
      const seed = attempt * 7 + 13;

      const x = (seededRandom(seed) - 0.5) * mapWidth * GRASS_EDGE_MARGIN;
      const z = (seededRandom(seed + 1) - 0.5) * mapDepth * GRASS_EDGE_MARGIN;

      const noiseVal = clumpNoise(x * 0.05, z * 0.05);
      if (noiseVal < -0.15) continue;

      if (Math.abs(x) < GRASS_CLEARING_RADIUS && Math.abs(z) < GRASS_CLEARING_RADIUS) continue;

      // Track mask check - prevent grass on the muddy track
      const nx = (x + mapWidth / 2) / mapWidth;
      const nz = (z + mapDepth / 2) / mapDepth;
      const col = Math.floor(nx * (cols - 1));
      const row = Math.floor(nz * (rows - 1));
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        if (trackMasks[row * cols + col] > 0.1) continue;
      }

      const y = getInterpolatedHeight(x, z, heights, rows, cols, mapWidth, mapDepth);
      const normalizedHeight = mapRange(y, minHeight, maxHeight, 0, 1);
      if (normalizedHeight > GRASS_MAX_TERRAIN_HEIGHT) continue;
      if (y < -5) continue;

      const patchScale = mapRange(noiseVal, -0.15, 1.0, 0.6, 1.35);
      const scaleY = (GRASS_HEIGHT_MIN + seededRandom(seed + 2) * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN)) * patchScale;
      const scaleXZ = (0.75 + seededRandom(seed + 3) * 0.6) * patchScale;
      const rotY = seededRandom(seed + 4) * Math.PI * 2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();

      const colorT = seededRandom(seed + 5);
      tempColor.lerpColors(darkColor, lightColor, colorT);

      // Determine chunk
      let cx = Math.floor((x + mapWidth / 2) / chunkWidth);
      let cz = Math.floor((z + mapDepth / 2) / chunkDepth);
      cx = Math.max(0, Math.min(GRASS_CHUNKS - 1, cx));
      cz = Math.max(0, Math.min(GRASS_CHUNKS - 1, cz));

      const chunkIdx = cz * GRASS_CHUNKS + cx;
      chunks[chunkIdx].matrices.push(Array.from(dummy.matrix.elements));
      chunks[chunkIdx].colors.push(tempColor.clone());

      placed++;
    }

    // Calculate chunk centers for distance-based culling
    chunks.forEach((chunk, idx) => {
      if (chunk.matrices.length === 0) return;
      const cz = Math.floor(idx / GRASS_CHUNKS);
      const cx = idx % GRASS_CHUNKS;
      chunk.center.set(
        (cx + 0.5) * chunkWidth - mapWidth / 2,
        0,
        (cz + 0.5) * chunkDepth - mapDepth / 2,
      );
    });

    const geo = createGrassTuftGeometry();

    return { chunksData: chunks, geometry: geo };
  }, [heightmapData, levelData, graphicsQuality, isDesert]);

  // Create shared custom grass material
  const material = useMemo(() => {
    shaderUniformsRef.current = [];

    const mat = new MeshLambertMaterial({
      side: DoubleSide,
      transparent: true,
      color: 0xffffff,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.u_time = { value: 0 };
      shader.uniforms.u_windSpeed = { value: WIND_SPEED };
      shader.uniforms.u_windStrength = { value: WIND_STRENGTH };
      shader.uniforms.u_carPosition = { value: new Vector3(0, 0, 0) };

      shaderUniformsRef.current.push(shader.uniforms);

      shader.vertexShader = `
        uniform float u_time;
        uniform float u_windSpeed;
        uniform float u_windStrength;
        uniform vec3 u_carPosition;
        
        attribute float bladeTip;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying float vBladeTip;
        varying vec2 vMyUv;
        `,
      );

      // Custom vertex displacement for wind waves and vehicle bending
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vBladeTip = bladeTip;
        vMyUv = uv;
        vec3 displaced = transformed;

        vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Dynamic multi-frequency wind sway
        if (bladeTip > 0.3) {
          float wave1 = sin(u_time * u_windSpeed + worldPos.x * 0.15 + worldPos.z * 0.22);
          float wave2 = cos(u_time * (u_windSpeed * 0.7) + worldPos.x * 0.08 + worldPos.z * 0.12);
          float gust = sin(u_time * 0.9 + worldPos.x * 0.03) * 0.5 + 0.5;

          displaced.x += (wave1 + wave2 * 0.5) * u_windStrength * (1.0 + gust) * bladeTip;
          displaced.z += (wave2 - wave1 * 0.4) * u_windStrength * (1.0 + gust * 0.7) * bladeTip;
        }

        vec4 instanceWorldPos = instanceMatrix * vec4(displaced, 1.0);

        // Responsive vehicle pushdown & deflection
        float distToCar = distance(instanceWorldPos.xyz, u_carPosition);
        float bendRadius = 2.4;
        if (distToCar < bendRadius && bladeTip > 0.05) {
          vec3 pushDir = normalize(instanceWorldPos.xyz - u_carPosition);
          pushDir.y = 0.0;
          float pushStrength = (1.0 - (distToCar / bendRadius));
          pushStrength = pushStrength * pushStrength; // Quadratic falloff
          displaced.x += pushDir.x * pushStrength * 0.9 * bladeTip;
          displaced.z += pushDir.z * pushStrength * 0.9 * bladeTip;
          displaced.y -= pushStrength * 0.45 * bladeTip;
        }
        
        vec4 mvPosition = vec4( displaced, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `,
      );

      shader.fragmentShader = `
        varying float vBladeTip;
        varying vec2 vMyUv;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        // Natural gradient from moist earth root (blending into terrain) to fresh sunlit tip
        vec3 rootColor = diffuseColor.rgb * 0.48;
        vec3 tipColor = diffuseColor.rgb * 1.32;
        vec3 bladeColor = mix(rootColor, tipColor, smoothstep(0.05, 0.95, vBladeTip));

        // Subsurface scattering fake — tips catch vibrant sunlight
        float sunTranslucency = mix(0.75, 1.25, vBladeTip);
        diffuseColor.rgb = bladeColor * sunTranslucency;
        `,
      );
    };

    return mat;
  }, []);


  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const carPosArray = useGameStore.getState().position;
    carPosRef.current.set(carPosArray[0], carPosArray[1], carPosArray[2]);

    for (const uniforms of shaderUniformsRef.current) {
      if (uniforms.u_time) uniforms.u_time.value = time;
      if (uniforms.u_carPosition) uniforms.u_carPosition.value.copy(carPosRef.current);
    }

    // Throttled distance-based culling check every 4 frames
    frameCountRef.current++;
    if (frameCountRef.current % 4 === 0) {
      const camPos = state.camera.position;
      if (camPos.distanceToSquared(lastCamPosRef.current) > 1.0) {
        lastCamPosRef.current.copy(camPos);
        const maxDistSq =
          graphicsQuality === 'very_high'
            ? 320 * 320
            : graphicsQuality === 'high'
            ? 200 * 200
            : graphicsQuality === 'medium'
            ? 150 * 150
            : 100 * 100;

        chunksData.forEach((chunk, idx) => {
          const mesh = meshRefs.current[idx];
          if (!mesh) return;

          const distSq = chunk.center.distanceToSquared(camPos);
          if (distSq > maxDistSq) {
            mesh.count = 0;
          } else {
            mesh.count = chunk.matrices.length;
          }
        });
      }
    }
  });

  return (
    <group>
      {chunksData.map((chunk, index) => (
        <GrassChunkMesh
          key={index}
          geometry={geometry}
          material={material}
          chunk={chunk}
          onMeshRegister={(mesh) => {
            meshRefs.current[index] = mesh;
          }}
        />
      ))}
    </group>
  );
}

