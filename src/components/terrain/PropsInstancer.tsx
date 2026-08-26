import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CylinderCollider,
  BallCollider,
} from '@react-three/rapier';
import {
  InstancedMesh,
  Object3D,
  Color,
  Matrix4,
  Vector3,
  Sphere,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  MeshLambertMaterial,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  type IUniform,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useTexture } from '@react-three/drei';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';

// Global bounding sphere for frustum culling optimization
const GLOBAL_BOUNDING_SPHERE = new Sphere(new Vector3(0, 0, 0), 1000);

/**
 * Creates an organic tree trunk geometry with a flared root base
 * that extends from deep underground (Y = -0.7) all the way to the top apex (Y = 4.2).
 */
export function createTrunkGeometry(): BufferGeometry {
  // Continuous tapered trunk: top radius 0.04, base radius 0.40, height 4.9
  const trunk = new CylinderGeometry(0.04, 0.40, 4.9, 12, 8);
  trunk.translate(0, 1.75, 0); // Extends from Y = -0.7 to +4.2

  // Perturb vertices for natural organic bark curvature and root flaring
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const flare = y < 0.2 ? Math.max(0, (0.2 - y) * 0.4) : 0;
    const wobble = Math.sin(y * 2.2 + (i % 4)) * 0.018;
    pos.setXYZ(i, x * (1 + flare) + wobble, y, z * (1 + flare) + wobble);
  }
  trunk.computeVertexNormals();

  // Set UVs with vertical repeat for bark texture
  const uvs = trunk.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setY(i, uvs.getY(i) * 4.0);
  }

  return trunk;
}

/**
 * Creates a dense, organic evergreen pine canopy geometry with 11 overlapping tiers,
 * natural branch curve variations, inner needle fillers, and a tapered apex crown.
 */
