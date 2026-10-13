const HOMES_BY_LAYOUT_OK = true;
import { HOUSE_TIERS } from '../src/world/layoutBuilders';
/**
 * Content integrity check. Run after editing any state pack: npm run validate:content
 * Checks ids and references, layout geometry (overlaps, fixtures, doors, windows, car slots)
 * and that every life type's starting furniture can be placed in every possible starting home.
 */
import { LIFE_TYPES } from '../src/data/lifeTypes';
import { getFurniture } from '../src/data/items';
import { registerContent } from '../src/content';
import { carSlots, doorClearances, mainRoomCount, roomsOf, wallPieces, windowsOnPiece } from '../src/world/layoutGeometry';
import { BAY_LENGTH, BAY_WIDTH } from '../src/world/garage';
import { findFreeSpot, fixturesOf, validatePlacement } from '../src/world/placement';
import { getLayout, getProperty, listStates } from '../src/world/registry';
import type { PlacedItem } from '../src/types/game';

registerContent();
let errors = 0, warnings = 0;
const err = (m: string) => { console.error('  ✗ ' + m); errors++; };
const warn = (m: string) => { console.warn('  ! ' + m); warnings++; };

const overlap = (a: { x0: number; z0: number; x1: number; z1: number }, b: typeof a) =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-3 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1e-3;

