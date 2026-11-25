/**
 * Puts a person on the rigged body (bodyAsset.ts): skeleton, base pose, procedural clothes, and the bridge from the game's simple
 * joint angles to the file's bones. build.ts still makes the head, face, hair and head accessories (a `Host` below).
 */
import { BufferGeometry, Group, MeshStandardMaterial, Quaternion, Vector3, type Bone, type Material, type Object3D } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCharacter, type Host, type Rig, type Spec } from './build';
import { bodyTemplate, makeSkeleton, makeSkinned, type BodyTemplate } from './bodyAsset';
import { dress, type Dressing } from './garments';
import { BAKED_LEG, BONES } from './clips';

/** Base pose data per body type: arms hang instead of sticking out. Computed once. */
export interface BasePose { local: Quaternion[]; parentWorld: Quaternion[]; parentWorldInv: Quaternion[]; world: Quaternion[] }
const baseCache = new Map<string, BasePose>();
function basePose(t: BodyTemplate): BasePose {
  const hit = baseCache.get(t.kind); if (hit) return hit;
  const n = t.names.length, D: Quaternion[] = Array.from({ length: n }, () => new Quaternion()), pos = t.pos.map((p) => p.clone());
  // arms: rotate each arm segment so it points down (a little away from the body), upper arm first, then forearm
  for (const side of ['L', 'R'] as const) {
    const sx = Math.sign(t.pos[t.index[`DEF-thigh${side}`]].x) || 1, ua = t.index[`DEF-upper_arm${side}`], fa = t.index[`DEF-forearm${side}`], hand = t.index[`DEF-hand${side}`];
    const dir1 = pos[fa].clone().sub(pos[ua]).normalize(), tgt1 = new Vector3(sx * Math.sin(0.2), -Math.cos(0.2), 0.02).normalize();
    const q1 = new Quaternion().setFromUnitVectors(dir1, tgt1); D[ua] = q1;
    const rot = (p: Vector3, pivot: Vector3) => p.clone().sub(pivot).applyQuaternion(q1).add(pivot);
    const faN = rot(pos[fa], pos[ua]), handN = rot(pos[hand], pos[ua]);
    const dir2 = handN.clone().sub(faN).normalize(), tgt2 = new Vector3(sx * Math.sin(0.1), -Math.cos(0.1), 0.05).normalize();
    D[fa] = new Quaternion().setFromUnitVectors(dir2, tgt2);
  }
  // base world quaternion of every bone = (its own delta, then each ancestor's) applied to its rest world quaternion
  const cum: Quaternion[] = [], world: Quaternion[] = [], local: Quaternion[] = [], pw: Quaternion[] = [], pwi: Quaternion[] = [];
  t.names.forEach((_, i) => {
    const p = t.parent[i]; cum[i] = D[i].clone().multiply(p >= 0 ? cum[p] : new Quaternion());
    world[i] = cum[i].clone().multiply(t.quat[i]);
    pw[i] = p >= 0 ? world[p].clone() : new Quaternion(); pwi[i] = pw[i].clone().invert(); local[i] = pwi[i].clone().multiply(world[i]);
  });
  const b = { local, parentWorld: pw, parentWorldInv: pwi, world }; baseCache.set(t.kind, b); return b;
}

/** Skin material shared by body and head. */
const skinMat = (c: string) => new MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false });

const footlessCache = new Map<string, BufferGeometry>();
/** The body geometry without the triangles of the foot below the ankle: shares the vertex data, has its own index. */
function footless(tpl: ReturnType<typeof bodyTemplate>): BufferGeometry {
  const hit = footlessCache.get(tpl.kind); if (hit) return hit;
  const src = tpl.geometry, ix = src.index!, keep: number[] = [];
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i), b = ix.getX(i + 1), c = ix.getX(i + 2); if (tpl.region[a] === 'foot' && tpl.region[b] === 'foot' && tpl.region[c] === 'foot') continue; keep.push(a, b, c); }
  const g = new BufferGeometry(); for (const k of Object.keys(src.attributes)) g.setAttribute(k, src.attributes[k]); g.setIndex(keep); g.userData.shared = true; footlessCache.set(tpl.kind, g); return g;
}

