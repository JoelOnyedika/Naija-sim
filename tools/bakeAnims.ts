/**
 * Bakes Mixamo clips (from the Street Crown project's ybot_fixed.glb) onto the One Naija body (base_body.glb).
 * The body rests in an A-pose, Mixamo in a T-pose, so rotations are not copied: for the limbs and spine the BONE DIRECTION is matched in world space
 * (swing), and the twist comes from the source's world rotation. Hands, feet, toes and head keep the correction of their parent.
 * Output: src/three/character/animData.json = per clip, per frame, the LOCAL quaternion of every mapped bone (target hierarchy) + the hips height change as a fraction.
 * Run: npx tsx tools/bakeAnims.ts <path to ybot_fixed.glb>
 */
const ctx: any = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {}, width: 10 })), set: () => true });
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
import { readFileSync, writeFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { bodyTemplate } from '../src/three/character/bodyAsset';

const SRC = process.argv[2] ?? '/home/claude/crown/sc/apps/web/public/game/characters/ybot_fixed.glb';
const FPS = 30;
const CLIPS = ['Idle', 'Walking', 'Running', 'Sprint', 'PR_Idle_Aim', 'PR_Walk_F', 'PR_Run_F', 'PR_Sprint_F', 'Rifle_Shooting', 'Rifle_Reload', 'PR_Idle_Crouch_Aim', 'Jump'];
// target bone -> [mixamo bone, mixamo child for the direction (null = inherit the parent's correction)]
const side = (S: 'L' | 'R', M: 'Left' | 'Right'): Record<string, [string, string | null]> => ({
  [`DEF-collar${S}`]: [`${M}Shoulder`, `${M}Arm`], [`DEF-upper_arm${S}`]: [`${M}Arm`, `${M}ForeArm`], [`DEF-forearm${S}`]: [`${M}ForeArm`, `${M}Hand`], [`DEF-hand${S}`]: [`${M}Hand`, null],
  [`DEF-thigh${S}`]: [`${M}UpLeg`, `${M}Leg`], [`DEF-shin${S}`]: [`${M}Leg`, `${M}Foot`], [`DEF-foot${S}`]: [`${M}Foot`, null], // toes are left at rest: the source toe flips in some frames
 
});
const MAP: Record<string, [string, string | null]> = {
  'DEF-spine': ['Hips', 'Spine'], 'DEF-spine001': ['Spine', 'Spine1'], 'DEF-spine002': ['Spine1', 'Spine2'], 'DEF-spine003': ['Spine2', 'Neck'], 'DEF-neck': ['Neck', 'Head'], 'DEF-head': ['Head', null],
  ...side('L', 'Left'), ...side('R', 'Right'),
};
const load = async (p: string) => { const b = readFileSync(p); return await new Promise<any>((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '', res, rej)); };
const r4 = (n: number) => Math.round(n * 10000) / 10000;

const ybot = await load(SRC), body = await load('public/models/characters/base_body.glb');
const tpl = bodyTemplate(body, 'masc', new MeshStandardMaterial());
ybot.scene.updateMatrixWorld(true);
const sb = new Map<string, any>(); ybot.scene.traverse((o: any) => { if (o.isBone) sb.set(o.name.replace('mixamorig', '').replace(':', ''), o); });
const wq = (b: any) => b.getWorldQuaternion(new Quaternion()), wp = (b: any) => b.getWorldPosition(new Vector3());
const restQ = new Map<string, Quaternion>(); for (const [n, b] of sb) restQ.set(n, wq(b));
const restHipsY = wp(sb.get('Hips')).y, srcLeg = restHipsY - wp(sb.get('LeftFoot')).y, tgtLeg = tpl.pos[tpl.index['DEF-spine']].y - tpl.pos[tpl.index['DEF-footL']].y;
const ratio = tgtLeg / srcLeg;
console.log(`source hips ${restHipsY.toFixed(3)} leg ${srcLeg.toFixed(3)}; target leg ${tgtLeg.toFixed(3)}; ratio ${ratio.toFixed(3)}`);

const names = tpl.names, n = names.length, mappedIdx = names.map((nm, i) => (MAP[nm] ? i : -1));
const bakeNames = names.filter((nm) => MAP[nm]);
const restLocal = (i: number) => { const p = tpl.parent[i]; return p < 0 ? tpl.quat[i].clone() : tpl.quat[p].clone().invert().multiply(tpl.quat[i]); };
const childIdx = (i: number) => { const c = MAP[names[i]]?.[1]; if (!c) return -1; const tn = Object.keys(MAP).find((k) => MAP[k][0] === c); return tn ? tpl.index[tn] : -1; };

/** Retargets the pose the source is in right now. Returns the local quaternion per target bone and the world position per target bone (for checks). */
function pose() {
  const worldQ: Quaternion[] = new Array(n), local: Quaternion[] = new Array(n), corr: Quaternion[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = tpl.parent[i], m = MAP[names[i]];
    if (m) {
      const sbn = sb.get(m[0]), D = wq(sbn).multiply(restQ.get(m[0])!.clone().invert());
      let S = new Quaternion();
      const c = childIdx(i);
      if (c >= 0) {
        const dRest = tpl.pos[c].clone().sub(tpl.pos[i]).normalize().applyQuaternion(D), dAnim = wp(sb.get(MAP[names[c]][0])).sub(wp(sbn)).normalize();
        S = new Quaternion().setFromUnitVectors(dRest, dAnim);
      } else { let a = p; while (a >= 0 && !MAP[names[a]]) a = tpl.parent[a]; S = a >= 0 ? corr[a].clone() : S; }
      corr[i] = S; worldQ[i] = S.clone().multiply(D).multiply(tpl.quat[i]);
    } else { worldQ[i] = worldQ[p].clone().multiply(tpl.quat[p].clone().invert()).multiply(tpl.quat[i]); corr[i] = p >= 0 ? corr[p] : new Quaternion(); }
    local[i] = p < 0 ? worldQ[i].clone() : worldQ[p].clone().invert().multiply(worldQ[i]);
  }
  return { local, worldQ };
}
/** forward kinematics of the target for the checks: world position of each bone given local quats and a root height change */
function fk(local: Quaternion[], dy: number) {
  const W: Quaternion[] = [], P: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const p = tpl.parent[i];
    if (p < 0) { W[i] = local[i].clone(); P[i] = tpl.pos[i].clone().add(new Vector3(0, dy, 0)); }
    else { W[i] = W[p].clone().multiply(local[i]); const rel = tpl.pos[i].clone().sub(tpl.pos[p]).applyQuaternion(tpl.quat[p].clone().invert()); P[i] = P[p].clone().add(rel.applyQuaternion(W[p])); }
  }
  return { W, P };
}