export function createPineFoliageGeometry(): BufferGeometry {
  const branchGeometries: BufferGeometry[] = [];

  // 11 closely-spaced tiered levels from Y = 0.65 to Y = 3.95
  const tiers = [
    { y: 0.65, radius: 2.15, count: 8, angleDeg: 16, cardWidth: 1.6, cardLength: 2.1 },
    { y: 0.95, radius: 2.00, count: 8, angleDeg: 18, cardWidth: 1.5, cardLength: 1.95 },
    { y: 1.25, radius: 1.85, count: 8, angleDeg: 20, cardWidth: 1.45, cardLength: 1.8 },
    { y: 1.55, radius: 1.70, count: 7, angleDeg: 22, cardWidth: 1.35, cardLength: 1.65 },
    { y: 1.85, radius: 1.55, count: 7, angleDeg: 24, cardWidth: 1.3, cardLength: 1.5 },
    { y: 2.15, radius: 1.40, count: 7, angleDeg: 26, cardWidth: 1.2, cardLength: 1.35 },
    { y: 2.45, radius: 1.25, count: 6, angleDeg: 28, cardWidth: 1.1, cardLength: 1.2 },
    { y: 2.75, radius: 1.10, count: 6, angleDeg: 30, cardWidth: 1.0, cardLength: 1.05 },
    { y: 3.10, radius: 0.90, count: 5, angleDeg: 33, cardWidth: 0.85, cardLength: 0.9 },
    { y: 3.45, radius: 0.70, count: 5, angleDeg: 36, cardWidth: 0.75, cardLength: 0.75 },
    { y: 3.80, radius: 0.50, count: 4, angleDeg: 40, cardWidth: 0.65, cardLength: 0.6 },
  ];

  for (const tier of tiers) {
    // 1. Primary outer boughs with organic arching and angle jitter
    for (let i = 0; i < tier.count; i++) {
      const jitter = ((i * 19 + Math.floor(tier.y * 10)) % 7) * 0.08;
      const rotY = (i / tier.count) * Math.PI * 2 + tier.y * 1.9 + jitter;
      const dipAngle = ((tier.angleDeg + ((i % 3) - 1) * 3) * Math.PI) / 180;

      const lenJitter = 0.9 + ((i * 11) % 5) * 0.05;
      const w = tier.cardWidth * 0.5;
      const len = tier.cardLength * lenJitter;

      const c = Math.cos(rotY);
      const s = Math.sin(rotY);
      const perpX = -s * w;
      const perpZ = c * w;

      const outX = c * len * Math.cos(dipAngle);
      const outZ = s * len * Math.cos(dipAngle);
      const outY = -len * Math.sin(dipAngle);

      const startX = c * 0.1;
      const startZ = s * 0.1;

      const v0x = startX - perpX * 0.45, v0y = tier.y, v0z = startZ - perpZ * 0.45;
      const v1x = startX + perpX * 0.45, v1y = tier.y, v1z = startZ + perpZ * 0.45;
      const v2x = startX + outX + perpX, v2y = tier.y + outY, v2z = startZ + outZ + perpZ;
      const v3x = startX + outX - perpX, v3y = tier.y + outY, v3z = startZ + outZ - perpZ;

      const verts = new Float32Array([
        v0x, v0y, v0z,  v1x, v1y, v1z,  v2x, v2y, v2z,
        v0x, v0y, v0z,  v2x, v2y, v2z,  v3x, v3y, v3z,
      ]);

      const uvs = new Float32Array([
        0, 0,  1, 0,  1, 1,
        0, 0,  1, 1,  0, 1,
      ]);

      const cardGeo = new BufferGeometry();
      cardGeo.setAttribute('position', new Float32BufferAttribute(verts, 3));
      cardGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
      cardGeo.computeVertexNormals();

      branchGeometries.push(cardGeo);
    }

    // 2. Secondary interior filler needle clusters
    const fillerCount = Math.max(3, tier.count - 2);
    for (let j = 0; j < fillerCount; j++) {
      const rotY = (j / fillerCount) * Math.PI * 2 + tier.y * 1.9 + Math.PI / fillerCount;
      const dipAngle = ((tier.angleDeg + 10) * Math.PI) / 180;

      const w = tier.cardWidth * 0.42;
      const len = tier.cardLength * 0.7;

      const c = Math.cos(rotY);
      const s = Math.sin(rotY);
      const perpX = -s * w;
      const perpZ = c * w;

      const outX = c * len * Math.cos(dipAngle);
      const outZ = s * len * Math.cos(dipAngle);
      const outY = -len * Math.sin(dipAngle) + 0.08;

      const startX = c * 0.08;
      const startZ = s * 0.08;

      const v0x = startX - perpX * 0.45, v0y = tier.y + 0.06, v0z = startZ - perpZ * 0.45;
      const v1x = startX + perpX * 0.45, v1y = tier.y + 0.06, v1z = startZ + perpZ * 0.45;
      const v2x = startX + outX + perpX, v2y = tier.y + outY, v2z = startZ + outZ + perpZ;
      const v3x = startX + outX - perpX, v3y = tier.y + outY, v3z = startZ + outZ - perpZ;

      const verts = new Float32Array([
        v0x, v0y, v0z,  v1x, v1y, v1z,  v2x, v2y, v2z,
        v0x, v0y, v0z,  v2x, v2y, v2z,  v3x, v3y, v3z,
      ]);

      const uvs = new Float32Array([
        0, 0,  1, 0,  1, 1,
        0, 0,  1, 1,  0, 1,
      ]);

      const cardGeo = new BufferGeometry();
      cardGeo.setAttribute('position', new Float32BufferAttribute(verts, 3));
      cardGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
      cardGeo.computeVertexNormals();

      branchGeometries.push(cardGeo);
    }
  }

  // Top crown needle cone & crossed spire: smoothly envelopes trunk apex (Y = 3.6 to 4.35)
  const topH = 4.0;
  const topW = 0.48;
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 4;
    const c = Math.cos(angle) * topW;
    const s = Math.sin(angle) * topW;

    const verts = new Float32Array([
      -c, topH - 0.45, -s,   c, topH - 0.45,  s,   c * 0.15, topH + 0.35,  s * 0.15,
      -c, topH - 0.45, -s,   c * 0.15, topH + 0.35,  s * 0.15,  -c * 0.15, topH + 0.35, -s * 0.15,
    ]);
    const uvs = new Float32Array([
      0, 0,  1, 0,  1, 1,
      0, 0,  1, 1,  0, 1,
    ]);
    const topGeo = new BufferGeometry();
    topGeo.setAttribute('position', new Float32BufferAttribute(verts, 3));
    topGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    topGeo.computeVertexNormals();
    branchGeometries.push(topGeo);
  }

  const merged = BufferGeometryUtils.mergeGeometries(branchGeometries);
  return merged;
}



