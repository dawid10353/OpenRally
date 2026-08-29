import {
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ─────────────────────────────────────────────────────────────────────────────
// 7. TRACKSIDE & ROADSIDE GEOMETRIES (Fences, Hay Bales, Warning Signs)
// ─────────────────────────────────────────────────────────────────────────────

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
