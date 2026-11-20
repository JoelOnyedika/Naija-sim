/**
 * Procedural clothes for the rigged body. A garment is a copy of part of the body's own surface, pushed out a little along the
 * normals. So it fits every body, follows the same bones and bends with them, and each style is only a rule for which part to
 * copy (which region, how far down, how far along the arm) and how thick to make it. Bags, chain, holster and insignia are
 * small rigid pieces fixed to a bone.
 */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, LatheGeometry, Material, Matrix4, Mesh, MeshStandardMaterial,
  Object3D, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3, type Group,
} from 'three';
import type { BodyTemplate, Region } from './bodyAsset';
import { buildShoe, type ShoeKind } from './shoes';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeSkinned, type makeSkeleton } from './bodyAsset';
import { handGeo, type HostCtx, type Spec } from './build';
import type { BasePose } from './rigged';

export interface Dressing { dispose: () => void }
type V = { region: Region; x: number; y: number; z: number };
type Pick = (v: V) => boolean;

/** Copies the triangles whose three corners all pass `pick`, moving each vertex out along its normal by `off(v)`. Cached per template + key. */
/** The body repeats vertices along hard edges, each with its own normal; pushing those out separately would tear the garment open at the seams. These normals are averaged over every vertex at the same spot. */
const weldCache = new Map<string, BufferAttribute>();
function weldedNormals(t: BodyTemplate): BufferAttribute {
  const hit = weldCache.get(t.kind); if (hit) return hit;
  const P = t.geometry.attributes.position, N = t.geometry.attributes.normal, sum = new Map<string, number[]>(), key = (i: number) => `${Math.round(P.getX(i) * 2000)},${Math.round(P.getY(i) * 2000)},${Math.round(P.getZ(i) * 2000)}`;
  for (let i = 0; i < P.count; i++) { const k = key(i), a = sum.get(k) ?? [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); sum.set(k, a); }
  const out = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { const a = sum.get(key(i))!, l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
  const attr = new BufferAttribute(out, 3); weldCache.set(t.kind, attr); return attr;
}
const geoCache = new Map<string, BufferGeometry>();
function extract(t: BodyTemplate, key: string, pick: Pick, off: (v: V) => number, colour?: (v: V) => Color): BufferGeometry {
  const ck = `${t.kind}:${key}`, hit = geoCache.get(ck); if (hit) return hit;
  const g = t.geometry, P = g.attributes.position, N = weldedNormals(t), SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, ix = g.index!;
  const ok = new Map<number, boolean>(), vOf = (i: number): V => ({ region: t.region[i], x: P.getX(i), y: P.getY(i), z: P.getZ(i) });
  const pass = (i: number) => { let r = ok.get(i); if (r === undefined) { r = pick(vOf(i)); ok.set(i, r); } return r; };
  const remap = new Map<number, number>(), pos: number[] = [], nor: number[] = [], si: number[] = [], sw: number[] = [], col: number[] = [], idx: number[] = [];
  const take = (i: number) => {
    let n = remap.get(i); if (n !== undefined) return n; n = remap.size; remap.set(i, n);
    const v = vOf(i), o = off(v); pos.push(P.getX(i) + N.getX(i) * o, P.getY(i) + N.getY(i) * o, P.getZ(i) + N.getZ(i) * o); nor.push(N.getX(i), N.getY(i), N.getZ(i));
    for (let k = 0; k < 4; k++) { si.push(SI.getComponent(i, k)); sw.push(SW.getComponent(i, k)); }
    if (colour) { const c = colour(v); col.push(c.r, c.g, c.b); } return n;
  };
  for (let k = 0; k < ix.count; k += 3) { const a = ix.getX(k), b = ix.getX(k + 1), c = ix.getX(k + 2); if (pass(a) && pass(b) && pass(c)) idx.push(take(a), take(b), take(c)); }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); out.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  out.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(si), 4)); out.setAttribute('skinWeight', new BufferAttribute(new Float32Array(sw), 4));
  if (colour) out.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  out.setIndex(idx); out.userData.shared = true; geoCache.set(ck, out); return out;
}

