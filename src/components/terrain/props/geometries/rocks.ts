import {
  BufferGeometry,
  CylinderGeometry,
  BoxGeometry,
  TorusGeometry,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
