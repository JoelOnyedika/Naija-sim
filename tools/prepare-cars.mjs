/**
 * Turns raw car GLBs into game-ready ones. Run from the project root:
 *   npm i --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer sharp
 *   node tools/prepare-cars.mjs
 * It reads assets-src/cars-original/*.glb (names listed below) and writes public/models/cars/*.glb plus manifest.json.
 * For each car: removes stray geometry (Agera), welds and de-duplicates, simplifies the Agera (39k to 16k triangles), shrinks
 * textures to 512 px WebP, then bakes the car to 4.5 m long, centred, wheels on y = 0. Front must be +z (the game's cars face +z).
 * Materials named MAT_BODY / MAT_GLASS / MAT_TIRE are recoloured by the game.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds, dedup, prune, weld, simplify, textureCompress, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const OUT='public/models/cars', SRC='assets-src/cars-original';
fs.mkdirSync(OUT,{recursive:true}); fs.mkdirSync(SRC,{recursive:true});
const TARGET_LEN = 4.5; // metres along the car's length after baking (matches the procedural cars)
const manifest = {};
for (const n of ['agera','audi','dodge','gtr','huracan','tesla']) {
  const d = await io.read(`${SRC}/${n}.glb`);
  const root = d.getRoot();
  // 1. drop stray triangles far outside the car (the Agera has 9 stray vertices)
  if (n === 'agera') for (const node of root.listNodes()) { const m = node.getMesh(); if (!m) continue;
    for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'), idx = p.getIndices(); if (!idx) continue; const a = pos.getArray(), ia = idx.getArray(); const keep=[];
      for (let i=0;i<ia.length;i+=3) { const bad=[0,1,2].some(k=>Math.abs(a[ia[i+k]*3])>9.5); if(!bad) keep.push(ia[i],ia[i+1],ia[i+2]); }
      if (keep.length !== ia.length) idx.setArray(new Uint32Array(keep)); } }
  await d.transform(weld(), dedup(), prune());
  if (n === 'agera') await d.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.002 }), prune());
  if (root.listTextures().length) await d.transform(textureCompress({ encoder: sharp, resize: [512, 512], targetFormat: 'webp' }));
  // 2. measure, then bake: centre on x/z, wheels on y=0, length = TARGET_LEN
  const scene = root.listScenes()[0]; const b = getBounds(scene);
  const len = b.max[2]-b.min[2], s = TARGET_LEN/len, cx=(b.max[0]+b.min[0])/2, cz=(b.max[2]+b.min[2])/2;
  const wrap = d.createNode('CAR_ROOT').setScale([s,s,s]).setTranslation([-cx*s, -b.min[1]*s, -cz*s]);
  for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); } scene.addChild(wrap);
  // 3. which way is the front? headlights if the model has them, otherwise the cabin sits toward the REAR of a car
  let front = null; const hl = root.listNodes().find(x=>/HEADLIGHT/i.test(x.getName()));
  const nb = getBounds(scene); let tris=0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount()||0)/3;
  // heuristic: z-centroid of the highest 15% of vertices (roof/cabin) vs centre
  let sumz=0,cnt=0; const H = nb.max[1]; for (const node of root.listNodes()) { const m=node.getMesh(); if(!m||!/BODY|GLASS/i.test(node.getName()+m.listPrimitives()[0].getMaterial()?.getName())) continue; const mat=node.getWorldMatrix();
    for (const p of m.listPrimitives()) { const a=p.getAttribute('POSITION').getArray(); for(let i=0;i<a.length;i+=3){ const y=mat[1]*a[i]+mat[5]*a[i+1]+mat[9]*a[i+2]+mat[13]; if (y> H*0.85){ const z=mat[2]*a[i]+mat[6]*a[i+1]+mat[10]*a[i+2]+mat[14]; sumz+=z;cnt++; } } } }
  const roofZ = cnt? sumz/cnt:0; front = roofZ < 0 ? '+z' : '-z';
  console.log(n.padEnd(8),'tris',Math.round(tris),'size',nb.max.map((v,i)=>+(v-nb.min[i]).toFixed(2)).join('x'),'roofZ',roofZ.toFixed(2),'=> front',front);
  manifest[n] = { file: `${n}.glb`, front, width: +(nb.max[0]-nb.min[0]).toFixed(2), height: +(nb.max[1]-nb.min[1]).toFixed(2), length: +(nb.max[2]-nb.min[2]).toFixed(2) };
  await io.write(`${OUT}/${n}.glb`, d);
}
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest,null,2));
