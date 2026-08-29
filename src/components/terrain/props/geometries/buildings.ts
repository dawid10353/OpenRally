import {
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ─────────────────────────────────────────────────────────────────────────────
// 5. RUSTIC CABIN & HIGHLAND COTTAGE GEOMETRIES
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
export function createGablePrismGeometry(
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
