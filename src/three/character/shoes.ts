/**
 * Shoes for the rigged body: sneakers, boots, sandals, slippers (flip-flops) and loafers, each built from the real measurements of the body's foot
 * (the box around its foot vertices and the ankle bone), so they fit the masculine and the feminine body. All geometry is in model space at the base pose;
 * the caller fixes each piece to a bone. Smooth-shaded with a small bevel, a separate sole, laces and straps, so they read as shoes, not as coloured feet.
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry, type Material } from 'three';
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
const at = (g: BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

/** All the pieces of one shoe for the foot on side `sd` (+1 = the +x foot). */
export function buildShoe(kind: ShoeKind, t: BodyTemplate, sd: 1 | -1): ShoePiece[] {
  const f = footBox(t), cx = sd * f.cx, mx = 0.014, w = f.w + mx * 2, z0 = f.z0 - 0.014, z1 = f.z1 + 0.02, H = f.ankleY, az = f.ankleZ;
  const out: ShoePiece[] = [], P = (geo: BufferGeometry, bone: 'foot' | 'shin', mat: ShoePiece['mat']) => out.push({ geo, bone, mat });
  const soleH = kind === 'slippers' ? 0.018 : kind === 'sandals' ? 0.022 : kind === 'boots' ? 0.036 : 0.034;
  // sole: flat slab with a rounded toe; boots get a small heel block
  const sole: [number, number][] = [[z0, 0], [z1 - 0.05, 0], [z1 - 0.012, 0.006], [z1, soleH * 0.6], [z1, soleH], [z0, soleH]];
  const soleG = profile(sole, w * 1.03, cx, 0.003); P(soleG, 'foot', 'sole');
  if (kind === 'boots') P(profile([[z0, -0.0], [z0 + 0.07, 0], [z0 + 0.07, soleH + 0.001], [z0, soleH + 0.001]], w * 1.05, cx, 0.002), 'foot', 'trim');
  if (kind === 'sneakers' || kind === 'loafers') {
    const low = kind === 'loafers', top = low ? H - 0.012 : H + 0.032;
    const up: [number, number][] = low
      ? [[z0 + 0.004, soleH], [z0, soleH + 0.04], [z0 + 0.008, top], [az + 0.0, top + 0.004], [az + 0.075, top - 0.012], [az + 0.115, H - 0.03], [z1 - 0.095, soleH + 0.07], [z1 - 0.02, soleH + 0.05], [z1, soleH + 0.03], [z1, soleH]]
      : [[z0 + 0.004, soleH], [z0, soleH + 0.05], [z0 + 0.006, top], [az - 0.005, top + 0.004], [az + 0.05, top - 0.012], [az + 0.1, H - 0.012], [z1 - 0.12, soleH + 0.085], [z1 - 0.035, soleH + 0.075], [z1, soleH + 0.05], [z1, soleH]];
    P(profile(up, w, cx, 0.005), 'foot', 'upper');
    if (kind === 'sneakers') { // toe cap, laces
      P(profile([[z1 - 0.07, soleH], [z1 - 0.07, soleH + 0.07], [z1 - 0.03, soleH + 0.077], [z1 + 0.004, soleH + 0.052], [z1 + 0.004, soleH]], w * 1.01, cx, 0.003), 'foot', 'trim');
      for (let k = 0; k < 4; k++) { const zz = az + 0.1 + k * 0.034, yy = H - 0.016 - k * 0.0135 - (k > 2 ? 0.0 : 0); P(at(new BoxGeometry(w * 0.55, 0.008, 0.012), cx, yy + 0.012, zz), 'foot', 'lace'); }
    } else { P(at(new BoxGeometry(w * 0.9, 0.012, 0.03), cx, H - 0.04, az + 0.11), 'foot', 'trim'); } // the loafer's strap
  }
  if (kind === 'boots') {
    // ankle part in the foot, a shaft round the shin up to the calf
    const up: [number, number][] = [[z0 + 0.004, soleH], [z0, soleH + 0.06], [z0 + 0.004, H + 0.06], [az + 0.02, H + 0.07], [az + 0.1, H - 0.01], [z1 - 0.1, soleH + 0.09], [z1 - 0.03, soleH + 0.08], [z1, soleH + 0.05], [z1, soleH]];
    P(profile(up, w, cx, 0.005), 'foot', 'upper');
    const shaft = new CylinderGeometry(0.066, 0.056, 0.2, 12, 1, true); at(shaft, sd * f.shinX * 0.97 + (cx - sd * f.shinX) * 0.0 + 0, H + 0.1, f.shinZ - 0.003); P(shaft, 'shin', 'upper');
    const cuff = new TorusGeometry(0.066, 0.008, 5, 14); cuff.rotateX(Math.PI / 2); at(cuff, sd * f.shinX * 0.97, H + 0.2, f.shinZ - 0.003); P(cuff, 'shin', 'trim');
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
