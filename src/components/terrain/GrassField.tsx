import { useMemo, useRef } from 'react';
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
} from 'three';
import { createNoise2D } from 'simplex-noise';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
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
  GRASS_CHUNKS,
} from '@/config/grass';

/**
 * Creates a base grass tuft geometry (without instance attributes).
 */
function createGrassTuftGeometry(): BufferGeometry {
  const bw = GRASS_WIDTH * 0.5;
  const tw = bw * GRASS_TIP_WIDTH;
  const h = 1.0;

  const verts: number[] = [];
  const tips: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = []; 

  const angles = [0, Math.PI / 2];

  for (const angle of angles) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const blX = -bw * c, blZ = -bw * s;
    const brX =  bw * c, brZ =  bw * s;
    const tlX = -tw * c, tlZ = -tw * s;
    const trX =  tw * c, trZ =  tw * s;

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

interface GrassChunkData {
  matrices: number[][];
  colors: Color[];
  center: Vector3;
}

export function GrassField() {
  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  
  // We'll store all the uniform references so we can update them every frame
  const shaderUniformsRef = useRef<{ [key: string]: any }[]>([]);
  const carPosRef = useRef(new Vector3(0, 0, 0));
  
  // We'll store references to our instanced meshes to dynamically set count for LOD
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

    // Initialize chunks
    const chunks: GrassChunkData[] = Array.from({ length: GRASS_CHUNKS * GRASS_CHUNKS }, () => ({
      matrices: [],
      colors: [],
      center: new Vector3(), // Added for distance culling
    }));

    let placed = 0;
    let attempt = 0;
    
    const targetGrassCount = graphicsQuality === 'low' ? 10000 : graphicsQuality === 'medium' ? 30000 : GRASS_COUNT;
    const maxAttempts = targetGrassCount * 8;

    while (placed < targetGrassCount && attempt < maxAttempts) {
      attempt++;
      const seed = attempt * 7 + 13;

      const x = (seededRandom(seed) - 0.5) * mapWidth * GRASS_EDGE_MARGIN;
      const z = (seededRandom(seed + 1) - 0.5) * mapDepth * GRASS_EDGE_MARGIN;

      const noiseVal = clumpNoise(x * 0.05, z * 0.05); 
      if (noiseVal < -0.1) continue;

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

      const patchScale = mapRange(noiseVal, -0.1, 1.0, 0.4, 1.2); 
      const scaleY = (GRASS_HEIGHT_MIN + seededRandom(seed + 2) * (GRASS_HEIGHT_MAX - GRASS_HEIGHT_MIN)) * patchScale;
      const scaleXZ = (0.7 + seededRandom(seed + 3) * 0.6) * patchScale; 
      const rotY = seededRandom(seed + 4) * Math.PI * 2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();

      const colorT = seededRandom(seed + 5);
      tempColor.lerpColors(GRASS_COLOR_DARK, GRASS_COLOR_LIGHT, colorT);

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
      // Center of the chunk in world coordinates
      chunk.center.set(
        (cx + 0.5) * chunkWidth - mapWidth / 2,
        0, // Y doesn't matter much for distance
        (cz + 0.5) * chunkDepth - mapDepth / 2
      );
    });

    const geo = createGrassTuftGeometry();

    return { chunksData: chunks, geometry: geo };
  }, [heightmapData, levelData, graphicsQuality]);

  // Create a shared material using onBeforeCompile
  const material = useMemo(() => {
    const mat = new MeshLambertMaterial({
      side: DoubleSide,
      transparent: true,
      alphaTest: 0.5,
      color: 0xffffff, // Acts as multiplier for instanceColor
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
        `
      );

      // Inject custom vertex displacement for wind and bending
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vBladeTip = bladeTip;
        vMyUv = uv;
        vec3 displaced = transformed;

        vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        
        // Wind: gentle sway on blade tips only
        if (bladeTip > 0.5) {
          float phase = worldPos.x * 0.7 + worldPos.z * 1.1;
          displaced.x += sin(u_time * u_windSpeed + phase) * u_windStrength;
          displaced.z += cos(u_time * u_windSpeed * 0.6 + phase * 0.8) * u_windStrength * 0.5;
        }

        vec4 instanceWorldPos = instanceMatrix * vec4(displaced, 1.0);

        // Car Interaction
        float distToCar = distance(instanceWorldPos.xyz, u_carPosition);
        float bendRadius = 2.0;
        if (distToCar < bendRadius && bladeTip > 0.1) {
          vec3 pushDir = normalize(instanceWorldPos.xyz - u_carPosition);
          pushDir.y = 0.0;
          float pushStrength = (1.0 - (distToCar / bendRadius)) * 0.8;
          displaced.x += pushDir.x * pushStrength * bladeTip;
          displaced.z += pushDir.z * pushStrength * bladeTip;
          displaced.y -= pushStrength * 0.5 * bladeTip;
        }
        
        vec4 mvPosition = vec4( displaced, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );

      shader.fragmentShader = `
        varying float vBladeTip;
        varying vec2 vMyUv;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `
        float expectedWidth = 1.0 - pow(vMyUv.y, 2.5); 
        float distFromCenter = abs(vMyUv.x - 0.5) * 2.0;
        
        if (distFromCenter > expectedWidth) {
          discard;
        }
        #include <alphatest_fragment>
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Subsurface scattering fake
        diffuseColor.rgb *= mix(0.5, 1.05, vBladeTip);
        `
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
    
    // Distance-based culling (LOD)
    const camPos = state.camera.position;
    const MAX_DISTANCE_SQ = 150 * 150; // Max render distance for grass
    
    chunksData.forEach((chunk, idx) => {
      const mesh = meshRefs.current[idx];
      if (!mesh) return;
      
      const distSq = chunk.center.distanceToSquared(camPos);
      if (distSq > MAX_DISTANCE_SQ) {
        mesh.count = 0; // Cull entirely by setting instance count to 0
      } else {
        mesh.count = chunk.matrices.length; // Render all
      }
    });
  });

  return (
    <group>
      {chunksData.map((chunk, index) => {
        const count = chunk.matrices.length;
        if (count === 0) return null;

        return (
          <instancedMesh
            key={index}
            args={[geometry, material, count]}
            frustumCulled={true} // Performance boost!
            ref={(mesh) => {
              if (mesh) {
                meshRefs.current[index] = mesh;
                const dummy = new Object3D();
                for (let i = 0; i < count; i++) {
                  dummy.matrix.fromArray(chunk.matrices[i]);
                  mesh.setMatrixAt(i, dummy.matrix);
                  mesh.setColorAt(i, chunk.colors[i]);
                }
                mesh.instanceMatrix.needsUpdate = true;
                if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
                
                // CRITICAL for frustumCulled={true} to work correctly with InstancedMesh!
                mesh.computeBoundingSphere();
              }
            }}
          />
        );
      })}
    </group>
  );
}
