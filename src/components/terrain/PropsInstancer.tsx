import { useRef, useState, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  CylinderCollider,
  BallCollider,
  CuboidCollider,
} from '@react-three/rapier';
import {
  InstancedMesh,
  Object3D,
  Color,
  Matrix4,
  Vector3,
  Quaternion,
  Sphere,
  BufferGeometry,
  CylinderGeometry,
  BoxGeometry,
  Float32BufferAttribute,
  TorusGeometry,
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
import { useGameStore } from '@/store/gameStore';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';
import type { PropType } from '@/types/level';

// Global bounding sphere for frustum culling optimization
const GLOBAL_BOUNDING_SPHERE = new Sphere(new Vector3(0, 0, 0), 1200);

// Scratch objects for zero-GC loops
const _scratchDummy = new Object3D();

// ─────────────────────────────────────────────────────────────────────────────
// 1. PINE / EVERGREEN GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an organic conifer tree trunk geometry with a flared root base
 * extending from underground (Y = -0.7) to top apex (Y = 4.2).
 */
export function createTrunkGeometry(): BufferGeometry {
  const trunk = new CylinderGeometry(0.04, 0.40, 4.9, 12, 8);
  trunk.translate(0, 1.75, 0);

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

    // Secondary interior filler needles
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

  // Top crown needle apex
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. BIRCH / DECIDUOUS BROADLEAF GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an organic European Birch / Broadleaf trunk with natural tapering.
 */
export function createBirchTrunkGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const mainTrunk = new CylinderGeometry(0.12, 0.30, 3.0, 10, 6);
  mainTrunk.translate(0, 0.9, 0);

  const pos = mainTrunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const flare = y < 0.2 ? Math.max(0, (0.2 - y) * 0.35) : 0;
    const lean = Math.sin(y * 0.9) * 0.06;
    pos.setXYZ(i, x * (1 + flare) + lean, y, z * (1 + flare));
  }
  mainTrunk.computeVertexNormals();

  const uvs = mainTrunk.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setY(i, uvs.getY(i) * 3.5);
  }
  parts.push(mainTrunk);

  const branchConfigs = [
    { radiusTop: 0.04, radiusBottom: 0.09, length: 1.4, rotZ: 0.28, rotX: 0.12, posX: 0.22, posY: 2.5, posZ: 0.10 },
    { radiusTop: 0.03, radiusBottom: 0.08, length: 1.3, rotZ: -0.30, rotX: -0.15, posX: -0.20, posY: 2.45, posZ: -0.12 },
    { radiusTop: 0.03, radiusBottom: 0.08, length: 1.2, rotZ: -0.08, rotX: 0.30, posX: 0.04, posY: 2.55, posZ: 0.22 },
  ];

  for (const cfg of branchConfigs) {
    const branch = new CylinderGeometry(cfg.radiusTop, cfg.radiusBottom, cfg.length, 6, 3);
    branch.rotateZ(cfg.rotZ);
    branch.rotateX(cfg.rotX);
    branch.translate(cfg.posX, cfg.posY, cfg.posZ);
    branch.computeVertexNormals();
    parts.push(branch);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a lush volumetric rounded leafy canopy for Broadleaf / Birch trees.
 */
export function createBirchFoliageGeometry(): BufferGeometry {
  const cards: BufferGeometry[] = [];

  const clusterPositions = [
    { x: 0.6, y: 2.1, z: 0.3, size: 2.2 },
    { x: -0.6, y: 2.0, z: -0.3, size: 2.2 },
    { x: 0.1, y: 2.2, z: 0.6, size: 2.0 },
    { x: -0.2, y: 2.1, z: -0.6, size: 2.0 },
    { x: 0.0, y: 3.0, z: 0.0, size: 2.8 },
    { x: 0.8, y: 3.1, z: 0.4, size: 2.4 },
    { x: -0.7, y: 2.9, z: -0.4, size: 2.4 },
    { x: 0.3, y: 3.2, z: -0.7, size: 2.2 },
    { x: -0.3, y: 3.0, z: 0.7, size: 2.2 },
    { x: 0.0, y: 4.1, z: 0.0, size: 2.2 },
    { x: 0.4, y: 3.8, z: -0.3, size: 1.9 },
    { x: -0.4, y: 3.9, z: 0.3, size: 1.9 },
  ];

  for (const cl of clusterPositions) {
    for (let a = 0; a < 3; a++) {
      const angle = (a * Math.PI) / 3;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const halfW = cl.size * 0.5;
      const halfH = cl.size * 0.5;

      const v0x = cl.x - c * halfW, v0y = cl.y - halfH, v0z = cl.z - s * halfW;
      const v1x = cl.x + c * halfW, v1y = cl.y - halfH, v1z = cl.z + s * halfW;
      const v2x = cl.x + c * halfW, v2y = cl.y + halfH, v2z = cl.z + s * halfW;
      const v3x = cl.x - c * halfW, v3y = cl.y + halfH, v3z = cl.z - s * halfW;

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
      cards.push(cardGeo);
    }
  }

  const merged = BufferGeometryUtils.mergeGeometries(cards);
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DESERT ARID TREE / AFRICAN UMBRELLA ACACIA GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an authentic African Umbrella Acacia (Acacia Tortilis) trunk geometry.
 * The curving gnarled trunk forks smoothly at Y = 2.0m into upward-arching structural boughs
 * that seamlessly terminate inside the canopy discs (no cut stumps or disconnected branches).
 */
export function createDesertTrunkGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main lower gnarled trunk from underground (Y = -0.6m) to fork (Y = 2.0m)
  const trunk = new CylinderGeometry(0.24, 0.44, 2.7, 10, 8);
  trunk.translate(0, 0.75, 0);

  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const flare = y < 0.2 ? Math.max(0, (0.2 - y) * 0.4) : 0;
    const twist = Math.sin(y * 1.6) * 0.14;
    pos.setXYZ(i, x * (1 + flare) + twist, y, z * (1 + flare) + twist * 0.6);
  }
  trunk.computeVertexNormals();

  const uvs = trunk.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setY(i, uvs.getY(i) * 3.0);
  }
  parts.push(trunk);

  // Upward-arching structural boughs anchored firmly into trunk fork
  const boughVectors = [
    { start: new Vector3(0.05, 1.95, 0.05), end: new Vector3(1.65, 3.65, 0.45), rBottom: 0.16, rTop: 0.05 },
    { start: new Vector3(-0.05, 1.95, -0.05), end: new Vector3(-1.60, 3.55, -0.35), rBottom: 0.15, rTop: 0.05 },
    { start: new Vector3(0.02, 1.98, 0.06), end: new Vector3(0.35, 3.75, 1.55), rBottom: 0.14, rTop: 0.04 },
    { start: new Vector3(-0.04, 1.98, -0.06), end: new Vector3(-0.40, 3.65, -1.45), rBottom: 0.14, rTop: 0.04 },
    { start: new Vector3(0.0, 2.0, 0.0), end: new Vector3(0.08, 3.95, 0.08), rBottom: 0.13, rTop: 0.05 },
  ];

  for (const b of boughVectors) {
    const dir = new Vector3().subVectors(b.end, b.start);
    const len = dir.length();
    const branchGeo = new CylinderGeometry(b.rTop, b.rBottom, len, 8, 4);

    branchGeo.translate(0, len / 2, 0);

    const up = new Vector3(0, 1, 0);
    const quat = new Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    branchGeo.applyQuaternion(quat);
    branchGeo.translate(b.start.x, b.start.y, b.start.z);

    const bPos = branchGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const y = bPos.getY(i);
      const wobble = Math.sin(y * 2.5) * 0.035;
      bPos.setX(i, bPos.getX(i) + wobble);
      bPos.setZ(i, bPos.getZ(i) + wobble * 0.7);
    }
    branchGeo.computeVertexNormals();

    const bUvs = branchGeo.attributes.uv;
    for (let i = 0; i < bUvs.count; i++) {
      bUvs.setY(i, bUvs.getY(i) * 2.5);
    }
    parts.push(branchGeo);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates multi-tiered flat umbrella canopy discs with fine bipinnate feathery acacia leaves.
 */
export function createDesertFoliageGeometry(): BufferGeometry {
  const cards: BufferGeometry[] = [];

  const clusters = [
    { x: 0.08, y: 4.0, z: 0.08, width: 3.5, depth: 3.3, count: 5 },
    { x: 1.65, y: 3.7, z: 0.45, width: 2.7, depth: 2.5, count: 4 },
    { x: -1.60, y: 3.6, z: -0.35, width: 2.7, depth: 2.5, count: 4 },
    { x: 0.35, y: 3.8, z: 1.55, width: 2.4, depth: 2.3, count: 4 },
    { x: -0.40, y: 3.7, z: -1.45, width: 2.4, depth: 2.3, count: 4 },
  ];

  for (const cl of clusters) {
    for (let a = 0; a < cl.count; a++) {
      const angle = (a * Math.PI) / cl.count + cl.x * 0.5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const halfW = (cl.width * 0.5) * (0.9 + ((a * 7) % 3) * 0.1);
      const halfL = (cl.depth * 0.5) * (0.9 + ((a * 5) % 3) * 0.1);

      const dipY = 0.12;

      // Horizontal disc card
      const v0x = cl.x - c * halfW, v0y = cl.y - dipY, v0z = cl.z - s * halfL;
      const v1x = cl.x + c * halfW, v1y = cl.y - dipY, v1z = cl.z + s * halfL;
      const v2x = cl.x + c * halfW * 0.7, v2y = cl.y + 0.18, v2z = cl.z + s * halfL * 0.7;
      const v3x = cl.x - c * halfW * 0.7, v3y = cl.y + 0.18, v3z = cl.z - s * halfL * 0.7;

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
      cards.push(cardGeo);

      // Vertical skirt card crossing through to envelope branch tip
      const vertAngle = angle + Math.PI * 0.5;
      const vc = Math.cos(vertAngle) * halfW * 0.8;
      const vs = Math.sin(vertAngle) * halfL * 0.8;
      const skirtH = 0.55;

      const sv0x = cl.x - vc, sv0y = cl.y - skirtH, sv0z = cl.z - vs;
      const sv1x = cl.x + vc, sv1y = cl.y - skirtH, sv1z = cl.z + vs;
      const sv2x = cl.x + vc, sv2y = cl.y + 0.2, sv2z = cl.z + vs;
      const sv3x = cl.x - vc, sv3y = cl.y + 0.2, sv3z = cl.z - vs;

      const sverts = new Float32Array([
        sv0x, sv0y, sv0z,  sv1x, sv1y, sv1z,  sv2x, sv2y, sv2z,
        sv0x, sv0y, sv0z,  sv2x, sv2y, sv2z,  sv3x, sv3y, sv3z,
      ]);
      const suvs = new Float32Array([
        0, 0,  1, 0,  1, 1,
        0, 0,  1, 1,  0, 1,
      ]);

      const skirtGeo = new BufferGeometry();
      skirtGeo.setAttribute('position', new Float32BufferAttribute(sverts, 3));
      skirtGeo.setAttribute('uv', new Float32BufferAttribute(suvs, 2));
      skirtGeo.computeVertexNormals();
      cards.push(skirtGeo);
    }
  }

  const merged = BufferGeometryUtils.mergeGeometries(cards);
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROCK & BOULDER GEOMETRIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a high-fidelity faceted granite boulder geometry with natural fractures.
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

  const uvs = rock.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setX(i, uvs.getX(i) * 1.8);
    uvs.setY(i, uvs.getY(i) * 1.8);
  }

  return rock;
}

