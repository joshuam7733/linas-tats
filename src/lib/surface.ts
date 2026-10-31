import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

/**
 * Converts the (meshopt-quantized) GLB geometry into plain float geometry in metres,
 * baked with the node transform, so placement maths can work in one coordinate space.
 */
export function bakeGeometry(source: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv'] as const) {
    const attr = source.getAttribute(name) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
    if (!attr) continue;
    const array = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
      for (let c = 0; c < attr.itemSize; c++) array[i * attr.itemSize + c] = attr.getComponent(i, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, attr.itemSize));
  }
  if (source.index) out.setIndex(new THREE.BufferAttribute(Uint32Array.from(source.index.array as ArrayLike<number>), 1));
  out.applyMatrix4(matrix);
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** Spatial helpers over the body surface: per-triangle centroids and normals, precomputed once. */
export class BodySurface {
  readonly geometry: THREE.BufferGeometry;
  private readonly tri: Uint32Array;
  private readonly centroids: Float32Array;
  private readonly normals: Float32Array;
  private readonly areas: Float32Array;

  constructor(geometry: THREE.BufferGeometry) {
    this.geometry = geometry;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const index = geometry.index;
    const count = index ? index.count : pos.count;
    this.tri = new Uint32Array(count);
    for (let i = 0; i < count; i++) this.tri[i] = index ? index.getX(i) : i;
    const faces = count / 3;
    this.centroids = new Float32Array(faces * 3);
    this.normals = new Float32Array(faces * 3);
    this.areas = new Float32Array(faces);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let f = 0; f < faces; f++) {
      a.fromBufferAttribute(pos, this.tri[f * 3]);
      b.fromBufferAttribute(pos, this.tri[f * 3 + 1]);
      c.fromBufferAttribute(pos, this.tri[f * 3 + 2]);
      this.centroids[f * 3] = (a.x + b.x + c.x) / 3;
      this.centroids[f * 3 + 1] = (a.y + b.y + c.y) / 3;
      this.centroids[f * 3 + 2] = (a.z + b.z + c.z) / 3;
      n.subVectors(c, b).cross(a.clone().sub(b));
      const len = n.length();
      this.areas[f] = len / 2;
      if (len > 0) n.divideScalar(len);
      this.normals[f * 3] = n.x;
      this.normals[f * 3 + 1] = n.y;
      this.normals[f * 3 + 2] = n.z;
    }
  }

  /**
   * Area-weighted average normal of triangles near `point` that face roughly the same way
   * as `hint`. Smooths out the faceted normal of a single triangle for stable decal orientation.
   */
  averageNormal(point: THREE.Vector3, hint: THREE.Vector3, radius = 0.025) {
    const out = new THREE.Vector3();
    const r2 = radius * radius;
    const { centroids: cs, normals: ns, areas } = this;
    for (let f = 0; f < areas.length; f++) {
      const dx = cs[f * 3] - point.x;
      const dy = cs[f * 3 + 1] - point.y;
      const dz = cs[f * 3 + 2] - point.z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      const nx = ns[f * 3];
      const ny = ns[f * 3 + 1];
      const nz = ns[f * 3 + 2];
      if (nx * hint.x + ny * hint.y + nz * hint.z < 0.3) continue;
      out.x += nx * areas[f];
      out.y += ny * areas[f];
      out.z += nz * areas[f];
    }
    return out.lengthSq() > 0 ? out.normalize() : hint.clone().normalize();
  }

  /**
   * Builds a small geometry containing only triangles near the decal that face the projector.
   * Projecting onto this patch (instead of the whole body) keeps rebuilding fast and stops the
   * artwork from bleeding through to the far side of a limb.
   */
  patch(point: THREE.Vector3, facing: THREE.Vector3, radius: number) {
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const nrm = this.geometry.getAttribute('normal') as THREE.BufferAttribute;
    const { centroids: cs, normals: ns, areas } = this;
    const r2 = radius * radius;
    const keep: number[] = [];
    for (let f = 0; f < areas.length; f++) {
      const dx = cs[f * 3] - point.x;
      const dy = cs[f * 3 + 1] - point.y;
      const dz = cs[f * 3 + 2] - point.z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      // Allow wrapping around the sides of a limb, but never onto skin facing away from the projector.
      if (ns[f * 3] * facing.x + ns[f * 3 + 1] * facing.y + ns[f * 3 + 2] * facing.z < -0.1) continue;
      keep.push(f);
    }
    const p = new Float32Array(keep.length * 9);
    const n = new Float32Array(keep.length * 9);
    keep.forEach((f, i) => {
      for (let k = 0; k < 3; k++) {
        const v = this.tri[f * 3 + k];
        p.set([pos.getX(v), pos.getY(v), pos.getZ(v)], i * 9 + k * 3);
        n.set([nrm.getX(v), nrm.getY(v), nrm.getZ(v)], i * 9 + k * 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    return geo;
  }
}

/** Orientation basis for a decal: +Z out of the skin, +Y towards the head (before user rotation). */
export function decalBasis(normal: THREE.Vector3, rotationDeg = 0) {
  const z = normal.clone().normalize();
  const up = Math.abs(z.y) > 0.92 ? new THREE.Vector3(0, 0, z.y > 0 ? -1 : 1) : new THREE.Vector3(0, 1, 0);
  // x = up × z keeps the image reading left-to-right when viewed from outside the body (no mirroring).
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const angle = THREE.MathUtils.degToRad(rotationDeg);
  if (angle) {
    const q = new THREE.Quaternion().setFromAxisAngle(z, -angle);
    x.applyQuaternion(q);
    y.applyQuaternion(q);
  }
  return { x, y, z };
}

export function buildDecalGeometry(
  surface: BodySurface,
  point: THREE.Vector3,
  normal: THREE.Vector3,
  widthM: number,
  heightM: number,
  rotationDeg: number,
) {
  const { x, y, z } = decalBasis(normal, rotationDeg);
  const rotation = new THREE.Matrix4().makeBasis(x, y, z);
  const orientation = new THREE.Euler().setFromRotationMatrix(rotation);
  // Shallow projection box: deep enough to wrap around curved skin, shallow enough not to
  // reach the opposite side of an arm or a neighbouring body part.
  const depth = THREE.MathUtils.clamp(Math.max(widthM, heightM) * 0.6, 0.03, 0.1);
  const radius = Math.hypot(widthM, heightM) / 2 + depth;
  const patch = surface.patch(point, z, radius);
  const projector = new THREE.Mesh(patch);
  projector.updateMatrixWorld();
  const decal = new DecalGeometry(projector, point, orientation, new THREE.Vector3(widthM, heightM, depth));
  patch.dispose();

  // Lift the decal a fraction of a millimetre along its normals to avoid depth flicker.
  const pos = decal.getAttribute('position') as THREE.BufferAttribute | undefined;
  const nrm = decal.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (pos && nrm) {
    // How squarely each vertex faces the projector. The decal material fades ink where the skin turns
    // away, so a flat projection wrapping round a limb softens instead of smearing into streaks.
    const facing = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) facing[i] = nrm.getX(i) * z.x + nrm.getY(i) * z.y + nrm.getZ(i) * z.z;
    decal.setAttribute('facing', new THREE.BufferAttribute(facing, 1));
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + nrm.getX(i) * 0.0004,
        pos.getY(i) + nrm.getY(i) * 0.0004,
        pos.getZ(i) + nrm.getZ(i) * 0.0004,
      );
    }
    pos.needsUpdate = true;
  }
  decal.computeBoundingSphere();
  return decal;
}