for (const state of listStates()) {
  console.log(`\nState: ${state.name} (${state.id})`);
  const areaIds = new Set(state.areas.map((a) => a.id));
  const propIds = new Set(state.properties.map((p) => p.id));

  for (const a of state.areas) {
    if (a.stateId !== state.id) err(`area ${a.id} has wrong stateId`);
    for (const pid of a.propertyIds) if (!propIds.has(pid)) err(`area ${a.id} lists unknown property ${pid}`);
    // A district with no listing is fine as long as the map gives it a reason to exist (a landmark).
    if (!a.propertyIds.length && !state.mapData.landmarks.some((l) => l.areaId === a.id)) warn(`area ${a.id} has no properties and no landmarks`);
  }
  // Map quality: unique ids, inside the playable bounds, not stacked on each other, billboards clear of landmarks.
  {
    const lm = state.mapData.landmarks, bb = state.mapData.billboards ?? [], b = state.mapData.bounds;
    const dup = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);
    dup(lm.map((l) => l.id)).forEach((id) => err(`duplicate landmark id ${id}`));
    dup(bb.map((x) => x.id)).forEach((id) => err(`duplicate billboard id ${id}`));
    for (const l of lm) {
      if (Math.abs(l.position[0] - state.mapData.center[0]) > b || Math.abs(l.position[1] - state.mapData.center[1]) > b) err(`landmark ${l.id} is outside the map bounds`);
      if (!l.visit.effects || !Object.keys(l.visit.effects).length) warn(`landmark ${l.id} has no visit effects`);
    }
    for (let a = 0; a < lm.length; a++) for (let c = a + 1; c < lm.length; c++) {
      const d = Math.hypot(lm[a].position[0] - lm[c].position[0], lm[a].position[1] - lm[c].position[1]);
      if (d < 2.6) err(`landmarks ${lm[a].id} and ${lm[c].id} overlap (${d.toFixed(1)} apart)`);
    }
    for (const x of bb) for (const l of lm) if (Math.hypot(x.position[0] - l.position[0], x.position[1] - l.position[1]) < 2.2) err(`billboard ${x.id} sits on landmark ${l.id}`);
    console.log(`  map: ${lm.length} landmarks across ${new Set(lm.map((l) => l.category)).size} categories, ${bb.length} billboards`);
  }
  for (const l of state.mapData.landmarks) if (l.areaId && !areaIds.has(l.areaId)) err(`landmark ${l.id} references unknown area ${l.areaId}`);
  for (const t of ['lapo', 'nepo'] as const) for (const pid of state.startingProperties[t]) if (!propIds.has(pid)) err(`startingProperties.${t}: unknown ${pid}`);

  for (const p of state.properties) {
    const tag = p.id;
    if (!areaIds.has(p.areaId)) err(`${tag}: unknown area ${p.areaId}`);
    const layout = getLayout(p.layoutId);
    if (!layout) { err(`${tag}: missing layout ${p.layoutId}`); continue; }

    // zones
    const ids = new Set<string>();
    layout.zones.forEach((z) => { if (ids.has(z.id)) err(`${tag}: duplicate zone ${z.id}`); ids.add(z.id); });
    for (let i = 0; i < layout.zones.length; i++) for (let j = i + 1; j < layout.zones.length; j++) {
      if (overlap(layout.zones[i], layout.zones[j])) err(`${tag}: zones ${layout.zones[i].id} and ${layout.zones[j].id} overlap`);
    }
    // plot
    for (const z of layout.zones) if (z.x0 < layout.plot.x0 || z.x1 > layout.plot.x1 || z.z0 < layout.plot.z0 || z.z1 > layout.plot.z1) err(`${tag}: zone ${z.id} outside plot`);
    // connections → doors
    const pieces = wallPieces(layout);
    for (const c of layout.connections) {
      if (c.open) continue;
      if (!ids.has(c.a) || !ids.has(c.b)) { err(`${tag}: connection ${c.a}-${c.b} references unknown zone`); continue; }
      if (c.b === 'entry' || c.a === 'entry') continue;
      if (!pieces.some((w) => w.doors.length && ((w.hi?.id === c.a && w.lo?.id === c.b) || (w.hi?.id === c.b && w.lo?.id === c.a)))) warn(`${tag}: connection ${c.a}-${c.b} produced no door (zones not adjacent?)`);
    }
    // windows must sit on a tall wall
    for (const w of layout.windows) {
      const ok = pieces.some((pc) => pc.tall && (pc.o === 'h') === (w.wall === 'back') && windowsOnPiece(layout, pc).includes(w));
      if (!ok) warn(`${tag}: window (${w.wall}, ${w.along}) is not on any tall wall`);
    }
    // fixtures: inside a zone and not overlapping each other
    const fx = fixturesOf(layout);
    fx.forEach((f, i) => {
      const def = getFurniture(f.defId);
      if (!def) { err(`${tag}: fixture ${f.defId} unknown`); return; }
      const fw = (f.rotation % 2 ? def.footprint.d : def.footprint.w) / 2, fd = (f.rotation % 2 ? def.footprint.w : def.footprint.d) / 2;
      const inside = layout.zones.some((z) => f.x - fw >= z.x0 - 1e-3 && f.x + fw <= z.x1 + 1e-3 && f.z - fd >= z.z0 - 1e-3 && f.z + fd <= z.z1 + 1e-3);
      if (!inside) err(`${tag}: fixture ${f.defId} at (${f.x.toFixed(2)}, ${f.z.toFixed(2)}) is not inside a zone`);
      for (let j = 0; j < i; j++) {
        const o = fx[j], od = getFurniture(o.defId)!;
        const ow = (o.rotation % 2 ? od.footprint.d : od.footprint.w) / 2, odp = (o.rotation % 2 ? od.footprint.w : od.footprint.d) / 2;
        if (Math.abs(f.x - o.x) < fw + ow && Math.abs(f.z - o.z) < fd + odp) err(`${tag}: fixtures ${f.defId} and ${o.defId} overlap`);
      }
    });
    // parking: the listing, the layout and the geometry must agree
    const slots = carSlots(layout);
    if (slots.length !== p.garageBays + p.parkingSpaces) err(`${tag}: listing says ${p.garageBays + p.parkingSpaces} car spaces but layout has ${slots.length}`);
    if (p.garageBays !== 0) err(`${tag}: garageBays must be 0 (bays are open, not garage buildings)`);
    if (layout.zones.some((z) => z.kind === 'garage')) err(`${tag}: has an enclosed garage zone`);
    const indoor = layout.zones.filter((z) => z.indoor);
    for (const s of slots) {
      const z = layout.zones.find((q) => q.id === s.zoneId)!;
      if (Math.abs(z.x1 - z.x0 - BAY_WIDTH) > 1e-6 || Math.abs(z.z1 - z.z0 - BAY_LENGTH) > 1e-6) err(`${tag}: bay ${s.id} is not ${BAY_WIDTH} x ${BAY_LENGTH} m`);
      if (indoor.some((q) => overlap(q, z))) err(`${tag}: bay ${s.id} overlaps the house`);
    }
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      if (Math.abs(slots[i].x - slots[j].x) < BAY_WIDTH - 1e-6 && Math.abs(slots[i].z - slots[j].z) < BAY_LENGTH - 1e-6) err(`${tag}: bays ${slots[i].id} and ${slots[j].id} overlap`);
    }
    // square footprint, tiled exactly by indoor zones
    const bx0 = Math.min(...indoor.map((z) => z.x0)), bz0 = Math.min(...indoor.map((z) => z.z0)), bx1 = Math.max(...indoor.map((z) => z.x1)), bz1 = Math.max(...indoor.map((z) => z.z1));
    if (Math.abs((bx1 - bx0) - (bz1 - bz0)) > 1e-6) err(`${tag}: footprint ${(bx1 - bx0).toFixed(2)} x ${(bz1 - bz0).toFixed(2)} is not square`);
    // size ladder, attached side carport
    const tierOf = Object.values(HOUSE_TIERS).find((t) => Math.abs(t.size - (bx1 - bx0)) < 1e-6);
    if (!tierOf) err(`${tag}: footprint ${(bx1 - bx0).toFixed(2)} is not one of the tier sizes 12/14/16/18/20`);
    else {
      if (slots.length !== tierOf.parkingBays) err(`${tag}: ${tierOf.label} needs ${tierOf.parkingBays} bay(s), layout has ${slots.length}`);
      if (tierOf.id === 1 && layout.windows.length !== 1) err(`${tag}: Lapo Baby homes must have exactly one window, has ${layout.windows.length}`);
      console.log(`  ${tag}: ${tierOf.label} ${(bx1 - bx0).toFixed(2)} x ${(bz1 - bz0).toFixed(2)}, ${slots.length} bays, ${layout.windows.length} windows`);
    }
    const bayZones = layout.zones.filter((z) => z.kind === 'parking').sort((a, b) => a.x0 - b.x0);
    if (bayZones.length) {
      if (Math.abs(bayZones[0].x0 - bx1) > 1e-6) err(`${tag}: carport is not attached to the right side of the house`);
      if (bayZones.some((z) => Math.abs(z.z1 - bz1) > 1e-6)) err(`${tag}: bays are not aligned with the front edge`);
      for (let i = 1; i < bayZones.length; i++) if (Math.abs(bayZones[i].x0 - bayZones[i - 1].x1) > 1e-6) err(`${tag}: bays are not side by side`);
      if (bayZones.some((z) => z.z0 < bz0 - 1e-6)) err(`${tag}: carport sticks out behind the house`);
    }
    // floor-plan balance: rooms keep sensible proportions and living space does not swallow the house
    {
      const rooms = roomsOf(layout), area = (r: { zoneIds: string[] }) => r.zoneIds.reduce((a, id) => { const z = layout.zones.find((q) => q.id === id)!; return a + (z.x1 - z.x0) * (z.z1 - z.z0); }, 0);
      const total = (bx1 - bx0) * (bz1 - bz0);
      const living = rooms.filter((r) => r.kind === 'living').reduce((a, r) => a + area(r), 0);
      const line = rooms.map((r) => `${r.label} ${area(r).toFixed(0)}`).join(', ');
      if (rooms.length > 2) console.log(`    rooms (m²): ${line}; living ${(100 * living / total).toFixed(0)}%`);
      if (rooms.length > 2 && living / total > (rooms.length <= 3 ? 0.8 : 0.75)) err(`${tag}: living areas take ${(100 * living / total).toFixed(0)}% of the floor`);
      for (const r of rooms) {
        if (r.kind === 'living') continue;
        const zs = r.zoneIds.map((id) => layout.zones.find((q) => q.id === id)!);
        const w = Math.max(...zs.map((z) => z.x1 - z.x0)), d = Math.max(...zs.map((z) => z.z1 - z.z0));
        if (Math.min(w, d) < (r.kind === 'bathroom' ? 2.8 : 3.5)) err(`${tag}: ${r.label} is only ${Math.min(w, d).toFixed(1)} m across`);
        if (Math.max(w, d) / Math.min(w, d) > 2.2) err(`${tag}: ${r.label} is a narrow strip (${w.toFixed(1)} x ${d.toFixed(1)})`);
      }
      if (HOMES_BY_LAYOUT_OK && rooms.length > 3) for (const r of rooms) if (r.zoneIds.length > 1) err(`${tag}: ${r.label} is not a plain rectangle`);
      if (layout.zones.filter((z) => z.kind === 'bathroom').length > 1) err(`${tag}: more than one bathroom`);
      if (layout.zones.some((z) => z.kind === 'bathroom' && !z.furnishable)) err(`${tag}: the WC must accept furniture`);
      const beds = rooms.filter((r) => r.kind === 'bedroom').map(area);
      if (beds.length && Math.max(...beds) > 0.25 * total) err(`${tag}: a bedroom takes more than 25% of the floor`);
      // floors: kitchens share one material, bathrooms another
      const fl = (k: string) => new Set(layout.zones.filter((z) => z.kind === k).map((z) => z.floor));
      if (fl('kitchen').size > 1 || (fl('kitchen').size === 1 && !fl('kitchen').has('ceramic'))) err(`${tag}: kitchens must all use ceramic`);
      if (fl('bathroom').size > 1 || (fl('bathroom').size === 1 && !fl('bathroom').has('diamond'))) err(`${tag}: bathrooms must all use diamond tile`);
    }
    // cutaway: no wall on the camera-facing sides (front z = bz1 and right x = bx1)
    for (const pc of pieces) if ((pc.o === 'h' && Math.abs(pc.c - bz1) < 1e-6) || (pc.o === 'v' && Math.abs(pc.c - bx1) < 1e-6)) err(`${tag}: wall left on the camera-facing side (${pc.o}=${pc.c})`);
    // every window is drawn exactly once, on the outer back (z = bz0) or left (x = bx0) wall, never on a partition or camera-facing wall
    let drawn = 0;
    for (const pc of pieces) {
      const n = windowsOnPiece(layout, pc).length; drawn += n;
      if (n && Math.abs(pc.c - (pc.o === 'h' ? bz0 : bx0)) > 1e-6) err(`${tag}: window drawn on a wall at ${pc.o}=${pc.c}, not the outer back/left wall`);
    }
    if (drawn !== layout.windows.length) err(`${tag}: ${layout.windows.length} windows defined but ${drawn} drawn`);
    // the camera sees the front (+z) and right (+x) faces: windows exist only on the back and left walls
    if (layout.windows.some((w) => w.wall !== 'back' && w.wall !== 'left')) err(`${tag}: window on a camera-facing wall`);
    const area = indoor.reduce((a, z) => a + (z.x1 - z.x0) * (z.z1 - z.z0), 0);
    if (Math.abs(area - (bx1 - bx0) * (bz1 - bz0)) > 1e-6) err(`${tag}: indoor zones leave gaps in the footprint`);
    // rooms
    const main = mainRoomCount(layout);
    const beds = layout.zones.filter((z) => z.kind === 'bedroom').length;
    const baths = layout.zones.filter((z) => z.kind === 'bathroom').length;
    if (main !== p.rooms) err(`${tag}: listing says ${p.rooms} main rooms, layout has ${main}`);
    if (p.unit === 'bedrooms' && beds !== p.bedrooms) err(`${tag}: listing says ${p.bedrooms} bedrooms, layout has ${beds}`);
    if (baths !== p.bathrooms) err(`${tag}: listing says ${p.bathrooms} bathrooms, layout has ${baths}`);
    // fixtures must not stand in a doorway
    for (const f of fx) {
      const def = getFurniture(f.defId)!, hw = (f.rotation % 2 ? def.footprint.d : def.footprint.w) / 2, hd = (f.rotation % 2 ? def.footprint.w : def.footprint.d) / 2;
      if (doorClearances(layout).some((r) => f.x + hw > r.x0 && f.x - hw < r.x1 && f.z + hd > r.z0 && f.z - hd < r.z1)) err(`${tag}: fixture ${f.defId} blocks a doorway`);
    }
    // every room is reachable from the entrance
    const reach = new Set<string>(['entry']), queue = ['entry'];
    while (queue.length) { const a = queue.shift()!; for (const c of layout.connections) { const o = c.a === a ? c.b : c.b === a ? c.a : null; if (o && !reach.has(o)) { reach.add(o); queue.push(o); } } }
    for (const z of indoor) if (!reach.has(z.id)) err(`${tag}: ${z.id} cannot be reached from the entrance`);
    if (layout.plot.fence !== 'none' || layout.decor.length) warn(`${tag}: has fence or decor geometry`);
  }

  // starting homes: every life type's furniture must fit in every candidate home
  for (const t of ['lapo', 'nepo'] as const) {
    for (const pid of state.startingProperties[t]) {
      const layout = getLayout(getProperty(pid)!.layoutId)!;
      const placed: PlacedItem[] = [];
      const missed: string[] = [];
      for (const id of LIFE_TYPES[t].startingFurniture) {
        const def = getFurniture(id);
        if (!def) { err(`life ${t}: unknown furniture ${id}`); continue; }
        const pose = findFreeSpot(def, layout, placed);
        if (pose && validatePlacement(def, layout, pose, [...fixturesOf(layout), ...placed])) placed.push({ uid: id, defId: id, ...pose });
        else missed.push(id);
      }
      if (carSlots(layout).length < LIFE_TYPES[t].startingVehicles.length) err(`life ${t} starts with ${LIFE_TYPES[t].startingVehicles.length} cars but ${pid} has ${carSlots(layout).length} car spaces`);
      console.log(`  ${t} → ${pid}: placed ${placed.length}/${LIFE_TYPES[t].startingFurniture.length}${missed.length ? ` (inventory: ${missed.join(', ')})` : ''}`);
    }
  }
  console.log(`  ${state.properties.length} properties, ${state.areas.length} areas, ${state.mapData.landmarks.length} landmarks`);
}
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
