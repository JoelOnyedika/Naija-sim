/**
 * The body: the supplied rigged low-poly mannequin (public/models/characters/base_body.glb), prepared once per body type.
 * - Rigify exports 320 bones; only the 49 deforming ones matter. They are rebuilt as a clean, shallow hierarchy.
 * - Scale (height) and femme/masc shape are baked into the vertices and bones, so the scene graph never needs a scale.
 * - Everything is in metres, feet on y = 0, facing +z, like the rest of the game.
 * - The head triangles are cut off: the head, face, hair and headgear are generated (build.ts) and sit on the neck.
 * Animation does not touch the file's bone axes: see `poseBones`, which turns a plain "rotate about x / z" into each bone's own frame.
 */
import { Bone, BufferAttribute, BufferGeometry, Matrix4, Quaternion, Skeleton, SkinnedMesh, Vector3, type Object3D, type Material } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const BODY_URL = '/models/characters/base_body.glb';
export type BodyKind = 'masc' | 'femme';
export type Side = 'L' | 'R';
export const HEIGHT: Record<BodyKind, number> = { masc: 1.8, femme: 1.7 };

/** Which part of the body a vertex mostly belongs to. */
export type Region = 'torso' | 'neck' | 'head' | 'upperarm' | 'forearm' | 'hand' | 'pelvis' | 'thigh' | 'shin' | 'foot';
const regionOf = (name: string): Region => {
  if (/head/.test(name)) return 'head'; if (/neck/.test(name)) return 'neck';
  if (/spine|collar/.test(name)) return 'torso';
  if (/upper_arm/.test(name)) return 'upperarm'; if (/forearm/.test(name)) return 'forearm'; if (/hand|f_pinky/.test(name)) return 'hand';
  if (/pelvis/.test(name)) return 'pelvis'; if (/thigh/.test(name)) return 'thigh'; if (/shin/.test(name)) return 'shin'; return 'foot';
};

export interface BodyTemplate {
  kind: BodyKind;
  names: string[];                    // base names of the kept bones, parents before children
  parent: (number | -1)[];            // parent index per bone
  pos: Vector3[]; quat: Quaternion[]; // rest world transform per bone (metres)
  inverse: Matrix4[];                 // bind inverse per bone
  geometry: BufferGeometry;           // the body without the head, skinned to the kept bones
  full: BufferGeometry;               // same with the head kept (for measuring only)
  region: Region[];                   // per vertex of `geometry`
  index: Record<string, number>;      // bone base name -> index
  m: Measures;
  mat: Material;
}
/** Landmarks in metres, measured from the bones of the rest pose. */
export interface Measures { top: number; hipY: number; kneeY: number; ankleY: number; shoulderY: number; neckY: number; headBaseY: number; headTopY: number; headW: number; headD: number; waistY: number; crotchY: number; elbowY: number; wristY: number; armX: number }

