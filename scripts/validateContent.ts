/**
 * Content integrity check. Run after editing any state pack: npm run validate:content
 * Checks ids and references, layout geometry (overlaps, fixtures, doors, windows, car slots)
 * and that every life type's starting furniture can be placed in every possible starting home.
 */
import { LIFE_TYPES } from '../src/data/lifeTypes';
import { getFurniture } from '../src/data/items';
import { registerContent } from '../src/content';
import { carSlots, wallPieces, windowsOnPiece } from '../src/world/layoutGeometry';
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
      if (!ids.has(c.a) || !ids.has(c.b)) { err(`${tag}: connection ${c.a}-${c.b} references unknown zone`); continue; }
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
      const inside = layout.zones.some((z) => f.x - def.footprint.w / 2 >= z.x0 - 1e-3 && f.x + def.footprint.w / 2 <= z.x1 + 1e-3 && f.z - def.footprint.d / 2 >= z.z0 - 1e-3 && f.z + def.footprint.d / 2 <= z.z1 + 1e-3);
      if (!inside) err(`${tag}: fixture ${f.defId} at (${f.x.toFixed(2)}, ${f.z.toFixed(2)}) is not inside a zone`);
      for (let j = 0; j < i; j++) {
        const o = fx[j], od = getFurniture(o.defId)!;
        if (Math.abs(f.x - o.x) < (def.footprint.w + od.footprint.w) / 2 && Math.abs(f.z - o.z) < (def.footprint.d + od.footprint.d) / 2) err(`${tag}: fixtures ${f.defId} and ${o.defId} overlap`);
      }
    });
    // parking matches the listing
    const slots = carSlots(layout).length;
    if (slots < p.garageBays + p.parkingSpaces) err(`${tag}: listing promises ${p.garageBays + p.parkingSpaces} car spaces but layout has ${slots}`);
    if (p.garageBays === 0 && p.parkingSpaces === 0 && slots > 0) warn(`${tag}: layout has parking but listing says none`);
    // bathrooms in listing vs layout
    const baths = layout.zones.filter((z) => z.kind === 'bathroom').length;
    if (p.unit === 'bedrooms' && baths !== p.bathrooms) warn(`${tag}: listing says ${p.bathrooms} bathrooms, layout has ${baths}`);
    if (p.unit === 'bedrooms' && layout.zones.filter((z) => z.kind === 'bedroom').length !== p.bedrooms) warn(`${tag}: bedroom count mismatch`);
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