const keep: Record<string, Quaternion[][]> = {};
const out: any = { fps: FPS, bones: bakeNames, ratio: r4(ratio), clips: {} };
const mixer = new AnimationMixer(ybot.scene);
const report: string[] = [];
for (const name of CLIPS) {
  const clip = ybot.animations.find((a: any) => a.name === name); if (!clip) { console.log('missing clip', name); continue; }
  const act = mixer.clipAction(clip); act.play();
  const frames = Math.max(2, Math.round(clip.duration * FPS)), q: number[][] = [], hips: number[] = [];
  const footY: number[][] = [], footP: Vector3[][] = [];
  for (let f = 0; f < frames; f++) {
    mixer.setTime((f / frames) * clip.duration); ybot.scene.updateMatrixWorld(true);
    const { local } = pose(), dyRaw = wp(sb.get('Hips')).y - restHipsY, dy = dyRaw * ratio;
    (keep[name] ??= []).push(local.map((x) => x.clone()));
    q.push(bakeNames.flatMap((nm) => { const L = local[tpl.index[nm]]; return [r4(L.x), r4(L.y), r4(L.z), r4(L.w)]; })); hips.push(r4(dy));
    const k = fk(local, dy); footY.push([k.P[tpl.index['DEF-toeL']].y, k.P[tpl.index['DEF-toeR']].y, k.P[tpl.index['DEF-footL']].y, k.P[tpl.index['DEF-footR']].y]); footP.push([k.P[tpl.index['DEF-footL']], k.P[tpl.index['DEF-footR']]]);
    if (!q[f].every(Number.isFinite)) throw new Error(`NaN in ${name} frame ${f}`);
  }
  act.stop(); mixer.uncacheClip(clip);
  out.clips[name] = { duration: r4(clip.duration), frames: q, hipsY: hips };
  const lowest = Math.min(...footY.flatMap((r) => [r[2], r[3]])), toe = Math.min(...footY.flatMap((r) => [r[0], r[1]]));
  report.push(`${name.padEnd(20)} ${frames} frames  lowest ankle ${lowest.toFixed(3)} (rest 0.133)  lowest toe ${toe.toFixed(3)}  ankle y range ${Math.min(...footY.map((r) => r[2])).toFixed(3)}..${Math.max(...footY.map((r) => r[2])).toFixed(3)}`);
}
console.log(report.join('\n'));

