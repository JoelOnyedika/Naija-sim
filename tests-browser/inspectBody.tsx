// TEST-ONLY: prints the measured body template.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshStandardMaterial } from 'three';
import { BODY_URL, bodyTemplate } from '@/three/character/bodyAsset';
export async function inspect() {
  const g = await new GLTFLoader().loadAsync(BODY_URL);
  const out: Record<string, unknown> = {};
  for (const k of ['masc', 'femme'] as const) { const t = bodyTemplate(g, k, new MeshStandardMaterial()); out[k] = { m: t.m, bones: t.names.length, verts: t.geometry.attributes.position.count, tris: t.geometry.index!.count / 3, fullTris: t.full.index!.count / 3, root: t.pos[0].toArray(), thighL: t.pos[t.index['DEF-thighL']].toArray(), upperL: t.pos[t.index['DEF-upper_armL']].toArray(), handL: t.pos[t.index['DEF-handL']].toArray(), forearmL: t.pos[t.index['DEF-forearmL']].toArray() }; }
  return out;
}
