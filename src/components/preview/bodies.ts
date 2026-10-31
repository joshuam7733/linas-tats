import { asset } from '@/lib/asset';
import type { AreaId, BodyId } from '@/lib/concept';

export type CameraView = 'front' | 'back' | 'left' | 'right';

type Vec3 = [number, number, number];

export interface AreaRay {
  /** A ray aimed at the skin: the first hit is the placement point. */
  origin: Vec3;
  dir: Vec3;
  /** Direction from the placement point to the camera, and how far away it sits. */
  camera: Vec3;
  distance: number;
}

/**
 * Clothing lines (metres, body space). The skin shader paints the garments and the tattoo shader
 * fades ink wherever they cover the skin, so a tattoo never sits on top of fabric.
 */
export interface Clothing {
  /** Shorts: waist height front/back, hem height front/back. */
  shorts: [number, number, number, number];
  /** Top: bottom/top edge at the front, bottom/top edge at the back. All zero means no top. */
  top: [number, number, number, number];
  /** z where front turns into back, torso half-width for shorts, half-width for the top. */
  frame: [number, number, number];
}

export interface BodySpec {
  url: string;
  views: Record<CameraView, { position: Vec3; target: Vec3 }>;
  areas: Record<AreaId, AreaRay>;
  clothing: Clothing;
}

const views = (height: number, distance: number): BodySpec['views'] => {
  const target = height * 0.495;
  const eye = height * 0.59;
  return {
    front: { position: [0, eye, distance], target: [0, target, 0] },
    back: { position: [0, eye, -distance], target: [0, target, 0] },
    left: { position: [distance, eye, 0], target: [0, target, 0] },
    right: { position: [-distance, eye, 0], target: [0, target, 0] },
  };
};

// Ribs are reached with a ray coming from the front-side so it passes in front of the A-pose arm.
const RIBS_DIR: Vec3 = [-1, 0, -1.2];

/* Models face +Z, +X is the body's left side. Both are CC0 MakeHuman-derived meshes (see ATTRIBUTION.md). */
export const BODIES: Record<BodyId, BodySpec> = {
  man: {
    url: asset('/models/man.glb'),
    views: views(1.7, 4.0),
    areas: {
      chest: { origin: [0.085, 1.245, 1], dir: [0, 0, -1], camera: [0.18, 0.08, 1], distance: 0.8 },
      ribs: { origin: [0.13 + 1, 1.1, 0.04 + 1.2], dir: RIBS_DIR, camera: [1, 0.05, 0.45], distance: 0.75 },
      upperBack: { origin: [0, 1.27, -1], dir: [0, 0, 1], camera: [0, 0.1, -1], distance: 0.9 },
      lowerBack: { origin: [0, 1.04, -1], dir: [0, 0, 1], camera: [0, 0.15, -1], distance: 0.8 },
      neck: { origin: [0, 1.455, -1], dir: [0, 0, 1], camera: [0, 0.25, -1], distance: 0.55 },
      upperArm: { origin: [1, 1.22, 0.02], dir: [-1, 0, 0], camera: [1, 0.05, 0.2], distance: 0.65 },
      forearm: { origin: [1, 1.065, 0.15], dir: [-1, 0, 0], camera: [1, 0.1, 0.3], distance: 0.6 },
      thigh: { origin: [0.105, 0.58, 1], dir: [0, 0, -1], camera: [0.2, 0.05, 1], distance: 0.8 },
      calf: { origin: [0.165, 0.33, -1], dir: [0, 0, 1], camera: [0.2, 0.05, -1], distance: 0.7 },
    },
    clothing: {
      shorts: [0.95, 0.965, 0.68, 0.685],
      top: [0, 0, 0, 0],
      frame: [0.02, 0.24, 0],
    },
  },
  woman: {
    url: asset('/models/woman.glb'),
    views: views(1.59, 3.8),
    areas: {
      chest: { origin: [0.075, 1.275, 1], dir: [0, 0, -1], camera: [0.18, 0.12, 1], distance: 0.75 },
      ribs: { origin: [0.115 + 1, 1.02, 0.05 + 1.2], dir: RIBS_DIR, camera: [1, 0.05, 0.45], distance: 0.7 },
      upperBack: { origin: [0, 1.24, -1], dir: [0, 0, 1], camera: [0, 0.1, -1], distance: 0.85 },
      lowerBack: { origin: [0, 0.96, -1], dir: [0, 0, 1], camera: [0, 0.15, -1], distance: 0.75 },
      neck: { origin: [0, 1.385, -1], dir: [0, 0, 1], camera: [0, 0.25, -1], distance: 0.5 },
      upperArm: { origin: [1, 1.16, 0.02], dir: [-1, 0, 0], camera: [1, 0.05, 0.2], distance: 0.6 },
      forearm: { origin: [1, 1.0, 0.11], dir: [-1, 0, 0], camera: [1, 0.1, 0.3], distance: 0.55 },
      thigh: { origin: [0.11, 0.54, 1], dir: [0, 0, -1], camera: [0.2, 0.05, 1], distance: 0.75 },
      calf: { origin: [0.15, 0.31, -1], dir: [0, 0, 1], camera: [0.2, 0.05, -1], distance: 0.65 },
    },
    clothing: {
      shorts: [0.885, 0.9, 0.64, 0.645],
      top: [1.07, 1.235, 1.1, 1.17],
      frame: [0.045, 0.23, 0.17],
    },
  },
};

/** GLSL shared by the skin and tattoo materials. */
export const CLOTHING_GLSL = /* glsl */ `
uniform vec4 uShorts;
uniform vec4 uTop;
uniform vec3 uFrame;
float bandMask(float y, float lo, float hi) {
  return smoothstep(lo - 0.0015, lo + 0.0015, y) * (1.0 - smoothstep(hi - 0.0015, hi + 0.0015, y));
}
// Garment edges in body space. x: shorts hem, y: shorts waist, z: top bottom edge, w: top upper edge.
vec4 clothEdges(vec3 p) {
  float ax = abs(p.x);
  float back = smoothstep(uFrame.x + 0.02, uFrame.x - 0.03, p.z);
  // The hem rises slightly towards the outer thigh, like real shorts.
  float hem = mix(uShorts.z, uShorts.w, back) + 0.02 * smoothstep(0.06, 0.19, ax);
  float waist = mix(uShorts.x, uShorts.y, back);
  // A soft scooped neckline at the front of the top.
  float scoop = 0.032 * (1.0 - smoothstep(0.0, 0.09, ax)) * (1.0 - back);
  return vec4(hem, waist, mix(uTop.x, uTop.z, back), mix(uTop.y, uTop.w, back) - scoop);
}
float clothMask(vec3 p) {
  float ax = abs(p.x);
  vec4 e = clothEdges(p);
  float shorts = bandMask(p.y, e.x, e.y) * (1.0 - smoothstep(uFrame.y, uFrame.y + 0.02, ax));
  float top = 0.0;
  if (uTop.y > 0.0) {
    top = bandMask(p.y, e.z, e.w) * (1.0 - smoothstep(uFrame.z, uFrame.z + 0.015, ax));
  }
  return max(shorts, top);
}
// Waistband and underband trims, used to lighten the fabric slightly.
float clothTrim(vec3 p) {
  vec4 e = clothEdges(p);
  float trim = bandMask(p.y, e.y - 0.022, e.y);
  if (uTop.y > 0.0) trim = max(trim, bandMask(p.y, e.z, e.z + 0.018));
  return trim;
}
`;
