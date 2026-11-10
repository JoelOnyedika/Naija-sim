import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const TMP = process.env.STREET_TMP || '.street-cars-tmp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read('assets-src/street-cars-pack/low_poly_cars_pack.glb');
// ---- 1. collect world-space triangles per primitive
const prims = {};
for (const n of src.getRoot().listNodes()) { const m = n.getMesh(); if (!m) continue;
  const p = m.listPrimitives()[0], M = n.getWorldMatrix();
  const P = p.getAttribute('POSITION').getArray(), N = p.getAttribute('NORMAL')?.getArray(), U = p.getAttribute('TEXCOORD_0')?.getArray(), I = p.getIndices().getArray();
  const pos = new Float32Array(P.length), nrm = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) { const x=P[i],y=P[i+1],z=P[i+2];
    pos[i]=M[0]*x+M[4]*y+M[8]*z+M[12]; pos[i+1]=M[1]*x+M[5]*y+M[9]*z+M[13]; pos[i+2]=M[2]*x+M[6]*y+M[10]*z+M[14];
    if (N) { const a=N[i],b=N[i+1],c=N[i+2]; nrm[i]=M[0]*a+M[4]*b+M[8]*c; nrm[i+1]=M[1]*a+M[5]*b+M[9]*c; nrm[i+2]=M[2]*a+M[6]*b+M[10]*c; const l=Math.hypot(nrm[i],nrm[i+1],nrm[i+2])||1; nrm[i]/=l;nrm[i+1]/=l;nrm[i+2]/=l; } }
  prims[n.getName()] = { name: n.getName(), pos, nrm, uv: U, idx: I, mat: p.getMaterial() };
}
// ---- 2. connected components per primitive (weld by position)
function components(pr) {
  const key = new Map(), w = new Int32Array(pr.pos.length / 3);
  for (let i = 0; i < w.length; i++) { const k = `${Math.round(pr.pos[i*3]*500)},${Math.round(pr.pos[i*3+1]*500)},${Math.round(pr.pos[i*3+2]*500)}`; if (!key.has(k)) key.set(k, key.size); w[i] = key.get(k); }
  const par = Array.from({ length: key.size }, (_, i) => i); const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < pr.idx.length; t += 3) { const a = f(w[pr.idx[t]]), b = f(w[pr.idx[t+1]]), c = f(w[pr.idx[t+2]]); par[b] = a; par[c] = a; }
  const comp = new Map();
  for (let t = 0; t < pr.idx.length; t += 3) { const r = f(w[pr.idx[t]]); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(t); }
  return [...comp.values()].map((tris) => { const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]; for (const t of tris) for (let k=0;k<3;k++){ const v=pr.idx[t+k]; for (let a=0;a<3;a++){ mn[a]=Math.min(mn[a],pr.pos[v*3+a]); mx[a]=Math.max(mx[a],pr.pos[v*3+a]); } } return { pr, tris, mn, mx, c: mn.map((v,i)=>(v+mx[i])/2) }; });
}
const bb = (pr) => { const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]; for (let i=0;i<pr.pos.length;i+=3) for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],pr.pos[i+a]);mx[a]=Math.max(mx[a],pr.pos[i+a]);} return {mn,mx}; };
const O = (n) => `Object_${n}`;
const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const defs = [
  ...[2,3,10,31,42,43,44,45,46].map((n,i)=>({ model:'hatch', id:`hatch${i}`, bodies:[O(n)] })),
  ...R(14,19).map((n,i)=>({ model:'van', id:`van${i}`, bodies:[O(n)] })),
  ...R(20,28).map((n,i)=>({ model:'sedan', id:`sedan${i}`, bodies:[O(n)] })),
  ...[9,11,12,13].map((n,i)=>({ model:'pickup_s', id:`pickups${i}`, bodies:[O(n)] })),
  ...R(4,8).map((n,i)=>({ model:'wagon', id:`wagon${i}`, bodies:[O(n)] })),
  ...[[29,30],[32,37],[33,38],[34,39],[35,40],[36,41]].map((p,i)=>({ model:'pickup_l', id:`pickupl${i}`, bodies:p.map(O) })),
];
const bodyNames = new Set(defs.flatMap(d => d.bodies));
for (const d of defs) { const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]; for (const b of d.bodies){ const r=bb(prims[b]); for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],r.mn[a]);mx[a]=Math.max(mx[a],r.mx[a]);} } d.mn=mn; d.mx=mx; d.parts=d.bodies.map(b=>({pr:prims[b],tris:Array.from({length:prims[b].idx.length/3},(_,i)=>i*3),role:'body'})); }
// ---- 3. hand every other component to the car whose footprint holds it
const stray = [];
for (const name of Object.keys(prims)) { if (bodyNames.has(name)) continue;
  for (const c of components(prims[name])) {
    let best = null, bd = 1e9;
    for (const d of defs) { const dx = Math.max(d.mn[0]-c.c[0], 0, c.c[0]-d.mx[0]), dz = Math.max(d.mn[2]-c.c[2], 0, c.c[2]-d.mx[2]); const dist = Math.hypot(dx, dz); if (dist < bd) { bd = dist; best = d; } }
    if (bd < 0.35) best.parts.push({ pr: c.pr, tris: c.tris, role: 'detail', mn: c.mn, mx: c.mx });
    else stray.push({ n: name, tris: c.tris.length, c: c.c.map(v=>+v.toFixed(1)), size: c.mx.map((v,i)=>+(v-c.mn[i]).toFixed(2)) });
  } }
