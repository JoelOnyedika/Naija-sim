// TEST-ONLY: prints body template measures and where each region's vertices live.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshStandardMaterial } from 'three';
import { BODY_URL, bodyTemplate } from '@/three/character/bodyAsset';
export async function probe(kind: 'masc' | 'femme' = 'masc') {
  const g = await new GLTFLoader().loadAsync(BODY_URL), t = bodyTemplate(g, kind, new MeshStandardMaterial());
  const P = t.geometry.attributes.position, bins: Record<string, number[][]> = {};
  for (let i = 0; i < P.count; i++) (bins[t.region[i]] ??= []).push([Math.abs(P.getX(i)), P.getY(i), P.getZ(i)]);
  const out: any = { m: t.m, bones: {}, reg: {}, tris: t.geometry.index!.count / 3 };
  for (const n of t.names.filter((n) => /arm|hand|collar|spine003|neck|pinky01/.test(n))) { const p = t.pos[t.index[n]]; out.bones[n] = [p.x, p.y, p.z].map((v) => +v.toFixed(3)); }
  for (const k in bins) { const a = bins[k], mm = (j: number, f: (...x: number[]) => number) => +f(...a.map((v) => v[j])).toFixed(3); out.reg[k] = { n: a.length, x: [mm(0, Math.min), mm(0, Math.max)], y: [mm(1, Math.min), mm(1, Math.max)], z: [mm(2, Math.min), mm(2, Math.max)] }; }
  return out;
}
