const ctx: any = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {}, width: 10 })), set: () => true });
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3 } from 'three';
import { buildRiggedCharacter } from '../src/three/character/rigged';
import { toSpec } from '../src/three/character/build';
import { DEFAULT_APPEARANCE } from '../src/stores/characterStore';
import { BAG_STYLES, BOTTOM_STYLES, SHOE_STYLES, TOP_STYLES } from '../src/data/clothing';
import { ANIM, ClipPlayer, UNARMED } from '../src/three/character/clips';
let fails = 0; const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const b = readFileSync('public/models/characters/base_body.glb');
const gltf: any = await new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '', res, rej));
console.log('Every outfit builds');
let n = 0, bad = 0;
for (const body of ['masc', 'femme'] as const) for (const top of TOP_STYLES) for (const bottom of BOTTOM_STYLES) for (const shoes of SHOE_STYLES) for (const bag of BAG_STYLES) {
  if ((n++ % 9) !== 0 && !(bag.id !== 'none' && top.id === 'tee')) continue; // a spread of every combination, all of them for the bag styles
  try { const rig: any = buildRiggedCharacter(toSpec({ ...DEFAULT_APPEARANCE, body, top: top.id, bottom: bottom.id, shoes: shoes.id, bag: bag.id } as any), gltf); rig.root.updateMatrixWorld(true); const box = new Box3().setFromObject(rig.root); if (!Number.isFinite(box.max.y) || box.max.y < 1.5 || box.max.y > 2.1) bad++; rig.dispose(); } catch (e) { bad++; console.log('  failed', body, top.id, bottom.id, shoes.id, bag.id, (e as Error).message); }
}
ok(bad === 0, `outfits (spread over both bodies, all tops, bottoms, shoes, bags) build and stand 1.5 to 2.1 m tall (${bad} problems)`);
console.log('Animated body');
const rig: any = buildRiggedCharacter(toSpec({ ...DEFAULT_APPEARANCE, body: 'masc', shoes: 'sneakers', bag: 'backpack' } as any), gltf), pl = new ClipPlayer();
const minY = (): number => { rig.root.updateMatrixWorld(true); let lo = 9; const foot = [rig.bone('DEF-footL'), rig.bone('DEF-footR')]; for (const f of foot) { f.updateWorldMatrix(true, false); lo = Math.min(lo, f.matrixWorld.elements[13]); } return lo; };
let worst = 0, high = 0;
for (let i = 0; i < 240; i++) { const dy = pl.update(1 / 60, 1.5, UNARMED); rig.playPose(pl.q, dy); const y = minY(); worst = Math.min(worst, y - 0.133); high = Math.max(high, y - 0.133); }
ok(worst > -0.03 && high < 0.07, `while walking, the lower foot stays on the ground (within ${(worst * 100).toFixed(1)} to +${(high * 100).toFixed(1)} cm of standing height)`);
rig.leavePose(); rig.root.updateMatrixWorld(true); ok(Math.abs(rig.bone('DEF-footL').matrixWorld.elements[13] - 0.133) < 0.02, 'leaving the clips puts the body back in its base pose');
ok(ANIM.gun.bone === 'DEF-handR' && !!rig.bone(ANIM.gun.bone), 'the rifle has a hand bone to ride on');
// head cargo and the rifle ride bones that move with the clips
{ const h = rig.bone('DEF-head'); h.updateWorldMatrix(true, false); const y0 = h.matrixWorld.elements[13]; for (let i = 0; i < 90; i++) { const dy = pl.update(1 / 60, 3, UNARMED); rig.playPose(pl.q, dy); } rig.root.updateMatrixWorld(true); const y1 = rig.bone('DEF-head').matrixWorld.elements[13]; ok(Math.abs(y1 - y0) < 0.2 && y1 > 1.3, `the head stays at a sane height while running (${y0.toFixed(2)} to ${y1.toFixed(2)} m): a load on it stays on`); }
console.log(fails ? `\n${fails} check(s) failed` : '\nAll outfit checks passed'); process.exit(fails ? 1 : 0);