/**
 * Creates a layered sandstone slab / crag geometry for desert environments.
 */
export function createSandstoneRockGeometry(): BufferGeometry {
  const rock = new BoxGeometry(1.6, 0.9, 1.3, 3, 2, 3);
  const pos = rock.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const layer = Math.floor(y * 2.5) * 0.12;
    const jag = Math.sin(x * 4.0) * 0.1;
    pos.setXYZ(i, x + layer + jag, y * 0.9, z + jag * 0.5);
  }

  rock.computeVertexNormals();

  const uvs = rock.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setX(i, uvs.getX(i) * 2.0);
    uvs.setY(i, uvs.getY(i) * 2.0);
  }

  return rock;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RUSTIC CABIN & VILLAGE FENCE GEOMETRIES (Zero-Levitation Ground Anchoring)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the stone foundation (deep underground base) and natural fieldstone chimney.
 * The stone foundation extends from Y = -3.0m to +0.5m to guarantee zero floating on any slope.
 */
export function createCabinStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Deep stone foundation base (from Y = -3.0m to +0.5m)
  const foundation = new BoxGeometry(6.4, 3.5, 8.4);
  foundation.translate(0, -1.25, 0.0);
  const fUvs = foundation.attributes.uv;
  for (let i = 0; i < fUvs.count; i++) {
    fUvs.setXY(i, fUvs.getX(i) * 2.5, fUvs.getY(i) * 2.0);
  }
  parts.push(foundation);

  // Fieldstone chimney on side (from Y = -1.0m to +5.8m)
  const chimney = new BoxGeometry(1.15, 6.8, 1.15);
  chimney.translate(3.1, 2.4, 0.4);
  const cUvs = chimney.attributes.uv;
  for (let i = 0; i < cUvs.count; i++) {
    cUvs.setXY(i, cUvs.getX(i) * 1.5, cUvs.getY(i) * 3.5);
  }
  parts.push(chimney);

  // Chimney stone cap
  const chimneyCap = new BoxGeometry(1.35, 0.22, 1.35);
  chimneyCap.translate(3.1, 5.85, 0.4);
  parts.push(chimneyCap);

  // Front stone entrance steps
  const step = new BoxGeometry(2.4, 0.35, 1.2);
  step.translate(0, 0.25, 5.2);
  parts.push(step);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Helper to construct a solid 3D triangular gable wall prism for cabin ends.
 */
function createGablePrismGeometry(
  xHalf: number,
  yBase: number,
  yPeak: number,
  zFront: number,
  zBack: number,
): BufferGeometry {
  const geo = new BufferGeometry();

  const zF = Math.max(zFront, zBack);
  const zB = Math.min(zFront, zBack);
  const thickness = zF - zB;

  const dy = yPeak - yBase;
  const len = Math.hypot(dy, xHalf);
  const nx = dy / len;
  const ny = xHalf / len;

  const positions: number[] = [
    // 0..2: Front face
    -xHalf, yBase, zF,
     xHalf, yBase, zF,
     0,     yPeak, zF,

    // 3..5: Back face
     xHalf, yBase, zB,
    -xHalf, yBase, zB,
     0,     yPeak, zB,

    // 6..9: Left slope
    -xHalf, yBase, zB,
    -xHalf, yBase, zF,
     0,     yPeak, zF,
     0,     yPeak, zB,

    // 10..13: Right slope
     xHalf, yBase, zF,
     xHalf, yBase, zB,
     0,     yPeak, zB,
     0,     yPeak, zF,

    // 14..17: Bottom face
    -xHalf, yBase, zF,
    -xHalf, yBase, zB,
     xHalf, yBase, zB,
     xHalf, yBase, zF,
  ];

  const normals: number[] = [
    // Front face
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    // Back face
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    // Left slope
    -nx, ny, 0,
    -nx, ny, 0,
    -nx, ny, 0,
    -nx, ny, 0,

    // Right slope
    nx, ny, 0,
    nx, ny, 0,
    nx, ny, 0,
    nx, ny, 0,

    // Bottom face
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
  ];

  const uvs: number[] = [
    // Front face
    0.0, 0.0,
    2.0, 0.0,
    1.0, 1.3,

    // Back face
    2.0, 0.0,
    0.0, 0.0,
    1.0, 1.3,

    // Left slope
    0.0, 0.0,
    thickness * 2, 0.0,
    thickness * 2, 1.3,
    0.0, 1.3,

    // Right slope
    0.0, 0.0,
    thickness * 2, 0.0,
    thickness * 2, 1.3,
    0.0, 1.3,

    // Bottom face
    0.0, 0.0,
    0.0, thickness * 2,
    2.0, thickness * 2,
    2.0, 0.0,
  ];

  const indices: number[] = [
    // Front face
    0, 1, 2,
    // Back face
    3, 4, 5,
    // Left slope
    6, 7, 8,
    6, 8, 9,
    // Right slope
    10, 11, 12,
    10, 12, 13,
    // Bottom face
    14, 15, 16,
    14, 16, 17,
  ];

  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  return geo;
}

/**
 * Creates the timber cabin walls, front porch, corner notch logs, structural beams, and gable attic walls.
 */
export function createCabinWallGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main timber walls (from Y = +0.5 to Y = +3.4)
  const walls = new BoxGeometry(6.0, 2.9, 8.0);
  walls.translate(0, 1.95, 0);
  const wUvs = walls.attributes.uv;
  for (let i = 0; i < wUvs.count; i++) {
    wUvs.setXY(i, wUvs.getX(i) * 2.0, wUvs.getY(i) * 2.0);
  }
  parts.push(walls);

  // Front triangular gable attic wall (closes space under roof from Y = 3.4 to 5.35, supporting upper window)
  const frontGable = createGablePrismGeometry(3.0, 3.4, 5.35, 4.0, 3.75);
  parts.push(frontGable);

  // Rear triangular gable attic wall
  const rearGable = createGablePrismGeometry(3.0, 3.4, 5.35, -3.75, -4.0);
  parts.push(rearGable);

  // Decorative horizontal timber frieze beams separating ground floor from gable attic
  const frontFriezeBeam = new BoxGeometry(6.1, 0.16, 0.16);
  frontFriezeBeam.translate(0, 3.4, 4.02);
  parts.push(frontFriezeBeam);

  const rearFriezeBeam = new BoxGeometry(6.1, 0.16, 0.16);
  rearFriezeBeam.translate(0, 3.4, -4.02);
  parts.push(rearFriezeBeam);

  // Front entrance porch timber deck
  const porchDeck = new BoxGeometry(6.0, 0.25, 1.8);
  porchDeck.translate(0, 0.55, 4.8);
  parts.push(porchDeck);

  // Front porch support posts
  const postL = new BoxGeometry(0.2, 2.8, 0.2);
  postL.translate(-2.7, 1.9, 5.5);
  parts.push(postL);

  const postR = new BoxGeometry(0.2, 2.8, 0.2);
  postR.translate(2.7, 1.9, 5.5);
  parts.push(postR);

  // Porch header beam
  const headerBeam = new BoxGeometry(6.0, 0.25, 0.25);
  headerBeam.translate(0, 3.25, 5.5);
  parts.push(headerBeam);

  // 4 Corner vertical interlocking timber log columns
  const corners = [
    { x: -3.0, z: -4.0 },
    { x: 3.0, z: -4.0 },
    { x: -3.0, z: 4.0 },
    { x: 3.0, z: 4.0 },
  ];
  for (const c of corners) {
    const col = new BoxGeometry(0.35, 3.0, 0.35);
    col.translate(c.x, 1.95, c.z);
    parts.push(col);
  }

  // Rafter tails under roof eaves
  for (let r = -3.8; r <= 3.8; r += 1.2) {
    const rafterL = new BoxGeometry(0.12, 0.12, 0.12);
    rafterL.translate(-3.2, 3.4, r);
    parts.push(rafterL);

    const rafterR = new BoxGeometry(0.12, 0.12, 0.12);
    rafterR.translate(3.2, 3.4, r);
    parts.push(rafterR);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates the textured wooden entrance door with iron fittings.
 */
export function createCabinDoorGeometry(): BufferGeometry {
  const door = new BoxGeometry(1.3, 2.2, 0.08);
  door.translate(0, 1.65, 4.05);

  const uvs = door.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i), uvs.getY(i));
  }

  return door;
}

/**
 * Creates photorealistic 3D rustic windows with glass reflection textures and wooden frames.
 */
export function createCabinWindowGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Front Left window
  const winFL = new BoxGeometry(1.1, 1.2, 0.08);
  winFL.translate(-1.85, 2.05, 4.05);
  parts.push(winFL);

  // Front Right window
  const winFR = new BoxGeometry(1.1, 1.2, 0.08);
  winFR.translate(1.85, 2.05, 4.05);
  parts.push(winFR);

  // Side Left window
  const winSL = new BoxGeometry(0.08, 1.2, 1.3);
  winSL.translate(-3.05, 2.05, -0.5);
  parts.push(winSL);

  // Side Right window
  const winSR = new BoxGeometry(0.08, 1.2, 1.3);
  winSR.translate(3.05, 2.05, -1.8);
  parts.push(winSR);

  // Upper Gable window
  const winGable = new BoxGeometry(0.9, 0.9, 0.08);
  winGable.translate(0, 4.25, 4.05);
  parts.push(winGable);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a pitched A-frame roof with overhanging eaves, fascia trim, and gable walls.
 */
export function createCabinRoofGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Left roof slope (deep 0.8m overhang)
  const leftRoof = new BoxGeometry(4.3, 0.16, 10.0);
  leftRoof.rotateZ(0.56);
  leftRoof.translate(-1.75, 4.3, 0.4);
  const lUvs = leftRoof.attributes.uv;
  for (let i = 0; i < lUvs.count; i++) {
    lUvs.setXY(i, lUvs.getX(i) * 3.5, lUvs.getY(i) * 3.5);
  }
  parts.push(leftRoof);

  // Right roof slope
  const rightRoof = new BoxGeometry(4.3, 0.16, 10.0);
  rightRoof.rotateZ(-0.56);
  rightRoof.translate(1.75, 4.3, 0.4);
  const rUvs = rightRoof.attributes.uv;
  for (let i = 0; i < rUvs.count; i++) {
    rUvs.setXY(i, rUvs.getX(i) * 3.5, rUvs.getY(i) * 3.5);
  }
  parts.push(rightRoof);

  // Ridge cap beam
  const ridge = new BoxGeometry(0.38, 0.22, 10.2);
  ridge.translate(0, 5.45, 0.4);
  parts.push(ridge);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a rustic split-rail wooden fence segment with deep underground post anchors.
 */