const baseName = (n: string) => n.replace(/_\d+$/, '');
const KEEP = /^DEF-(spine|neck|head|collar|upper_arm|forearm|hand|f_pinky|pelvis|thigh|shin|foot|toe)/;
/** Parent of each kept bone, by base name (the file parents deform bones to control bones; here they chain to each other). */
function parentName(n: string): string | null {
  // (the glTF loader strips dots from node names, so "DEF-thigh.L.001" arrives as "DEF-thighL001")
  if (n === 'DEF-spine') return null;
  let m = n.match(/^DEF-spine00(\d)$/); if (m) return m[1] === '1' ? 'DEF-spine' : `DEF-spine00${+m[1] - 1}`;
  if (n === 'DEF-neck') return 'DEF-spine003'; if (n === 'DEF-neck001') return 'DEF-neck'; if (n === 'DEF-head') return 'DEF-neck001';
  m = n.match(/^DEF-collar([LR])$/); if (m) return 'DEF-spine003';
  m = n.match(/^DEF-upper_arm([LR])$/); if (m) return `DEF-collar${m[1]}`;
  m = n.match(/^DEF-upper_arm([LR])001$/); if (m) return `DEF-upper_arm${m[1]}`;
  m = n.match(/^DEF-forearm([LR])$/); if (m) return `DEF-upper_arm${m[1]}001`;
  m = n.match(/^DEF-forearm([LR])001$/); if (m) return `DEF-forearm${m[1]}`;
  m = n.match(/^DEF-hand([LR])$/); if (m) return `DEF-forearm${m[1]}001`;
  m = n.match(/^DEF-f_pinky01([LR])(00\d)?$/); if (m) return `DEF-hand${m[1]}`;
  m = n.match(/^DEF-f_pinky0([23])([LR])(00\d)?$/); if (m) return `DEF-f_pinky0${+m[1] - 1}${m[2]}${m[3] ?? ''}`;
  m = n.match(/^DEF-pelvis([LR])$/); if (m) return 'DEF-spine';
  m = n.match(/^DEF-thigh([LR])$/); if (m) return 'DEF-spine';
  m = n.match(/^DEF-thigh([LR])001$/); if (m) return `DEF-thigh${m[1]}`;
  m = n.match(/^DEF-shin([LR])$/); if (m) return `DEF-thigh${m[1]}001`;
  m = n.match(/^DEF-shin([LR])001$/); if (m) return `DEF-shin${m[1]}`;
  m = n.match(/^DEF-foot([LR])$/); if (m) return `DEF-shin${m[1]}001`;
  m = n.match(/^DEF-toe([LR])$/); if (m) return `DEF-foot${m[1]}`;
  return null;
}

