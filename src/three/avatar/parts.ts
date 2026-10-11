import {
  BoxGeometry, BufferGeometry, ExtrudeGeometry, LatheGeometry, MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry, Vector2, DoubleSide, Color,
} from 'three';

/**
 * Geometry kit for the stylised low-poly human. Everything is a purpose-shaped mesh (lathe profiles, a sculpted
 * head, extruded shoes), built once and shared by every avatar. Units are metres, feet at y = 0, the face looks
 * down +z. Body parts that animate are built hanging from their joint (y = 0 at the joint, negative downwards).
 */

const cache = new Map<string, BufferGeometry>();
function memo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = cache.get(key);
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}

type Pt = [number, number]; // [radius, y]
const lathe = (pts: Pt[], seg = 14) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
/** Closed tapered limb hanging down from its joint. */
const limbPts = (len: number, r0: number, rm: number, r1: number): Pt[] => [
  [0.001, 0.004], [r0 * 0.78, 0.0], [r0, -len * 0.05], [rm, -len * 0.45], [r1, -len * 0.94], [r1 * 0.65, -len], [0.001, -len - 0.004],
];
/** Open tube (sleeve, trouser leg, hem) hanging from y = 0. */
const tubePts = (len: number, r0: number, rm: number, r1: number): Pt[] => [[r0, 0], [rm, -len * 0.5], [r1, -len]];

// ---- body proportions (shared with the clothing so garments fit) ----
export const BODY = {
  hipY: 0.86, hipX: 0.085, thigh: 0.43, calf: 0.38, shoulderY: 1.37, shoulderX: 0.205, upperArm: 0.27, forearm: 0.24,
  headY: 1.63, neckY: 1.44,
};

// ---- skin parts ----
export const torso = () => memo('torso', () => {
  const g = lathe([[0.001, 0.855], [0.15, 0.86], [0.16, 0.93], [0.14, 1.03], [0.15, 1.13], [0.172, 1.25], [0.186, 1.33], [0.15, 1.41], [0.07, 1.455], [0.056, 1.47]], 16);
  g.scale(1, 1, 0.62); return g;
});
export const neck = () => memo('neck', () => lathe([[0.056, 1.4], [0.052, 1.46], [0.05, 1.53]], 10));
export const deltoid = () => memo('deltoid', () => new SphereGeometry(0.058, 10, 8));
export const upperArm = () => memo('upperArm', () => lathe(limbPts(BODY.upperArm, 0.052, 0.047, 0.04), 10));
export const foreArm = () => memo('foreArm', () => lathe(limbPts(BODY.forearm, 0.041, 0.04, 0.03), 10));
export const hand = () => memo('hand', () => { const g = lathe([[0.001, 0.0], [0.028, -0.005], [0.04, -0.04], [0.038, -0.075], [0.022, -0.1], [0.001, -0.108]], 8); g.scale(1, 1, 0.5); return g; });
export const thumb = () => memo('thumb', () => lathe(limbPts(0.05, 0.014, 0.013, 0.01), 6));
export const thigh = () => memo('thigh', () => lathe(limbPts(BODY.thigh, 0.088, 0.078, 0.06), 12));
export const calf = () => memo('calf', () => lathe(limbPts(BODY.calf, 0.06, 0.056, 0.036), 10));

