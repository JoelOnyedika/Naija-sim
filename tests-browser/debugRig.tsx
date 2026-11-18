// TEST-ONLY: finds vertices the skeleton moves far from where they were baked.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3, SkinnedMesh } from 'three';
import { BODY_URL, bodyTemplate } from '@/three/character/bodyAsset';
import { buildRiggedCharacter } from '@/three/character/rigged';
import { toSpec } from '@/three/character/build';
export async function debug(app: object) {
  const g = await new GLTFLoader().loadAsync(BODY_URL);
  const rig = buildRiggedCharacter(toSpec(app as never), g as never); rig.root.updateMatrixWorld(true);
  const t = bodyTemplate(g as never, 'masc', null as never);
  let sm: SkinnedMesh | null = null; rig.root.traverse((o) => { if ((o as SkinnedMesh).isSkinnedMesh && !sm) sm = o as SkinnedMesh; });
  const mesh = sm as unknown as SkinnedMesh;
  // put every bone back to the file's rest pose: nothing should move
  mesh.skeleton.bones.forEach((b, i) => { const p = t.parent[i]; if (p < 0) b.quaternion.copy(t.quat[i]); else b.quaternion.copy(t.quat[p]).invert().multiply(t.quat[i]); }); rig.root.updateMatrixWorld(true);
  const pos = mesh.geometry.attributes.position, v = new Vector3(), out: unknown[] = [];
  const SI = mesh.geometry.attributes.skinIndex, SW = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < pos.count; i++) { mesh.getVertexPosition(i, v); const d = v.distanceTo(new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))); if (d > 0.02) out.push({ i, d: +d.toFixed(2), region: t.region[i], bones: [0, 1, 2, 3].map((k) => `${t.names[SI.getComponent(i, k)]}:${SW.getComponent(i, k).toFixed(2)}`) }); }
  const bad: unknown[] = []; mesh.skeleton.bones.forEach((b, i) => { const m = b.matrixWorld.clone().multiply(mesh.skeleton.boneInverses[i]); let d = 0; for (let k = 0; k < 16; k++) d = Math.max(d, Math.abs(m.elements[k] - (k % 5 === 0 ? 1 : 0))); if (d > 0.001) bad.push([t.names[i], +d.toFixed(3)]); });
  return { bad, count: out.length, sample: out.slice(0, 8), bone0: t.names.slice(0, 6) };
}
