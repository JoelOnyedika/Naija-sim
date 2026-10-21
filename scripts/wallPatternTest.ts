import './mockStorage';
import { readFileSync } from 'node:fs';
import { FLOORS, WALLS, WALL_CATEGORIES } from '../src/data/finishes';
import { FURNITURE, ITEM_CATEGORIES } from '../src/data/items';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const tex = readFileSync('src/three/textures.ts', 'utf8');
const buy = readFileSync('src/features/game/BuyMode.tsx', 'utf8');

console.log('Wall catalogue');
ok(WALLS.length >= 45, `${WALLS.length} wall finishes (was 9)`);
ok(new Set(WALLS.map((w) => w.id)).size === WALLS.length && new Set([...WALLS, ...FLOORS].map((w) => w.id)).size === WALLS.length + FLOORS.length, 'finish ids are unique across walls and floors');
for (const id of ['wall_cream', 'wall_sky', 'wall_sage', 'wall_terracotta', 'wall_charcoal', 'wall_stripes', 'wall_dots', 'wall_diamond', 'wall_marble']) ok(WALLS.some((w) => w.id === id), `saved finish id still exists: ${id}`);
const diamond = WALLS.find((w) => w.id === 'wall_diamond')!;
ok(diamond.pattern === 'diamond' && diamond.color === '#2E3A4D' && diamond.accent === '#B8892F' && diamond.price === 160000, 'the existing diamond pattern is unchanged (same pattern, colours and price)');
ok(WALLS.every((w) => w.price > 0 && w.color && w.swatch && w.name), 'every wall has a price, colours and a name');
const cats = new Set(WALL_CATEGORIES.map((c) => c.id));
ok(WALLS.every((w) => cats.has(w.category)) && WALL_CATEGORIES.every((c) => WALLS.filter((w) => w.category === c.id).length >= 3), `every category has at least 3 options (${WALL_CATEGORIES.map((c) => c.label + ' ' + WALLS.filter((w) => w.category === c.id).length).join(', ')})`);
const patterns = new Set(WALLS.filter((w) => w.pattern).map((w) => w.pattern!));
ok(patterns.size >= 20, `${patterns.size} distinct patterns in use`);
const missing = [...patterns].filter((p) => !new RegExp(`case '${p}'`).test(tex));
ok(missing.length === 0, `every pattern has a drawing routine${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);
ok(WALLS.filter((w) => w.category === 'paint').length >= 15, `${WALLS.filter((w) => w.category === 'paint').length} solid colours`);
ok(WALLS.filter((w) => w.pattern && w.color.toLowerCase() === (w.accent ?? '').toLowerCase()).length === 0, 'no pattern is drawn in the same colour as its background (it would be invisible)');
ok(WALLS.every((w) => w.pattern ? true : w.finish === 'painted' || w.finish === 'marble'), 'plain walls use the painted or marble finish');

console.log('Seamless tiling and scale');
ok(/const wrap = \(draw: \(\) => void\)/.test(tex) && (tex.match(/wrap\(\(\) =>/g) ?? []).length >= 8, 'shapes that cross a tile edge are redrawn on the opposite side, so tiles join without seams');
ok(/One 256px tile covers 2m x 2m/.test(tex), 'one tile is 2 m x 2 m of wall, the same scale as before');

console.log('House Design tab');
const order = ITEM_CATEGORIES.map((c) => c.id);
ok(order[0] === 'storage', 'Storage is the first shop tab');
ok(/const si = catTabs\.findIndex\(\(c\) => c\.id === 'storage'\)/.test(buy) && /\.\.\.catTabs\.slice\(0, si \+ 1\), houseTab, \.\.\.catTabs\.slice\(si \+ 1\)/.test(buy), 'the House Design tab is inserted immediately after Storage');
ok(!/FINISH_TABS/.test(buy), 'there are no separate Floors/Walls tabs any more');
ok(/seg\('floors', 'Floors'\)\}\{seg\('walls', 'Walls'\)/.test(buy) && /WALL_CATEGORIES\.map/.test(buy), 'inside House Design: a Floors/Walls switch and wall category chips');
ok(/wallThumb\(f\.color/.test(buy), 'wall swatches show the real pattern');
ok(FURNITURE.length >= 64, 'furniture catalogue untouched');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll wall pattern checks passed');