/** Head: a sphere pulled into a jaw and chin, with a flatter face. */
export const head = () => memo('head', () => {
  const g = new SphereGeometry(0.112, 24, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y *= 1.14;
    if (y < 0.0) {
      const t = Math.min(1, -y / 0.13);
      const k = 1 - 0.22 * t * t;          // narrow towards the jaw
      x *= k; z *= 1 - 0.1 * t * t;
      if (z > 0 && t > 0.55) z += 0.014 * (t - 0.55); // chin
    }
    if (z > 0.02) z *= 0.97;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
});
export const ear = () => memo('ear', () => { const g = new SphereGeometry(0.026, 8, 6); g.scale(0.45, 1, 0.8); return g; });
export const eyeWhite = () => memo('eyeWhite', () => { const g = new SphereGeometry(0.0155, 10, 8); g.scale(1, 0.85, 0.5); return g; });
export const iris = () => memo('iris', () => { const g = new SphereGeometry(0.0095, 8, 6); g.scale(1, 1, 0.5); return g; });
export const brow = () => memo('brow', () => new BoxGeometry(0.036, 0.0075, 0.01));
export const nose = () => memo('nose', () => {
  const s = new Shape(); s.moveTo(0, 0); s.lineTo(0.016, -0.03); s.lineTo(-0.016, -0.03); s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  return g;
});
export const mouth = () => memo('mouth', () => { const g = new TorusGeometry(0.026, 0.0045, 4, 10, Math.PI * 0.8); g.rotateZ(Math.PI + Math.PI * 0.1); return g; });

// ---- shoes (extruded side profile, width along x) ----
function shoeShape(kind: 'sneaker' | 'boot' | 'sandal') {
  const s = new Shape();
  const h = kind === 'boot' ? 0.16 : kind === 'sneaker' ? 0.085 : 0.03;
  s.moveTo(-0.075, 0.0);
  s.lineTo(0.13, 0.0);
  s.quadraticCurveTo(0.165, 0.0, 0.165, 0.028);
  s.quadraticCurveTo(0.165, 0.052, 0.12, 0.062);
  s.lineTo(0.05, Math.min(h, 0.085));
  if (kind === 'boot') { s.lineTo(0.0, h); s.lineTo(-0.065, h); } else { s.lineTo(-0.02, h); s.lineTo(-0.06, h - 0.01); }
  s.quadraticCurveTo(-0.085, h * 0.5, -0.075, 0.0);
  return s;
}
export const shoeUpper = (kind: 'sneaker' | 'boot' | 'sandal') => memo('shoe:' + kind, () => {
  const g = new ExtrudeGeometry(shoeShape(kind), { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 6 });
  g.rotateY(-Math.PI / 2); g.translate(0.0, 0, 0.0); // profile x -> world z (forward)
  g.translate(0, 0, 0); g.computeBoundingBox();
  const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  return g;
});
export const shoeSole = () => memo('sole', () => {
  const s = new Shape(); s.moveTo(-0.082, 0); s.lineTo(0.135, 0); s.quadraticCurveTo(0.175, 0, 0.175, 0.02); s.lineTo(-0.082, 0.02); s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.074, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2); g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  return g;
});

// ---- clothing ----
/** Torso garment: follows the body profile, offset outward by `o`, hem at `hem`, open neck at the top. */
export function torsoGarment(o: number, hem: number, flare = 0, key = 'g') {
  return memo(`torsoG:${key}:${o}:${hem}:${flare}`, () => {
    const body: Pt[] = [[0.15, 0.86], [0.16, 0.93], [0.14, 1.03], [0.15, 1.13], [0.172, 1.25], [0.186, 1.33], [0.15, 1.41], [0.075, 1.452]];
    const pts: Pt[] = [];
    for (const [r, y] of body) if (y >= hem) pts.push([r + o, y]);
    // hem: interpolate the body radius at hem height, then flare outward
    let rh = body[0][0];
    for (let i = 0; i < body.length - 1; i++) {
      const [r0, y0] = body[i], [r1, y1] = body[i + 1];
      if (hem >= y0 && hem <= y1) rh = r0 + ((r1 - r0) * (hem - y0)) / (y1 - y0);
    }
    pts.unshift([rh + o + flare, hem]);
    const g = lathe(pts, 16); g.scale(1, 1, 0.64); return g;
  });
}
export const sleeve = (len: number, o: number, flare = 0, key = 's') => memo(`sleeve:${key}:${len}:${o}:${flare}`, () => lathe(tubePts(len, 0.052 + o, 0.048 + o + flare * 0.4, 0.04 + o + flare), 10));
export const foreSleeve = (len: number, o: number, flare = 0, key = 'fs') => memo(`fsleeve:${key}:${len}:${o}:${flare}`, () => lathe(tubePts(len, 0.041 + o, 0.04 + o, 0.031 + o + flare), 10));
export const ring = (r: number, tube: number, key: string) => memo(`ring:${key}`, () => { const g = new TorusGeometry(r, tube, 5, 18); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.64); return g; });
export const hood = () => memo('hood', () => {
  const g = new SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.6);
  g.scale(1.15, 0.9, 0.8); return g;
});
export const pocket = () => memo('pocket', () => new BoxGeometry(0.19, 0.075, 0.03));
export const button = () => memo('button', () => new SphereGeometry(0.0075, 6, 4));