const shadeC = (hex: string, a: number) => { const c = new Color(hex); c.lerp(new Color(a < 0 ? '#000' : '#fff'), Math.abs(a)); return '#' + c.getHexString(); };
const fabricSmooth = (c: string, rough = 0.7) => new MeshStandardMaterial({ color: c, roughness: rough, flatShading: false, side: DoubleSide });
const fabric = (c: string, rough = 0.85, vertexColors = false) => new MeshStandardMaterial({ color: vertexColors ? '#ffffff' : c, roughness: rough, flatShading: false, side: DoubleSide, vertexColors });

export function dress(spec: Spec, t: BodyTemplate, sk: ReturnType<typeof makeSkeleton>, _base: BasePose, _skin: Material, ctx: HostCtx): Dressing {
  const body = ctx.body, m = t.m, fem = spec.body === 'femme', mats: Material[] = [], objs: Object3D[] = [];
  const elbowX = Math.abs(t.pos[t.index['DEF-forearmL']].x), wristX = Math.abs(t.pos[t.index['DEF-handL']].x), shX = m.armX;
  const skinned = (g: BufferGeometry, mat: Material) => { mats.push(mat); const s = makeSkinned(g, mat, sk); body.add(s); objs.push(s); return s; };

  // ---- shoes: real shoe models fitted to this body's foot (shoes.ts), fixed to the foot (and shin for boot shafts) bones
  if (spec.shoes !== 'barefoot') {
    const sole = spec.shoes === 'sneakers' ? '#F4F4F2' : spec.shoes === 'boots' ? '#2A2420' : spec.shoes === 'loafers' ? '#2A1D14' : '#E9E4DA';
    const upperMat = fabricSmooth(spec.shoeColor, spec.shoes === 'loafers' || spec.shoes === 'boots' ? 0.4 : 0.6), soleMat = fabricSmooth(sole, 0.8);
    const laceMat = fabricSmooth(spec.shoes === 'slippers' ? shadeC(spec.shoeColor, 0.35) : '#F7F7F5', 0.7), trimMat = fabricSmooth(shadeC(spec.shoeColor, -0.2), 0.5);
    mats.push(upperMat, soleMat, laceMat, trimMat);
    const byKind = { upper: upperMat, sole: soleMat, lace: laceMat, trim: trimMat };
    for (const sd of [1, -1] as const) for (const pc of buildShoe(spec.shoes as ShoeKind, t, sd)) {
      const o = new Mesh(pc.geo, byKind[pc.mat]); o.castShadow = true; mats.push(); objs.push(o);
      place(sk, t, `DEF-${pc.bone === 'foot' ? 'foot' : 'shin'}${sd === 1 ? 'L' : 'R'}`, o, new Vector3(0, 0, 0));
    }
  }
  // ---- bottoms
  const waistTop = m.hipY + 0.075;
  if (spec.bottom === 'jeans' || spec.bottom === 'trousers' || spec.bottom === 'shorts') {
    const low = spec.bottom === 'shorts' ? m.kneeY + 0.13 : 0.12, off = spec.bottom === 'jeans' ? 0.02 : 0.016;
    skinned(extract(t, `legs:${spec.bottom}`, (v) => ((v.region === 'pelvis' || v.region === 'thigh' || v.region === 'shin' || v.region === 'foot') && v.y > low && v.y < waistTop) || (v.region === 'torso' && v.y < waistTop), (v) => off + (spec.bottom === 'trousers' ? 0.004 : 0) + 0.0 * v.y), fabric(spec.bottomColor, spec.bottom === 'jeans' ? 0.9 : 0.7));
  }
  if (spec.bottom === 'jeans' || spec.bottom === 'trousers') {
    const belt = extract(t, 'belt', (v) => (v.region === 'torso' || v.region === 'pelvis') && v.y > waistTop - 0.05 && v.y < waistTop, () => 0.034);
    skinned(belt, fabric(spec.bottom === 'jeans' ? '#2A1D14' : '#16130F', 0.45));
    let fz = -9; const Pa = t.geometry.attributes.position; for (let i = 0; i < Pa.count; i++) if (Math.abs(Pa.getY(i) - (waistTop - 0.025)) < 0.02 && Math.abs(Pa.getX(i)) < 0.05) fz = Math.max(fz, Pa.getZ(i));
    if (fz > -9) { const bk = new Mesh(new BoxGeometry(0.045, 0.034, 0.012), new MeshStandardMaterial({ color: '#D9B04A', roughness: 0.3, metalness: 0.85 })); mats.push(bk.material as Material); place(sk, t, 'DEF-spine', bk, new Vector3(0, waistTop - 0.025, fz + 0.036)); }
  }
  const skirt = (len: number, flare: number, c: string) => {
    const top = m.hipY + 0.06, r0 = fem ? 0.19 : 0.2; const pts: Vector2[] = []; for (let i = 0; i <= 6; i++) { const f = i / 6; pts.push(new Vector2(r0 + flare * f * f, top - len * f)); }
    const g = new LatheGeometry(pts, 14); g.scale(1, 1, 0.78); g.translate(0, 0, -0.045);
    const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = t.index['DEF-spine']; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new BufferAttribute(si, 4)); g.setAttribute('skinWeight', new BufferAttribute(sw, 4)); return skinned(g, fabric(c, 0.75));
  };
  if (spec.bottom === 'skirt') skirt(0.3, 0.12, spec.bottomColor);
  if (spec.bottom === 'dress') skirt(0.45, 0.16, spec.bottomColor);

  // ---- tops
  const top = spec.top, tc = spec.topColor;
  const mk = (key: string, sleeves: 'none' | 'short' | 'long', hem: number, off: number, colour?: (v: V) => Color, extra?: (v: V) => number) => {
    const sleeveX = sleeves === 'short' ? shX + 0.5 * (elbowX - shX) : sleeves === 'long' ? wristX - 0.035 : shX - 0.005; // a sleeveless garment still covers the chest and shoulder blades, which the file weights to the arm
    return extract(t, key, (v) => ((v.region === 'torso' || v.region === 'pelvis') && v.y > hem) || ((v.region === 'upperarm' || (sleeves === 'long' && v.region === 'forearm')) && Math.abs(v.x) < sleeveX), (v) => off + (extra?.(v) ?? 0), colour);
  };
  const chestY = m.shoulderY - 0.13;
  // collar band, sleeve cuffs and hem band as a darker (or, on a dark garment, lighter) colour on the same garment: it reads as a ribbed neckline, cuffs and hem
  const trim = (v: V, base: string, kind: 'rib' | 'collar') => {
    const b = new Color(base), dark = b.getHSL({ h: 0, s: 0, l: 0 }).l > 0.45, band = b.clone().lerp(new Color(dark ? '#000000' : '#ffffff'), kind === 'collar' ? 0.5 : 0.3);
    const neck = v.y > m.neckY - 0.04 && (v.region === 'torso' || v.region === 'neck'), hem = (v.region === 'torso' || v.region === 'pelvis') && v.y < m.hipY - 0.04 + 0.025;
    const cuff = (v.region === 'upperarm' || v.region === 'forearm') && Math.abs(v.x) > (kind === 'rib' ? shX + 0.5 * (elbowX - shX) - 0.03 : wristX - 0.07);
    return neck || hem || cuff ? band : b;
  };
  if (top === 'tee' || top === 'shirt') skinned(mk(`top:${top}`, top === 'tee' ? 'short' : 'long', m.hipY - 0.04, top === 'tee' ? 0.02 : 0.018, (v) => trim(v, tc, top === 'tee' ? 'rib' : 'collar')), fabric(tc, 0.8, true));
  else if (top === 'jersey') { const a = new Color(tc), b = new Color('#ffffff'); skinned(mk('top:jersey', 'short', m.hipY - 0.05, 0.015, (v) => (v.y > chestY - 0.045 && v.y < chestY + 0.01 ? b : a)), fabric(tc, 0.7, true)); }
  else if (top === 'hoodie' || top === 'jacket') {
    skinned(mk(`top:${top}`, 'long', m.hipY - 0.1, top === 'hoodie' ? 0.027 : 0.024), fabric(tc, top === 'hoodie' ? 0.9 : 0.6));
    if (top === 'hoodie') { const hood = new Mesh(new IcosahedronGeometry(0.1, 0), fabric(shadeC(tc, -0.1), 0.9)); hood.scale.set(1.1, 0.7, 0.8); mats.push(hood.material as Material); place(sk, t, 'DEF-spine003', hood, new Vector3(0, m.neckY + 0.0, -0.1 - 0.0)); }
    else { const col = new Mesh(new CylinderGeometry(0.075, 0.062, 0.07, 8, 1, true), fabric(shadeC(tc, -0.1), 0.6)); mats.push(col.material as Material); place(sk, t, 'DEF-spine003', col, new Vector3(0, m.neckY + 0.015, -0.01)); }
  } else if (top === 'kaftan') {
    const flare = (v: V) => (v.region === 'pelvis' || v.region === 'thigh' || v.region === 'torso') && v.y < m.hipY ? 0.075 * Math.min(1, (m.hipY - v.y) / (m.hipY - m.kneeY)) : 0;
    skinned(extract(t, 'top:kaftan', (v) => ((v.region === 'torso' || v.region === 'pelvis') && v.y > m.kneeY - 0.02) || (v.region === 'thigh' && v.y > m.kneeY - 0.02) || ((v.region === 'upperarm' || v.region === 'forearm') && Math.abs(v.x) < wristX - 0.035), (v) => 0.02 + flare(v)), fabric(tc, 0.7));
    const trim = new Mesh(new TorusGeometry(0.085, 0.008, 4, 10), fabric('#E5B93C', 0.4)); trim.rotation.x = Math.PI / 2; mats.push(trim.material as Material); place(sk, t, 'DEF-spine003', trim, new Vector3(0, m.neckY - 0.02, 0.0));
  } else if (top === 'vest') {
    // a tank top under an open vest, like the reference
    skinned(mk('top:tank', 'none', m.hipY - 0.04, 0.012), fabric('#E8E8E8', 0.8));
    skinned(extract(t, 'top:vest', (v) => (v.region === 'torso' || v.region === 'pelvis') && v.y > m.hipY - 0.1 && !(v.z > 0 && Math.abs(v.x) < 0.04 && v.y < m.neckY - 0.01), () => 0.026), fabric(tc, 0.55));
    const col = new Mesh(new CylinderGeometry(0.082, 0.066, 0.08, 8, 1, true), fabric(shadeC(tc, -0.1), 0.55)); mats.push(col.material as Material); place(sk, t, 'DEF-spine003', col, new Vector3(0, m.neckY + 0.02, -0.01));
  }
  if (spec.top === 'jacket' || spec.top === 'hoodie') void 0;
  if (spec.bottom === 'dress') skinned(mk('top:dress', 'none', m.hipY - 0.02, 0.012), fabric(spec.bottomColor, 0.75));

  const rbox = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.28);
  // ---- small rigid things
  const rigid = (g: BufferGeometry, mat: Material, bone: string, pos: Vector3, rot?: [number, number, number]) => { const o = new Mesh(g, mat); mats.push(mat); if (rot) o.rotation.set(...rot); place(sk, t, bone, o, pos); return o; };
  const solid = (c: string, r = 0.5, metal = 0) => new MeshStandardMaterial({ color: c, roughness: r, metalness: metal, flatShading: true });
  // ---- hands: generated, hanging from the wrist, turning with the forearm
  for (const sd of ['L', 'R'] as const) { const wrist = new Vector3().setFromMatrixPosition(sk.bones[t.index[`DEF-hand${sd}`]].matrixWorld); const hm = new MeshStandardMaterial({ color: (_skin as MeshStandardMaterial).color, roughness: 0.85, flatShading: false, side: DoubleSide }); mats.push(hm); const h = new Mesh(handGeo(sd === 'L' ? 1 : -1, fem ? 1.08 : 1.2), hm); h.castShadow = true; place(sk, t, `DEF-hand${sd}`, h, wrist.add(new Vector3(0, 0.012, 0))); }
  if (spec.accessory === 'chain') rigid(new TorusGeometry(0.1, 0.007, 5, 14), solid('#E5B93C', 0.25, 0.85), 'DEF-spine003', new Vector3(0, m.neckY - 0.045, 0.012), [Math.PI / 2 - 0.25, 0, 0]);
  if (spec.bro) { rigid(new CylinderGeometry(0.026, 0.026, 0.008, 12), solid('#B91C1C'), 'DEF-spine003', new Vector3(0.085, chestY, 0.12), [Math.PI / 2, 0, 0]); rigid(new CylinderGeometry(0.013, 0.013, 0.01, 8), solid('#E5B93C', 0.3, 0.8), 'DEF-spine003', new Vector3(0.085, chestY, 0.126), [Math.PI / 2, 0, 0]); }
  if (spec.gun && spec.top !== 'jacket' && spec.top !== 'hoodie') { const h = solid('#1A1C20', 0.5, 0.3); rigid(new BoxGeometry(0.05, 0.16, 0.09), h, 'DEF-spine', new Vector3(0.205, m.hipY + 0.0, 0.0)); rigid(new BoxGeometry(0.045, 0.1, 0.05), solid('#3A2A1E', 0.7), 'DEF-spine', new Vector3(0.207, m.hipY + 0.1, 0.01)); }
  if (spec.bag !== 'none') {
    const bc = solid(spec.bagColor, 0.5), bd = solid(shadeC(spec.bagColor, -0.3), 0.55), gold = solid('#E5B93C', 0.25, 0.85);
    if (spec.bag === 'backpack') { rigid(rbox(0.26, 0.36, 0.13), bc, 'DEF-spine002', new Vector3(0, m.shoulderY - 0.2, -0.17)); rigid(rbox(0.2, 0.14, 0.05), bd, 'DEF-spine002', new Vector3(0, m.shoulderY - 0.3, -0.255)); for (const sd of [-1, 1]) rigid(rbox(0.03, 0.34, 0.012), bd, 'DEF-spine002', new Vector3(sd * 0.075, m.shoulderY - 0.17, 0.12), [0.1, 0, 0]); }
    if (spec.bag === 'crossbody') { rigid(rbox(0.19, 0.13, 0.07), bc, 'DEF-spine', new Vector3(-0.225, m.hipY - 0.03, 0.0)); rigid(rbox(0.04, 0.6, 0.012), bd, 'DEF-spine002', new Vector3(-0.02, m.shoulderY - 0.25, 0.125), [0, 0, 0.55]); rigid(rbox(0.04, 0.6, 0.012), bd, 'DEF-spine002', new Vector3(-0.02, m.shoulderY - 0.25, -0.125), [0, 0, 0.55]); rigid(rbox(0.03, 0.03, 0.01), gold, 'DEF-spine', new Vector3(-0.225, m.hipY - 0.03, 0.04)); }
    if (spec.bag === 'tote') { rigid(rbox(0.25, 0.28, 0.1), bc, 'DEF-spine', new Vector3(-0.22, m.hipY - 0.06, 0.0)); rigid(new TorusGeometry(0.075, 0.008, 5, 12, Math.PI), bd, 'DEF-spine', new Vector3(-0.22, m.hipY + 0.08, 0.0), [0, 0, 0]); }
    if (spec.bag === 'handbag' || spec.bag === 'clutch') { const hand = `DEF-hand${t.pos[t.index['DEF-handL']].x > 0 ? 'R' : 'L'}`; const hp = new Vector3().setFromMatrixPosition(sk.bones[t.index[hand]].matrixWorld); rigid(rbox(0.25, 0.17, 0.1), bc, hand, hp.clone().add(new Vector3(0, -0.2, 0.03))); rigid(new TorusGeometry(0.065, 0.007, 5, 12, Math.PI), gold, hand, hp.clone().add(new Vector3(0, -0.11, 0.03))); }
  }
  return { dispose: () => { mats.forEach((x) => x.dispose()); objs.forEach((o) => { o.removeFromParent(); }); } };
}

/** Fixes a rigid object to a bone, from where it should be in the base pose (metres, model space). */
function place(sk: ReturnType<typeof makeSkeleton>, t: BodyTemplate, boneName: string, o: Object3D, worldPos: Vector3) {
  const b = sk.bones[t.index[boneName]]; b.updateWorldMatrix(true, false);
  const world = new Matrix4().compose(worldPos, new Quaternion().setFromEuler(o.rotation), new Vector3(1, 1, 1)), local = new Matrix4().copy(b.matrixWorld).invert().multiply(world);
  local.decompose(o.position, o.quaternion, o.scale); o.castShadow = true; b.add(o);
}
export type { Group, SphereGeometry };