export function buildRiggedCharacter(spec: Spec, gltf: GLTF): Rig {
  const tpl = bodyTemplate(gltf, spec.body, skinMat('#fff')), base = basePose(tpl), sk = makeSkeleton(tpl), m = tpl.m, fem = spec.body === 'femme';
  const bones = sk.bones, idx = tpl.index;
  // put the skeleton in its base pose
  bones.forEach((b, i) => b.quaternion.copy(base.local[i])); sk.root.updateMatrixWorld(true);
  const root = new Group(), body = new Group(); root.add(body);
  const skin = skinMat(spec.skin);
  // closed shoes cover the whole foot: drop the bare foot below the ankle so no skin pokes out in front of the toe or under the sole
  body.add(makeSkinned(footless(tpl), skin, sk, true));
  // proxies: the animation code writes plain angles here; `sync` turns them into bone rotations
  const px = () => new Group(), P = { hipL: px(), hipR: px(), kneeL: px(), kneeR: px(), footL: px(), footR: px(), shoulderL: px(), shoulderR: px(), elbowL: px(), elbowR: px() };
  const negSide = tpl.pos[idx['DEF-thighL']].x < 0 ? 'L' : 'R', posSide = negSide === 'L' ? 'R' : 'L'; // the game's "left" limbs are at -x
  const set = (b: Bone, i: number, d: Quaternion) => { b.quaternion.copy(base.parentWorldInv[i]).multiply(d).multiply(base.parentWorld[i]).multiply(base.local[i]); };
  const dq = new Quaternion(), neck = idx['DEF-neck001'], headI = idx['DEF-head'];
  const sync = () => {
    const pairs: [string, Group, Group, Group, Group, Group][] = [[negSide, P.hipL, P.kneeL, P.footL, P.shoulderL, P.elbowL], [posSide, P.hipR, P.kneeR, P.footR, P.shoulderR, P.elbowR]];
    for (const [sd, hip, knee, foot, sh, el] of pairs) {
      let i = idx[`DEF-thigh${sd}`]; set(bones[i], i, dq.setFromEuler(hip.rotation));
      i = idx[`DEF-shin${sd}`]; set(bones[i], i, dq.setFromEuler(knee.rotation));
      i = idx[`DEF-foot${sd}`]; set(bones[i], i, dq.setFromEuler(foot.rotation));
      i = idx[`DEF-upper_arm${sd}`]; set(bones[i], i, dq.setFromEuler(sh.rotation));
      i = idx[`DEF-forearm${sd}`]; set(bones[i], i, dq.setFromEuler(el.rotation));
    }
    const hr = headProxy.rotation; set(bones[neck], neck, dq.set(0, 0, 0, 1).setFromEuler(hr).slerp(new Quaternion(), 0.65)); set(bones[headI], headI, dq.setFromEuler(hr).slerp(new Quaternion(), 0.35));
  };
  // ---- baked Mixamo clips (clips.ts): write the retargeted bone rotations straight into the skeleton, bypassing the joint-angle bridge above
  const restLocal = (i: number) => { const p = tpl.parent[i]; return p < 0 ? tpl.quat[i].clone() : tpl.quat[p].clone().invert().multiply(tpl.quat[i]); };
  const rest = bones.map((_, i) => restLocal(i)), baked = BONES.map((nm) => idx[nm]), isBaked = new Set(baked);
  const legScale = (tpl.pos[0].y - tpl.pos[idx['DEF-footL']].y) / BAKED_LEG, rootY = tpl.pos[0].y;
  let inClip = false;
  const playPose = (q: ArrayLike<number>, dy: number) => {
    if (!inClip) { inClip = true; bones.forEach((b, i) => { if (!isBaked.has(i)) b.quaternion.copy(rest[i]); }); } // fingers, twist bones: back to rest, they follow their parents
    baked.forEach((bi, j) => bones[bi].quaternion.set(q[j * 4], q[j * 4 + 1], q[j * 4 + 2], q[j * 4 + 3]));
    bones[0].position.y = rootY + dy * legScale;
  };
  const leavePose = () => { if (!inClip) return; inClip = false; bones.forEach((b, i) => b.quaternion.copy(base.local[i])); bones[0].position.y = rootY; };
  const headProxy = new Group();
  // the head, built by build.ts, rides on the head bone; the group is counter-rotated so it faces +z and stands upright
  const R = fem ? 0.122 : 0.13, headCentre = new Vector3(0, m.headBaseY + R * 1.0, -0.005);
  const hb = bones[headI]; hb.updateWorldMatrix(true, false);
  const hq = base.world[headI].clone().invert(), hp = headCentre.clone().sub(new Vector3().setFromMatrixPosition(hb.matrixWorld)).applyQuaternion(hq);
  let dressing: Dressing | null = null;
  const host: Host = {
    root, body, R, headY: headCentre.y,
    attachHead: () => { const g = new Group(); g.position.copy(hp); g.quaternion.copy(hq); hb.add(g); return g; },
    finish: (ctx) => {
      dressing = dress(spec, tpl, sk, base, skin, ctx);
      const total = m.top;
      const dispose = () => { dressing?.dispose(); root.traverse((o: Object3D) => { const g = (o as { geometry?: BufferGeometry }).geometry; if (g && !(g as { userData?: { shared?: boolean } }).userData?.shared) g.dispose(); }); skin.dispose(); };
      return { dispose, root, body, head: headProxy as Group, ...P, height: total, sync, headBone: ctx.head, handL: bones[idx[`DEF-hand${negSide}`]] as unknown as Group, handR: bones[idx[`DEF-hand${posSide}`]] as unknown as Group, playPose, leavePose, bone: (name: string) => bones[idx[name]] as unknown as Group } as Rig;
    },
  };
  void (null as unknown as Material);
  const rig = buildCharacter(spec, host);
  // the avatar writes head angles to `rig.head`; it is a proxy, the real head group is parented to the bone
  return rig;
}