const cache = new Map<string, BodyTemplate>();
export function bodyTemplate(gltf: GLTF, kind: BodyKind, mat: Material): BodyTemplate {
  const hit = cache.get(kind); if (hit) return hit;
  gltf.scene.updateMatrixWorld(true);
  let sm: SkinnedMesh | null = null; gltf.scene.traverse((o: Object3D) => { if ((o as SkinnedMesh).isSkinnedMesh && !sm) sm = o as SkinnedMesh; });
  const src = sm as unknown as SkinnedMesh; const skel = src.skeleton, g = src.geometry;
  const pos = g.attributes.position, nor = g.attributes.normal, sIdx = g.attributes.skinIndex, sWt = g.attributes.skinWeight;
  // 1. which bones to keep, in an order with parents first
  const all = skel.bones.map((b) => baseName(b.name)), keepOld: number[] = [];
  all.forEach((n, i) => { if (KEEP.test(n)) keepOld.push(i); });
  const nameToOld = new Map(keepOld.map((i) => [all[i], i]));
  const order: number[] = [], seen = new Set<number>();
  // a bone whose usual parent is not in the file (e.g. the right collar) attaches to the next one up
  const parentOf = (n: string) => { let p = parentName(n); while (p && !nameToOld.has(p)) p = parentName(p); return p; };
  const visit = (oi: number) => { if (seen.has(oi)) return; const pn = parentOf(all[oi]); if (pn) visit(nameToOld.get(pn)!); seen.add(oi); order.push(oi); };
  keepOld.forEach(visit);
  const newIdx = new Map(order.map((oi, ni) => [oi, ni]));
  const names = order.map((oi) => all[oi]), index: Record<string, number> = {}; names.forEach((n, i) => (index[n] = i));
  const parent = names.map((n) => { const p = parentOf(n); return p && index[p] !== undefined ? index[p] : -1; });
  // 2. rest world transforms of the kept bones, in file units; then the baking transform: feet on y = 0, centred, scaled to the wanted height
  // the bind pose is what the file's inverse bind matrices say (not the nodes' current transforms, which can differ)
  const world = order.map((oi) => skel.boneInverses[oi].clone().invert());
  const M = src.bindMatrix;
  const v = new Vector3(), tmp: Vector3[] = [];
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(M); tmp.push(v.clone()); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z); }
  const s = HEIGHT[kind] / (maxY - minY), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const bake = (p: Vector3) => new Vector3((p.x - cx) * s, (p.y - minY) * s, (p.z - cz) * s);
  // 3. vertices: baked, reshaped for the body type, with the skin remapped to the kept bones
  const P = new Float32Array(pos.count * 3), NRM = new Float32Array(pos.count * 3), SI = new Uint16Array(pos.count * 4), SW = new Float32Array(pos.count * 4), region: Region[] = [];
  const nm = new Vector3(), nmat = new Matrix4().extractRotation(M);
  const shapeFem = (p: Vector3, y: number) => { // narrower shoulders and waist, fuller hips and chest
    const tt = y / HEIGHT[kind], bell = (c: number, w: number) => Math.exp(-(((tt - c) / w) ** 2));
    const wx = 1 + 0.12 * bell(0.54, 0.06) * -1 + 0.12 * bell(0.5, 0.06) - 0.07 * bell(0.8, 0.07) - 0.1 * bell(0.62, 0.05), wz = 1 - 0.04 * bell(0.62, 0.05) + 0.1 * bell(0.7, 0.05);
    p.x *= Math.abs(p.x) > 0.22 && tt > 0.6 ? 1 : wx; p.z = (p.z - 0) * wz + (bell(0.7, 0.05) * 0.012);
  };
  for (let i = 0; i < pos.count; i++) {
    const p = bake(tmp[i]); if (kind === 'femme') shapeFem(p, p.y);
    P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
    nm.fromBufferAttribute(nor, i).applyMatrix4(nmat).normalize(); NRM[i * 3] = nm.x; NRM[i * 3 + 1] = nm.y; NRM[i * 3 + 2] = nm.z;
    let tot = 0, best = -1, bw = 0; const w4: number[] = [0, 0, 0, 0], i4: number[] = [0, 0, 0, 0]; let n = 0;
    for (let k = 0; k < 4; k++) { const wgt = sWt.getComponent(i, k), oi = sIdx.getComponent(i, k), ni = newIdx.get(oi); if (wgt > 0.001 && ni !== undefined) { w4[n] = wgt; i4[n] = ni; tot += wgt; n++; if (wgt > bw) { bw = wgt; best = ni; } } }
    if (tot === 0) { w4[0] = 1; i4[0] = 0; tot = 1; best = 0; }
    for (let k = 0; k < 4; k++) { SI[i * 4 + k] = i4[k]; SW[i * 4 + k] = w4[k] / tot; }
    region.push(regionOf(names[best]));
  }
  const geo = (keepTri: (a: number, b: number, c: number) => boolean) => {
    const out = new BufferGeometry(); out.setAttribute('position', new BufferAttribute(P, 3)); out.setAttribute('normal', new BufferAttribute(NRM, 3)); out.setAttribute('skinIndex', new BufferAttribute(SI, 4)); out.setAttribute('skinWeight', new BufferAttribute(SW, 4));
    const idx: number[] = [], src = g.index!; for (let t = 0; t < src.count; t += 3) { const a = src.getX(t), b = src.getX(t + 1), c = src.getX(t + 2); if (keepTri(a, b, c)) idx.push(a, b, c); }
    out.setIndex(idx); return out;
  };
  // the head is generated (build.ts) and so are the hands (the file's fingers are thin slivers), so those triangles are dropped
  // 4. bone rest transforms, baked
  const posB: Vector3[] = [], quatB: Quaternion[] = [], inverse: Matrix4[] = [], sc = new Vector3(), q = new Quaternion(), p = new Vector3();
  world.forEach((w) => { w.decompose(p, q, sc); posB.push(bake(p.clone())); quatB.push(q.clone()); inverse.push(new Matrix4().compose(posB[posB.length - 1], q, new Vector3(1, 1, 1)).invert()); });
  // forearm vertices the file weights to the fingers are still forearm: the hand starts at the wrist
  const wristX0 = Math.abs(posB[index['DEF-handL']].x);
  for (let i = 0; i < region.length; i++) if (region[i] === 'hand' && Math.abs(P[i * 3]) < wristX0 + 0.02) region[i] = 'forearm';
  // the head is generated (build.ts) and so are the hands (the file's fingers are thin slivers): triangles touching either are dropped
  // the forearms carry thin fins (two nearly equal wrist vertices joined to the elbow): no volume, so they are dropped
  const sliver = (a: number, b: number, c: number) => { const e1 = edge(a, b), e2 = edge(b, c), e3 = edge(c, a), L = Math.max(e1, e2, e3), h = (e1 + e2 + e3) / 2, area = Math.sqrt(Math.max(0, h * (h - e1) * (h - e2) * (h - e3))); return L * L / (area || 1e-9) > 7 && Math.min(Math.abs(P[a * 3]), Math.abs(P[b * 3]), Math.abs(P[c * 3])) > 0.25; }; // (forearm fins only: legs and chest have long thin triangles that are real surface)
  const edge = (a: number, b: number) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
  const geometry = geo((a, b, c) => !(region[a] === 'head' && region[b] === 'head' && region[c] === 'head') && region[a] !== 'hand' && region[b] !== 'hand' && region[c] !== 'hand' && !sliver(a, b, c)), full = geo(() => true);
  const at = (n: string) => posB[index[n]];
  const m: Measures = {
    top: HEIGHT[kind], hipY: at('DEF-thighL').y, kneeY: at('DEF-shinL').y, ankleY: at('DEF-footL').y, shoulderY: at('DEF-upper_armL').y, neckY: at('DEF-neck').y, headBaseY: at('DEF-head').y, headTopY: HEIGHT[kind],
    headW: 0, headD: 0, waistY: at('DEF-spine001').y, crotchY: at('DEF-thighL').y - 0.05, elbowY: at('DEF-forearmL').y, wristY: at('DEF-handL').y, armX: Math.abs(at('DEF-upper_armL').x),
  };
  // head size, from the cut-off head triangles
  let hx = 0, hz = 0; for (let i = 0; i < pos.count; i++) if (region[i] === 'head') { hx = Math.max(hx, Math.abs(P[i * 3])); hz = Math.max(hz, Math.abs(P[i * 3 + 2])); }
  m.headW = hx * 2; m.headD = hz * 2;
  const tpl: BodyTemplate = { kind, names, parent, pos: posB, quat: quatB, inverse, geometry, full, region, index, m, mat };
  cache.set(kind, tpl); return tpl;
}

