/**
 * Procedural low-poly person. No model files: every body part, garment, hairstyle and beard is generated from an Appearance.
 * Units are metres, feet at y = 0, the face looks down +z. Joints are exposed on the returned rig so the avatar component
 * (and later a proper animation system) can pose them: hips/knees (legs), shoulders/elbows (arms), body (whole figure), head.
 * Garments are shells built from the same body silhouette, so any outfit fits any body type.
 */
import type { Appearance } from '@/types/game';
import {
  BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, LatheGeometry,
  Material, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
  BoxGeometry, ExtrudeGeometry, Shape, Matrix4, Quaternion, Euler,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ spec
export interface Spec {
  body: 'masc' | 'femme';
  skin: string; eye: string;
  hair: 'bald' | 'lowcut' | 'fade' | 'afro' | 'braids' | 'dreads' | 'bun' | 'cornrows' | 'twists';
  hairColor: string; beard: 'none' | 'stubble' | 'moustache' | 'goatee' | 'full';
  top: 'tee' | 'shirt' | 'hoodie' | 'jacket' | 'kaftan' | 'jersey'; topColor: string;
  bottom: 'jeans' | 'shorts' | 'trousers' | 'skirt' | 'dress'; bottomColor: string;
  shoes: 'sneakers' | 'boots' | 'sandals' | 'barefoot'; shoeColor: string;
  accessory: 'none' | 'glasses' | 'cap' | 'chain' | 'earrings';
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
const POLY: Style = { name: 'Low-Poly Faceted', head: 0.112, legs: 0.84, torso: 0.52, shoulder: 0.21, limb: 1.05, arm: 1.0, hand: 1.0, foot: 1.0, eye: 1.0, face: 'simple', shade: 'flat', rough: 0.9, seg: 7, femWaist: 0.9 };

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
/** Flat-shaded materials, shared by every character (never disposed with a single avatar). */
function makeMat(_st: Style, color: string, rough = 0.8, opts: { double?: boolean; metal?: number } = {}): Material {
  const key = `${color}|${rough}|${!!opts.double}|${opts.metal ?? 0}`;
  let m = matCache.get(key);
  if (!m) { m = new MeshStandardMaterial({ color, roughness: rough, metalness: opts.metal ?? 0, flatShading: true }); if (opts.double) m.side = DoubleSide; matCache.set(key, m); }
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
function headGeo(R: number, seg: number, jaw = 1): BufferGeometry {
  const g = new SphereGeometry(R, seg, Math.max(7, Math.round(seg * 0.75)));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y *= 1.14;
    if (z < 0) z *= 1.05;                                              // back of the skull
    if (y > 0.25 * R && z > 0) z *= 1 - 0.07 * ((y - 0.25 * R) / R) ** 2 * 3; // sloping forehead
    if (y < 0) { const t = Math.min(1, -y / (1.2 * R)); const k = 1 - 0.3 * jaw * t * t; x *= k; z *= 1 - 0.1 * t * t; if (z > 0 && t > 0.5) z += 0.16 * R * (t - 0.5); } // jaw and chin
    if (y < 0.1 * R && y > -0.4 * R && z > 0) x *= 1 + 0.05 * Math.sin(((y + 0.4 * R) / (0.5 * R)) * Math.PI); // cheekbones
    if (z > 0.2 * R) z *= 0.97;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
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
  const waist = (fem ? 0.118 : 0.142) * lk * (fem ? 1 - 0.1 * (st.femWaist - 1) : 1), hipR = (fem ? 0.158 : 0.15) * (1 + (fem ? 0.06 * (st.femWaist - 1) : 0)) * (0.92 + lk * 0.08);
  const chest = (fem ? 0.148 : 0.172) * (0.9 + lk * 0.1), shr = sx * 0.95;
  // torso silhouette: (radius, y). Lathe is symmetric, so it is squashed in z for depth.
  const torsoProf: Pt[] = [[0.001, h(0)], [hipR * 0.96, h(0.01)], [hipR, h(0.12)], [lerp(hipR, waist, 0.85), h(0.3)], [waist, h(0.42)], [lerp(waist, chest, 0.7), h(0.62)], [chest, h(0.78)], [lerp(chest, shr, 0.65), h(0.88)], [shr, h(0.935)], [shr * 0.9, h(0.975)], [shr * 0.6, h(1.0) + 0.006], [0.088 * lk, h(1.0) + 0.032], [0.066 * lk, h(1.0) + 0.052], [0.056 * lk, h(1.0) + 0.066]];
  const depth = fem ? 0.66 : 0.64;

  const root = new Group(), body = grp(root);
  const skinM = mat(spec.skin, st.rough);

  // ---- torso, neck
  const torsoG = lathe(torsoProf, seg); torsoG.scale(1, 1, depth);
  mesh(torsoG, skinM, body);
  const neckR = 0.052 * lk * (fem ? 0.9 : 1.05);
  mesh(lathe([[neckR * 1.1, shoulderY - 0.02], [neckR, shoulderY + 0.03], [neckR * 0.96, shoulderY + neckLen + 0.03]], Math.max(6, seg / 2)), skinM, body);

  // ---- head + face
  const hseg = 12; // the head is built finer than the rest, so the face has enough facets to read as a face
  const head = grp(body, 0, headY, 0);
  const jawK = fem ? 0.85 : 1.05;
  mesh(headGeo(R, hseg, jawK), skinM, head);
  const surf = (x: number, y: number) => { const yy = y / 1.14; const q = R * R - x * x - yy * yy; return q > 0 ? Math.sqrt(q) * 0.985 : 0; };
  const eyeY = R * 0.1, eyeX = R * 0.38, er = R * 0.16;
  const dark = mat('#14100E', 0.35), white = mat('#F2EFE8', 0.5), irisM = mat(spec.eye, 0.4);
  const lidM = mat(shade(spec.skin, -0.3), 0.7), browM = mat(spec.hair === 'bald' ? shade(spec.skin, -0.5) : mix(spec.hairColor, '#000000', 0.15), 0.9);
  const lipM = mat(fem ? mix(shade(spec.skin, -0.3), '#B03A4A', 0.4) : shade(spec.skin, -0.28), 0.5);
  const ico = (r: number) => new IcosahedronGeometry(r, 0);
  // ears: a flattened shell with a lobe
  for (const s of [-1, 1]) {
    mesh(ico(R * 0.21), skinM, head, [s * R * 0.97, R * 0.0, -R * 0.06], undefined, [0.38, 1, 0.72]);
    mesh(ico(R * 0.07), skinM, head, [s * R * 0.99, -R * 0.2, -R * 0.03], undefined, [0.5, 1, 0.8]);
  }
  // brow ridge: heavier on the masculine face
  mesh(new BoxGeometry(R * 0.78, R * (fem ? 0.06 : 0.085), R * 0.09), skinM, head, [0, eyeY + R * 0.17, surf(0, eyeY + R * 0.17) - R * 0.005], [0.12, 0, 0]);
  for (const s of [-1, 1]) {
    const z = surf(s * eyeX, eyeY);
    mesh(new BoxGeometry(R * 0.24, R * 0.1, R * 0.06), white, head, [s * eyeX, eyeY, z - R * 0.005]);                       // eye white
    mesh(new BoxGeometry(R * 0.1, R * 0.1, R * 0.06), irisM, head, [s * eyeX, eyeY - R * 0.005, z + R * 0.02]);             // iris
    mesh(new BoxGeometry(R * 0.045, R * 0.055, R * 0.06), dark, head, [s * eyeX, eyeY - R * 0.005, z + R * 0.035]);         // pupil
    mesh(new BoxGeometry(R * 0.28, R * 0.034, R * 0.07), lidM, head, [s * eyeX, eyeY + R * 0.065, z + R * 0.004], [0.12, 0, -s * 0.1]); // upper lid
    mesh(new BoxGeometry(R * 0.31, R * 0.045, R * 0.06), browM, head, [s * eyeX, eyeY + R * 0.21, surf(s * eyeX, eyeY + R * 0.21) + R * 0.012], [0.2, 0, -s * (fem ? 0.2 : 0.07)]);
  }
  // nose: bridge, tip and two nostril wings
  const nz = (y: number) => surf(0, y);
  mesh(new CylinderGeometry(R * 0.055, R * 0.1, R * 0.36, 4), skinM, head, [0, -R * 0.04, nz(-R * 0.04) + R * 0.03], [-0.28, Math.PI / 4, 0], [1, 1, 0.75]);
  mesh(ico(R * 0.125), skinM, head, [0, -R * 0.215, nz(-R * 0.2) + R * 0.085], undefined, [1, 0.85, 1.1]);
  for (const s of [-1, 1]) mesh(ico(R * 0.08), skinM, head, [s * R * 0.115, -R * 0.235, nz(-R * 0.22) + R * 0.035]);
  // mouth: upper lip, lower lip and the line between them
  const lz = (y: number) => surf(0, y) + R * 0.035, fl = fem ? 1.25 : 1;
  mesh(new BoxGeometry(R * 0.36, R * 0.055 * fl, R * 0.08), lipM, head, [0, -R * 0.47, lz(-R * 0.47)], [0.1, 0, 0]);
  mesh(new BoxGeometry(R * 0.3, R * 0.07 * fl, R * 0.08), lipM, head, [0, -R * 0.555, lz(-R * 0.555)], [0.15, 0, 0]);
  mesh(new BoxGeometry(R * 0.33, R * 0.014, R * 0.08), dark, head, [0, -R * 0.508, lz(-R * 0.508) + R * 0.01]);

  // ---- hair + facial hair (shells that hug the skull)
  const hc = mat(spec.hairColor, 0.9);
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
  }
  // facial hair
  if (spec.beard !== 'none' && !fem) {
    const beardM = mat(spec.hairColor, 0.95);
    if (spec.beard === 'full') mesh(headShell(R, hseg, (x, y, z) => y < -R * 0.28 && z > -R * 0.2 && !(Math.abs(x) < R * 0.36 && y > -R * 0.6 && y < -R * 0.36 && z > R * 0.3), (_x, y) => R * (y < -R * 0.5 ? 0.05 : 0.035), jawK), beardM, head);
    if (spec.beard === 'stubble') mesh(headShell(R, hseg, (_x, y, z) => y < -R * 0.15 && z > R * 0.05, () => 0.012 * R, jawK), mat(mix(spec.skin, spec.hairColor, 0.55), 1), head);
    if (spec.beard === 'goatee') mesh(headShell(R, hseg, (x, y, z) => y < -R * 0.62 && Math.abs(x) < R * 0.38 && z > R * 0.2, () => 0.05 * R, jawK), beardM, head);
    if (spec.beard === 'moustache' || spec.beard === 'full' || spec.beard === 'goatee') mesh(new SphereGeometry(R * 0.2, 10, 8), beardM, head, [0, -R * 0.38, surf(0, -R * 0.4) - R * 0.02], undefined, [1.4, 0.32, 0.5]);
  }

  // ---- accessories
  if (spec.accessory === 'glasses') {
    const f = mat('#15181D', 0.3, { metal: 0.4 });
    for (const s of [-1, 1]) { mesh(new TorusGeometry(er * 1.7, R * 0.025, 6, 20), f, head, [s * eyeX, eyeY, surf(s * eyeX, eyeY) + R * 0.06]); mesh(new BoxGeometry(R * 0.02, R * 0.02, R * 0.9), f, head, [s * R * 0.95, eyeY + R * 0.02, R * 0.4]); }
    mesh(new BoxGeometry(R * 0.2, R * 0.025, R * 0.025), f, head, [0, eyeY + R * 0.05, surf(0, eyeY) + R * 0.06]);
  }
  if (spec.accessory === 'cap') {
    mesh(new SphereGeometry(R * 1.1, seg, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(spec.topColor, 0.8), head, [0, R * 0.12, -R * 0.02], [-0.18, 0, 0], [1, 1.1, 1.05]);
    mesh(new CylinderGeometry(R * 1.1, R * 1.1, R * 0.05, 14, 1, false, -Math.PI / 2, Math.PI), mat(shade(spec.topColor, -0.15), 0.8), head, [0, R * 0.5, R * 0.95], [0.12, 0, 0]);
  }
  if (spec.accessory === 'earrings') for (const s of [-1, 1]) mesh(new TorusGeometry(R * 0.1, R * 0.02, 6, 14), mat('#E5B93C', 0.25, { metal: 0.85 }), head, [s * R * 0.97, -R * 0.28, -R * 0.05], [0, Math.PI / 2, 0]);
  if (spec.accessory === 'chain') { const g = mat('#E5B93C', 0.25, { metal: 0.85 }); mesh(new TorusGeometry(0.1, 0.005, 6, 22), g, body, [0, shoulderY - 0.03, 0.02], [Math.PI / 2.2, 0, 0], [1, 1.2, 1]); mesh(new SphereGeometry(0.016, 8, 6), g, body, [0, shoulderY - 0.13, 0.085]); }

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
  if (onePiece) {
    mesh(torsoShell(0.008, h(0.4)), mat(spec.topColor, 0.8, { double: true }), body);
    const skirtG = lathe([[waist + 0.006, h(0.46)], [lerp(waist, hipR, 0.8) + 0.01, h(0.25)], [hipR + 0.02, h(0.1)], [hipR + 0.1, hipY - 0.14], [hipR + 0.15, hipY - 0.3], [hipR + 0.16, hipY - 0.32]], seg); skirtG.scale(1, 1, 0.9);
    mesh(skirtG, mat(spec.topColor, 0.85, { double: true }), body);
    mesh(new TorusGeometry(waist + 0.01, 0.01, 6, 20), mat(shade(spec.topColor, -0.35), 0.7), body, [0, h(0.43), 0], [Math.PI / 2, 0, 0], [1, depth, 1]);
  } else {
    const hem = { tee: h(0.04), shirt: h(0.02), hoodie: h(-0.04), jacket: h(-0.02), kaftan: hipY - 0.3, jersey: h(-0.02) }[T0];
    const off = { tee: 0.01, shirt: 0.009, hoodie: 0.022, jacket: 0.03, kaftan: 0.028, jersey: 0.012 }[T0];
    mesh(torsoShell(off, hem, T0 === 'kaftan' ? 0.1 : 0.006), topC, body);
    mesh(new TorusGeometry(neckR * 1.55, 0.008, 6, 16), T0 === 'shirt' ? topTrim : topDark, body, [0, h(1.0) + 0.04, 0.0], [Math.PI / 2, 0, 0]);
    if (T0 === 'hoodie') mesh(new SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.6), topC, body, [0, shoulderY + 0.07, -0.07], [0.35, 0, 0], [1.15, 0.9, 0.8]);
    if (T0 === 'kaftan') mesh(new BoxGeometry(0.035, T * 0.75 + 0.3, 0.008), mat('#E5B93C', 0.4, { metal: 0.5 }), body, [0, hipY + T * 0.5 - 0.1, (waist + 0.03) * depth + 0.012]);
    if (T0 === 'jersey') mesh(new TorusGeometry(profileAt(torsoProf, hem) + off + 0.006, 0.008, 6, 20), mat('#FFFFFF', 0.7), body, [0, hem + 0.004, 0], [Math.PI / 2, 0, 0], [1, depth + 0.02, 1]);
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
    mesh(new SphereGeometry(r1 * 0.72, 10, 8), skinM, knee);
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
    const sh = grp(body, s * sx, shoulderY - 0.05, 0); sh.rotation.z = s * 0.06;
    const r0 = 0.05 * lk, r1 = 0.043 * lk, r2 = 0.033 * lk;
    mesh(new SphereGeometry(r0 * 1.08, 8, 6), skinM, sh, [-s * 0.004, 0.012, 0], undefined, [1.02, 1.2, 1]); // deltoid
    mesh(lathe(limbPts(upper, r0, r1, r1 * 0.92), 10), skinM, sh);
    const elbow = grp(sh, 0, -upper, 0); elbow.rotation.x = -0.18;
    mesh(new SphereGeometry(r1 * 0.72, 10, 8), skinM, elbow);
    mesh(lathe(limbPts(fore, r1 * 0.95, r1 * 0.9, r2), 10), skinM, elbow);
    const hand = grp(elbow, 0, -fore, 0), hs = st.hand;
    mesh(handGeo(s, hs), skinM, hand);
    // sleeves
    const sleeveLen = T0 === 'tee' || T0 === 'jersey' ? upper * 0.45 : T0 === 'kaftan' ? upper * 1.1 : upper;
    const so = { tee: 0.008, shirt: 0.008, hoodie: 0.016, jacket: 0.022, kaftan: 0.022, jersey: 0.01 }[T0], flare = T0 === 'kaftan' ? 0.06 : 0.006;
    mesh(lathe([[0.001, r0 * 1.3 + so + 0.012], [(r0 + so) * 0.75, r0 * 1.25 + so + 0.004], [(r0 + so) * 1.06, r0 * 0.5], [r0 + so, 0], [r1 + so + flare * 0.4, -sleeveLen * 0.5], [r1 * 0.92 + so + flare, -sleeveLen]], 12), topC, sh);
    if (T0 === 'shirt' || T0 === 'hoodie' || T0 === 'jacket') {
      mesh(lathe(tubePts(fore * 0.92, r1 * 0.95 + so, r1 * 0.9 + so, r2 + so + 0.002), 10), topC, elbow);
      mesh(new TorusGeometry(r2 + so + 0.002, 0.007, 5, 12), T0 === 'shirt' ? topTrim : topDark, elbow, [0, -fore * 0.92, 0], [Math.PI / 2, 0, 0]);
    }
    return { sh, elbow };
  };
  const AL = mkArm(-1), AR = mkArm(1);

  const total = headY + R * 1.14;
  const dispose = () => root.traverse((o) => { const g = (o as Mesh).geometry as BufferGeometry | undefined; if (g) g.dispose(); });
  return { dispose, root, body, head, hipL: L.hip, hipR: Rr.hip, kneeL: L.knee, kneeR: Rr.knee, shoulderL: AL.sh, shoulderR: AR.sh, elbowL: AL.elbow, elbowR: AR.elbow, height: total };
}

export const DEFAULT_EYE = '#2A1A10';
/** Appearance (what the game stores) -> builder spec. New fields are optional, so old saves and NPCs still work. */
export function toSpec(a: Appearance): Spec {
  return {
    body: a.body ?? 'masc', skin: a.skin, eye: a.eye ?? DEFAULT_EYE, hair: a.hairStyle, hairColor: a.hairColor, beard: a.beard ?? 'none',
    top: a.top, topColor: a.topColor, bottom: a.bottom, bottomColor: a.bottomColor, shoes: a.shoes, shoeColor: a.shoeColor, accessory: a.accessory,
  };
}
