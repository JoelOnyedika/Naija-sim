/**
 * Shoes for the rigged body: sneakers, boots, sandals, slippers (flip-flops) and loafers, each built from the real measurements of the body's foot
 * (the box around its foot vertices and the ankle bone), so they fit the masculine and the feminine body. All geometry is in model space at the base pose;
 * the caller fixes each piece to a bone. Smooth-shaded with a small bevel, a separate sole, laces and straps, so they read as shoes, not as coloured feet.
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, TorusGeometry, type Material } from 'three';
import type { BodyTemplate } from './bodyAsset';

export type ShoeKind = 'sneakers' | 'boots' | 'sandals' | 'slippers' | 'loafers';
export interface FootBox { cx: number; w: number; z0: number; z1: number; ankleY: number; ankleZ: number; shinX: number; shinZ: number }
export interface ShoePiece { geo: BufferGeometry; bone: 'foot' | 'shin'; mat: 'upper' | 'sole' | 'lace' | 'trim'; }

const boxCache = new Map<string, FootBox>();
/** The left (+x) foot's measurements; the right foot is its mirror. */
export function footBox(t: BodyTemplate): FootBox {
  const hit = boxCache.get(t.kind); if (hit) return hit;
  const P = t.geometry.attributes.position, ix = t.geometry.index!, used = new Set<number>(); for (let i = 0; i < ix.count; i++) used.add(ix.getX(i));
  let x0 = 9, x1 = -9, z0 = 9, z1 = -9;
  for (const i of used) if (t.region[i] === 'foot' && P.getX(i) > 0) { x0 = Math.min(x0, P.getX(i)); x1 = Math.max(x1, P.getX(i)); z0 = Math.min(z0, P.getZ(i)); z1 = Math.max(z1, P.getZ(i)); }
  const a = t.pos[t.index['DEF-footL']], s = t.pos[t.index['DEF-shinL']];
  const b = { cx: (x0 + x1) / 2, w: x1 - x0, z0, z1, ankleY: a.y, ankleZ: a.z, shinX: s.x, shinZ: s.z }; boxCache.set(t.kind, b); return b;
}

/** Extrudes a side profile (z forward, y up) across `width`, centred on x = cx. */
function profile(pts: [number, number][], width: number, cx: number, bevel = 0.004): BufferGeometry {
  const sh = new Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const [a, b] of pts.slice(1)) sh.lineTo(a, b); sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: Math.max(0.01, width - 2 * bevel), bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate(cx + (width - 2 * bevel) / 2, 0, 0); g.computeVertexNormals(); return g;
}
interface Station { u: number; hw: number; y0: number; y1: number }
/**
 * Lofts rounded cross-sections (superellipses) along z from the heel (u = 0) to the toe (u = 1): width, bottom and top change from station to station, so the shoe
 * is rounded and tapers like a real one instead of being a box. Both ends are capped. Smooth normals.
 */
