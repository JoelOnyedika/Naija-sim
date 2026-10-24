import './mockStorage';
import { readFileSync } from 'node:fs';
import { registerContent } from '../src/content';
import { FURNITURE, ITEM_CATEGORIES, type Rarity } from '../src/data/items';
import { describeItem } from '../src/game/itemInfo';
import { priceOf } from '../src/game/pricing';
import { findFreeSpot, validatePlacement } from '../src/world/placement';
import { getLayout, getProperty } from '../src/world/registry';
import { LAGOS_IDS } from './lagosIds';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const registry = readFileSync('src/three/models/registry.tsx', 'utf8');
const kitSrc = readFileSync('src/three/models/kit.tsx', 'utf8'); // the venue prop kit registers its models in its own file

console.log('Catalogue integrity');
ok(new Set(FURNITURE.map((f) => f.id)).size === FURNITURE.length, `${FURNITURE.length} items with unique ids`);
const missing = FURNITURE.filter((f) => !new RegExp(`\\b${f.model}\\s*:`).test(registry + kitSrc));
ok(missing.length === 0, `every item's model is registered${missing.length ? ' (missing: ' + missing.map((m) => m.id).join(', ') + ')' : ''}`);
const dupModels = FURNITURE.map((f) => f.model).filter((m, i, a) => a.indexOf(m) !== i);
ok(dupModels.length === 0, `no two items share a model, so none is just a recolour${dupModels.length ? ' (' + dupModels.join(', ') + ')' : ''}`);
ok(FURNITURE.every((f) => f.price > 0 && f.footprint.w > 0 && f.footprint.d > 0 && f.height > 0 && f.name && f.description), 'prices, footprints, heights and texts are valid');
ok(FURNITURE.every((f) => ITEM_CATEGORIES.some((c) => c.id === f.category)), 'every item is in a real shop category');
ok(FURNITURE.filter((f) => f.placement.surface === 'wall').every((f) => f.footprint.d <= (['ac', 'wall_shelf'].includes(f.id) ? 0.3 : 0.12) && (f.placement.mountHeight ?? 0) + f.height / 2 <= 2.4 && (f.placement.mountHeight ?? 0) - f.height / 2 >= 0.4), 'wall items are thin (the AC and shelf are deeper by design) and mounted inside the wall height');

console.log('Variety');
const seating = ['chair', 'sofa', 'armchair', 'office_chair', 'dining_chair', 'stool'];
ok(seating.every((id) => FURNITURE.some((f) => f.id === id)) && new Set(seating.map((id) => FURNITURE.find((f) => f.id === id)!.model)).size === 6, 'six distinct seating designs');
const rugs = FURNITURE.filter((f) => f.id.startsWith('rug'));
ok(rugs.length >= 4 && new Set(rugs.map((r) => `${r.footprint.w}x${r.footprint.d}`)).size === rugs.length, `${rugs.length} rugs with different shapes and sizes`);
ok(FURNITURE.filter((f) => f.id.startsWith('wall_') || f.id === 'neon_sign').length >= 7, 'at least seven wall decorations and storage pieces');
for (const id of ['ring_light', 'camera_tripod', 'dj_deck', 'speaker', 'disco_light']) ok(FURNITURE.some((f) => f.id === id), `creator / music item exists: ${id}`);

console.log('Quality tiers');
const mean = (r: Rarity) => { const l = FURNITURE.filter((f) => f.rarity === r && f.category !== 'pets'); return l.reduce((s, f) => s + f.price, 0) / l.length; };
ok(mean('common') < mean('uncommon') && mean('uncommon') < mean('rare') && mean('rare') < mean('epic'), `average price rises with tier (${(['common', 'uncommon', 'rare', 'epic'] as Rarity[]).map((r) => Math.round(mean(r) / 1000) + 'k').join(' < ')})`);
ok(FURNITURE.some((f) => f.rarity === 'epic' && f.price < 300000) && FURNITURE.some((f) => f.rarity === 'common' && f.price >= 30000), 'price and tier are related but not identical (cheap epics and dearer commons exist)');
ok(FURNITURE.every((f) => priceOf(f.price) > 0), 'every price survives the shared pricing function');

console.log('Placement');
const newIds = ['dining_chair', 'stool', 'office_chair', 'armchair', 'side_table', 'locker', 'shelf_unit', 'shoe_rack', 'rug_round', 'rug_runner', 'rug_persian', 'wall_art_abstract', 'wall_photos', 'wall_panel', 'wall_clock', 'wall_mirror', 'neon_sign', 'ring_light', 'camera_tripod', 'dj_deck', 'bedside_lamp', 'pet_bed', 'pet_bowl'];
let unplaceable = 0, total = 0;
for (const id of newIds) {
  const def = FURNITURE.find((f) => f.id === id)!;
  for (const pid of LAGOS_IDS) {
    total++;
    const layout = getLayout(getProperty(pid)!.layoutId)!;
    const pose = findFreeSpot(def, layout, []);
    if (!pose || !validatePlacement(def, layout, pose, [])) { unplaceable++; console.log(`  ! ${id} cannot be placed in ${pid}`); }
  }
}
ok(unplaceable === 0, `all ${newIds.length} new items can be placed in all ${LAGOS_IDS.length} homes (${total} tries)`);

console.log('Information');
const decor = ['side_table', 'rug_round', 'wall_clock', 'shoe_rack'].map((id) => describeItem(FURNITURE.find((f) => f.id === id)!));
ok(decor.every((d) => !d.functional && d.activities.length === 0), 'decorative items are labelled decorative with no invented effects');
const ring = describeItem(FURNITURE.find((f) => f.id === 'ring_light')!);
ok(!!ring.functional && ring.activities.length === 2 && ring.activities[0].requires.some((r) => r.includes('Camera and tripod')) && !!ring.activities[0].skill?.includes("Creativity"), 'ring light lists record content (needs the camera, trains creativity) and presenting');
ok(describeItem(FURNITURE.find((f) => f.id === 'dj_deck')!).activities[0].requires.some((r) => r.includes('Tower speaker')), 'DJ deck says it needs a speaker');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll catalogue checks passed');