export function createFenceGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Left post: deep anchor from Y = -1.2m to Y = +1.15m
  const postL = new BoxGeometry(0.18, 2.35, 0.18);
  postL.translate(-1.6, -0.02, 0);
  parts.push(postL);

  // Right post: deep anchor
  const postR = new BoxGeometry(0.18, 2.35, 0.18);
  postR.translate(1.6, -0.02, 0);
  parts.push(postR);

  // Lower rail
  const railBottom = new BoxGeometry(3.35, 0.12, 0.08);
  railBottom.translate(0, 0.45, 0);
  parts.push(railBottom);

  // Upper rail
  const railTop = new BoxGeometry(3.35, 0.12, 0.08);
  railTop.translate(0, 0.88, 0);
  parts.push(railTop);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a monumental medieval round castle keep / ruined bastion tower.
 * Features deep subterranean foundation (from Y = -3.5m to guarantee zero floating on any slope),
 * thick defensive stone cylinder (Y = -3.5m to 8.5m), crumbling battlements / crenellations (Y = 8.5m to 10.2m),
 * arrow loops, and weathered stone corbels.
 */
export function createCastleTowerGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main tower cylinder (radius 3.2m, height 12.0m from Y = -3.5m to +8.5m)
  const tower = new CylinderGeometry(3.1, 3.4, 12.0, 16, 6);
  tower.translate(0, 2.5, 0);
  const tUvs = tower.attributes.uv;
  for (let i = 0; i < tUvs.count; i++) {
    tUvs.setXY(i, tUvs.getX(i) * 3.5, tUvs.getY(i) * 3.5);
  }
  parts.push(tower);

  // Upper projecting parapet corbel ring
  const corbelRing = new CylinderGeometry(3.45, 3.1, 0.6, 16, 1);
  corbelRing.translate(0, 8.4, 0);
  parts.push(corbelRing);

  // Parapet floor deck
  const deck = new CylinderGeometry(3.3, 3.3, 0.3, 16, 1);
  deck.translate(0, 8.7, 0);
  parts.push(deck);

  // Battlement merlons (crenellations) around the rim, with one side broken/ruined
  const numMerlons = 8;
  for (let i = 0; i < numMerlons; i++) {
    // Leave 2 merlons missing on the ruined side
    if (i === 4 || i === 5) continue;
    const angle = (i / numMerlons) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const merlon = new BoxGeometry(1.2, 1.2, 0.5);
    merlon.rotateY(-angle);
    merlon.translate(c * 3.15, 9.4, s * 3.15);
    parts.push(merlon);
  }

  // Ruined fallen debris / stone pile at the base on one side
  const debris1 = new BoxGeometry(1.6, 0.9, 1.4);
  debris1.rotateY(0.4);
  debris1.translate(2.4, 0.45, 2.1);
  parts.push(debris1);

  const debris2 = new BoxGeometry(1.2, 0.7, 1.1);
  debris2.rotateY(-0.6);
  debris2.translate(2.8, 0.35, 1.1);
  parts.push(debris2);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a weathered medieval fortress curtain wall segment.
 * Extends from Y = -3.5m deep foundation to Y = +5.2m walkway with battlements,
 * structural buttresses, and crenellated stone parapet.
 */
export function createCastleWallGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main thick curtain wall (Length 8.0m, Height 8.5m from Y = -3.5m to +5.0m, Width 1.6m)
  const wall = new BoxGeometry(8.0, 8.5, 1.6);
  wall.translate(0, 0.75, 0);
  const wUvs = wall.attributes.uv;
  for (let i = 0; i < wUvs.count; i++) {
    wUvs.setXY(i, wUvs.getX(i) * 3.0, wUvs.getY(i) * 2.5);
  }
  parts.push(wall);

  // Walkway parapet merlons on outer edge (Z = +0.65m)
  for (let x = -3.2; x <= 3.2; x += 1.8) {
    const merlon = new BoxGeometry(1.1, 1.0, 0.35);
    merlon.translate(x, 5.5, 0.65);
    parts.push(merlon);
  }

  // Supporting stone wall buttresses on exterior face
  const buttressL = new BoxGeometry(0.8, 6.0, 0.7);
  buttressL.translate(-2.5, 0.5, 1.0);
  parts.push(buttressL);

  const buttressR = new BoxGeometry(0.8, 6.0, 0.7);
  buttressR.translate(2.5, 0.5, 1.0);
  parts.push(buttressR);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a monumental Gothic castle gatehouse / barbican archway.
 * Features two flanking round watchtowers and a grand stone arch spanning 5.4m,
 * allowing vehicles to pass underneath into the castle courtyard.
 */
export function createCastleGateGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Left flanking gate tower (from Y = -3.5m to +8.5m, radius 1.7m)
  const towerL = new CylinderGeometry(1.6, 1.8, 12.0, 12, 4);
  towerL.translate(-3.6, 2.5, 0);
  parts.push(towerL);

  // Right flanking gate tower
  const towerR = new CylinderGeometry(1.6, 1.8, 12.0, 12, 4);
  towerR.translate(3.6, 2.5, 0);
  parts.push(towerR);

  // Tower battlements (left & right)
  const capL = new CylinderGeometry(1.85, 1.6, 0.4, 12, 1);
  capL.translate(-3.6, 8.4, 0);
  parts.push(capL);

  const capR = new CylinderGeometry(1.85, 1.6, 0.4, 12, 1);
  capR.translate(3.6, 8.4, 0);
  parts.push(capR);

  for (let a = 0; a < 4; a++) {
    const angle = (a / 4) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const mL = new BoxGeometry(0.7, 0.8, 0.35);
    mL.rotateY(-angle);
    mL.translate(-3.6 + c * 1.6, 9.0, s * 1.6);
    parts.push(mL);

    const mR = new BoxGeometry(0.7, 0.8, 0.35);
    mR.rotateY(-angle);
    mR.translate(3.6 + c * 1.6, 9.0, s * 1.6);
    parts.push(mR);
  }

  // Stone archway span header connecting the towers above the road (Y = 4.0m to 6.8m)
  const archHeader = new BoxGeometry(4.4, 2.8, 1.8);
  archHeader.translate(0, 5.4, 0);
  parts.push(archHeader);

  // Top parapet above arch
  for (let x = -1.4; x <= 1.4; x += 1.4) {
    const merlon = new BoxGeometry(0.9, 0.8, 0.35);
    merlon.translate(x, 7.2, 0.75);
    parts.push(merlon);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a traditional British / Scottish dry-stone dyke wall segment.
 * Deep subterranean foundation (Y = -2.0m) with rough fieldstone profile.
 */
export function createStoneWallGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main stone wall body (Length 6.2m, Height 3.2m from Y = -2.0m to +1.2m, Thickness 0.55m)
  const wall = new BoxGeometry(6.2, 3.2, 0.55);
  wall.translate(0, -0.4, 0);
  const uvs = wall.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * 2.5, uvs.getY(i) * 1.5);
  }
  parts.push(wall);

  // Rounded top stone coping
  const coping = new BoxGeometry(6.3, 0.22, 0.65);
  coping.translate(0, 1.25, 0);
  parts.push(coping);

  // Vertical stone pier posts on ends
  const postL = new BoxGeometry(0.7, 3.5, 0.7);
  postL.translate(-3.0, -0.3, 0);
  parts.push(postL);

  const postR = new BoxGeometry(0.7, 3.5, 0.7);
  postR.translate(3.0, -0.3, 0);
  parts.push(postR);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a monumental 4-story rectangular medieval donjon keep / castle citadel.
 * Features 4 corner defensive turrets, crenellated roof battlements, arched windows,
 * and deep subterranean foundation anchoring.
 */
export function createCastleKeepGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Main square keep block (Width 14m, Depth 14m, Height 18m from Y = -3.5m to +14.5m)
  const mainKeep = new BoxGeometry(14.0, 18.0, 14.0);
  mainKeep.translate(0, 5.5, 0);
  const kUvs = mainKeep.attributes.uv;
  for (let i = 0; i < kUvs.count; i++) {
    kUvs.setXY(i, kUvs.getX(i) * 3.5, kUvs.getY(i) * 3.5);
  }
  parts.push(mainKeep);

  // 4 Corner round bastion turrets (extending up to Y = +17.2m)
  const turretOffsets = [
    [-6.8, -6.8],
    [6.8, -6.8],
    [-6.8, 6.8],
    [6.8, 6.8],
  ];

  for (const [tx, tz] of turretOffsets) {
    const turret = new CylinderGeometry(2.1, 2.3, 21.0, 12, 4);
    turret.translate(tx, 7.0, tz);
    const tUvs = turret.attributes.uv;
    for (let i = 0; i < tUvs.count; i++) {
      tUvs.setXY(i, tUvs.getX(i) * 2.5, tUvs.getY(i) * 3.5);
    }
    parts.push(turret);

    // Turret crenellations
    const tCap = new CylinderGeometry(2.35, 2.1, 0.4, 12, 1);
    tCap.translate(tx, 17.2, tz);
    parts.push(tCap);

    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);

      const merlon = new BoxGeometry(0.85, 0.9, 0.4);
      merlon.rotateY(-angle);
      merlon.translate(tx + c * 2.1, 17.8, tz + s * 2.1);
      parts.push(merlon);
    }
  }

  // Parapet roof merlons along all 4 main walls
  for (let x = -5.0; x <= 5.0; x += 2.5) {
    const mNorth = new BoxGeometry(1.4, 1.2, 0.5);
    mNorth.translate(x, 15.1, 6.8);
    parts.push(mNorth);

    const mSouth = new BoxGeometry(1.4, 1.2, 0.5);
    mSouth.translate(x, 15.1, -6.8);
    parts.push(mSouth);

    const mWest = new BoxGeometry(0.5, 1.2, 1.4);
    mWest.translate(-6.8, 15.1, x);
    parts.push(mWest);

    const mEast = new BoxGeometry(0.5, 1.2, 1.4);
    mEast.translate(6.8, 15.1, x);
    parts.push(mEast);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a ruined Gothic stone pointed archway and arcade partition.
 */
export function createCastleArchGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Left column pillar
  const pillarL = new CylinderGeometry(0.5, 0.6, 6.5, 8, 2);
  pillarL.translate(-2.6, 0.75, 0);
  parts.push(pillarL);

  // Right column pillar
  const pillarR = new CylinderGeometry(0.5, 0.6, 6.5, 8, 2);
  pillarR.translate(2.6, 0.75, 0);
  parts.push(pillarR);

  // Arch span header
  const archTop = new BoxGeometry(6.2, 1.2, 0.9);
  archTop.translate(0, 4.2, 0);
  const aUvs = archTop.attributes.uv;
  for (let i = 0; i < aUvs.count; i++) {
    aUvs.setXY(i, aUvs.getX(i) * 2.0, aUvs.getY(i) * 1.0);
  }
  parts.push(archTop);

  // Weathered broken crest stones
  const crest1 = new BoxGeometry(1.2, 0.8, 0.7);
  crest1.translate(-1.0, 5.0, 0);
  parts.push(crest1);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates an ancient Scottish Celtic standing stone megalith / menhir.
 * Monolithic pillar (Width 1.6m, Depth 1.0m, Height 5.5m from Y = -2.0m to +3.5m)
 * with carved Celtic spiral triskele runes on the face.
 */
export function createStandingStoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const pillar = new BoxGeometry(1.6, 5.5, 0.9, 2, 4, 2);
  pillar.translate(0, 0.75, 0);

  const pos = pillar.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const taper = Math.max(0.65, 1.0 - (y / 5.5) * 0.35);
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
  }
  pillar.computeVertexNormals();

  const uvs = pillar.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * 1.5, uvs.getY(i) * 2.0);
  }
  parts.push(pillar);

  const baseRock = new CylinderGeometry(0.8, 1.3, 0.8, 8, 1);
  baseRock.scale(1.4, 0.7, 1.2);
  baseRock.translate(0, 0.2, 0);
  parts.push(baseRock);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates the stone walls, front & rear gables, twin chimneys, door, and windows
 * for a traditional Scottish highland croft cottage.
 * Width across X: 6.0m (from X = -3.0m to +3.0m)
 * Length along Z: 8.0m (from Z = -4.0m to +4.0m)
 * Ground wall height: Y = -1.8m (deep foundation plinth) to Y = +3.0m
 * Peak height: Y = +5.2m
 */