function loft(st: Station[], cx: number, z0: number, z1: number, n = 3.0, seg = 18): BufferGeometry {
  const pos: number[] = [], idx: number[] = [], e = 2 / n;
  const ring = (s: Station) => { const out: number[] = [], cy = (s.y0 + s.y1) / 2, ry = (s.y1 - s.y0) / 2; for (let k = 0; k < seg; k++) { const a = (k / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); out.push(cx + s.hw * Math.sign(c) * Math.abs(c) ** e, cy + ry * Math.sign(sn) * Math.abs(sn) ** e, z0 + s.u * (z1 - z0)); } return out; };
  st.forEach((s) => pos.push(...ring(s)));
  for (let i = 0; i < st.length - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + ((k + 1) % seg), c = (i + 1) * seg + k, d = (i + 1) * seg + ((k + 1) % seg); idx.push(a, c, b, b, c, d); }
  for (const [i, flip] of [[0, true], [st.length - 1, false]] as const) { const ci = pos.length / 3, s = st[i]; pos.push(cx, (s.y0 + s.y1) / 2, z0 + s.u * (z1 - z0)); for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + ((k + 1) % seg); idx.push(...(flip ? [ci, b, a] : [ci, a, b])); } }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const at = (g: BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

/** All the pieces of one shoe for the foot on side `sd` (+1 = the +x foot). */
export function buildShoe(kind: ShoeKind, t: BodyTemplate, sd: 1 | -1): ShoePiece[] {
  const f = footBox(t), cx = sd * f.cx, w = Math.min(f.w, 0.118) + 0.022, z0 = Math.max(f.z0, f.ankleZ - 0.078) - 0.008, z1 = Math.min(f.z1, f.ankleZ + 0.215) + 0.01, H = f.ankleY, az = f.ankleZ;
  const out: ShoePiece[] = [], P = (geo: BufferGeometry, bone: 'foot' | 'shin', mat: ShoePiece['mat']) => out.push({ geo, bone, mat });
  const soleH = kind === 'slippers' ? 0.018 : kind === 'sandals' ? 0.022 : kind === 'boots' ? 0.034 : 0.03;
  const W = w * 0.5, L = z1 - z0, closed = kind === 'sneakers' || kind === 'loafers' || kind === 'boots';
  // the sole: a rounded slab, a touch wider than the upper, with the toe sprung up a little
  const soleSt: Station[] = [0, 0.05, 0.3, 0.7, 0.9, 1].map((u) => ({ u, hw: W * (u < 0.05 ? 0.7 : u > 0.9 ? 0.55 : u > 0.7 ? 0.96 : 1.0) * (kind === 'slippers' ? 0.95 : 1), y0: u > 0.88 ? 0.004 : -0.006, y1: soleH + (u > 0.88 ? 0.006 : 0) }));
  P(loft(soleSt, cx, z0, z1, 3.4, 16), 'foot', 'sole');
  if (kind === 'boots') P(profile([[z0, 0], [z0 + 0.07, 0], [z0 + 0.07, soleH + 0.001], [z0, soleH + 0.001]], w * 1.05, cx, 0.002), 'foot', 'trim');
  if (closed) {
    const high = kind === 'boots' ? 0.06 : 0, low = kind === 'loafers';
    const top = (u: number) => (low ? [H - 0.03, H - 0.026, H - 0.022, H - 0.035, soleH + 0.085, soleH + 0.07, soleH + 0.05, soleH + 0.03] : [H + 0.022 + high, H + 0.032 + high, H + 0.034 + high, H + 0.016, soleH + 0.104, soleH + 0.078, soleH + 0.055, soleH + 0.03])[Math.round(u * 7)];
    const us = [0, 0.06, 0.22, 0.4, 0.58, 0.78, 0.92, 1], hws = [0.3, 0.46, 0.5, 0.5, 0.49, 0.45, 0.37, 0.2];
    const upSt: Station[] = us.map((u, i) => ({ u, hw: W * hws[i] * 2 * 0.93, y0: soleH - 0.004, y1: top(i / 7) }));
    P(loft(upSt, cx, z0, z1, 2.7, 18), 'foot', 'upper');
    if (kind === 'sneakers') {
      // toe cap, a heel tab and laces along the instep
      P(loft([0.78, 0.86, 0.94, 1].map((u, i) => ({ u, hw: W * [0.45, 0.43, 0.36, 0.2][i] * 2 * 0.93 + 0.004, y0: soleH - 0.002, y1: [soleH + 0.08, soleH + 0.066, soleH + 0.052, soleH + 0.034][i] })), cx, z0, z1, 2.7, 18), 'foot', 'trim');
      for (let k = 0; k < 4; k++) { const u = 0.4 + k * 0.045, zz = z0 + u * L, yy = top(Math.min(1, u)) - (k * 0.003); P(at(new BoxGeometry(w * 0.5, 0.006, 0.012), cx, yy + 0.004, zz), 'foot', 'lace'); }
      P(at(new BoxGeometry(w * 0.4, 0.05, 0.012), cx, H + 0.03, z0 + 0.012), 'foot', 'trim');
    } else if (kind === 'loafers') { P(at(new BoxGeometry(w * 0.74, 0.01, 0.026), cx, H - 0.03, z0 + 0.5 * L), 'foot', 'trim'); }
  }
  if (kind === 'boots') {
    const shaft = new CylinderGeometry(0.066, 0.058, 0.22, 14, 1, true); at(shaft, sd * f.shinX, H + 0.11, f.shinZ - 0.003); P(shaft, 'shin', 'upper');
    const cuff = new TorusGeometry(0.066, 0.009, 6, 16); cuff.rotateX(Math.PI / 2); at(cuff, sd * f.shinX, H + 0.22, f.shinZ - 0.003); P(cuff, 'shin', 'trim');
  }
  if (kind === 'sandals') {
    for (const zz of [az + 0.07, z1 - 0.11]) P(at(new BoxGeometry(w * 0.98, 0.012, 0.05), cx, zz > az + 0.1 ? 0.066 : 0.098, zz), 'foot', 'upper');
    P(at(new BoxGeometry(w * 0.9, 0.012, 0.03), cx, H - 0.03, z0 + 0.03), 'foot', 'upper'); // heel strap
    P(at(new BoxGeometry(0.016, 0.014, 0.1), cx, 0.082, az + 0.1), 'foot', 'trim'); // buckle bar
  }
  if (kind === 'slippers') { // flip-flop: a Y strap from the toe post to both sides of the foot
    const ys = [0.056, 0.062];
    for (const s of [-1, 1]) { const strap = new BoxGeometry(0.014, 0.01, 0.15); strap.rotateY(s * 0.42); at(strap, cx + s * w * 0.27, soleH + ys[0] + 0.012, z1 - 0.11 - 0.01); P(strap, 'foot', 'lace'); }
    const post = new CylinderGeometry(0.008, 0.008, soleH + 0.04, 6); at(post, cx, (soleH + 0.04) / 2, z1 - 0.1); P(post, 'foot', 'lace');
    P(at(new BoxGeometry(w * 0.85, 0.01, 0.014), cx, soleH + ys[1] + 0.02, az + 0.12), 'foot', 'lace');
  }
  return out;
}
export type { Material };