/** Pelvis: covers the hips and the top of both legs. */
export const pelvis = (o: number, y0: number, y1: number, key: string) => memo(`pelvis:${key}:${o}:${y0}:${y1}`, () => {
  const g = lathe([[0.152 + o, y1], [0.158 + o, y1 - 0.07], [0.162 + o, (y1 + y0) / 2], [0.15 + o, y0 + 0.02], [0.14 + o, y0]], 16);
  g.scale(1, 1, 0.66); return g;
});
export const legGarment = (len: number, top: number, bottom: number, key: string) => memo(`legG:${key}:${len}:${top}:${bottom}`, () => lathe(tubePts(len, top, (top + bottom) / 2 + 0.002, bottom), 12));

/** Skirt: defined waist, a flare with soft pleats, and a visible hem band. */
export function skirt(hemY: number, hemR: number, key = 'skirt') {
  return memo(`skirt:${key}:${hemY}:${hemR}`, () => {
    const g = lathe([[0.152, 1.04], [0.158, 1.0], [0.17, 0.94], [(0.17 + hemR) / 2 + 0.02, (0.94 + hemY) / 2], [hemR - 0.015, hemY + 0.05], [hemR, hemY]], 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = Math.min(1, Math.max(0, (0.96 - y) / (0.96 - hemY)));
      const k = 1 + 0.045 * t * Math.sin(Math.atan2(x, z) * 14);
      p.setXYZ(i, x * k, y, z * k * 0.9);
    }
    g.computeVertexNormals(); return g;
  });
}

// ---- hair ----
/** Cap that follows the skull. `ext` is how far down it reaches (fraction of PI). */
export const hairCap = (r: number, ext: number, key: string) => memo(`cap:${key}:${r}:${ext}`, () => {
  const g = new SphereGeometry(r, 20, 14, 0, Math.PI * 2, 0, Math.PI * ext);
  g.scale(1.02, 1.14, 1.02); return g;
});
export const afroPuff = () => memo('afro', () => { const g = new SphereGeometry(0.19, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1.08, 0.95, 1.05); return g; });
export const hairStrand = (len: number, r: number, key: string) => memo(`strand:${key}:${len}:${r}`, () => lathe(limbPts(len, r, r * 0.95, r * 0.6), 6));
export const bun = () => memo('bun', () => new SphereGeometry(0.06, 10, 8));

// ---- materials (shared by colour) ----
const mats = new Map<string, MeshStandardMaterial>();
export function material(color: string, rough = 0.8, double = false, metal = 0): MeshStandardMaterial {
  const key = `${color}|${rough}|${double}|${metal}`;
  let m = mats.get(key);
  if (!m) { m = new MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (double) m.side = DoubleSide; mats.set(key, m); }
  return m;
}
/** Lighten (+) or darken (-) a hex colour. */
export function shade(hex: string, amt: number): string {
  const c = new Color(hex); const t = amt < 0 ? 0 : 1; const a = Math.abs(amt);
  c.r += (t - c.r) * a; c.g += (t - c.g) * a; c.b += (t - c.b) * a; return '#' + c.getHexString();
}
export const mix = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();

// ---- small extras ----
import { CylinderGeometry } from 'three';
/** Front surface z of the torso at height y (for buttons, plackets, pockets). */
export function torsoFrontZ(y: number): number {
  const prof: Pt[] = [[0.15, 0.86], [0.16, 0.93], [0.14, 1.03], [0.15, 1.13], [0.172, 1.25], [0.186, 1.33], [0.15, 1.41]];
  let r = prof[0][0];
  for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y >= y0 && y <= y1) r = r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); }
  return r * 0.64;
}
export const cuff = (r: number, tube = 0.007) => memo(`cuff:${r}:${tube}`, () => { const g = new TorusGeometry(r, tube, 5, 12); g.rotateX(Math.PI / 2); return g; });
export const capBrim = () => memo('brim', () => new CylinderGeometry(0.13, 0.13, 0.008, 14, 1, false, -Math.PI / 2, Math.PI));
export const lensRing = () => memo('lens', () => new TorusGeometry(0.026, 0.0038, 5, 14));
export const slab = (w: number, h: number, d: number) => memo(`slab:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d));
export const pendant = () => memo('pendant', () => new SphereGeometry(0.014, 8, 6));

export const shoulderCap = (o: number) => memo(`shoulder:${o}`, () => new SphereGeometry(0.054 + o, 12, 8));
