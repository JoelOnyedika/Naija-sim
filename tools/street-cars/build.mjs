import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const TMP = process.env.STREET_TMP || '.street-cars-tmp', OUT = process.argv[2] || 'public/models/street';
fs.mkdirSync(OUT, { recursive: true });
// model -> { variants, length (m), flip (front toward -z after aligning), body/trim/wheel keep ratios }
const CFG = JSON.parse(fs.readFileSync('tools/street-cars/cfg.json', 'utf8'));
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

function simplifyPrim(P, tris, keep, err = 0.02, lockBorder = false) {
  // P: {pos, nrm, uv?, idx}; returns same shape reduced to ~keep of the triangles
  const target = Math.max(12, Math.floor(P.idx.length * keep / 3) * 3);
  if (target >= P.idx.length) return P;
  const n = P.pos.length / 3, hasUv = !!P.uv, stride = hasUv ? 5 : 3, at = new Float32Array(n * stride);
  for (let i = 0; i < n; i++) { at[i*stride] = P.nrm[i*3]; at[i*stride+1] = P.nrm[i*3+1]; at[i*stride+2] = P.nrm[i*3+2]; if (hasUv) { at[i*stride+3] = P.uv[i*2]; at[i*stride+4] = P.uv[i*2+1]; } }
  const w = hasUv ? [0.6, 0.6, 0.6, 1.5, 1.5] : [0.5, 0.5, 0.5];
  const [idx] = hasUv ? MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(P.idx), P.pos, 3, at, stride, w, null, target, err, lockBorder ? ['LockBorder'] : []) : MeshoptSimplifier.simplify(new Uint32Array(P.idx), P.pos, 3, target, 0.4, []);
  // compact: drop unused vertices
  const remap = new Map(), pos = [], nrm = [], uv = [], col = [], out = [];
  for (const v of idx) { if (!remap.has(v)) { remap.set(v, pos.length / 3); pos.push(P.pos[v*3], P.pos[v*3+1], P.pos[v*3+2]); nrm.push(P.nrm[v*3], P.nrm[v*3+1], P.nrm[v*3+2]); if (P.uv) uv.push(P.uv[v*2], P.uv[v*2+1]); if (P.col) col.push(P.col[v*3], P.col[v*3+1], P.col[v*3+2]); } out.push(remap.get(v)); }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: P.uv ? new Float32Array(uv) : null, col: P.col ? new Float32Array(col) : null, idx: out };
}
function readPrim(node) { const p = node.getMesh().listPrimitives()[0]; return { name: node.getName(), mat: p.getMaterial(), pos: Float32Array.from(p.getAttribute('POSITION').getArray()), nrm: Float32Array.from(p.getAttribute('NORMAL').getArray()), uv: p.getAttribute('TEXCOORD_0') ? Float32Array.from(p.getAttribute('TEXCOORD_0').getArray()) : null, idx: Array.from(p.getIndices().getArray()) }; }
function splitComponents(P) {
  const key = new Map(), w = new Int32Array(P.pos.length / 3);
  for (let i = 0; i < w.length; i++) { const k = `${Math.round(P.pos[i*3]*500)},${Math.round(P.pos[i*3+1]*500)},${Math.round(P.pos[i*3+2]*500)}`; if (!key.has(k)) key.set(k, key.size); w[i] = key.get(k); }
  const par = Array.from({ length: key.size }, (_, i) => i); const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < P.idx.length; t += 3) { const a = f(w[P.idx[t]]); par[f(w[P.idx[t+1]])] = a; par[f(w[P.idx[t+2]])] = a; }
  const comp = new Map(); for (let t = 0; t < P.idx.length; t += 3) { const r = f(w[P.idx[t]]); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(t); }
  return [...comp.values()].map((tl) => { const remap = new Map(), pos = [], nrm = [], uv = [], idx = [];
    for (const t of tl) for (let k = 0; k < 3; k++) { const v = P.idx[t+k]; if (!remap.has(v)) { remap.set(v, pos.length/3); pos.push(P.pos[v*3], P.pos[v*3+1], P.pos[v*3+2]); nrm.push(P.nrm[v*3], P.nrm[v*3+1], P.nrm[v*3+2]); if (P.uv) uv.push(P.uv[v*2], P.uv[v*2+1]); } idx.push(remap.get(v)); }
    const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]; for (let i=0;i<pos.length;i+=3) for (let a=0;a<3;a++){ mn[a]=Math.min(mn[a],pos[i+a]); mx[a]=Math.max(mx[a],pos[i+a]); }
    return { ...P, pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: P.uv ? Float32Array.from(uv) : null, idx, mn, mx, dims: mx.map((v,i)=>v-mn[i]) }; });
}
/** A 10-sided tyre prism (flat shaded) plus a grey alloy disc on its outer face, standing where the original tyre stood. axis = index of the wheel's axle (thin dimension). */
function makeWheel(c, mn, mx, axis, outward, seg = 10) {
  const ctr = mn.map((v, i) => (v + mx[i]) / 2), others = [0, 1, 2].filter((i) => i !== axis), r = ((mx[others[0]] - mn[others[0]]) + (mx[others[1]] - mn[others[1]])) / 4, hw = (mx[axis] - mn[axis]) / 2;
  const pos = [], nrm = [], col = [], idx = [];
  const P = (a, u, v) => { const p = [0, 0, 0]; p[axis] = a; p[others[0]] = u; p[others[1]] = v; return p; };
  const N = (a, u, v) => { const p = [0, 0, 0]; p[axis] = a; p[others[0]] = u; p[others[1]] = v; return p; };
  const add = (p, n, k) => { pos.push(ctr[0] + p[0], ctr[1] + p[1], ctr[2] + p[2]); nrm.push(...n); col.push(k, k, k); return pos.length / 3 - 1; };
  const tyre = 0.02, rim = 0.2;
  for (let i = 0; i < seg; i++) { const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2, n = N(0, Math.cos(am), Math.sin(am));
    const v = [add(P(-hw, r * Math.cos(a0), r * Math.sin(a0)), n, tyre), add(P(hw, r * Math.cos(a0), r * Math.sin(a0)), n, tyre), add(P(hw, r * Math.cos(a1), r * Math.sin(a1)), n, tyre), add(P(-hw, r * Math.cos(a1), r * Math.sin(a1)), n, tyre)];
    idx.push(v[0], v[1], v[2], v[0], v[2], v[3]); }
  // outer face: a dark tyre disc with a smaller alloy disc on top (the inner face is never seen, so it is skipped)
  for (const [rr, off, k] of [[r * 0.99, hw, tyre], [r * 0.6, hw + 0.004, rim]]) { const n = N(outward, 0, 0), c0 = add(P(outward * off, 0, 0), n, k), ring = [];
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; ring.push(add(P(outward * off, rr * Math.cos(a), rr * Math.sin(a)), n, k)); }
    for (let i = 0; i < seg; i++) idx.push(c0, ring[i], ring[(i + 1) % seg]); }
  // fix winding so every face points outward (check against its normal)
  for (let t = 0; t < idx.length; t += 3) { const [a, b, c2] = [idx[t], idx[t+1], idx[t+2]]; const ab = [0,1,2].map(k => pos[b*3+k] - pos[a*3+k]), ac = [0,1,2].map(k => pos[c2*3+k] - pos[a*3+k]); const cr = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]]; const dot = cr[0]*nrm[a*3] + cr[1]*nrm[a*3+1] + cr[2]*nrm[a*3+2]; if (dot < 0) { idx[t+1] = c2; idx[t+2] = b; } }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: null, col: Float32Array.from(col), idx };
}
function concat(list) { const pos = [], nrm = [], uv = [], col = [], idx = []; let base = 0, hasCol = list.every(l => l.col);
  for (const l of list) { pos.push(...l.pos); nrm.push(...l.nrm); if (l.uv) uv.push(...l.uv); if (hasCol) col.push(...l.col); for (const i of l.idx) idx.push(i + base); base += l.pos.length / 3; }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: uv.length ? Float32Array.from(uv) : null, col: hasCol ? Float32Array.from(col) : null, idx }; }