export function createHighlandCottageWallGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // 1. Main stone body (Width 6.0m, Height 4.8m from Y = -1.8m to +3.0m, Length 8.0m)
  const walls = new BoxGeometry(6.0, 4.8, 8.0);
  walls.translate(0, 0.6, 0);
  const uvs = walls.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * 2.0, uvs.getY(i) * 2.0);
  }
  parts.push(walls);

  // 2. Front triangular gable wall (at Z = +4.0m, closes space from Y = 3.0m to 5.2m, across X from -3.0m to +3.0m)
  const frontGable = createGablePrismGeometry(3.0, 3.0, 5.2, 4.0, 3.75);
  parts.push(frontGable);

  // 3. Rear triangular gable wall (at Z = -4.0m, closes space from Y = 3.0m to 5.2m, across X from -3.0m to +3.0m)
  const rearGable = createGablePrismGeometry(3.0, 3.0, 5.2, -3.75, -4.0);
  parts.push(rearGable);

  // 4. Front stone chimney on gable wall (Z = +4.0m, Y = 1.0m to 6.0m)
  const chimneyF = new BoxGeometry(0.9, 5.8, 0.9);
  chimneyF.translate(0, 3.1, 4.05);
  parts.push(chimneyF);

  const potF = new CylinderGeometry(0.2, 0.22, 0.6, 8, 1);
  potF.translate(0, 6.2, 4.05);
  parts.push(potF);

  // 5. Rear stone chimney on gable wall (Z = -4.0m, Y = 1.0m to 6.0m)
  const chimneyR = new BoxGeometry(0.9, 5.8, 0.9);
  chimneyR.translate(0, 3.1, -4.05);
  parts.push(chimneyR);

  const potR = new CylinderGeometry(0.2, 0.22, 0.6, 8, 1);
  potR.translate(0, 6.2, -4.05);
  parts.push(potR);

  // 6. Side entrance wooden door (on +X side, X = +3.02m, Z = 0)
  const door = new BoxGeometry(0.12, 2.2, 1.3);
  door.translate(3.05, 1.4, 0);
  parts.push(door);

  const doorFrame = new BoxGeometry(0.16, 2.35, 1.5);
  doorFrame.translate(3.04, 1.45, 0);
  parts.push(doorFrame);

  // 7. Multi-pane side windows with stone sills & timber frames (on +X side)
  const winF = new BoxGeometry(0.12, 1.2, 1.1);
  winF.translate(3.05, 1.8, 2.2);
  parts.push(winF);

  const sillF = new BoxGeometry(0.22, 0.12, 1.3);
  sillF.translate(3.08, 1.15, 2.2);
  parts.push(sillF);

  const winB = new BoxGeometry(0.12, 1.2, 1.1);
  winB.translate(3.05, 1.8, -2.2);
  parts.push(winB);

  const sillB = new BoxGeometry(0.22, 0.12, 1.3);
  sillB.translate(3.08, 1.15, -2.2);
  parts.push(sillB);

  // 8. Multi-pane side windows on (-X side)
  const winL1 = new BoxGeometry(0.12, 1.2, 1.1);
  winL1.translate(-3.05, 1.8, 2.0);
  parts.push(winL1);

  const winL2 = new BoxGeometry(0.12, 1.2, 1.1);
  winL2.translate(-3.05, 1.8, -2.0);
  parts.push(winL2);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates the traditional Scottish double-pitched thatch / slate roof
 * with overhanging eaves, ridge roll, and timber eave trim.
 */
export function createHighlandCottageRoofGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // 1. Left Roof Slope (rotated around Z by +0.58 rad, sloping from ridge X=0 down to left eave X=-3.5m)
  const leftPitch = new BoxGeometry(4.3, 0.22, 9.2);
  leftPitch.rotateZ(0.58);
  leftPitch.translate(-1.7, 4.15, 0);
  const lUvs = leftPitch.attributes.uv;
  for (let i = 0; i < lUvs.count; i++) {
    lUvs.setXY(i, lUvs.getX(i) * 2.5, lUvs.getY(i) * 3.5);
  }
  parts.push(leftPitch);

  // 2. Right Roof Slope (rotated around Z by -0.58 rad, sloping from ridge X=0 down to right eave X=+3.5m)
  const rightPitch = new BoxGeometry(4.3, 0.22, 9.2);
  rightPitch.rotateZ(-0.58);
  rightPitch.translate(1.7, 4.15, 0);
  const rUvs = rightPitch.attributes.uv;
  for (let i = 0; i < rUvs.count; i++) {
    rUvs.setXY(i, rUvs.getX(i) * 2.5, rUvs.getY(i) * 3.5);
  }
  parts.push(rightPitch);

  // 3. Thick Heather Thatch Ridge Turf Roll along apex (X = 0, Y = 5.35m, Z = -4.7m to +4.7m)
  const ridge = new BoxGeometry(0.42, 0.28, 9.4);
  ridge.translate(0, 5.35, 0);
  parts.push(ridge);

  // 4. Eave Fascia Trim Boards
  const fasciaL = new BoxGeometry(0.12, 0.2, 9.2);
  fasciaL.translate(-3.45, 2.95, 0);
  parts.push(fasciaL);

  const fasciaR = new BoxGeometry(0.12, 0.2, 9.2);
  fasciaR.translate(3.45, 2.95, 0);
  parts.push(fasciaR);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a Scottish highland stone cairn mound with Celtic high cross atop.
 */
export function createStoneCairnGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const mound = new CylinderGeometry(0.4, 2.2, 2.4, 7, 3);
  mound.translate(0, 0.7, 0);
  parts.push(mound);

  const crossShaft = new BoxGeometry(0.32, 2.2, 0.22);
  crossShaft.translate(0, 2.7, 0);
  parts.push(crossShaft);

  const crossBar = new BoxGeometry(1.1, 0.28, 0.22);
  crossBar.translate(0, 3.2, 0);
  parts.push(crossBar);

  const ring = new TorusGeometry(0.42, 0.08, 6, 12);
  ring.translate(0, 3.2, 0);
  parts.push(ring);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a round agricultural golden straw hay bale.
 * Cylinder (Radius 0.75m, Length 1.4m) lying horizontally on its side with binder cords.
 */
export function createHayBaleGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const bale = new CylinderGeometry(0.75, 0.75, 1.4, 12, 1);
  bale.rotateZ(Math.PI / 2);
  bale.translate(0, 0.72, 0);
  const uvs = bale.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * 2.0, uvs.getY(i) * 2.0);
  }
  parts.push(bale);

  const cordL = new TorusGeometry(0.76, 0.02, 6, 12);
  cordL.rotateY(Math.PI / 2);
  cordL.translate(-0.4, 0.72, 0);
  parts.push(cordL);

  const cordR = new TorusGeometry(0.76, 0.02, 6, 12);
  cordR.rotateY(Math.PI / 2);
  cordR.translate(0.4, 0.72, 0);
  parts.push(cordR);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates a roadside rally directional warning arrow signboard.
 */
export function createRallySignGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const post = new BoxGeometry(0.1, 1.8, 0.1);
  post.translate(0, 0.7, 0);
  parts.push(post);

  const board = new BoxGeometry(1.2, 0.65, 0.06);
  board.translate(0, 1.35, 0.06);
  parts.push(board);

  const border = new BoxGeometry(1.26, 0.71, 0.04);
  border.translate(0, 1.35, 0.04);
  parts.push(border);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

/**
 * Creates an ancient arched stone packhorse bridge with double parapets.
 */
export function createStoneBridgeGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const deck = new BoxGeometry(6.8, 1.4, 12.0);
  deck.translate(0, 0.5, 0);
  const uvs = deck.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * 2.0, uvs.getY(i) * 3.0);
  }
  parts.push(deck);

  const parapetL = new BoxGeometry(0.55, 1.1, 12.2);
  parapetL.translate(-3.1, 1.7, 0);
  parts.push(parapetL);

  const parapetR = new BoxGeometry(0.55, 1.1, 12.2);
  parapetR.translate(3.1, 1.7, 0);
  parts.push(parapetR);

  const merged = BufferGeometryUtils.mergeGeometries(parts);
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS INSTANCER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface PropItem {
  id: string;
  type: PropType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  matrix: Matrix4;
}

interface ProximityCollidersProps {
  spatialGrid: Map<string, PropItem[]>;
  initialTrees: PropItem[];
  initialRocks: PropItem[];
  initialCabins: PropItem[];
  initialFences: PropItem[];
  initialCastleTowers: PropItem[];
  initialCastleWalls: PropItem[];
  initialCastleGates: PropItem[];
  initialCastleKeeps: PropItem[];
  initialCastleArches: PropItem[];
  initialStoneWalls: PropItem[];
  initialStandingStones: PropItem[];
  initialHighlandCottages: PropItem[];
  initialStoneCairns: PropItem[];
  initialHayBales: PropItem[];
  initialRallySigns: PropItem[];
  initialStoneBridges: PropItem[];
}

