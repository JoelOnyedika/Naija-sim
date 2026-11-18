// TEST-ONLY: finds sliver triangles in the arm.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BODY_URL, bodyTemplate } from '@/three/character/bodyAsset';
export async function dbg() {
  const g = await new GLTFLoader().loadAsync(BODY_URL); const t = bodyTemplate(g as never, 'masc', null as never), P = t.geometry.attributes.position, ix = t.geometry.index!;
  const out: unknown[] = [];
  for (let k = 0; k < ix.count; k += 3) {
    const a = ix.getX(k), b = ix.getX(k + 1), c = ix.getX(k + 2), p = [a, b, c].map((i) => [P.getX(i), P.getY(i), P.getZ(i)]);
    if (Math.min(...p.map((q) => Math.abs(q[0]))) < 0.15) continue; // arms only
    const e = [[0, 1], [1, 2], [2, 0]].map(([i, j]) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]));
    const L = Math.max(...e), s = (e[0] + e[1] + e[2]) / 2, area = Math.sqrt(Math.max(0, s * (s - e[0]) * (s - e[1]) * (s - e[2])));
    out.push({ r: +(L * L / (area || 1e-9)).toFixed(1), L: +L.toFixed(3), reg: [a, b, c].map((i) => t.region[i]), x: p.map((q) => +q[0].toFixed(2)), y: p.map((q) => +q[1].toFixed(2)) });
  }
  out.sort((u: any, v: any) => v.r - u.r); return out.slice(0, 8); // eslint-disable-line @typescript-eslint/no-explicit-any
}