// ---- the AK-47 in the hands. Rifle model space: origin = right-hand grip, +z barrel, +y up; foregrip marker at (0, 0.0514, 0.3075), muzzle at (0, 0.0803, 0.6067).
const PALM = 0.055, UPV = new Vector3(0, 1, 0), FORE = new Vector3(0, 0.0514, 0.3075), MUZ = new Vector3(0, 0.0803, 0.6067);
const HR = tpl.index['DEF-handR'], HL = tpl.index['DEF-handL'];
const palm = (k: ReturnType<typeof fk>, h: number) => k.P[h].clone().add(new Vector3(0, 1, 0).applyQuaternion(k.W[h]).multiplyScalar(PALM));
const k0 = fk(keep['PR_Idle_Aim'][0], out.clips['PR_Idle_Aim'].hipsY[0]);
const pr = palm(k0, HR), pl = palm(k0, HL), zg = pl.clone().sub(pr).normalize(), yg = UPV.clone().sub(zg.clone().multiplyScalar(UPV.dot(zg))).normalize(), xg = yg.clone().cross(zg);
const gunQ = new Quaternion().setFromRotationMatrix(new (await import('three')).Matrix4().makeBasis(xg, yg, zg));
const handInv = k0.W[HR].clone().invert(), gLocalQ = handInv.clone().multiply(gunQ), gLocalP = new Vector3(0, PALM, 0);
console.log('right palm to left palm', pr.distanceTo(pl).toFixed(3), '(rifle foregrip is 0.31 from the grip)');
const bodyMuz = MUZ.clone().applyQuaternion(gunQ).add(pr);
out.gun = { pos: gLocalP.toArray().map(r4), quat: [gLocalQ.x, gLocalQ.y, gLocalQ.z, gLocalQ.w].map(r4), muzzleBody: bodyMuz.toArray().map(r4), barrelYaw: r4(Math.atan2(zg.x, zg.z)), bone: 'DEF-handR' };
console.log('muzzle in body space', bodyMuz.toArray().map((x) => +x.toFixed(3)), 'barrel yaw (rad)', out.gun.barrelYaw, 'barrel pitch', Math.asin(zg.y).toFixed(3));
// how far the left palm drifts from the foregrip over the rifle clips
for (const nm of ['PR_Idle_Aim', 'PR_Walk_F', 'PR_Run_F', 'PR_Sprint_F']) {
  let worst = 0, sum = 0; const fr = keep[nm], hy = out.clips[nm].hipsY;
  fr.forEach((loc, f) => { const k = fk(loc, hy[f]), gp = palm(k, HR), gq = k.W[HR].clone().multiply(gLocalQ), fg = FORE.clone().applyQuaternion(gq).add(gp), d = palm(k, HL).distanceTo(fg); worst = Math.max(worst, d); sum += d; });
  console.log(`${nm.padEnd(12)} left hand to foregrip: mean ${(sum / fr.length).toFixed(3)} m, worst ${worst.toFixed(3)} m`);
}
writeFileSync('src/three/character/animData.json', JSON.stringify(out));
console.log('written', (JSON.stringify(out).length / 1024).toFixed(0), 'KB');