function ProximityColliders({
  spatialGrid,
  initialTrees,
  initialRocks,
  initialCabins,
  initialFences,
  initialCastleTowers,
  initialCastleWalls,
  initialCastleGates,
  initialCastleKeeps,
  initialCastleArches,
  initialStoneWalls,
  initialStandingStones,
  initialHighlandCottages,
  initialStoneCairns,
  initialHayBales,
  initialRallySigns,
  initialStoneBridges,
}: ProximityCollidersProps) {
  const lastCarPosRef = useRef<[number, number]>([-9999, -9999]);
  const activeCollidersRef = useRef<{
    trees: PropItem[];
    rocks: PropItem[];
    cabins: PropItem[];
    fences: PropItem[];
    castleTowers: PropItem[];
    castleWalls: PropItem[];
    castleGates: PropItem[];
    castleKeeps: PropItem[];
    castleArches: PropItem[];
    stoneWalls: PropItem[];
    standingStones: PropItem[];
    highlandCottages: PropItem[];
    stoneCairns: PropItem[];
    hayBales: PropItem[];
    rallySigns: PropItem[];
    stoneBridges: PropItem[];
  }>({
    trees: initialTrees,
    rocks: initialRocks,
    cabins: initialCabins,
    fences: initialFences,
    castleTowers: initialCastleTowers,
    castleWalls: initialCastleWalls,
    castleGates: initialCastleGates,
    castleKeeps: initialCastleKeeps,
    castleArches: initialCastleArches,
    stoneWalls: initialStoneWalls,
    standingStones: initialStandingStones,
    highlandCottages: initialHighlandCottages,
    stoneCairns: initialStoneCairns,
    hayBales: initialHayBales,
    rallySigns: initialRallySigns,
    stoneBridges: initialStoneBridges,
  });
  const [activeColliders, setActiveColliders] = useState(activeCollidersRef.current);
  const lastCellKeyRef = useRef('');

  useFrame(() => {
    const carPos = useGameStore.getState().position;
    const CELL_SIZE = 50;
    const cx = Math.floor(carPos[0] / CELL_SIZE);
    const cz = Math.floor(carPos[2] / CELL_SIZE);
    const cellKey = `${cx}_${cz}`;

    const dx = carPos[0] - lastCarPosRef.current[0];
    const dz = carPos[2] - lastCarPosRef.current[1];

    if (dx * dx + dz * dz > 100 || cellKey !== lastCellKeyRef.current) {
      lastCarPosRef.current[0] = carPos[0];
      lastCarPosRef.current[1] = carPos[2];
      lastCellKeyRef.current = cellKey;

      const nearbyTrees: PropItem[] = [];
      const nearbyRocks: PropItem[] = [];
      const nearbyCabins: PropItem[] = [];
      const nearbyFences: PropItem[] = [];
      const nearbyCastleTowers: PropItem[] = [];
      const nearbyCastleWalls: PropItem[] = [];
      const nearbyCastleGates: PropItem[] = [];
      const nearbyCastleKeeps: PropItem[] = [];
      const nearbyCastleArches: PropItem[] = [];
      const nearbyStoneWalls: PropItem[] = [];
      const nearbyStandingStones: PropItem[] = [];
      const nearbyHighlandCottages: PropItem[] = [];
      const nearbyStoneCairns: PropItem[] = [];
      const nearbyHayBales: PropItem[] = [];
      const nearbyRallySigns: PropItem[] = [];
      const nearbyStoneBridges: PropItem[] = [];

      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const key = `${cx + ox}_${cz + oz}`;
          const cell = spatialGrid.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              const item = cell[i];
              const distSq = (item.position[0] - carPos[0]) ** 2 + (item.position[2] - carPos[2]) ** 2;
              if (distSq < 95 * 95) {
                if (item.type === 'cabin') {
                  nearbyCabins.push(item);
                } else if (item.type === 'fence') {
                  nearbyFences.push(item);
                } else if (item.type === 'castle_tower') {
                  nearbyCastleTowers.push(item);
                } else if (item.type === 'castle_wall') {
                  nearbyCastleWalls.push(item);
                } else if (item.type === 'castle_gate') {
                  nearbyCastleGates.push(item);
                } else if (item.type === 'castle_keep') {
                  nearbyCastleKeeps.push(item);
                } else if (item.type === 'castle_arch') {
                  nearbyCastleArches.push(item);
                } else if (item.type === 'stone_wall') {
                  nearbyStoneWalls.push(item);
                } else if (item.type === 'standing_stone') {
                  nearbyStandingStones.push(item);
                } else if (item.type === 'highland_cottage') {
                  nearbyHighlandCottages.push(item);
                } else if (item.type === 'stone_cairn') {
                  nearbyStoneCairns.push(item);
                } else if (item.type === 'hay_bale') {
                  nearbyHayBales.push(item);
                } else if (item.type === 'rally_sign') {
                  nearbyRallySigns.push(item);
                } else if (item.type === 'stone_bridge') {
                  nearbyStoneBridges.push(item);
                } else if (item.type.startsWith('tree')) {
                  nearbyTrees.push(item);
                } else {
                  nearbyRocks.push(item);
                }
              }
            }
          }
        }
      }

      const prev = activeCollidersRef.current;
      const countChanged =
        prev.trees.length !== nearbyTrees.length ||
        prev.rocks.length !== nearbyRocks.length ||
        prev.cabins.length !== nearbyCabins.length ||
        prev.fences.length !== nearbyFences.length ||
        prev.castleTowers.length !== nearbyCastleTowers.length ||
        prev.castleWalls.length !== nearbyCastleWalls.length ||
        prev.castleGates.length !== nearbyCastleGates.length ||
        prev.castleKeeps.length !== nearbyCastleKeeps.length ||
        prev.castleArches.length !== nearbyCastleArches.length ||
        prev.stoneWalls.length !== nearbyStoneWalls.length ||
        prev.standingStones.length !== nearbyStandingStones.length ||
        prev.highlandCottages.length !== nearbyHighlandCottages.length ||
        prev.stoneCairns.length !== nearbyStoneCairns.length ||
        prev.hayBales.length !== nearbyHayBales.length ||
        prev.rallySigns.length !== nearbyRallySigns.length ||
        prev.stoneBridges.length !== nearbyStoneBridges.length;

      let changed = countChanged;
      if (!changed && nearbyTrees.length > 0 && nearbyTrees[0].id !== prev.trees[0]?.id) {
        changed = true;
      }

      if (changed) {
        const nextColliders = {
          trees: nearbyTrees,
          rocks: nearbyRocks,
          cabins: nearbyCabins,
          fences: nearbyFences,
          castleTowers: nearbyCastleTowers,
          castleWalls: nearbyCastleWalls,
          castleGates: nearbyCastleGates,
          castleKeeps: nearbyCastleKeeps,
          castleArches: nearbyCastleArches,
          stoneWalls: nearbyStoneWalls,
          standingStones: nearbyStandingStones,
          highlandCottages: nearbyHighlandCottages,
          stoneCairns: nearbyStoneCairns,
          hayBales: nearbyHayBales,
          rallySigns: nearbyRallySigns,
          stoneBridges: nearbyStoneBridges,
        };
        activeCollidersRef.current = nextColliders;
        setActiveColliders(nextColliders);
      }
    }
  });

  return (
    <RigidBody type="fixed" colliders={false}>
      {activeColliders.trees.map((t) => (
        <CylinderCollider
          key={t.id}
          args={[1.4 * t.scale[1], 0.35 * t.scale[0]]}
          position={[t.position[0], t.position[1] + 1.4 * t.scale[1], t.position[2]]}
          rotation={t.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.rocks.map((r) => (
        <BallCollider
          key={r.id}
          args={[0.85 * r.scale[0]]}
          position={[r.position[0], r.position[1] + 0.45 * r.scale[1], r.position[2]]}
          rotation={r.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.cabins.map((c) => (
        <CuboidCollider
          key={c.id}
          args={[3.1 * c.scale[0], 2.6 * c.scale[1], 4.2 * c.scale[2]]}
          position={[c.position[0], c.position[1] + 2.6 * c.scale[1], c.position[2]]}
          rotation={c.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.fences.map((f) => (
        <CuboidCollider
          key={f.id}
          args={[1.7 * f.scale[0], 0.6 * f.scale[1], 0.15 * f.scale[2]]}
          position={[f.position[0], f.position[1] + 0.6 * f.scale[1], f.position[2]]}
          rotation={f.rotation}
          friction={0.7}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleTowers.map((t) => (
        <CylinderCollider
          key={t.id}
          args={[4.5 * t.scale[1], 3.2 * t.scale[0]]}
          position={[t.position[0], t.position[1] + 4.5 * t.scale[1], t.position[2]]}
          rotation={t.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleWalls.map((w) => (
        <CuboidCollider
          key={w.id}
          args={[4.0 * w.scale[0], 2.8 * w.scale[1], 0.8 * w.scale[2]]}
          position={[w.position[0], w.position[1] + 2.8 * w.scale[1], w.position[2]]}
          rotation={w.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleGates.map((g) => {
        const rotY = g.rotation[1];
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const offset = 3.6 * g.scale[0];
        return (
          <group key={g.id}>
            <CylinderCollider
              args={[4.5 * g.scale[1], 1.7 * g.scale[0]]}
              position={[
                g.position[0] - cosY * offset,
                g.position[1] + 4.5 * g.scale[1],
                g.position[2] + sinY * offset,
              ]}
              rotation={g.rotation}
              friction={0.9}
              restitution={0.05}
            />
            <CylinderCollider
              args={[4.5 * g.scale[1], 1.7 * g.scale[0]]}
              position={[
                g.position[0] + cosY * offset,
                g.position[1] + 4.5 * g.scale[1],
                g.position[2] - sinY * offset,
              ]}
              rotation={g.rotation}
              friction={0.9}
              restitution={0.05}
            />
          </group>
        );
      })}
      {activeColliders.castleKeeps.map((k) => (
        <CuboidCollider
          key={k.id}
          args={[7.2 * k.scale[0], 9.0 * k.scale[1], 7.2 * k.scale[2]]}
          position={[k.position[0], k.position[1] + 9.0 * k.scale[1], k.position[2]]}
          rotation={k.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.castleArches.map((a) => {
        const rotY = a.rotation[1];
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const offset = 2.6 * a.scale[0];
        return (
          <group key={a.id}>
            <CylinderCollider
              args={[2.8 * a.scale[1], 0.6 * a.scale[0]]}
              position={[
                a.position[0] - cosY * offset,
                a.position[1] + 2.8 * a.scale[1],
                a.position[2] + sinY * offset,
              ]}
              rotation={a.rotation}
              friction={0.9}
              restitution={0.05}
            />
            <CylinderCollider
              args={[2.8 * a.scale[1], 0.6 * a.scale[0]]}
              position={[
                a.position[0] + cosY * offset,
                a.position[1] + 2.8 * a.scale[1],
                a.position[2] - sinY * offset,
              ]}
              rotation={a.rotation}
              friction={0.9}
              restitution={0.05}
            />
          </group>
        );
      })}
      {activeColliders.stoneWalls.map((sw) => (
        <CuboidCollider
          key={sw.id}
          args={[3.1 * sw.scale[0], 0.65 * sw.scale[1], 0.3 * sw.scale[2]]}
          position={[sw.position[0], sw.position[1] + 0.65 * sw.scale[1], sw.position[2]]}
          rotation={sw.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.standingStones.map((ss) => (
        <CuboidCollider
          key={ss.id}
          args={[0.8 * ss.scale[0], 2.7 * ss.scale[1], 0.5 * ss.scale[2]]}
          position={[ss.position[0], ss.position[1] + 2.7 * ss.scale[1], ss.position[2]]}
          rotation={ss.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
      {activeColliders.highlandCottages.map((hc) => (
        <CuboidCollider
          key={hc.id}
          args={[3.2 * hc.scale[0], 2.2 * hc.scale[1], 2.2 * hc.scale[2]]}
          position={[hc.position[0], hc.position[1] + 2.2 * hc.scale[1], hc.position[2]]}
          rotation={hc.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.stoneCairns.map((sc) => (
        <BallCollider
          key={sc.id}
          args={[1.6 * sc.scale[0]]}
          position={[sc.position[0], sc.position[1] + 1.2 * sc.scale[1], sc.position[2]]}
          rotation={sc.rotation}
          friction={0.8}
          restitution={0.05}
        />
      ))}
      {activeColliders.hayBales.map((hb) => (
        <CylinderCollider
          key={hb.id}
          args={[0.75 * hb.scale[1], 0.75 * hb.scale[0]]}
          position={[hb.position[0], hb.position[1] + 0.72 * hb.scale[1], hb.position[2]]}
          rotation={hb.rotation}
          friction={0.85}
          restitution={0.05}
        />
      ))}
      {activeColliders.rallySigns.map((rs) => (
        <CylinderCollider
          key={rs.id}
          args={[0.8 * rs.scale[1], 0.15 * rs.scale[0]]}
          position={[rs.position[0], rs.position[1] + 0.8 * rs.scale[1], rs.position[2]]}
          rotation={rs.rotation}
          friction={0.5}
          restitution={0.05}
        />
      ))}
      {activeColliders.stoneBridges.map((sb) => (
        <CuboidCollider
          key={sb.id}
          args={[3.4 * sb.scale[0], 0.7 * sb.scale[1], 6.0 * sb.scale[2]]}
          position={[sb.position[0], sb.position[1] + 0.5 * sb.scale[1], sb.position[2]]}
          rotation={sb.rotation}
          friction={0.9}
          restitution={0.05}
        />
      ))}
    </RigidBody>
  );
}

export function PropsInstancer() {
  const pineTrunkRef = useRef<InstancedMesh>(null);
  const pineFoliageRef = useRef<InstancedMesh>(null);
  const birchTrunkRef = useRef<InstancedMesh>(null);
  const birchFoliageRef = useRef<InstancedMesh>(null);
  const desertTrunkRef = useRef<InstancedMesh>(null);
  const desertFoliageRef = useRef<InstancedMesh>(null);
  const rockRef = useRef<InstancedMesh>(null);
  const sandstoneRef = useRef<InstancedMesh>(null);
  const cabinStoneRef = useRef<InstancedMesh>(null);
  const cabinWallRef = useRef<InstancedMesh>(null);
  const cabinDoorRef = useRef<InstancedMesh>(null);
  const cabinWindowRef = useRef<InstancedMesh>(null);
  const cabinRoofRef = useRef<InstancedMesh>(null);
  const fenceRef = useRef<InstancedMesh>(null);
  const castleTowerRef = useRef<InstancedMesh>(null);
  const castleWallRef = useRef<InstancedMesh>(null);
  const castleGateRef = useRef<InstancedMesh>(null);
  const castleKeepRef = useRef<InstancedMesh>(null);
  const castleArchRef = useRef<InstancedMesh>(null);
  const stoneWallRef = useRef<InstancedMesh>(null);
  const standingStoneRef = useRef<InstancedMesh>(null);
  const cottageWallRef = useRef<InstancedMesh>(null);
  const cottageRoofRef = useRef<InstancedMesh>(null);
  const stoneCairnRef = useRef<InstancedMesh>(null);
  const hayBaleRef = useRef<InstancedMesh>(null);
  const rallySignRef = useRef<InstancedMesh>(null);
  const stoneBridgeRef = useRef<InstancedMesh>(null);

  const { heightmapData, levelData } = useTerrainData();
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  // Load textures
  const [
    pineBarkTexture,
    pineBranchTexture,
    pineBranchSnowTexture,
    birchBarkTexture,
    leafyBranchTexture,
    desertBarkTexture,
    desertAcaciaBranchTexture,
    rockTexture,
    sandTexture,
    cabinTimberWallTexture,
    cabinRedWallTexture,
    cabinDoorTexture,
    cabinWindowTexture,
    cabinRoofTexture,
    cabinRoofSnowTexture,
    fenceTexture,
    castleStoneTexture,
    castleCobblestoneTexture,
    britishDrystoneTexture,
    celticStandingStoneTexture,
    highlandCottageWallTexture,
    highlandCottageThatchTexture,
  ] = useTexture([
    '/textures/foliage/tree_bark.jpg',
    '/textures/foliage/pine_branch.jpg',
    '/textures/foliage/pine_branch_snow.jpg',
    '/textures/foliage/birch_bark.jpg',
    '/textures/foliage/leafy_branch.jpg',
    '/textures/foliage/desert_bark.jpg',
    '/textures/foliage/desert_acacia_branch.jpg',
    '/textures/terrain/rock_cliff.jpg',
    '/textures/terrain/desert_sand.jpg',
    '/textures/props/cabin_timber_wall.jpg',
    '/textures/props/cabin_red_wall.jpg',
    '/textures/props/cabin_door.jpg',
    '/textures/props/cabin_window.jpg',
    '/textures/props/cabin_roof.jpg',
    '/textures/props/cabin_roof_snow.jpg',
    '/textures/props/rustic_fence.jpg',
    '/textures/props/castle_stone_wall.jpg',
    '/textures/props/castle_cobblestone.jpg',
    '/textures/props/british_drystone_wall.jpg',
    '/textures/props/celtic_standing_stone.jpg',
    '/textures/props/highland_cottage_wall.jpg',
    '/textures/props/highland_cottage_thatch.jpg',
  ]);

  useMemo(() => {
    [
      pineBarkTexture,
      pineBranchTexture,
      pineBranchSnowTexture,
      birchBarkTexture,
      leafyBranchTexture,
      desertBarkTexture,
      desertAcaciaBranchTexture,
      rockTexture,
      sandTexture,
      cabinTimberWallTexture,
      cabinRedWallTexture,
      cabinDoorTexture,
      cabinWindowTexture,
      cabinRoofTexture,
      cabinRoofSnowTexture,
      fenceTexture,
      castleStoneTexture,
      castleCobblestoneTexture,
      britishDrystoneTexture,
      celticStandingStoneTexture,
      highlandCottageWallTexture,
      highlandCottageThatchTexture,
    ].forEach((tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
    });
  }, [
    pineBarkTexture,
    pineBranchTexture,
    pineBranchSnowTexture,
    birchBarkTexture,
    leafyBranchTexture,
    desertBarkTexture,
    desertAcaciaBranchTexture,
    rockTexture,
    sandTexture,
    cabinTimberWallTexture,
    cabinRedWallTexture,
    cabinDoorTexture,
    cabinWindowTexture,
    cabinRoofTexture,
    cabinRoofSnowTexture,
    fenceTexture,
    castleStoneTexture,
    castleCobblestoneTexture,
    britishDrystoneTexture,
    celticStandingStoneTexture,
    highlandCottageWallTexture,
    highlandCottageThatchTexture,
  ]);

  const levelId = levelData.id.toLowerCase();
  const isDesert = levelId.includes('desert');
  const isSnow = levelId.includes('sweden') || levelId.includes('snow') || levelId.includes('winter');

  // Geometries
  const pineTrunkGeo = useMemo(() => {
    const geo = createTrunkGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const pineFoliageGeo = useMemo(() => {
    const geo = createPineFoliageGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const birchTrunkGeo = useMemo(() => {
    const geo = createBirchTrunkGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const birchFoliageGeo = useMemo(() => {
    const geo = createBirchFoliageGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const desertTrunkGeo = useMemo(() => {
    const geo = createDesertTrunkGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const desertFoliageGeo = useMemo(() => {
    const geo = createDesertFoliageGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const rockGeo = useMemo(() => {
    const geo = createRealisticRockGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const sandstoneGeo = useMemo(() => {
    const geo = createSandstoneRockGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cabinStoneGeo = useMemo(() => {
    const geo = createCabinStoneGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cabinWallGeo = useMemo(() => {
    const geo = createCabinWallGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cabinDoorGeo = useMemo(() => {
    const geo = createCabinDoorGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cabinWindowGeo = useMemo(() => {
    const geo = createCabinWindowGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cabinRoofGeo = useMemo(() => {
    const geo = createCabinRoofGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const fenceGeo = useMemo(() => {
    const geo = createFenceGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const castleTowerGeo = useMemo(() => {
    const geo = createCastleTowerGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const castleWallGeo = useMemo(() => {
    const geo = createCastleWallGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const castleGateGeo = useMemo(() => {
    const geo = createCastleGateGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const castleKeepGeo = useMemo(() => {
    const geo = createCastleKeepGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const castleArchGeo = useMemo(() => {
    const geo = createCastleArchGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const stoneWallGeo = useMemo(() => {
    const geo = createStoneWallGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const standingStoneGeo = useMemo(() => {
    const geo = createStandingStoneGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cottageWallGeo = useMemo(() => {
    const geo = createHighlandCottageWallGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const cottageRoofGeo = useMemo(() => {
    const geo = createHighlandCottageRoofGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const stoneCairnGeo = useMemo(() => {
    const geo = createStoneCairnGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const hayBaleGeo = useMemo(() => {
    const geo = createHayBaleGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const rallySignGeo = useMemo(() => {
    const geo = createRallySignGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  const stoneBridgeGeo = useMemo(() => {
    const geo = createStoneBridgeGeometry();
    geo.boundingSphere = GLOBAL_BOUNDING_SPHERE.clone();
    return geo;
  }, []);

  // Foliage shader uniforms
  const foliageShaderUniformsRef = useRef<Record<string, IUniform>[]>([]);

  // Trunk Materials
  const pineTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: pineBarkTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: new Color(isSnow ? '#44342a' : '#5a3f2b'),
      }),
    [pineBarkTexture, isSnow],
  );

  const birchTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: birchBarkTexture,
        roughness: 0.94,
        metalness: 0.01,
        color: new Color('#4c443c'),
      }),
    [birchBarkTexture],
  );

  const desertTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: desertBarkTexture,
        roughness: 0.95,
        metalness: 0.02,
        color: new Color('#5a3e2b'),
      }),
    [desertBarkTexture],
  );

  // Foliage Materials with custom shaders
  const createFoliageMaterial = (tex: typeof pineBranchTexture, baseColor: string, isBroadleaf: boolean) => {
    const mat = new MeshLambertMaterial({
      map: tex,
      side: DoubleSide,
      transparent: true,
      color: new Color(baseColor),
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.u_time = { value: 0 };
      shader.uniforms.u_tex = { value: tex };
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

      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vFoliageUv = uv;
        vec3 displaced = transformed;

        vec4 worldOrigin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float heightFactor = clamp(displaced.y / 4.0, 0.1, 1.0);
        float speed = ${isBroadleaf ? '2.4' : '1.8'};
        float sway = ${isBroadleaf ? '0.06' : '0.038'};
        float breeze = sin(u_time * speed + worldOrigin.x * 0.2 + worldOrigin.z * 0.3) * sway * heightFactor;
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
        uniform sampler2D u_tex;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec4 fTex = texture2D(u_tex, vFoliageUv);

        // Alpha discard for black background cutout
        float lum = max(fTex.r, max(fTex.g, fTex.b));
        if (lum < 0.075) {
          discard;
        }

        // Branch ambient occlusion (deeper shadow near trunk, sunlit tips)
        float branchAO = mix(0.5, 1.15, vFoliageUv.y);
        diffuseColor.rgb = fTex.rgb * diffuseColor.rgb * 1.55 * branchAO;
        `,
      );
    };

    return mat;
  };

  const pineFoliageMaterial = useMemo(
    () =>
      createFoliageMaterial(
        isSnow ? pineBranchSnowTexture : pineBranchTexture,
        isSnow ? '#ffffff' : isDesert ? '#8b7a42' : '#23441a',
        false,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pineBranchTexture, pineBranchSnowTexture, isDesert, isSnow],
  );

  const birchFoliageMaterial = useMemo(
    () => createFoliageMaterial(leafyBranchTexture, '#2d541a', true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leafyBranchTexture],
  );

  const desertFoliageMaterial = useMemo(
    () => createFoliageMaterial(desertAcaciaBranchTexture, '#9e914c', true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desertAcaciaBranchTexture],
  );

  // Rock Materials
  const rockMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockTexture,
        roughness: isSnow ? 0.92 : 0.85,
        metalness: 0.05,
        color: new Color(isSnow ? '#b5bec8' : '#9fa4ab'),
      }),
    [rockTexture, isSnow],
  );

  const sandstoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: sandTexture,
        roughness: 0.90,
        metalness: 0.02,
        color: new Color('#bf8b5a'),
      }),
    [sandTexture],
  );

  // High-Detail Cabin Materials
  const cabinStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color('#888c92'),
      }),
    [rockTexture],
  );

  const cabinWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: isSnow ? cabinRedWallTexture : cabinTimberWallTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color(isSnow ? '#b83b2a' : '#755f4c'),
      }),
    [cabinTimberWallTexture, cabinRedWallTexture, isSnow],
  );

  const cabinDoorMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinDoorTexture,
        roughness: 0.82,
        metalness: 0.04,
        color: new Color(isSnow ? '#ded9ce' : '#80654e'),
      }),
    [cabinDoorTexture, isSnow],
  );

  const cabinWindowMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinWindowTexture,
        roughness: 0.35,
        metalness: 0.12,
        color: new Color('#e0dbcb'),
      }),
    [cabinWindowTexture],
  );

  const cabinRoofMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: isSnow ? cabinRoofSnowTexture : cabinRoofTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color(isSnow ? '#ffffff' : '#635e4f'),
      }),
    [cabinRoofTexture, cabinRoofSnowTexture, isSnow],
  );

  const fenceMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: fenceTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: new Color(isSnow ? '#8b8478' : '#7a7164'),
      }),
    [fenceTexture, isSnow],
  );

  // Medieval Castle & Stone Wall Materials with Dedicated High-Res Textures
  const castleStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: castleStoneTexture,
        roughness: 0.86,
        metalness: 0.02,
        color: new Color('#ffffff'),
      }),
    [castleStoneTexture],
  );

  const stoneWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#ffffff'),
      }),
    [britishDrystoneTexture],
  );

  const standingStoneMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: celticStandingStoneTexture,
        roughness: 0.88,
        metalness: 0.02,
        color: new Color('#ffffff'),
      }),
    [celticStandingStoneTexture],
  );

  const cottageWallMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#eae6dc'),
      }),
    [britishDrystoneTexture],
  );

  const cottageRoofMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: highlandCottageThatchTexture,
        roughness: 0.92,
        metalness: 0.01,
        color: new Color('#ffffff'),
      }),
    [highlandCottageThatchTexture],
  );

  const stoneCairnMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: celticStandingStoneTexture,
        roughness: 0.90,
        metalness: 0.02,
        color: new Color('#c0c6cc'),
      }),
    [celticStandingStoneTexture],
  );

  const hayBaleMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: highlandCottageThatchTexture,
        roughness: 0.94,
        metalness: 0.01,
        color: new Color('#e5c26b'),
      }),
    [highlandCottageThatchTexture],
  );

  const rallySignMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cabinRedWallTexture,
        roughness: 0.60,
        metalness: 0.08,
        color: new Color('#ff3322'),
      }),
    [cabinRedWallTexture],
  );

  const stoneBridgeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: britishDrystoneTexture,
        roughness: 0.88,
        metalness: 0.01,
        color: new Color('#ded9ce'),
      }),
    [britishDrystoneTexture],
  );

  // Categorize props and compute exact ground anchoring for zero floating
  const {
    pineTrees,
    birchTrees,
    desertTrees,
    rocks,
    sandstoneRocks,
    cabins,
    fences,
    castleTowers,
    castleWalls,
    castleGates,
    castleKeeps,
    castleArches,
    stoneWalls,
    standingStones,
    highlandCottages,
    stoneCairns,
    hayBales,
    rallySigns,
    stoneBridges,
    spatialGrid,
  } = useMemo(() => {
    foliageShaderUniformsRef.current = [];

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

    const pines: PropItem[] = [];
    const birches: PropItem[] = [];
    const deserts: PropItem[] = [];
    const graniteRocks: PropItem[] = [];
    const sandstones: PropItem[] = [];
    const cabinList: PropItem[] = [];
    const fenceList: PropItem[] = [];
    const castleTowerList: PropItem[] = [];
    const castleWallList: PropItem[] = [];
    const castleGateList: PropItem[] = [];
    const castleKeepList: PropItem[] = [];
    const castleArchList: PropItem[] = [];
    const stoneWallList: PropItem[] = [];
    const standingStoneList: PropItem[] = [];
    const highlandCottageList: PropItem[] = [];
    const stoneCairnList: PropItem[] = [];
    const hayBaleList: PropItem[] = [];
    const rallySignList: PropItem[] = [];
    const stoneBridgeList: PropItem[] = [];

    const grid = new Map<string, PropItem[]>();
    const CELL_SIZE = 50;
    const getCellKey = (cx: number, cz: number) => `${cx}_${cz}`;

    for (const prop of levelData.props) {
      const [x, originalY, z] = prop.position;
      const isRoadExempt =
        prop.type === 'fence' ||
        prop.type === 'cabin' ||
        prop.type === 'castle_gate' ||
        prop.type === 'castle_wall' ||
        prop.type === 'castle_tower' ||
        prop.type === 'castle_keep' ||
        prop.type === 'castle_arch' ||
        prop.type === 'stone_wall' ||
        prop.type === 'standing_stone' ||
        prop.type === 'highland_cottage' ||
        prop.type === 'stone_cairn' ||
        prop.type === 'hay_bale' ||
        prop.type === 'rally_sign' ||
        prop.type === 'stone_bridge';

      if (!isRoadExempt && getTrackMaskAt(x, z) > 0.1) continue;

      const terrainY = getInterpolatedHeight(x, z, heights, rows, cols, mapWidth, mapDepth);
      if (terrainY < -6.0) continue;

      let finalY = terrainY;

      if (prop.type === 'cabin' || prop.type === 'highland_cottage') {
        const cornerOffsets = [
          [-3.0, -4.0],
          [3.0, -4.0],
          [-3.0, 4.0],
          [3.0, 4.0],
          [0, 0],
        ];
        let minGroundY = Infinity;
        for (const [ox, oz] of cornerOffsets) {
          const gy = getInterpolatedHeight(x + ox, z + oz, heights, rows, cols, mapWidth, mapDepth);
          if (gy < minGroundY) minGroundY = gy;
        }
        finalY = originalY !== 0 ? originalY : minGroundY;
      } else if (prop.type === 'castle_keep') {
        const offsets = [
          [-6.5, -6.5],
          [6.5, -6.5],
          [-6.5, 6.5],
          [6.5, 6.5],
          [0, 0],
        ];
        let minGroundY = Infinity;
        for (const [ox, oz] of offsets) {
          const gy = getInterpolatedHeight(x + ox, z + oz, heights, rows, cols, mapWidth, mapDepth);
          if (gy < minGroundY) minGroundY = gy;
        }
        finalY = originalY !== 0 ? originalY : minGroundY;
      } else if (prop.type === 'castle_tower') {
        const offsets = [
          [-2.5, -2.5],
          [2.5, -2.5],
          [-2.5, 2.5],
          [2.5, 2.5],
          [0, 0],
        ];
        let minGroundY = Infinity;
        for (const [ox, oz] of offsets) {
          const gy = getInterpolatedHeight(x + ox, z + oz, heights, rows, cols, mapWidth, mapDepth);
          if (gy < minGroundY) minGroundY = gy;
        }
        finalY = originalY !== 0 ? originalY : minGroundY;
      } else if (prop.type === 'castle_wall') {
        const leftY = getInterpolatedHeight(x - 3.5, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 3.5, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.min(leftY, rightY);
      } else if (prop.type === 'castle_gate') {
        const leftY = getInterpolatedHeight(x - 3.6, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 3.6, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.min(leftY, rightY);
      } else if (prop.type === 'castle_arch') {
        const leftY = getInterpolatedHeight(x - 2.6, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 2.6, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.min(leftY, rightY);
      } else if (prop.type === 'stone_wall') {
        const leftY = getInterpolatedHeight(x - 2.8, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 2.8, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.min(leftY, rightY);
      } else if (prop.type === 'stone_bridge') {
        const leftY = getInterpolatedHeight(x - 3.0, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 3.0, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.max(leftY, rightY);
      } else if (prop.type === 'standing_stone' || prop.type === 'stone_cairn') {
        finalY = (originalY !== 0 ? originalY : terrainY) - 0.3;
      } else if (prop.type === 'hay_bale') {
        finalY = (originalY !== 0 ? originalY : terrainY);
      } else if (prop.type === 'rally_sign') {
        finalY = (originalY !== 0 ? originalY : terrainY) - 0.1;
      } else if (prop.type === 'fence') {
        const leftY = getInterpolatedHeight(x - 1.6, z, heights, rows, cols, mapWidth, mapDepth);
        const rightY = getInterpolatedHeight(x + 1.6, z, heights, rows, cols, mapWidth, mapDepth);
        finalY = originalY !== 0 ? originalY : Math.min(leftY, rightY);
      } else {
        const isAnyTree = prop.type.startsWith('tree');
        const yOffset = isAnyTree ? -0.25 : -0.2;
        finalY = (originalY !== 0 ? originalY : terrainY) + yOffset;
      }

      _scratchDummy.position.set(x, finalY, z);
      _scratchDummy.rotation.set(...prop.rotation);
      _scratchDummy.scale.set(...prop.scale);
      _scratchDummy.updateMatrix();

      const item: PropItem = {
        id: prop.id,
        type: prop.type,
        position: [x, finalY, z],
        rotation: prop.rotation,
        scale: prop.scale,
        matrix: _scratchDummy.matrix.clone(),
      };

      if (prop.type === 'tree_birch') {
        birches.push(item);
      } else if (prop.type === 'tree_desert') {
        deserts.push(item);
      } else if (prop.type === 'rock_sandstone') {
        sandstones.push(item);
      } else if (prop.type === 'rock') {
        graniteRocks.push(item);
      } else if (prop.type === 'cabin') {
        cabinList.push(item);
      } else if (prop.type === 'fence') {
        fenceList.push(item);
      } else if (prop.type === 'castle_tower') {
        castleTowerList.push(item);
      } else if (prop.type === 'castle_wall') {
        castleWallList.push(item);
      } else if (prop.type === 'castle_gate') {
        castleGateList.push(item);
      } else if (prop.type === 'castle_keep') {
        castleKeepList.push(item);
      } else if (prop.type === 'castle_arch') {
        castleArchList.push(item);
      } else if (prop.type === 'stone_wall') {
        stoneWallList.push(item);
      } else if (prop.type === 'standing_stone') {
        standingStoneList.push(item);
      } else if (prop.type === 'highland_cottage') {
        highlandCottageList.push(item);
      } else if (prop.type === 'stone_cairn') {
        stoneCairnList.push(item);
      } else if (prop.type === 'hay_bale') {
        hayBaleList.push(item);
      } else if (prop.type === 'rally_sign') {
        rallySignList.push(item);
      } else if (prop.type === 'stone_bridge') {
        stoneBridgeList.push(item);
      } else {
        pines.push(item);
      }

      // Add to spatial grid cell
      const cx = Math.floor(x / CELL_SIZE);
      const cz = Math.floor(z / CELL_SIZE);
      const key = getCellKey(cx, cz);
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(item);
    }

    return {
      pineTrees: pines,
      birchTrees: birches,
      desertTrees: deserts,
      rocks: graniteRocks,
      sandstoneRocks: sandstones,
      cabins: cabinList,
      fences: fenceList,
      castleTowers: castleTowerList,
      castleWalls: castleWallList,
      castleGates: castleGateList,
      castleKeeps: castleKeepList,
      castleArches: castleArchList,
      stoneWalls: stoneWallList,
      standingStones: standingStoneList,
      highlandCottages: highlandCottageList,
      stoneCairns: stoneCairnList,
      hayBales: hayBaleList,
      rallySigns: rallySignList,
      stoneBridges: stoneBridgeList,
      spatialGrid: grid,
    };
  }, [heightmapData, levelData]);

  // Static One-Time VRAM Upload per archetype (Zero-GC, Zero-PCIe bus transfer during gameplay)
  useLayoutEffect(() => {
    const uploadBatch = (mesh: InstancedMesh | null, items: PropItem[]) => {
      if (!mesh) return;
      for (let i = 0; i < items.length; i++) {
        mesh.setMatrixAt(i, items[i].matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = items.length;
    };

    uploadBatch(pineTrunkRef.current, pineTrees);
    uploadBatch(pineFoliageRef.current, pineTrees);
    uploadBatch(birchTrunkRef.current, birchTrees);
    uploadBatch(birchFoliageRef.current, birchTrees);
    uploadBatch(desertTrunkRef.current, desertTrees);
    uploadBatch(desertFoliageRef.current, desertTrees);
    uploadBatch(rockRef.current, rocks);
    uploadBatch(sandstoneRef.current, sandstoneRocks);
    uploadBatch(cabinStoneRef.current, cabins);
    uploadBatch(cabinWallRef.current, cabins);
    uploadBatch(cabinDoorRef.current, cabins);
    uploadBatch(cabinWindowRef.current, cabins);
    uploadBatch(cabinRoofRef.current, cabins);
    uploadBatch(fenceRef.current, fences);
    uploadBatch(castleTowerRef.current, castleTowers);
    uploadBatch(castleWallRef.current, castleWalls);
    uploadBatch(castleGateRef.current, castleGates);
    uploadBatch(castleKeepRef.current, castleKeeps);
    uploadBatch(castleArchRef.current, castleArches);
    uploadBatch(stoneWallRef.current, stoneWalls);
    uploadBatch(standingStoneRef.current, standingStones);
    uploadBatch(cottageWallRef.current, highlandCottages);
    uploadBatch(cottageRoofRef.current, highlandCottages);
    uploadBatch(stoneCairnRef.current, stoneCairns);
    uploadBatch(hayBaleRef.current, hayBales);
    uploadBatch(rallySignRef.current, rallySigns);
    uploadBatch(stoneBridgeRef.current, stoneBridges);
  }, [
    pineTrees,
    birchTrees,
    desertTrees,
    rocks,
    sandstoneRocks,
    cabins,
    fences,
    castleTowers,
    castleWalls,
    castleGates,
    castleKeeps,
    castleArches,
    stoneWalls,
    standingStones,
    highlandCottages,
    stoneCairns,
    hayBales,
    rallySigns,
    stoneBridges,
  ]);

  // Frame loop: update wind shader
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    for (const uniforms of foliageShaderUniformsRef.current) {
      if (uniforms.u_time) uniforms.u_time.value = time;
    }
  });

  const canShadow = graphicsQuality !== 'low';

  return (
    <>
      {/* Isolated Dynamic Proximity Physics Colliders */}
      <ProximityColliders
        spatialGrid={spatialGrid}
        initialTrees={[...pineTrees, ...birchTrees, ...desertTrees].slice(0, 120)}
        initialRocks={[...rocks, ...sandstoneRocks].slice(0, 40)}
        initialCabins={cabins.slice(0, 10)}
        initialFences={fences.slice(0, 40)}
        initialCastleTowers={castleTowers.slice(0, 16)}
        initialCastleWalls={castleWalls.slice(0, 30)}
        initialCastleGates={castleGates.slice(0, 8)}
        initialCastleKeeps={castleKeeps.slice(0, 4)}
        initialCastleArches={castleArches.slice(0, 12)}
        initialStoneWalls={stoneWalls.slice(0, 50)}
        initialStandingStones={standingStones.slice(0, 30)}
        initialHighlandCottages={highlandCottages.slice(0, 12)}
        initialStoneCairns={stoneCairns.slice(0, 12)}
        initialHayBales={hayBales.slice(0, 20)}
        initialRallySigns={rallySigns.slice(0, 20)}
        initialStoneBridges={stoneBridges.slice(0, 4)}
      />

      {/* 1. Nordic Pines */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[pineTrunkGeo, pineTrunkMaterial, Math.max(1, pineTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={pineFoliageRef}
        args={[pineFoliageGeo, pineFoliageMaterial, Math.max(1, pineTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 2. European Birch / Broadleaf */}
      <instancedMesh
        ref={birchTrunkRef}
        args={[birchTrunkGeo, birchTrunkMaterial, Math.max(1, birchTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={birchFoliageRef}
        args={[birchFoliageGeo, birchFoliageMaterial, Math.max(1, birchTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 3. Desert Acacia */}
      <instancedMesh
        ref={desertTrunkRef}
        args={[desertTrunkGeo, desertTrunkMaterial, Math.max(1, desertTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={desertFoliageRef}
        args={[desertFoliageGeo, desertFoliageMaterial, Math.max(1, desertTrees.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 4. Granite Boulders */}
      <instancedMesh
        ref={rockRef}
        args={[rockGeo, rockMaterial, Math.max(1, rocks.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 5. Sandstone Crags */}
      <instancedMesh
        ref={sandstoneRef}
        args={[sandstoneGeo, sandstoneMaterial, Math.max(1, sandstoneRocks.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 6. Rustic Cabins (Stone, Timber Walls, Door, Windows, Roof) */}
      <instancedMesh
        ref={cabinStoneRef}
        args={[cabinStoneGeo, cabinStoneMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinWallRef}
        args={[cabinWallGeo, cabinWallMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinDoorRef}
        args={[cabinDoorGeo, cabinDoorMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinWindowRef}
        args={[cabinWindowGeo, cabinWindowMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cabinRoofRef}
        args={[cabinRoofGeo, cabinRoofMaterial, Math.max(1, cabins.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 7. Village Wooden Fences */}
      <instancedMesh
        ref={fenceRef}
        args={[fenceGeo, fenceMaterial, Math.max(1, fences.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 8. Medieval Castle Bastion Towers */}
      <instancedMesh
        ref={castleTowerRef}
        args={[castleTowerGeo, castleStoneMaterial, Math.max(1, castleTowers.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 9. Medieval Fortress Curtain Walls */}
      <instancedMesh
        ref={castleWallRef}
        args={[castleWallGeo, castleStoneMaterial, Math.max(1, castleWalls.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 10. Gothic Barbican Arched Gateways */}
      <instancedMesh
        ref={castleGateRef}
        args={[castleGateGeo, castleStoneMaterial, Math.max(1, castleGates.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 11. Grand Medieval Castle Citadel Keep (Donjon) */}
      <instancedMesh
        ref={castleKeepRef}
        args={[castleKeepGeo, castleStoneMaterial, Math.max(1, castleKeeps.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 12. Ruined Gothic Castle Arches & Arcades */}
      <instancedMesh
        ref={castleArchRef}
        args={[castleArchGeo, castleStoneMaterial, Math.max(1, castleArches.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 13. British Countryside Dry-Stone Dyke Walls */}
      <instancedMesh
        ref={stoneWallRef}
        args={[stoneWallGeo, stoneWallMaterial, Math.max(1, stoneWalls.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 14. Ancient Celtic Standing Stones & Megalith Circle */}
      <instancedMesh
        ref={standingStoneRef}
        args={[standingStoneGeo, standingStoneMaterial, Math.max(1, standingStones.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 15. Scottish Highland Croft Cottages (Walls & Thatch Roof) */}
      <instancedMesh
        ref={cottageWallRef}
        args={[cottageWallGeo, cottageWallMaterial, Math.max(1, highlandCottages.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
      <instancedMesh
        ref={cottageRoofRef}
        args={[cottageRoofGeo, cottageRoofMaterial, Math.max(1, highlandCottages.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 16. Highland Mountain Stone Cairns & Celtic Crosses */}
      <instancedMesh
        ref={stoneCairnRef}
        args={[stoneCairnGeo, stoneCairnMaterial, Math.max(1, stoneCairns.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 17. Agricultural Golden Straw Hay Bales */}
      <instancedMesh
        ref={hayBaleRef}
        args={[hayBaleGeo, hayBaleMaterial, Math.max(1, hayBales.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 18. Roadside Rally Directional Warning Chevron Signs */}
      <instancedMesh
        ref={rallySignRef}
        args={[rallySignGeo, rallySignMaterial, Math.max(1, rallySigns.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />

      {/* 19. Ancient Arched Stone Packhorse Bridges */}
      <instancedMesh
        ref={stoneBridgeRef}
        args={[stoneBridgeGeo, stoneBridgeMaterial, Math.max(1, stoneBridges.length)]}
        castShadow={canShadow}
        receiveShadow={canShadow}
        frustumCulled
      />
    </>
  );
}
