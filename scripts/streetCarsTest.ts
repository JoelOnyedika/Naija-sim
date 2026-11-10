import fs from 'fs';
import { STREET_CARS, STREET_MODELS, TRAFFIC_KINDS, TRAFFIC_MODEL, streetCarUrl } from '../src/data/streetCars';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const dir = 'public/models/street';
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8')) as Record<string, { triangles: number; kb: number; length: number; width: number; height: number; front: string }>;

console.log('Street car files');
for (const m of STREET_MODELS) {
  const f = `${dir}/${m}.glb`, ex = fs.existsSync(f), d = STREET_CARS[m], man = manifest[m];
  ok(ex, `${m}: file exists`);
  if (!ex || !man) { ok(false, `${m}: listed in manifest.json`); continue; }
  const buf = fs.readFileSync(f), json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string }[]; materials: { name: string }[] };
  ok(buf.toString('utf8', 0, 4) === 'glTF', `${m}: is a binary glTF`);
  ok(json.meshes.length === 2 && json.meshes.some((x) => x.name === 'body') && json.meshes.some((x) => x.name === 'trim'), `${m}: exactly two meshes, body and trim (two draw calls)`);
  ok(man.triangles <= 1200, `${m}: ${man.triangles} triangles (budget 1,200)`);
  ok(buf.length <= 120 * 1024, `${m}: ${Math.round(buf.length / 1024)} KB (budget 120 KB)`);
  ok(man.front === '+z', `${m}: front faces +z like every other car`);
  ok(d.length === man.length && d.width === man.width && d.height === man.height && d.triangles === man.triangles, `${m}: src/data/streetCars.ts matches the built file`);
  ok(streetCarUrl(m).endsWith(`models/street/${m}.glb`), `${m}: url`);
}
console.log('Traffic');
ok(TRAFFIC_KINDS.every((k) => STREET_MODELS.includes(TRAFFIC_MODEL[k])), 'every traffic kind maps to a model');
ok(new Set(TRAFFIC_KINDS.map((k) => TRAFFIC_MODEL[k])).size === 6, 'all six models appear in traffic');
const total = STREET_MODELS.reduce((a, m) => a + fs.statSync(`${dir}/${m}.glb`).size, 0);
ok(total < 400 * 1024, `all six together are ${Math.round(total / 1024)} KB (the original pack is 10 MB)`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
