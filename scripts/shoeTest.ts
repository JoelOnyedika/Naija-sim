const ctx: any = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {}, width: 10 })), set: () => true });
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, MeshStandardMaterial } from 'three';
import { bodyTemplate } from '../src/three/character/bodyAsset';
import { buildShoe, footBox, type ShoeKind } from '../src/three/character/shoes';
let fails = 0; const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const b = readFileSync('public/models/characters/base_body.glb');
const gltf: any = await new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '', res, rej));
console.log('Shoes fit the foot');
for (const kind of ['masc', 'femme'] as const) {
  const t = bodyTemplate(gltf, kind, new MeshStandardMaterial()), f = footBox(t);
  for (const sh of ['sneakers', 'boots', 'sandals', 'slippers', 'loafers'] as ShoeKind[]) for (const sd of [1, -1] as const) {
    const parts = buildShoe(sh, t, sd), box = new Box3(); parts.forEach((p) => { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox!); });
    const cx = sd * f.cx, good = parts.every((p) => Number.isFinite(p.geo.boundingBox!.min.x) && p.geo.attributes.position.count > 0);
    ok(good && box.min.x <= cx - f.w / 2 + 0.005 && box.max.x >= cx + f.w / 2 - 0.005 && box.min.z <= f.z0 && box.max.z >= f.z1 - 0.005, `${kind} ${sh} (${sd > 0 ? 'left' : 'right'}): covers the foot's width and length`);
    ok(box.min.y > -0.02 && box.min.y < 0.01, `${kind} ${sh} (${sd > 0 ? 'left' : 'right'}): stands on the ground (sole at y ${box.min.y.toFixed(3)})`);
    ok(sh === 'boots' ? box.max.y > f.ankleY + 0.15 : sh === 'slippers' || sh === 'sandals' ? box.max.y < f.ankleY : sh === 'loafers' ? box.max.y > 0.09 && box.max.y < f.ankleY + 0.05 : box.max.y > f.ankleY && box.max.y < f.ankleY + 0.07, `${kind} ${sh}: sensible height (${box.max.y.toFixed(3)} m, ankle ${f.ankleY.toFixed(3)})`);
  }
}
console.log(fails ? `\n${fails} check(s) failed` : '\nAll shoe checks passed'); process.exit(fails ? 1 : 0);
