import './mockStorage';
import { readFileSync } from 'node:fs';
import { registerContent } from '../src/content';
import { MAP } from '../src/data/balance';
import { getState } from '../src/world/registry';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

console.log('Map camera');
ok(MAP.polar > 0.5 && MAP.polar < 1.0, `tilt ${MAP.polar} rad (${Math.round(MAP.polar * 57.3)} degrees from straight down): angled but never side-on (old value was 0.38)`);
const view = readFileSync('src/three/world/WorldView.tsx', 'utf8');
ok(view.includes('minPolarAngle={MAP_POLAR} maxPolarAngle={MAP_POLAR}') && view.includes('MAP_POLAR = MAP.polar'), 'the map still locks the tilt, so panning, dragging and tapping keep working as before');

console.log('Billboards');
const state = getState('lagos')!, list = state.mapData.billboards ?? [];
const SIZE = { wide: 1.9, standard: 1.4 } as const;
ok(MAP.billboardScale > 1 && MAP.billboardScale <= 4, `billboards are drawn ${MAP.billboardScale}x bigger than their definitions`);
ok(list.length >= 5 && new Set(list.map((b) => b.id)).size === list.length, `${list.length} billboards with unique ids (the ad slots and their purchase flow are untouched)`);
let overlaps = 0;
for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const a = list[i], b = list[j], d = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1]);
  if (d < ((SIZE[a.format] + SIZE[b.format]) / 2) * MAP.billboardScale * 0.6) { overlaps++; console.log(`  ! ${a.id} and ${b.id} are ${d.toFixed(1)} apart`); }
}
ok(overlaps === 0, 'no two enlarged billboards overlap each other');
const sea = state.mapData.layout!.sea;
ok(list.every((b) => b.position[0] > sea.x0 && b.position[0] < sea.x1 && b.position[1] > sea.z0 && b.position[1] < sea.z1), 'every billboard is inside the map');
const board = readFileSync('src/three/world/Billboards.tsx', 'utf8');
ok(board.includes('scale={MAP.billboardScale}') && board.includes('onClick={open}'), 'the enlarged board keeps its click handler (opens the ad sheet in map mode)');

console.log('Water');
const water = readFileSync('src/three/world/Water.tsx', 'utf8');
ok(!/uTime\*1\.6|\*2\.2|smoothstep\(0\.93/.test(water), 'the high-frequency stripe terms that drew crossing lines are gone');
ok(/#2477CC/i.test(water) && /#4DB0EE/i.test(water), 'water is a blue surface (deep and shallow blues)');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll map checks passed');
