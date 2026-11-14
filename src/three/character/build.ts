/**
 * Procedural low-poly person. No model files: every body part, garment, hairstyle and beard is generated from an Appearance.
 * Units are metres, feet at y = 0, the face looks down +z. Joints are exposed on the returned rig so the avatar component
 * (and later a proper animation system) can pose them: hips/knees (legs), shoulders/elbows (arms), body (whole figure), head.
 * Garments are shells built from the same body silhouette, so any outfit fits any body type.
 */
import type { Accessory, Appearance, BagStyle, HairStyle } from '@/types/game';
import { faceTexture, faceUV } from './face';
import {
  BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, LatheGeometry,
  Material, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
  BoxGeometry, ExtrudeGeometry, Shape, Matrix4, Quaternion, Euler, MeshPhysicalMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ spec
export interface Spec {
  body: 'masc' | 'femme';
  skin: string; eye: string;
  hair: HairStyle;
  hairColor: string; beard: 'none' | 'stubble' | 'moustache' | 'goatee' | 'full';
  top: 'tee' | 'shirt' | 'hoodie' | 'jacket' | 'kaftan' | 'jersey' | 'vest'; topColor: string;
  bottom: 'jeans' | 'shorts' | 'trousers' | 'skirt' | 'dress'; bottomColor: string;
  shoes: 'sneakers' | 'boots' | 'sandals' | 'barefoot'; shoeColor: string;
  accessory: Accessory;
  bag: BagStyle; bagColor: string;
  gun?: boolean;
  bro?: 'plain' | 'beret';
}

// ------------------------------------------------------------------ style presets
interface Style {
  name: string;
  head: number;        // head radius (m)
  legs: number;        // leg length (hip height)
  torso: number;       // hip -> shoulder
  shoulder: number;    // half shoulder width
  limb: number;        // limb thickness multiplier
  arm: number;         // arm length multiplier
  hand: number; foot: number;
  eye: number;         // eye size multiplier
  face: 'full' | 'simple';
  shade: 'flat';
  rough: number;       // skin roughness
  seg: number;         // radial segments
  femWaist: number;    // how strongly the femme body is shaped
}
const POLY: Style = { name: 'Low-Poly Faceted', head: 0.112, legs: 0.84, torso: 0.52, shoulder: 0.21, limb: 1.05, arm: 1.0, hand: 1.0, foot: 1.0, eye: 1.0, face: 'simple', shade: 'flat', rough: 0.82, seg: 10, femWaist: 1.5 };

// ------------------------------------------------------------------ helpers
type Pt = [number, number];
const lathe = (pts: Pt[], seg: number) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
const limbPts = (len: number, r0: number, rm: number, r1: number): Pt[] => [[0.001, 0.004], [r0 * 0.78, 0], [r0, -len * 0.05], [rm, -len * 0.45], [r1, -len * 0.94], [r1 * 0.65, -len], [0.001, -len - 0.004]];
const tubePts = (len: number, r0: number, rm: number, r1: number): Pt[] => [[r0, 0], [rm, -len * 0.5], [r1, -len]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function profileAt(pts: Pt[], y: number): number {
  for (let i = 0; i < pts.length - 1; i++) { const [r0, y0] = pts[i], [r1, y1] = pts[i + 1]; if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); }
  return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
}
function noise3(x: number, y: number, z: number) { return Math.sin(x * 9.1 + y * 5.3) * Math.cos(z * 8.7 - y * 4.1) * 0.5 + Math.sin((x + z) * 13.7 + y * 3.9) * 0.5; }

// ------------------------------------------------------------------ materials
const matCache = new Map<string, MeshStandardMaterial>();
void MeshStandardMaterial;
/** Flat-shaded materials, shared by every character (never disposed with a single avatar). */
function makeMat(_st: Style, color: string, rough = 0.8, opts: { double?: boolean; metal?: number } = {}): Material {
  const key = `${color}|${rough}|${!!opts.double}|${opts.metal ?? 0}`;
  let m = matCache.get(key);
  if (!m) { // a light clearcoat gives the facets the glossy highlights that make low poly look finished
    m = new MeshPhysicalMaterial({ color, roughness: rough, metalness: opts.metal ?? 0, flatShading: true, clearcoat: 0 }); if (opts.double) m.side = DoubleSide; matCache.set(key, m as unknown as MeshStandardMaterial); }
  return m;
}
const shade = (hex: string, amt: number) => { const c = new Color(hex); const t = amt < 0 ? 0 : 1, a = Math.abs(amt); c.r += (t - c.r) * a; c.g += (t - c.g) * a; c.b += (t - c.b) * a; return '#' + c.getHexString(); };
const mix = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();


// ------------------------------------------------------------------ merged detail parts (hands, feet)
const _M = new Matrix4(), _Q = new Quaternion(), _E = new Euler(), _V = new Vector3(), _S = new Vector3();
/** A copy of `g` moved/rotated/scaled, as non-indexed geometry so different primitives can be merged into one mesh. */
function placed(g: BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]): BufferGeometry {
  const c = g.index ? g.toNonIndexed() : g.clone();
  c.deleteAttribute('uv'); _M.compose(_V.set(...pos), _Q.setFromEuler(_E.set(...rot)), _S.set(...scale)); c.applyMatrix4(_M); return c;
}
const merge = (parts: BufferGeometry[]) => { const g = mergeGeometries(parts, false)!; g.computeVertexNormals(); return g; };
/** Hanging chain of tapered segments (a finger): each segment hangs from the end of the last and curls forward by `curl`. */
function chain(parts: BufferGeometry[], at: [number, number, number], rot: [number, number, number], segs: { len: number; r0: number; r1: number; curl: number }[]) {
  const m = new Matrix4().compose(new Vector3(...at), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(1, 1, 1));
  for (const sg of segs) {
    m.multiply(new Matrix4().makeRotationX(sg.curl));
    const g = new CylinderGeometry(sg.r0, sg.r1, sg.len, 5).toNonIndexed(); g.deleteAttribute('uv');
    g.applyMatrix4(new Matrix4().makeTranslation(0, -sg.len / 2, 0)); g.applyMatrix4(m); parts.push(g);
    m.multiply(new Matrix4().makeTranslation(0, -sg.len, 0));
  }
}
/** A hand hanging from the wrist (y = 0): tapered palm, four fingers with two joints each, and a thumb. */
function handGeo(side: number, hs: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(placed(new CylinderGeometry(0.047 * hs, 0.058 * hs, 0.088 * hs, 4), [0, -0.046 * hs, 0], [0, Math.PI / 4, 0], [1, 1, 0.42]));
  const lens = [0.07, 0.078, 0.072, 0.056], xs = [0.03, 0.01, -0.01, -0.03];
  xs.forEach((x, k) => {
    const L = lens[k] * hs;
    chain(parts, [x * hs * 1.05, -0.086 * hs, 0], [0, 0, 0], [{ len: L * 0.55, r0: 0.0105 * hs, r1: 0.0095 * hs, curl: -0.12 - k * 0.02 }, { len: L * 0.45, r0: 0.0092 * hs, r1: 0.0075 * hs, curl: -0.4 }]);
  });
  chain(parts, [-side * 0.036 * hs, -0.02 * hs, 0.012 * hs], [-0.35, 0, -side * 0.5], [{ len: 0.04 * hs, r0: 0.0135 * hs, r1: 0.0115 * hs, curl: 0 }, { len: 0.034 * hs, r0: 0.0112 * hs, r1: 0.0088 * hs, curl: -0.3 }]);
  return merge(parts);
}
/** Extrude a side profile ((forward, y) points) across `width`, centred on x = 0. */
function sideExtrude(pts: [number, number][], width: number, bevel = 0.005): BufferGeometry {
  const sh = new Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const [a, b] of pts.slice(1)) sh.lineTo(a, b); sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2); g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g;
}
const GY = -0.075; // ground, relative to the ankle joint
/** Bare foot: heel, arch, ball and five toes. Ankle at y = 0, toes point +z. */
function footGeo(side: number, width: number, fs: number): BufferGeometry {
  const f: [number, number][] = [[-0.05, GY], [0.13, GY], [0.14, GY + 0.008], [0.135, -0.052], [0.1, -0.043], [0.06, -0.025], [0.025, -0.004], [-0.02, 0.004], [-0.045, -0.02], [-0.053, GY + 0.02]];
  const parts = [sideExtrude(f, width * 0.92, 0.004)];
  const sz = [0.024, 0.017, 0.015, 0.014, 0.012], ln = [0.034, 0.032, 0.028, 0.024, 0.02];
  sz.forEach((w, k) => parts.push(placed(new BoxGeometry(w, 0.015, ln[k]), [-side * (0.027 - 0.016 * k), GY + 0.009, 0.128 + ln[k] / 2 - 0.004 - k * 0.003])));
  const g = merge(parts); g.scale(1, 1, fs); return g;
}
/** Shoe upper (sneaker or boot) and its sole, as separate geometries so they can take different colours. */
function shoeGeo(kind: 'sneaker' | 'boot', width: number, fs: number): { upper: BufferGeometry; sole: BufferGeometry } {
  const toe: [number, number][] = [[0.07, -0.026], [0.125, -0.038], [0.157, -0.052], [0.162, -0.062], [0.15, -0.059]];
  const up: [number, number][] = kind === 'boot'
    ? [[-0.056, -0.059], [-0.066, 0.0], [-0.06, 0.105], [0.054, 0.105], [0.05, 0.02], ...toe]
    : [[-0.056, -0.059], [-0.064, -0.03], [-0.05, 0.012], [-0.015, 0.016], [0.02, -0.004], ...toe];
  const upper = sideExtrude(up, width, 0.007), sole = sideExtrude([[-0.064, GY], [0.152, GY], [0.166, GY + 0.006], [0.168, GY + 0.018], [-0.062, GY + 0.018]], width * 1.08, 0.004);
  upper.scale(1, 1, fs); sole.scale(1, 1, fs); return { upper, sole };
}