/**
 * Creates a high-fidelity faceted boulder geometry with natural fractures and texture UVs.
 */
export function createRealisticRockGeometry(): BufferGeometry {
  const rock = new CylinderGeometry(0.7, 0.9, 1.1, 7, 3);
  const pos = rock.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const noise = Math.sin(x * 3.5 + y * 2.1) * Math.cos(z * 3.2);
    const strata = (y % 0.3) * 0.15;
    const deform = 1.0 + noise * 0.18 - strata;

    pos.setXYZ(i, x * deform * 1.1, y * 0.85, z * deform * 0.95);
  }

  rock.computeVertexNormals();

  // Scale UVs for seamless rock cliff texture mapping
  const uvs = rock.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setX(i, uvs.getX(i) * 1.8);
    uvs.setY(i, uvs.getY(i) * 1.8);
  }

  return rock;
}

interface PropItem {
  id: string;
  type: 'tree' | 'rock';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  matrix: Matrix4;
}

export function PropsInstancer() {
  const trunkLOD0Ref = useRef<InstancedMesh>(null);
  const trunkLOD1Ref = useRef<InstancedMesh>(null);
  const foliageLOD0Ref = useRef<InstancedMesh>(null);
  const foliageLOD1Ref = useRef<InstancedMesh>(null);

  const rockLOD0Ref = useRef<InstancedMesh>(null);
  const rockLOD1Ref = useRef<InstancedMesh>(null);
  const lastUpdatePos = useRef<Vector3 | null>(null);

  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  // Load AI-generated foliage and rock textures
  const [barkTexture, pineTexture, rockTexture] = useTexture([
    '/textures/foliage/tree_bark.jpg',
    '/textures/foliage/pine_branch.jpg',
    '/textures/terrain/rock_cliff.jpg',
  ]);

  useMemo(() => {
    [barkTexture, pineTexture, rockTexture].forEach((tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
    });
  }, [barkTexture, pineTexture, rockTexture]);

  const isDesert = levelData.id.toLowerCase().includes('desert');

  // Geometries
  const trunkGeometry = useMemo(() => {
    const geo = createTrunkGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const foliageGeometry = useMemo(() => {
    const geo = createPineFoliageGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const rockGeometry = useMemo(() => {
    const geo = createRealisticRockGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  // Trunk Material
  const trunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: barkTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: isDesert ? new Color('#8c684d') : new Color('#634934'),
      }),
    [barkTexture, isDesert],
  );

  // Foliage Material with Alpha Cutout & Wind Sway
  const foliageShaderUniformsRef = useRef<Record<string, IUniform>[]>([]);

  const foliageMaterial = useMemo(() => {
    foliageShaderUniformsRef.current = [];

    const mat = new MeshLambertMaterial({
      map: pineTexture,
      side: DoubleSide,
      transparent: true,
      color: isDesert ? new Color('#a38c4d') : new Color('#224419'),
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.u_time = { value: 0 };
      shader.uniforms.u_pineTexture = { value: pineTexture };
      foliageShaderUniformsRef.current.push(shader.uniforms);

      shader.vertexShader = `
        uniform float u_time;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec2 vFoliageUv;
        varying vec3 vFoliageWorldPos;
        `,
      );

      // Subtle foliage wind sway
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vFoliageUv = uv;
        vec3 displaced = transformed;

        vec4 worldOrigin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float heightFactor = clamp(displaced.y / 4.0, 0.1, 1.0);
        float breeze = sin(u_time * 1.8 + worldOrigin.x * 0.2 + worldOrigin.z * 0.3) * 0.04 * heightFactor;
        displaced.x += breeze;
        displaced.z += breeze * 0.6;

        vec4 mvPosition = vec4( displaced, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vFoliageWorldPos = (modelMatrix * mvPosition).xyz;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `,
      );

      shader.fragmentShader = `
        varying vec2 vFoliageUv;
        varying vec3 vFoliageWorldPos;
        uniform sampler2D u_pineTexture;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec4 pineTex = texture2D(u_pineTexture, vFoliageUv);

        // Alpha discard for black background cutout
        float lum = max(pineTex.r, max(pineTex.g, pineTex.b));
        if (lum < 0.08) {
          discard;
        }

        // Branch ambient occlusion (deeper shadow near trunk, sunlit tips)
        float branchAO = mix(0.45, 1.15, vFoliageUv.y);
        diffuseColor.rgb = pineTex.rgb * diffuseColor.rgb * 1.55 * branchAO;
        `,
      );
    };

    return mat;
  }, [pineTexture, isDesert]);

  // Rock Material
  const rockMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockTexture,
        roughness: 0.85,
        metalness: 0.05,
        color: isDesert ? new Color('#c29b74') : new Color('#9fa4ab'),
      }),
    [rockTexture, isDesert],
  );

  // Position items on terrain
  const { trees, rocks } = useMemo(() => {
    const { heights, trackMasks, rows, cols } = heightmapData;
    const mapWidth = levelData.terrainBase.width;
    const mapDepth = levelData.terrainBase.depth;

    const getTrackMaskAt = (worldX: number, worldZ: number) => {
      const nx = (worldX + mapWidth / 2) / mapWidth;
      const nz = (worldZ + mapDepth / 2) / mapDepth;
      const x = Math.floor(nx * (cols - 1));
      const z = Math.floor(nz * (rows - 1));
      if (x >= 0 && x < cols && z >= 0 && z < rows) {
        return trackMasks[z * cols + x];
      }
      return 0;
    };

    const treeList: PropItem[] = [];
    const rockList: PropItem[] = [];
    const dummy = new Object3D();

    for (const prop of levelData.props) {
      const [x, originalY, z] = prop.position;
      // Do not spawn on track
      if (getTrackMaskAt(x, z) > 0.1) continue;

      const terrainY = getInterpolatedHeight(x, z, heights, rows, cols, mapWidth, mapDepth);
      // Skip if deep underwater
      if (terrainY < -6.0) continue;

      const isTree = prop.type === 'tree';
      // Anchor firmly into ground slope
      const yOffset = isTree ? -0.25 : -0.2;
      const y = originalY !== 0 ? originalY : terrainY;
      const finalY = y + yOffset;

      dummy.position.set(x, finalY, z);
      dummy.rotation.set(...prop.rotation);
      dummy.scale.set(...prop.scale);
      dummy.updateMatrix();

      const item: PropItem = {
        id: prop.id,
        type: prop.type,
        position: [x, finalY, z],
        rotation: prop.rotation,
        scale: prop.scale,
        matrix: dummy.matrix.clone(),
      };

      if (isTree) {
        treeList.push(item);
      } else {
        rockList.push(item);
      }
    }

    return { trees: treeList, rocks: rockList };
  }, [heightmapData, levelData]);

  const frameCountRef = useRef(0);

  // Dynamic LOD thresholds based on graphics quality (Very High provides vast panoramic draw distance)
  const { lod0DistSq, lod1DistSq } = useMemo(() => {
    switch (graphicsQuality) {
      case 'low':
        return { lod0DistSq: 50 * 50, lod1DistSq: 140 * 140 };
      case 'medium':
        return { lod0DistSq: 80 * 80, lod1DistSq: 200 * 200 };
      case 'high':
        return { lod0DistSq: 110 * 110, lod1DistSq: 280 * 280 };
      case 'very_high':
        return { lod0DistSq: 180 * 180, lod1DistSq: 500 * 500 };
    }
  }, [graphicsQuality]);

  // LOD calculation loop
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    for (const uniforms of foliageShaderUniformsRef.current) {
      if (uniforms.u_time) uniforms.u_time.value = time;
    }

    frameCountRef.current++;
    if (frameCountRef.current % 8 !== 0) return;

    const camPos = state.camera.position;
    if (!lastUpdatePos.current) lastUpdatePos.current = new Vector3();
    if (camPos.distanceToSquared(lastUpdatePos.current) < 4) return;
    lastUpdatePos.current.copy(camPos);

    // Update Trees (Trunk & Foliage LOD)
    if (
      trunkLOD0Ref.current &&
      trunkLOD1Ref.current &&
      foliageLOD0Ref.current &&
      foliageLOD1Ref.current
    ) {
      let t0 = 0;
      let t1 = 0;
      for (let i = 0; i < trees.length; i++) {
        const [px, py, pz] = trees[i].position;
        const distSq = (camPos.x - px) ** 2 + (camPos.y - py) ** 2 + (camPos.z - pz) ** 2;
        if (distSq < lod0DistSq) {
          trunkLOD0Ref.current.setMatrixAt(t0, trees[i].matrix);
          foliageLOD0Ref.current.setMatrixAt(t0, trees[i].matrix);
          t0++;
        } else if (distSq < lod1DistSq) {
          trunkLOD1Ref.current.setMatrixAt(t1, trees[i].matrix);
          foliageLOD1Ref.current.setMatrixAt(t1, trees[i].matrix);
          t1++;
        }
      }
      trunkLOD0Ref.current.count = t0;
      trunkLOD0Ref.current.instanceMatrix.needsUpdate = true;
      foliageLOD0Ref.current.count = t0;
      foliageLOD0Ref.current.instanceMatrix.needsUpdate = true;

      trunkLOD1Ref.current.count = t1;
      trunkLOD1Ref.current.instanceMatrix.needsUpdate = true;
      foliageLOD1Ref.current.count = t1;
      foliageLOD1Ref.current.instanceMatrix.needsUpdate = true;
    }

    // Update Rocks LOD
    if (rockLOD0Ref.current && rockLOD1Ref.current) {
      let r0 = 0;
      let r1 = 0;
      for (let i = 0; i < rocks.length; i++) {
        const [px, py, pz] = rocks[i].position;
        const distSq = (camPos.x - px) ** 2 + (camPos.y - py) ** 2 + (camPos.z - pz) ** 2;
        if (distSq < lod0DistSq) {
          rockLOD0Ref.current.setMatrixAt(r0, rocks[i].matrix);
          r0++;
        } else if (distSq < lod1DistSq) {
          rockLOD1Ref.current.setMatrixAt(r1, rocks[i].matrix);
          r1++;
        }
      }
      rockLOD0Ref.current.count = r0;
      rockLOD0Ref.current.instanceMatrix.needsUpdate = true;

      rockLOD1Ref.current.count = r1;
      rockLOD1Ref.current.instanceMatrix.needsUpdate = true;
    }
  });

  const canShadow = graphicsQuality !== 'low';

  return (
    <>
      {/* Static Compound Physics Colliders for Props */}
      <RigidBody type="fixed" colliders={false}>
        {/* Tree Trunk Colliders */}
        {trees.map((t) => (
          <CylinderCollider
            key={t.id}
            args={[1.4 * t.scale[1], 0.3 * t.scale[0]]}
            position={[t.position[0], t.position[1] + 1.4 * t.scale[1], t.position[2]]}
            rotation={t.rotation}
            friction={0.8}
            restitution={0.05}
          />
        ))}

        {/* Rock Boulder Colliders */}
        {rocks.map((r) => (
          <BallCollider
            key={r.id}
            args={[0.8 * r.scale[0]]}
            position={[r.position[0], r.position[1] + 0.45 * r.scale[1], r.position[2]]}
            rotation={r.rotation}
            friction={0.9}
            restitution={0.05}
          />
        ))}
      </RigidBody>

      {/* Visual Trees LOD 0 (Close - Shadows) */}
      <instancedMesh
        ref={trunkLOD0Ref}
        args={[trunkGeometry, trunkMaterial, trees.length]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={foliageLOD0Ref}
        args={[foliageGeometry, foliageMaterial, trees.length]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* Visual Trees LOD 1 (Far - No shadows) */}
      <instancedMesh
        ref={trunkLOD1Ref}
        args={[trunkGeometry, trunkMaterial, trees.length]}
        receiveShadow={false}
        frustumCulled
      />
      <instancedMesh
        ref={foliageLOD1Ref}
        args={[foliageGeometry, foliageMaterial, trees.length]}
        receiveShadow={false}
        frustumCulled
      />

      {/* Visual Rocks LOD 0 */}
      <instancedMesh
        ref={rockLOD0Ref}
        args={[rockGeometry, rockMaterial, rocks.length]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* Visual Rocks LOD 1 */}
      <instancedMesh
        ref={rockLOD1Ref}
        args={[rockGeometry, rockMaterial, rocks.length]}
        receiveShadow={false}
        frustumCulled
      />
    </>
  );
}