/** A fresh set of bones (one skeleton per person), parented, at the rest pose. */
export function makeSkeleton(t: BodyTemplate): { bones: Bone[]; skeleton: Skeleton; root: Bone } {
  const bones = t.names.map((n) => { const b = new Bone(); b.name = n; return b; });
  t.names.forEach((_, i) => {
    const b = bones[i], p = t.parent[i];
    if (p < 0) { b.position.copy(t.pos[i]); b.quaternion.copy(t.quat[i]); }
    else { const pq = t.quat[p].clone().invert(); b.position.copy(t.pos[i]).sub(t.pos[p]).applyQuaternion(pq); b.quaternion.copy(pq).multiply(t.quat[i]); bones[p].add(b); }
  });
  const root = bones[0]; root.updateMatrixWorld(true);
  return { bones, skeleton: new Skeleton(bones, t.inverse), root };
}
/** A skinned mesh on the person's skeleton. Only the first one (the body) carries the bones in the scene graph; the others just share the skeleton. */
export function makeSkinned(geometry: BufferGeometry, material: Material, sk: ReturnType<typeof makeSkeleton>, carriesBones = false): SkinnedMesh {
  const m = new SkinnedMesh(geometry, material); m.frustumCulled = false; m.castShadow = true;
  if (carriesBones) m.add(sk.root);
  m.bind(sk.skeleton, new Matrix4()); return m;
}
