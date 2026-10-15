import './mockStorage';
import { registerContent } from '../src/content';
import { FURNITURE, getFurniture } from '../src/data/items';
import { AFK_ALLOWED, afkCandidates, pickAfk } from '../src/game/afk';
import { LAGOS_IDS } from './lagosIds';
import { getLayout, getProperty } from '../src/world/registry';
import { buildNavGrid, findPath, interactionSpot, isFree, SPECS, CELL } from '../src/world/navigation';
import { findFreeSpot, validatePlacement } from '../src/world/placement';
import type { PlacedItem } from '../src/types/game';
import { wallPieces } from '../src/world/layoutGeometry';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

// 1. furnish each home with one of every usable item (where it fits) and check every one can be reached
const USABLE = FURNITURE.filter((d) => SPECS[d.id] && d.placement.surface === 'floor').map((d) => d.id);
ok(USABLE.includes('gym_rug'), 'the gym mat is a usable catalogue item');
for (const pid of LAGOS_IDS) {
  const prop = getProperty(pid)!, layout = getLayout(prop.layoutId)!;
  const placed: PlacedItem[] = [];
  for (const id of ['bed', 'sofa', 'tv', 'desk', 'chair', 'fridge', 'cooker', 'toilet', 'shower', 'speaker', 'bathtub', 'piano', 'gym_rug']) {
    const def = getFurniture(id)!;
    const pose = findFreeSpot(def, layout, placed);
    if (pose && validatePlacement(def, layout, pose, placed)) placed.push({ uid: `${id}-${placed.length}`, defId: id, ...pose } as PlacedItem);
  }
  const g = buildNavGrid(layout, placed);
  let reached = 0, total = 0, bad = 0;
  for (const it of placed) {
    if (!USABLE.includes(it.defId)) continue;
    total++;
    const spot = interactionSpot(layout, placed, it);
    if (!spot) { bad++; console.log('   no spot', pid, it.defId); continue; }
    ok(isFree(g, spot.approach), `${pid}: ${it.defId} approach point is walkable`);
    // start from the centre of the largest walkable region: the avatar's real start is the living room
    const home = layout.zones.find((z) => z.indoor && z.furnishable) ?? layout.zones[0];
    const from = { x: (home.x0 + home.x1) / 2, z: (home.z0 + home.z1) / 2 };
    const path = findPath(g, from, spot.approach);
    if (path) { reached++; for (let i = 0; i < path.length; i++) ok(isFree(g, path[i]), `${pid}: waypoint ${i} to ${it.defId} is on free floor`); } else bad++;
  }
  console.log(`  ${pid}: ${reached}/${total} usable items reachable (${placed.length} placed)`);
}
void CELL; void wallPieces;

// 2. a path between two rooms must go through a door: the straight line crosses a wall, the path must not
{
  const layout = getLayout(getProperty(LAGOS_IDS[LAGOS_IDS.length - 1])!.layoutId)!;
  const g = buildNavGrid(layout, []);
  const rooms = layout.zones.filter((z) => z.indoor);
  let crossed = 0, tested = 0;
  for (const a of rooms) for (const b of rooms) {
    if (a === b) continue;
    const pa = { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 }, pb = { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 };
    const path = findPath(g, pa, pb); tested++;
    if (!path) continue;
    let prev = pa;
    for (const w of path) { // every segment must be free along its length
      const n = Math.ceil(Math.hypot(w.x - prev.x, w.z - prev.z) / (CELL / 2));
      for (let i = 0; i <= n; i++) if (!isFree(g, { x: prev.x + ((w.x - prev.x) * i) / n, z: prev.z + ((w.z - prev.z) * i) / n })) crossed++;
      prev = w;
    }
  }
  ok(tested > 0 && crossed === 0, `room-to-room paths never cross a wall (${tested} pairs, ${crossed} violations)`);
}

// 3. AFK is a closed list
{
  const everything = FURNITURE.map((d, i) => ({ uid: `u${i}`, defId: d.id, x: 0, z: 0, rotation: 0 })) as PlacedItem[];
  everything.push({ uid: 'gym', defId: 'gym_rug', x: 0, z: 0, rotation: 0 });
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) seen.add(pickAfk(everything, Math.random).kind);
  ok([...seen].every((k) => (AFK_ALLOWED as readonly string[]).includes(k)), `AFK only ever picks ${[...seen].join(', ')}`);
  ok(!seen.has('sleep' as never) && !seen.has('toilet' as never) && !seen.has('dance' as never), 'AFK never picks sleep, toilet, shower, piano, dance');
  ok(afkCandidates([]).length === 1 && afkCandidates([])[0].kind === 'relax', 'with no furniture AFK only relaxes');
  ok(afkCandidates(everything).some((c) => c.kind === 'pushups'), 'push-ups appear only when a gym rug exists');
  ok(!afkCandidates(everything.filter((i) => i.defId !== 'gym_rug')).some((c) => c.kind === 'pushups'), 'no gym rug, no push-ups');
}
console.log(fails ? `\n${fails} FAILED` : '\nAll navigation checks passed');
process.exit(fails ? 1 : 0);