// ------------------------------------------------------------------ head
/**
 * An anatomical head, not a ball: lofted from cross-sections that follow a real skull (narrow crown, wide temples, cheekbones,
 * a tapering jaw and a chin that sits forward). Units are head radii; y runs from the chin (-1.15) to the crown (+1.14), the
 * face looks along +z. `jaw` is wider for a masculine face and narrower for a feminine one.
 */
const HEAD_RING = 16;
function headSlices(jaw: number) {
  const j = jaw, wide = jaw > 1;
  return [
    { y: 1.14, hw: 0.04, hd: 0.06, cz: -0.06 }, { y: 1.07, hw: 0.46, hd: 0.58, cz: -0.07 }, { y: 0.92, hw: 0.72, hd: 0.84, cz: -0.06 }, { y: 0.68, hw: 0.8, hd: 0.92, cz: -0.05 },
    { y: 0.4, hw: 0.82, hd: 0.96, cz: -0.04 }, { y: 0.1, hw: 0.8, hd: 0.95, cz: 0 }, { y: -0.2, hw: 0.78 + (wide ? 0.02 : 0), hd: 0.88, cz: 0.0 },
    { y: -0.5, hw: 0.68 * j, hd: 0.8, cz: 0.03 }, { y: -0.78, hw: 0.5 * j, hd: 0.66, cz: 0.08 }, { y: -0.98, hw: (wide ? 0.34 : 0.24) * j, hd: 0.48, cz: 0.2 },
    { y: -1.1, hw: 0.14 * j, hd: 0.3, cz: 0.24 }, { y: -1.15, hw: 0.04, hd: 0.1, cz: 0.24 },
  ];
}
/** Front of the face (z) at height y, in head radii: where the nose, glasses and the like sit. */
const faceZ = (jaw: number, y: number) => { const sl = headSlices(jaw); for (let i = 0; i < sl.length - 1; i++) { const a = sl[i], b = sl[i + 1]; if (y <= a.y && y >= b.y) { const t = (a.y - y) / (a.y - b.y); return (a.cz + a.hd) + ((b.cz + b.hd) - (a.cz + a.hd)) * t; } } return 0.9; };
function headGeo(R: number, _seg: number, jaw = 1): BufferGeometry {
  const sl = headSlices(jaw), pos: number[] = [], idx: number[] = [], N = HEAD_RING, n = 2.35;
  const sp = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  for (const st of sl) for (let j = 0; j <= N; j++) { const f = (j / N) * Math.PI * 2; pos.push(sp(Math.sin(f)) * st.hw * R, st.y * R, (st.cz + sp(Math.cos(f)) * st.hd) * R); }
  for (let i = 0; i < sl.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal, p = g.attributes.position, k = 5 * (N + 1) + 4; // a point on the side of a middle slice: its normal must point away from the centre
  if (nr.getX(k) * p.getX(k) + nr.getZ(k) * (p.getZ(k) - sl[5].cz * R) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
/** A shell that follows the head surface over the triangles accepted by `keep`, pushed outward by `off`. Used for hair and beards. */
function headShell(R: number, seg: number, keep: (x: number, y: number, z: number) => boolean, off: (x: number, y: number, z: number) => number, jaw = 1): BufferGeometry {
  const base = headGeo(R, seg, jaw), p = base.attributes.position, n = base.attributes.normal, idx = base.index!;
  const pos: number[] = [], nor: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const v = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
    // keep a triangle when its centre is inside the region (the head is coarse, so testing every corner leaves holes)
    const cx = (p.getX(v[0]) + p.getX(v[1]) + p.getX(v[2])) / 3, cy = (p.getY(v[0]) + p.getY(v[1]) + p.getY(v[2])) / 3, cz = (p.getZ(v[0]) + p.getZ(v[1]) + p.getZ(v[2])) / 3;
    if (!keep(cx, cy, cz)) continue;
    for (const i of v) { const o = off(p.getX(i), p.getY(i), p.getZ(i)); pos.push(p.getX(i) + n.getX(i) * o, p.getY(i) + n.getY(i) * o, p.getZ(i) + n.getZ(i) * o); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new Float32BufferAttribute(nor, 3)); return g;
}

// ------------------------------------------------------------------ builder
export interface Rig { dispose: () => void; root: Group; body: Group; head: Group; hipL: Group; hipR: Group; kneeL: Group; kneeR: Group; shoulderL: Group; shoulderR: Group; elbowL: Group; elbowR: Group; height: number }

export function buildCharacter(spec: Spec): Rig {
  const st = POLY, fem = spec.body === 'femme';
  const mesh = (g: BufferGeometry, m: Material, parent: Group, pos?: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]) => {
    const o = new Mesh(g, m); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (scale) o.scale.set(...scale); o.castShadow = true; parent.add(o); return o;
  };
  const grp = (parent: Group, x = 0, y = 0, z = 0) => { const g = new Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mat = (c: string, r = 0.8, o: { double?: boolean; metal?: number } = {}) => makeMat(st, c, r, o);

  // ---- proportions
  const hipY = st.legs, thigh = st.legs * 0.5, calf = st.legs - st.legs * 0.5 - 0.075;
  const shoulderY = hipY + st.torso, R = st.head, neckLen = R * 0.55;
  const headY = shoulderY + neckLen * 0.5 + R * 1.02 + 0.01;
  const lk = st.limb, seg = st.seg, sx = st.shoulder * (fem ? 0.9 : 1), hipX = (fem ? 0.095 : 0.085) * (st.torso > 0.5 ? 1 : 0.95) * Math.max(0.9, lk * 0.9);
  const upper = (shoulderY - hipY) * 0.52 * st.arm, fore = (shoulderY - hipY) * 0.46 * st.arm;
  const T = st.torso, h = (f: number) => hipY + T * f;
  const waist = (fem ? 0.104 : 0.138) * lk * (fem ? 1 - 0.1 * (st.femWaist - 1) : 1), hipR = (fem ? 0.168 : 0.15) * (1 + (fem ? 0.06 * (st.femWaist - 1) : 0)) * (0.92 + lk * 0.08);
  const chest = (fem ? 0.148 : 0.172) * (0.9 + lk * 0.1), shr = sx * (fem ? 0.8 : 0.86); // rounder, narrower shoulders: the arms and deltoids carry the width
  // torso silhouette: (radius, y). Lathe is symmetric, so it is squashed in z for depth.
  const torsoProf: Pt[] = [[0.001, h(0)], [hipR * 0.96, h(0.01)], [hipR, h(0.12)], [lerp(hipR, waist, 0.85), h(0.3)], [waist, h(0.42)], [lerp(waist, chest, 0.7), h(0.62)], ...(fem ? ([[chest * 1.07, h(0.72)]] as Pt[]) : []), [chest, h(0.78)], [lerp(chest, shr, 0.65), h(0.88)], [shr, h(0.935)], [shr * 0.9, h(0.975)], [shr * 0.6, h(1.0) + 0.006], [0.088 * lk, h(1.0) + 0.032], [0.066 * lk, h(1.0) + 0.052], [0.056 * lk, h(1.0) + 0.066]];
  const depth = fem ? 0.66 : 0.64;

  const root = new Group(), body = grp(root);
  const skinM = mat(spec.skin, st.rough);

  // ---- torso, neck
  const torsoG = lathe(torsoProf, seg); torsoG.scale(1, 1, depth);
  mesh(torsoG, skinM, body);
  const neckR = 0.052 * lk * (fem ? 0.9 : 1.05);
  mesh(lathe([[neckR * 1.1, shoulderY - 0.02], [neckR, shoulderY + 0.03], [neckR * 0.96, shoulderY + neckLen + 0.03]], Math.max(6, seg / 2)), skinM, body);

  // ---- head + face
  const hseg = 16; // the head is built finer than the rest, so the face has enough facets to read as a face
  const head = grp(body, 0, headY, 0);
  const jawK = fem ? 0.85 : 1.05;
  mesh(headGeo(R, hseg, jawK), skinM, head);
  const surf = (x: number, y: number) => R * faceZ(jawK, y / R) * (1 - Math.min(0.5, Math.abs(x) / R) * 0.28);
  const eyeY = R * 0.1, eyeX = R * 0.36, er = R * 0.16;
  const lipM = mat(fem ? mix(shade(spec.skin, -0.3), '#B03A4A', 0.4) : shade(spec.skin, -0.28), 0.5);
  void lipM;
  const ico = (r: number) => new IcosahedronGeometry(r, 0);
  // the painted face: the front of the faceted head, drawn on (eyes with liner and shine, brows, glossy lips, blush)
  {
    const browC = spec.hair === 'bald' ? shade(spec.skin, -0.5) : mix(spec.hairColor, '#000000', 0.2);
    const tex = faceTexture({ skin: spec.skin, eye: spec.eye, fem, brow: browC });
    const patch = headShell(R, hseg, (x, y, z) => z > 0.12 * R && Math.abs(x) < 1.0 * R && y > -1.25 * R, () => 0.0035 * R, jawK);
    const pos = patch.attributes.position, uv: number[] = [];
    for (let i = 0; i < pos.count; i++) { const [u, v] = faceUV(pos.getX(i) / R, pos.getY(i) / R); uv.push(u, v); }
    patch.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    const faceM = new MeshPhysicalMaterial({ map: tex, roughness: 0.8, flatShading: true, clearcoat: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mesh(patch, faceM, head);
  }
  // ears: a flattened shell with a lobe
  for (const s of [-1, 1]) {
    mesh(ico(R * 0.22), skinM, head, [s * R * 0.8, R * 0.0, -R * 0.1], [0, 0, s * 0.12], [0.36, 1.1, 0.72]);
    mesh(ico(R * 0.07), skinM, head, [s * R * 0.8, -R * 0.24, -R * 0.06], undefined, [0.5, 1, 0.8]);
  }
  // nose: bridge, tip and two nostril wings
  const nz = (y: number) => surf(0, y);
  mesh(new CylinderGeometry(R * 0.055, R * 0.1, R * 0.36, 4), skinM, head, [0, -R * 0.04, nz(-R * 0.04) + R * 0.03], [-0.28, Math.PI / 4, 0], [1, 1, 0.75]);
  mesh(ico(R * 0.125), skinM, head, [0, -R * 0.215, nz(-R * 0.2) + R * 0.085], undefined, [1, 0.85, 1.1]);
  for (const s of [-1, 1]) mesh(ico(R * 0.08), skinM, head, [s * R * 0.115, -R * 0.235, nz(-R * 0.22) + R * 0.035]);

  // ---- hair + facial hair (shells that hug the skull)
  const hc = mat(spec.hairColor, 0.38);
  const above = (tilt: number, c: number) => (_x: number, y: number, z: number) => y * Math.cos(tilt) - z * Math.sin(tilt) > c * R; // hairline plane
  const shellHair = (c: number, tilt: number, o: number) => mesh(headShell(R, hseg, above(tilt, c), () => o * R, jawK), hc, head);
  const strands = (n: number, len: number, r: number, spread: number, y: number, rad: number, tilt = -0.1) => {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + ((i + 0.5) / n - 0.5) * spread * 2, l = len * (0.82 + 0.18 * Math.sin(i * 2.3)), g = grp(head); g.rotation.y = a;
      mesh(lathe(limbPts(l, r, r * 0.95, r * 0.6), 6), hc, g, [0, y, rad], [tilt, 0, 0]);
    }
  };
  switch (spec.hair) {
    case 'bald': break;
    case 'lowcut': shellHair(0.15, 0.5, 0.045); break;
    case 'bowl': // a rounded bowl: full on top, a straight fringe over the brows, cut level above the ears all the way round
      mesh(headShell(R, hseg, (x, y, z) => (y > R * 0.34) || (y > -R * 0.12 && z < R * 0.2 && Math.abs(x) > -1), (_x, y) => R * (y > R * 0.34 ? 0.085 : 0.07), jawK), hc, head); break;
    case 'fade': shellHair(0.3, 0.45, 0.07); mesh(headShell(R, hseg, above(0.45, 0.0), () => 0.02 * R, jawK), mat(mix(spec.skin, spec.hairColor, 0.45), 0.9), head); break;
    case 'afro': {
      const g = new IcosahedronGeometry(R * 1.55, 1); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + 0 * noise3(x * 6, y * 6, z * 6); p.setXYZ(i, x * d, y * d, z * d); }
      g.computeVertexNormals(); g.scale(0.8, 0.8, 0.8); mesh(g, mat(spec.hairColor, 1), head, [0, R * 0.42, -R * 0.34], undefined, [1.0, 0.95, 1.0]);
      shellHair(0.42, 0.35, 0.05); break; }
    case 'bun': shellHair(0.12, 0.55, 0.045); mesh(new SphereGeometry(R * 0.5, 14, 10), hc, head, [0, R * 1.0, -R * 0.55]); break;
    case 'cornrows': {
      shellHair(0.12, 0.55, 0.012);
      for (let i = -3; i <= 3; i++) {
        const pts: Vector3[] = [];
        for (let k = 0; k <= 10; k++) { const t = k / 10, ang = lerp(0.65, -2.3, t); const wob = Math.sin(t * 6 + i) * 0.015; const x = i * R * 0.24 * (1 - t * 0.35) + wob; const yy = Math.sin(ang) * R * 1.06 * 1.14 + 0.01, zz = Math.cos(ang) * R * 1.04; pts.push(new Vector3(x * (1 - Math.abs(yy) / (R * 2) * 0.3), Math.max(yy, -R * 0.2), zz)); }
        mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, R * 0.045, 6, false), hc, head);
      }
      strands(10, 0.22, 0.014, 1.2, -0.02, R * 1.0); break; }
    case 'braids': shellHair(0.12, 0.5, 0.045); strands(18, 0.34, 0.013, 2.3, -R * 0.2, R * 0.98); break;
    case 'twists': shellHair(0.15, 0.5, 0.05); strands(20, 0.14, 0.02, 2.4, R * 0.15, R * 1.05, -0.3); break;
    case 'dreads': shellHair(0.12, 0.5, 0.05); strands(16, 0.3, 0.02, 2.4, -R * 0.1, R * 1.02); break;
    case 'ponytail': {
      // sleek cap with a swept fringe, and a high tail of chunky tapered locks
      shellHair(0.02, 0.5, 0.055);
      mesh(headShell(R, hseg, (x, y, z) => y > 0.52 * R && z > 0.2 * R && x < 0.1 * R, () => 0.085 * R, jawK), hc, head);
      mesh(ico(R * 0.34), hc, head, [0, R * 0.62, -R * 0.98], undefined, [1, 1, 1.1]); // the tie
      mesh(new TorusGeometry(R * 0.2, R * 0.05, 5, 10), mat('#E5B93C', 0.3, { metal: 0.7 }), head, [0, R * 0.55, -R * 1.06], [0.5, 0, 0]);
      [[0, 0.36, 0.5, 0.075], [0.2, 0.3, 0.62, 0.062], [-0.2, 0.3, 0.62, 0.062]].forEach(([yaw, len, tilt, r]) => {
        const gg = grp(head, 0, R * 0.55, -R * 1.02); gg.rotation.y = yaw;
        mesh(lathe(limbPts(len, r, r * 1.05, r * 0.28), 6), hc, gg, undefined, [tilt, 0, 0]);
      });
      break; }
    case 'bob': {
      shellHair(0.05, 0.5, 0.055);
      mesh(headShell(R, hseg, (x, y, z) => y < 0.4 * R && y > -0.8 * R && (z < 0.2 * R || Math.abs(x) > 0.75 * R), () => 0.16 * R, jawK), hc, head);
      mesh(headShell(R, hseg, (_x, y, z) => y > 0.5 * R && z > 0.15 * R, () => 0.075 * R, jawK), hc, head); // fringe
      break; }
    case 'long': {
      shellHair(0.05, 0.5, 0.055);
      mesh(headShell(R, hseg, (x, y, z) => y < 0.4 * R && y > -0.6 * R && (z < 0.2 * R || Math.abs(x) > 0.75 * R), () => 0.14 * R, jawK), hc, head);
      mesh(headShell(R, hseg, (_x, y, z) => y > 0.5 * R && z > 0.15 * R, () => 0.075 * R, jawK), hc, head);
      // the length: an open sheet of hair behind the head and shoulders, down to the shoulder blades
      const sheet = lathe([[R * 1.12, -R * 0.4], [R * 1.1, -R * 1.2], [R * 1.0, -R * 2.0], [R * 1.12, -R * 2.9], [R * 0.7, -R * 3.1]], 9);
      const sg = new LatheGeometry(sheet.parameters.points, 9, 0.95, Math.PI * 2 - 1.9);
      mesh(sg, mat(spec.hairColor, 0.38, { double: true }), head, [0, -R * 0.05, -R * 0.05], undefined, [1, 1, 0.95]);
      break; }
    case 'puffs': {
      shellHair(0.1, 0.5, 0.05);
      for (const sd of [-1, 1]) mesh(new IcosahedronGeometry(R * 0.56, 1), hc, head, [sd * R * 0.82, R * 0.88, -R * 0.12]);
      break; }
  }
  // facial hair
  if (spec.beard !== 'none' && !fem) {
    const beardM = mat(spec.hairColor, 0.95);
    if (spec.beard === 'full') mesh(headShell(R, hseg, (x, y, z) => y < -R * 0.28 && z > -R * 0.2 && !(Math.abs(x) < R * 0.36 && y > -R * 0.6 && y < -R * 0.36 && z > R * 0.3), (_x, y) => R * (y < -R * 0.5 ? 0.05 : 0.035), jawK), beardM, head);
    if (spec.beard === 'stubble') mesh(headShell(R, hseg, (_x, y, z) => y < -R * 0.15 && z > R * 0.05, () => 0.012 * R, jawK), mat(mix(spec.skin, spec.hairColor, 0.55), 1), head);
    if (spec.beard === 'goatee') mesh(headShell(R, hseg, (x, y, z) => y < -R * 0.62 && Math.abs(x) < R * 0.38 && z > R * 0.2, () => 0.05 * R, jawK), beardM, head);
    if (spec.beard === 'moustache' || spec.beard === 'full' || spec.beard === 'goatee') mesh(new SphereGeometry(R * 0.2, 10, 8), beardM, head, [0, -R * 0.38, surf(0, -R * 0.4) - R * 0.02], undefined, [1.4, 0.32, 0.5]);
  }

  // ---- Brotherhood look: a small red-and-gold insignia over the heart and (optionally) a black beret
  if (spec.bro) {
    mesh(new CylinderGeometry(0.026, 0.026, 0.008, 12), mat('#B91C1C', 0.5), body, [-0.085, shoulderY - 0.13, (profileAt(torsoProf, shoulderY - 0.13) * depth) + 0.02], [Math.PI / 2, 0, 0]);
    mesh(new CylinderGeometry(0.013, 0.013, 0.01, 8), mat('#E5B93C', 0.3, { metal: 0.8 }), body, [-0.085, shoulderY - 0.13, (profileAt(torsoProf, shoulderY - 0.13) * depth) + 0.024], [Math.PI / 2, 0, 0]);
    if (spec.bro === 'beret') mesh(new SphereGeometry(R * 1.08, seg, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat('#0B0B0E', 0.9), head, [R * 0.12, R * 0.2, -R * 0.02], [0.1, 0, -0.22], [1.08, 0.5, 1.1]);
  }

  // ---- accessories
  if (spec.accessory === 'glasses') {
    const f = mat('#15181D', 0.3, { metal: 0.4 });
    for (const s of [-1, 1]) { mesh(new TorusGeometry(er * 1.7, R * 0.025, 6, 20), f, head, [s * eyeX, eyeY, surf(s * eyeX, eyeY) + R * 0.06]); mesh(new BoxGeometry(R * 0.02, R * 0.02, R * 0.9), f, head, [s * R * 0.9, eyeY + R * 0.02, R * 0.36]); }
    mesh(new BoxGeometry(R * 0.2, R * 0.025, R * 0.025), f, head, [0, eyeY + R * 0.05, surf(0, eyeY) + R * 0.06]);
  }
  if (spec.accessory === 'cap') {
    mesh(new SphereGeometry(R * 1.1, seg, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(spec.topColor, 0.8), head, [0, R * 0.12, -R * 0.02], [-0.18, 0, 0], [1, 1.1, 1.05]);
    mesh(new CylinderGeometry(R * 1.1, R * 1.1, R * 0.05, 14, 1, false, -Math.PI / 2, Math.PI), mat(shade(spec.topColor, -0.15), 0.8), head, [0, R * 0.5, R * 0.95], [0.12, 0, 0]);
  }
  if (spec.accessory === 'gele') {
    // a Nigerian headwrap: a folded band round the forehead and a big fan tied up behind it, in a rich colour
    const gc = mat(mix(spec.topColor, '#E5A400', 0.45), 0.4), gd = mat(shade(mix(spec.topColor, '#E5A400', 0.45), -0.25), 0.4);
    mesh(new TorusGeometry(R * 1.03, R * 0.17, 6, 14), gd, head, [0, R * 0.52, -R * 0.05], [Math.PI / 2 - 0.12, 0, 0], [1, 1.05, 1]);
    mesh(new IcosahedronGeometry(R * 1.05, 1), gc, head, [0, R * 1.2, -R * 0.2], undefined, [1.3, 0.9, 1.15]);
    mesh(new IcosahedronGeometry(R * 0.85, 1), gd, head, [0, R * 1.85, -R * 0.1], [0, 0, 0.12], [1.9, 0.8, 0.9]);
    for (const sd of [-1, 1]) mesh(new IcosahedronGeometry(R * 0.6, 0), gc, head, [sd * R * 1.55, R * 1.75, -R * 0.15], [0, 0, sd * 0.5], [1.0, 0.8, 0.9]);
    mesh(new IcosahedronGeometry(R * 0.5, 0), gd, head, [0, R * 2.25, -R * 0.05], undefined, [1.6, 0.8, 0.8]);
  }
  if (spec.accessory === 'headphones') {
    const hp = mat('#17191F', 0.35, { metal: 0.2 }), pad = mat(spec.topColor, 0.5);
    mesh(new TorusGeometry(R * 1.18, R * 0.07, 6, 18, Math.PI), hp, head, [0, R * 0.15, 0], [0, 0, 0]);
    for (const sd of [-1, 1]) { mesh(new CylinderGeometry(R * 0.36, R * 0.36, R * 0.26, 10), hp, head, [sd * R * 1.14, R * 0.05, 0], [0, 0, Math.PI / 2]); mesh(new CylinderGeometry(R * 0.28, R * 0.28, R * 0.3, 10), pad, head, [sd * R * 1.14, R * 0.05, 0], [0, 0, Math.PI / 2]); }
  }
  if (spec.accessory === 'stud') mesh(new SphereGeometry(R * 0.055, 8, 6), mat('#F2C94C', 0.25, { metal: 0.85 }), head, [R * 0.93, -R * 0.26, -R * 0.07]);
  if (spec.accessory === 'earrings') for (const s of [-1, 1]) mesh(new TorusGeometry(R * 0.1, R * 0.02, 6, 14), mat('#E5B93C', 0.25, { metal: 0.85 }), head, [s * R * 0.82, -R * 0.3, -R * 0.06], [0, Math.PI / 2, 0]);

  // ---- garments (shells built from the same silhouette so every style fits)
  const topC = mat(spec.topColor, 0.82, { double: true }), topTrim = mat(shade(spec.topColor, 0.35), 0.7, { double: true }), topDark = mat(shade(spec.topColor, -0.4), 0.8, { double: true });
  const botC = mat(spec.bottomColor, 0.85, { double: true }), botBand = mat(shade(spec.bottomColor, -0.3), 0.7, { double: true });
  const torsoShell = (o: number, hemY: number, flare = 0) => {
    const pts: Pt[] = []; for (const [r, y] of torsoProf) if (y >= hemY && y < h(1.0) + 0.034) pts.push([r + o, y]);
    pts.unshift([profileAt(torsoProf, hemY) + o + flare, hemY]);
    const g = lathe(pts, seg); g.scale(1, 1, depth + 0.02); return g;
  };
  const onePiece = spec.bottom === 'dress';
  const T0 = onePiece ? 'tee' : spec.top;
  // a vest is a sleeveless open gilet worn over a light tee: the tee is the shirt under it, the vest the top colour
  const VEST = T0 === 'vest', B = (VEST ? 'tee' : T0) as Exclude<typeof T0, 'vest'>, shirtC = VEST ? mat('#D9DCE0', 0.8, { double: true }) : topC;
  if (onePiece) {
    mesh(torsoShell(0.008, h(0.4)), mat(spec.topColor, 0.8, { double: true }), body);
    const skirtG = lathe([[waist + 0.006, h(0.46)], [lerp(waist, hipR, 0.8) + 0.01, h(0.25)], [hipR + 0.02, h(0.1)], [hipR + 0.1, hipY - 0.14], [hipR + 0.15, hipY - 0.3], [hipR + 0.16, hipY - 0.32]], seg); skirtG.scale(1, 1, 0.9);
    mesh(skirtG, mat(spec.topColor, 0.85, { double: true }), body);
    mesh(new TorusGeometry(waist + 0.01, 0.01, 6, 20), mat(shade(spec.topColor, -0.35), 0.7), body, [0, h(0.43), 0], [Math.PI / 2, 0, 0], [1, depth, 1]);
  } else {
    const hem = { tee: h(0.04), shirt: h(0.02), hoodie: h(-0.04), jacket: h(-0.02), kaftan: hipY - 0.3, jersey: h(-0.02) }[B];
    const off = { tee: 0.01, shirt: 0.009, hoodie: 0.022, jacket: 0.03, kaftan: 0.028, jersey: 0.012 }[B];
    mesh(torsoShell(off, hem, B === 'kaftan' ? 0.1 : 0.006), shirtC, body);
    if (VEST) { // the vest: open at the front, standing collar, snug to the body; sleeveless
      const vp: Pt[] = []; for (const [r, y] of torsoProf) if (y >= h(0.0) && y < h(1.0) + 0.05) vp.push([r + off + 0.016, y]);
      vp.unshift([profileAt(torsoProf, h(0.0)) + off + 0.016, h(0.0)]);
      const vg = new LatheGeometry(vp.map(([r, y]) => new Vector2(r, y)), seg, 0.52, Math.PI * 2 - 1.04); vg.scale(1, 1, depth); mesh(vg, topC, body);
      mesh(new TorusGeometry(neckR * 1.75, 0.014, 6, 16, Math.PI * 2 - 1.0), topDark, body, [0, h(1.0) + 0.052, 0.0], [Math.PI / 2, 0, Math.PI / 2 + 0.5]);
    }
    mesh(new TorusGeometry(neckR * 1.55, 0.008, 6, 16), B === 'shirt' ? topTrim : topDark, body, [0, h(1.0) + 0.04, 0.0], [Math.PI / 2, 0, 0]);
    if (B === 'hoodie') mesh(new SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.6), topC, body, [0, shoulderY + 0.07, -0.07], [0.35, 0, 0], [1.15, 0.9, 0.8]);
    if (B === 'kaftan') mesh(new BoxGeometry(0.035, T * 0.75 + 0.3, 0.008), mat('#E5B93C', 0.4, { metal: 0.5 }), body, [0, hipY + T * 0.5 - 0.1, (waist + 0.03) * depth + 0.012]);
    if (B === 'jersey') mesh(new TorusGeometry(profileAt(torsoProf, hem) + off + 0.006, 0.008, 6, 20), mat('#FFFFFF', 0.7), body, [0, hem + 0.004, 0], [Math.PI / 2, 0, 0], [1, depth + 0.02, 1]);
  }

  // ---- chain: lies ON the garment (its radius follows the body plus the garment's thickness), never inside it
  if (spec.accessory === 'chain') {
    const g = mat('#E5B93C', 0.25, { metal: 0.85 }), cy = shoulderY - 0.035, thick = onePiece ? 0.008 : ({ tee: 0.01, shirt: 0.009, hoodie: 0.022, jacket: 0.03, kaftan: 0.028, jersey: 0.012 }[B]) + (VEST ? 0.016 : 0);
    const cr = profileAt(torsoProf, cy) + thick + 0.014;
    mesh(new TorusGeometry(cr, 0.006, 6, 24), g, body, [0, cy, 0], [Math.PI / 2, 0, 0], [1, depth, 1]);
    mesh(new SphereGeometry(0.017, 8, 6), g, body, [0, cy - 0.015, (cr + 0.01) * depth]);
  }

  // ---- pelvis / legs
  const pelvis = lathe([[profileAt(torsoProf, hipY + 0.19) + 0.006, hipY + 0.19], [profileAt(torsoProf, hipY + 0.1) + 0.008, hipY + 0.1], [hipR + 0.012, hipY], [hipR * 0.9, hipY - 0.05]], seg); pelvis.scale(1, 1, depth + 0.012);
  const trousers = spec.bottom === 'jeans' || spec.bottom === 'trousers' || spec.bottom === 'shorts';
  if (trousers) mesh(pelvis, botC, body);
  if (spec.bottom === 'skirt') {
    const sk = lathe([[waist + 0.006, h(0.46)], [lerp(waist, hipR, 0.7) + 0.012, h(0.25)], [hipR + 0.02, h(0.1)], [hipR + 0.08, hipY - 0.15], [hipR + 0.1, hipY - 0.3]], seg); sk.scale(1, 1, 0.9);
    mesh(sk, botC, body); mesh(new TorusGeometry(waist + 0.01, 0.011, 6, 20), botBand, body, [0, h(0.46), 0], [Math.PI / 2, 0, 0], [1, depth, 1]);
  }

  const mkLeg = (s: number) => {
    const hip = grp(body, s * hipX, hipY, 0);
    const r0 = (fem ? 0.092 : 0.088) * lk, rm = 0.075 * lk, r1 = 0.056 * lk;
    mesh(lathe(limbPts(thigh, r0, rm, r1), Math.max(6, seg / 2 + 2)), skinM, hip);
    const knee = grp(hip, 0, -thigh, 0);
    mesh(lathe(limbPts(calf, r1 * 1.02, 0.056 * lk, 0.036 * lk), Math.max(6, seg / 2)), skinM, knee);
    const baggy = spec.bottom === 'trousers', skinny = spec.bottom === 'jeans';
    if (trousers) {
      const len = spec.bottom === 'shorts' ? thigh * 0.62 : thigh;
      mesh(lathe(tubePts(len, r0 + (baggy ? 0.026 : 0.012), (r0 + r1) / 2 + (baggy ? 0.03 : 0.013), spec.bottom === 'shorts' ? r1 + 0.03 : r1 + 0.012), 12), botC, hip);
      if (spec.bottom !== 'shorts') mesh(lathe(tubePts(calf, r1 + (baggy ? 0.03 : 0.012), 0.056 * lk + (baggy ? 0.03 : 0.012), (skinny ? 0.036 * lk + 0.012 : 0.036 * lk + 0.03)), 12), botC, knee);
    }
    mesh(new SphereGeometry(r1 * 0.5, 10, 8), skinM, knee);
    const foot = grp(knee, 0, -calf, 0);  // ankle joint, 0.075 above the ground
    const fs = st.foot, sneaker = spec.shoes === 'sneakers', boots = spec.shoes === 'boots', sandal = spec.shoes === 'sandals';
    const sc = mat(spec.shoeColor, 0.7), sole = mat(sneaker ? '#F4F1EA' : '#15181D', 0.6);
    const fw = 0.088 * Math.min(1.12, lk), side = s;
    if (spec.shoes === 'barefoot' || sandal) mesh(footGeo(side, fw, fs), skinM, foot);
    if (sneaker || boots) { const sg = shoeGeo(boots ? 'boot' : 'sneaker', fw * 1.04, fs); mesh(sg.upper, sc, foot); mesh(sg.sole, sole, foot); }
    if (sandal) {
      const slab = sideExtrude([[-0.062, GY], [0.15, GY], [0.162, GY + 0.006], [0.164, GY + 0.016], [-0.06, GY + 0.016]], fw * 1.04, 0.004); slab.scale(1, 1, fs); mesh(slab, sole, foot);
      for (const z of [0.02, 0.085]) mesh(new BoxGeometry(fw * 1.06, 0.012, 0.016), sc, foot, [0, z < 0.05 ? -0.012 : -0.036, z * fs], [z < 0.05 ? 0.2 : 0.35, 0, 0]);
    }
    return { hip, knee };
  };
  const L = mkLeg(-1), Rr = mkLeg(1);

  // ---- arms
  const mkArm = (s: number) => {
    const r0 = 0.05 * lk;
    const sh = grp(body, s * (shr * 0.98 + r0 * 0.42), shoulderY - 0.05, 0); sh.rotation.z = s * 0.06;
    const r1 = 0.043 * lk, r2 = 0.033 * lk;
    mesh(new SphereGeometry(r0 * 1.08, 8, 6), skinM, sh, [-s * 0.004, 0.012, 0], undefined, [1.02, 1.2, 1]); // deltoid
    mesh(lathe(limbPts(upper, r0, r1, r1 * 0.92), 10), skinM, sh);
    const elbow = grp(sh, 0, -upper, 0); elbow.rotation.x = -0.18;
    mesh(new SphereGeometry(r1 * 0.5, 10, 8), skinM, elbow);
    mesh(lathe(limbPts(fore, r1 * 0.95, r1 * 0.9, r2), 10), skinM, elbow);
    const hand = grp(elbow, 0, -fore, 0), hs = st.hand;
    mesh(handGeo(s, hs), skinM, hand);
    if (spec.bro && s === -1) mesh(new CylinderGeometry(r2 + 0.009, r2 + 0.009, 0.034, 12), mat('#0A0A0C', 0.5), elbow, [0, -fore * 0.9, 0]); // the black Brotherhood bracelet, on the left wrist
    // sleeves
    const sleeveLen = B === 'tee' || B === 'jersey' ? upper * 0.45 : B === 'kaftan' ? upper * 1.1 : upper;
    const so = { tee: 0.008, shirt: 0.008, hoodie: 0.016, jacket: 0.022, kaftan: 0.022, jersey: 0.01 }[B], flare = B === 'kaftan' ? 0.06 : 0.006;
    mesh(lathe([[0.001, r0 * 1.2 + so + 0.006], [(r0 + so) * 0.8, r0 * 1.1 + so], [(r0 + so) * 1.04, r0 * 0.42], [r0 + so, 0], [r1 + so + flare * 0.4, -sleeveLen * 0.5], [r1 * 0.92 + so + flare, -sleeveLen]], 12), shirtC, sh);
    if (B === 'shirt' || B === 'hoodie' || B === 'jacket') {
      mesh(lathe(tubePts(fore * 0.92, r1 * 0.95 + so, r1 * 0.9 + so, r2 + so + 0.002), 10), topC, elbow);
      mesh(new TorusGeometry(r2 + so + 0.002, 0.007, 5, 12), T0 === 'shirt' ? topTrim : topDark, elbow, [0, -fore * 0.92, 0], [Math.PI / 2, 0, 0]);
    }
    return { sh, elbow, hand };
  };
  const AL = mkArm(-1), AR = mkArm(1);

  // ---- holster: a carried weapon shows as a small holster and grip on the right hip; it is hidden under a jacket or hoodie (concealed)
  if (spec.gun && spec.top !== 'jacket' && spec.top !== 'hoodie') {
    const hx = hipX + 0.1 + (onePiece ? 0.03 : 0), leather = mat('#2B1D12', 0.8), steel = mat('#1A1C20', 0.5, { metal: 0.4 });
    mesh(new BoxGeometry(0.05, 0.14, 0.09), leather, body, [hx, hipY + 0.02, 0.02], [0, 0, -0.08]);
    mesh(new BoxGeometry(0.034, 0.075, 0.03), steel, body, [hx + 0.004, hipY + 0.11, 0.02], [0, 0, -0.18]);
  }

  // ---- bag (bought in the Boutique): hand-carried bags hang from the right hand and swing with it; the others sit on the body
  if (spec.bag !== 'none') {
    const bc = mat(spec.bagColor, 0.5), bd = mat(shade(spec.bagColor, -0.3), 0.55), gold = mat('#E5B93C', 0.25, { metal: 0.85 });
    const tz = (y: number) => profileAt(torsoProf, y) * depth; // front surface of the torso at height y
    const strap = (a: [number, number, number], b: [number, number, number], r = 0.011) => mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(...a), new Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + (a[2] >= 0 ? 0.01 : -0.01)), new Vector3(...b)]), 10, r, 5, false), bd, body);
    const slab = (w: number, hgt: number, d: number, m: Material, parent: Group, pos: [number, number, number], rot?: [number, number, number]) => mesh(new BoxGeometry(w, hgt, d), m, parent, pos, rot);
    if (spec.bag === 'crossbody') {
      const hx = -(hipR + 0.03), hy = hipY + 0.02;
      strap([sx * 0.55, shoulderY + 0.005, tz(shoulderY) * 0.55 + 0.02], [hx, hy, tz(hy) * 0.85 + 0.03]);
      strap([sx * 0.55, shoulderY + 0.005, -tz(shoulderY) * 0.55 - 0.02], [hx, hy, -tz(hy) * 0.85 - 0.03]);
      slab(0.17, 0.12, 0.06, bc, body, [hx - 0.02, hy - 0.04, 0.0]); slab(0.172, 0.05, 0.064, bd, body, [hx - 0.02, hy - 0.005, 0.0]); slab(0.03, 0.03, 0.01, gold, body, [hx - 0.02, hy - 0.03, 0.035]);
    }
    if (spec.bag === 'tote') {
      const bx = sx + 0.085, by = hipY + 0.01;
      strap([sx * 0.78, shoulderY + 0.0, 0.03], [bx, by + 0.17, 0.03], 0.012); strap([sx * 0.78, shoulderY + 0.0, -0.03], [bx, by + 0.17, -0.03], 0.012);
      slab(0.07, 0.27, 0.22, bc, body, [bx + 0.02, by, 0]); slab(0.072, 0.03, 0.222, bd, body, [bx + 0.02, by + 0.135, 0]);
    }
    if (spec.bag === 'backpack') {
      const back = -(tz(h(0.55)) + 0.075);
      slab(0.25, 0.34, 0.13, bc, body, [0, h(0.55), back]); slab(0.2, 0.14, 0.05, bd, body, [0, h(0.45), back - 0.08]); slab(0.255, 0.04, 0.135, bd, body, [0, h(0.7), back]);
      for (const sd of [-1, 1]) { strap([sd * 0.072, shoulderY + 0.005, tz(shoulderY) * 0.3 + 0.02], [sd * 0.1, h(0.38), tz(h(0.38)) + 0.012], 0.013); strap([sd * 0.072, shoulderY + 0.005, -0.045], [sd * 0.1, h(0.62), back + 0.05], 0.013); }
    }
    if (spec.bag === 'handbag') {
      const hg = AR.hand;
      slab(0.25, 0.17, 0.1, bc, hg, [0.02, -0.2, 0.03]); slab(0.255, 0.05, 0.104, bd, hg, [0.02, -0.14, 0.03]); slab(0.035, 0.03, 0.01, gold, hg, [0.02, -0.17, 0.085]);
      mesh(new TorusGeometry(0.065, 0.007, 5, 12, Math.PI), gold, hg, [0.02, -0.115, 0.03], [0, 0, 0]);
    }
    if (spec.bag === 'clutch') {
      const hg = AR.hand;
      slab(0.22, 0.12, 0.04, bc, hg, [0.0, -0.075, 0.07], [0.5, 0, 0.12]); slab(0.222, 0.045, 0.044, bd, hg, [0.0, -0.04, 0.085], [0.5, 0, 0.12]); mesh(new IcosahedronGeometry(0.014, 0), gold, hg, [0.0, -0.058, 0.108]);
    }
  }

  const total = headY + R * 1.14;
  const dispose = () => root.traverse((o) => { const g = (o as Mesh).geometry as BufferGeometry | undefined; if (g) g.dispose(); });
  return { dispose, root, body, head, hipL: L.hip, hipR: Rr.hip, kneeL: L.knee, kneeR: Rr.knee, shoulderL: AL.sh, shoulderR: AR.sh, elbowL: AL.elbow, elbowR: AR.elbow, height: total };
}

export const DEFAULT_EYE = '#2A1A10';
/** Appearance (what the game stores) -> builder spec. New fields are optional, so old saves and NPCs still work. */
export function toSpec(a: Appearance): Spec {
  return {
    body: a.body ?? 'masc', skin: a.skin, eye: a.eye ?? DEFAULT_EYE, hair: a.hairStyle, hairColor: a.hairColor, beard: a.beard ?? 'none',
    top: a.top, topColor: a.topColor, bottom: a.bottom, bottomColor: a.bottomColor, shoes: a.shoes, shoeColor: a.shoeColor, accessory: a.accessory, bag: a.bag ?? 'none', bagColor: a.bagColor ?? '#8A4B2A', gun: !!a.gun, bro: a.bro,
  };
}