console.log('stray components:', stray.length); for (const s of stray.slice(0,40)) console.log(JSON.stringify(s));
// ---- 4. write one glb per car (re-centred on its own footprint, wheels on y=0)
fs.mkdirSync(TMP, { recursive: true });
const dump = {};
for (const d of defs) {
  const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene(); const matMap = new Map();
  const cx=(d.mn[0]+d.mx[0])/2, cz=(d.mn[2]+d.mx[2])/2, by=d.mn[1];
  let tris = 0; const byMat = new Map();
  for (const part of d.parts) { const k = part.pr.name + '|' + part.pr.mat.getName(); if (!byMat.has(k)) byMat.set(k, { pr: part.pr, tris: [] }); byMat.get(k).tris.push(...part.tris); }
  for (const { pr, tris: tl } of byMat.values()) {
    const remap = new Map(), P = [], N = [], U = [], I = [];
    for (const t of tl) for (let k = 0; k < 3; k++) { const v = pr.idx[t+k]; if (!remap.has(v)) { remap.set(v, P.length/3); P.push(pr.pos[v*3]-cx, pr.pos[v*3+1]-by, pr.pos[v*3+2]-cz); N.push(pr.nrm[v*3],pr.nrm[v*3+1],pr.nrm[v*3+2]); if (pr.uv) U.push(pr.uv[v*2], pr.uv[v*2+1]); } I.push(remap.get(v)); }
    const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf)).setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buf)).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(buf));
    if (U.length) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(U)).setBuffer(buf));
    const sm = pr.mat; let m = matMap.get(sm.getName());
    if (!m) { m = doc.createMaterial(sm.getName()).setBaseColorFactor(sm.getBaseColorFactor()).setMetallicFactor(0).setRoughnessFactor(0.7); const bt = sm.getBaseColorTexture(); if (bt) { const t = doc.createTexture(sm.getName()+'_tex').setImage(bt.getImage()).setMimeType(bt.getMimeType()); m.setBaseColorTexture(t); } matMap.set(sm.getName(), m); }
    prim.setMaterial(m); const mesh = doc.createMesh(pr.name).addPrimitive(prim); scene.addChild(doc.createNode(pr.name).setMesh(mesh)); tris += I.length/3;
  }
  dump[d.id] = { model: d.model, tris, size: d.mx.map((v,i)=>+(v-d.mn[i]).toFixed(2)), parts: d.parts.length };
  await io.write(`${TMP}/${d.id}.glb`, doc);
}
console.log(JSON.stringify(dump));
