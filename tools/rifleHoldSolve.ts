const ctx: any = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : (k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => undefined))), set: () => true });
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { buildRiggedCharacter } from '/home/claude/nigeria-life/src/three/character/rigged';
import { toSpec } from '/home/claude/nigeria-life/src/three/character/build';
import { DEFAULT_APPEARANCE } from '/home/claude/nigeria-life/src/stores/characterStore';
const buf = readFileSync('/home/claude/nigeria-life/public/models/characters/base_body.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf: any = await new Promise((res, rej) => new GLTFLoader().parse(ab as ArrayBuffer, '', res, rej));
const rig: any = buildRiggedCharacter(toSpec({ ...DEFAULT_APPEARANCE, body: 'masc' } as any), gltf);
const wp = (o: any) => { o.updateWorldMatrix(true, false); return new Vector3().setFromMatrixPosition(o.matrixWorld); };
rig.sync(); rig.root.updateMatrixWorld(true);
console.log('hand R', wp(rig.handR).toArray().map((n:number)=>+n.toFixed(3)), 'hand L', wp(rig.handL).toArray().map((n:number)=>+n.toFixed(3)));
// shoulder/elbow world positions: bone parents of hands
const up=(b:any,n:number)=>{let o=b;for(let i=0;i<n;i++)o=o.parent;return o;};
console.log('elbow R', wp(up(rig.handR,1)).toArray().map((n:number)=>+n.toFixed(3)), 'shoulder R', wp(up(rig.handR,2)).toArray().map((n:number)=>+n.toFixed(3)));
console.log('height', rig.height);


const wpos = (b: any) => { b.updateWorldMatrix(true, false); return new Vector3().setFromMatrixPosition(b.matrixWorld); };
// solve one arm: angles (sx, sz, ef) so the hand bone reaches target (body space)
function solve(sh: any, el: any, hand: any, target: Vector3) {
  let best = [-1.2, 0, -0.6], bestE = 1e9;
  const err = (a: number[]) => { sh.rotation.set(a[0], 0, a[1]); el.rotation.set(a[2], 0, 0); rig.sync(); rig.root.updateMatrixWorld(true); return wpos(hand).distanceTo(target); };
  for (let sx = -1.8; sx <= -0.3; sx += 0.1) for (let sz = -0.4; sz <= 0.4; sz += 0.1) for (let ef = -2.2; ef <= -0.2; ef += 0.1) { const e = err([sx, sz, ef]); if (e < bestE) { bestE = e; best = [sx, sz, ef]; } }
  let step = 0.05; while (step > 0.001) { let imp = false; for (let k = 0; k < 3; k++) for (const d of [-step, step]) { const a = best.slice(); a[k] += d; if ((k === 1 && Math.abs(a[1]) > 0.45) || (k === 0 && (a[0] < -1.9 || a[0] > -0.2)) || (k === 2 && (a[2] < -2.3 || a[2] > -0.1))) continue; const e = err(a); if (e < bestE) { bestE = e; best = a; imp = true; } } if (!imp) step /= 2; }
  return { a: best.map((n) => +n.toFixed(3)), e: +bestE.toFixed(4) };
}
// -x hand (rig.handL) is the grip hand; +x (rig.handR) is the support hand on the foregrip
let bestAll: any = null;
for (const gz of [0.08, 0.14, 0.2]) for (const gy of [0.98, 1.06, 1.14]) for (const gx of [-0.2, -0.12, -0.04]) for (const yaw of [0.0, 0.2, 0.4]) for (const pitch of [0.2, 0.45, 0.7]) {
  const grip = new Vector3(gx, gy, gz), dir = new Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const sup = grip.clone().addScaledVector(dir, 0.2).addScaledVector(new Vector3(-Math.sin(yaw) * Math.sin(pitch) * 0, Math.cos(pitch), 0), 0.0514);
  const a = solve(rig.shoulderL, rig.elbowL, rig.handL, grip), b = solve(rig.shoulderR, rig.elbowR, rig.handR, sup);
  const tot = a.e + b.e; if (!bestAll || tot < bestAll.tot) bestAll = { tot, gz, gy, gx, yaw, pitch, a, b };
}
console.log(JSON.stringify(bestAll));