const report = {};
for (const [model, cfg] of Object.entries(CFG)) {
  // 1. pick the lightest variant as the template (it tints best)
  // the template is the variant that takes a tint best: bright and neutral (white / light grey), never a coloured one
  let best = null, bl = -1e9;
  for (const id of cfg.variants) { const d = await io.read(`${TMP}/${id}.glb`); let L = 0, S = 0, k = 0; for (const m of d.getRoot().listMaterials()) { const t = m.getBaseColorTexture(); if (t && m.getName() !== 'blinn2SG') { const st = await sharp(Buffer.from(t.getImage())).resize(16, 16).stats(); const c = st.channels.slice(0, 3).map((x) => x.mean); L += (c[0] + c[1] + c[2]) / 3; S += Math.max(...c) - Math.min(...c); k++; } } const score = L / (k || 1) - 1.5 * (S / (k || 1)); if (score > bl) { bl = score; best = id; } }
  const doc = await io.read(`${TMP}/${best}.glb`);
  const nodes = doc.getRoot().listNodes();
  const bodies = [], trims = [];
  for (const n of nodes) { const P = readPrim(n); const tex = P.mat.getBaseColorTexture(); if (tex && P.mat.getName() !== 'blinn2SG') { P.tex = tex; bodies.push(P); } else { P.isWheel = P.mat.getName() === 'blinn2SG'; P.flat = P.mat.getBaseColorFactor(); P.wtex = tex; trims.push(P); } }
  { const split = []; for (const P of trims) { if (P.isWheel) { split.push(P); continue; } for (const c of splitComponents(P)) { const d = [...c.dims].sort((a,b)=>a-b); c.isTyre = c.idx.length/3 === 280 && d[0] < d[2] * 0.45; split.push(c); } } trims.length = 0; trims.push(...split); }
  const before = [...bodies, ...trims].reduce((a, p) => a + p.idx.length / 3, 0);
  // 2. colour the trim: flat dark parts take their material colour, wheel parts sample the wheel texture at each vertex
  for (const P of trims) { const n = P.pos.length / 3, col = new Float32Array(n * 3);
    if (P.isWheel && P.wtex) { const img = sharp(Buffer.from(P.wtex.getImage())); const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < n; i++) { const u = ((P.uv[i*2] % 1) + 1) % 1, v = ((P.uv[i*2+1] % 1) + 1) % 1, x = Math.min(info.width - 1, Math.floor(u * info.width)), y = Math.min(info.height - 1, Math.floor(v * info.height)), o = (y * info.width + x) * 4; col[i*3] = lin(data[o]); col[i*3+1] = lin(data[o+1]); col[i*3+2] = lin(data[o+2]); } }
    else for (let i = 0; i < n; i++) { col[i*3] = Math.max(P.flat[0], 0.015); col[i*3+1] = Math.max(P.flat[1], 0.015); col[i*3+2] = Math.max(P.flat[2], 0.015); }
    P.col = col; P.uv = null; }
  // 3. simplify. Body keeps its UVs (border-locked off: UV weights keep the paint from smearing); trim and wheels have no UVs so they collapse hard.
  const bodyS = bodies.map((b) => simplifyPrim(b, null, cfg.body, 0.03));
  const trimMain = concat(trims.filter(t => !t.isWheel && !t.isTyre));
  const trimS = simplifyPrim(trimMain, null, cfg.trim, 0.05);
  // wheels: replaced by clean low-poly tyres + a grey disc, standing exactly where the original tyres stood (the original hub prim is dropped)
  const bmn = [1e9,1e9,1e9], bmx = [-1e9,-1e9,-1e9]; for (const b of bodies) for (let i = 0; i < b.pos.length; i += 3) for (let a = 0; a < 3; a++) { bmn[a] = Math.min(bmn[a], b.pos[i+a]); bmx[a] = Math.max(bmx[a], b.pos[i+a]); }
  const carC = bmn.map((v, i) => (v + bmx[i]) / 2);
  const wheelS = trims.filter(t => t.isTyre).map((t) => { const axis = t.dims.indexOf(Math.min(...t.dims)), cen = (t.mn[axis] + t.mx[axis]) / 2; return makeWheel(t, t.mn, t.mx, axis, cen > carC[axis] ? 1 : -1, cfg.seg || 10); });
  const wheels = wheelS;
  if (process.env.DBG) console.log(model, 'main', trimMain.idx.length/3, '->', trimS.idx.length/3, 'wheels', wheelS.length, 'x', wheelS[0]?.idx.length/3);
  const trimAll = concat([trimS, ...wheelS]);
  // 4. body texture(s) -> one small atlas (side by side), uv remapped
  const TS = cfg.tex || 384; const comp = [];
  for (let i = 0; i < bodies.length; i++) { const buf = await sharp(Buffer.from(bodies[i].tex.getImage())).resize(TS, TS).modulate({ saturation: cfg.sat ?? 0.3 }).png().toBuffer(); comp.push({ input: buf, left: i * TS, top: 0 }); }
  const atlas = await sharp({ create: { width: TS * bodies.length, height: TS, channels: 3, background: '#808080' } }).composite(comp).webp({ quality: cfg.q || 82 }).toBuffer();
  const bodyAll = concat(bodyS.map((b, i) => ({ ...b, uv: b.uv.map((u, k) => (k % 2 === 0 ? (u + i) / bodies.length : u)) })));
  // 5. align: long axis -> z, wheels on y=0, centred, scaled to the target length, front toward +z
  const all = [bodyAll, trimAll]; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const P of all) for (let i = 0; i < P.pos.length; i += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P.pos[i + a]); mx[a] = Math.max(mx[a], P.pos[i + a]); }
  const alongX = (mx[0] - mn[0]) > (mx[2] - mn[2]);
  const len = alongX ? mx[0] - mn[0] : mx[2] - mn[2], s = cfg.length / len, cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
  for (const P of all) { for (let i = 0; i < P.pos.length; i += 3) { let x = (P.pos[i] - cx) * s, y = (P.pos[i+1] - mn[1]) * s, z = (P.pos[i+2] - cz) * s, nx = P.nrm[i], nz = P.nrm[i+2];
      if (alongX) { [x, z] = [z, x]; [nx, nz] = [nz, nx]; /* x -> z */ }
      if (cfg.flip) { x = -x; z = -z; nx = -nx; nz = -nz; }
      P.pos[i] = x; P.pos[i+1] = y; P.pos[i+2] = z; P.nrm[i] = nx; P.nrm[i+2] = nz; }
    // swapping x and z mirrors the model: undo by reversing triangle winding
    if (alongX) for (let t = 0; t < P.idx.length; t += 3) { const q = P.idx[t+1]; P.idx[t+1] = P.idx[t+2]; P.idx[t+2] = q; }
    if (cfg.flip && alongX) { /* two flips cancel in winding */ } }
  // 6. write
  const out = new Document(); out.createExtension(EXTTextureWebP).setRequired(true); const buf = out.createBuffer(), scene = out.createScene();
  const mk = (P, mat, name) => { const prim = out.createPrimitive().setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(P.pos).setBuffer(buf)).setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(P.nrm).setBuffer(buf)).setIndices(out.createAccessor().setType('SCALAR').setArray(new Uint16Array(P.idx)).setBuffer(buf)).setMaterial(mat);
    if (P.uv) prim.setAttribute('TEXCOORD_0', out.createAccessor().setType('VEC2').setArray(P.uv).setBuffer(buf)); if (P.col) prim.setAttribute('COLOR_0', out.createAccessor().setType('VEC3').setArray(P.col).setBuffer(buf));
    scene.addChild(out.createNode(name).setMesh(out.createMesh(name).addPrimitive(prim))); };
  const tex = out.createTexture('body').setImage(atlas).setMimeType('image/webp');
  const mBody = out.createMaterial('MAT_BODY').setBaseColorTexture(tex).setMetallicFactor(0).setRoughnessFactor(0.55);
  const mTrim = out.createMaterial('MAT_TRIM').setMetallicFactor(0).setRoughnessFactor(0.8);
  mk(bodyAll, mBody, 'body'); mk(trimAll, mTrim, 'trim');
  await io.write(`${OUT}/${model}.glb`, out);
  const size = fs.statSync(`${OUT}/${model}.glb`).size;
  report[model] = { template: best, before, body: bodyAll.idx.length / 3, trim: trimAll.idx.length / 3, total: (bodyAll.idx.length + trimAll.idx.length) / 3, kb: Math.round(size / 1024), dims: alongX ? [mx[2]-mn[2], mx[1]-mn[1], mx[0]-mn[0]].map(v => +(v*s).toFixed(2)) : [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]].map(v => +(v*s).toFixed(2)) };
}
console.table(report);
const NAMES = { sedan: 'Old saloon', hatch: 'Hatchback', van: 'Panel van / minibus', wagon: 'Family wagon', pickup_s: 'Small pickup', pickup_l: 'Double-cab pickup' };
const manifest = Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { file: `${k}.glb`, name: NAMES[k] ?? k, triangles: v.total, kb: v.kb, width: v.dims[0], height: v.dims[1], length: v.dims[2], front: '+z' }]));
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
