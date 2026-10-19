import './mockStorage';
import { registerContent } from '../src/content';
import { INTERIOR_WALL_HEIGHT, PLACE_FOCUS, POWER, PRICING, WALL_MOUNT_GAP } from '../src/data/balance';
import { FURNITURE, getFurniture } from '../src/data/items';
import { AFK_ALLOWED, AFK_NEEDS, afkCandidates, pickAfk } from '../src/game/afk';
import { advance } from '../src/game/loop';
import { beginPlace, confirmDraft } from '../src/game/buy';
import { interactWith } from '../src/game/interactions';
import { describeItem } from '../src/game/itemInfo';
import { backupIn, initialTimers, lightLevel, powerMode, tickPower } from '../src/game/power';
import { getAffordability, priceOf, sanitizeMultiplier, setAffordability } from '../src/game/pricing';
import { startNewLife } from '../src/game/life';
import { getActiveHome } from '../src/game/active';
import { useCameraStore } from '../src/stores/cameraStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { usePowerStore } from '../src/stores/powerStore';
import { usePropertyStore } from '../src/stores/propertyStore';
import type { PlacedItem } from '../src/types/game';
import { findFreeSpot, getTransform, validatePlacement } from '../src/world/placement';
import { getLayout, getProperty } from '../src/world/registry';
import { WALL_T, wallPieces } from '../src/world/layoutGeometry';
import { LAGOS_IDS } from './lagosIds';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

console.log('Pricing');
ok(priceOf(100000, 0.5) === 100000, 'neutral multiplier 0.5 leaves base prices unchanged');
ok(priceOf(100000, 0.1) === 20000, '0.1 makes items five times cheaper');
ok(priceOf(100000, 0.9) === 180000, '0.9 makes items 1.8x more expensive');
ok(priceOf(100000, 0.3) < priceOf(100000, 0.5) && priceOf(100000, 0.5) < priceOf(100000, 0.7), 'price rises with the multiplier');
ok([NaN, Infinity, -1, 0].every((b) => priceOf(b) === 0), 'invalid, negative or zero base prices give 0, never NaN or negative');
ok(Number.isInteger(priceOf(12345, 0.37)), 'charged price is whole naira');
ok(sanitizeMultiplier(0) === PRICING.min && sanitizeMultiplier(5) === PRICING.max && sanitizeMultiplier(NaN) === PRICING.default && sanitizeMultiplier('x') === PRICING.default, 'multiplier is clamped to 0.1..0.9, junk falls back to the default');
ok(setAffordability(0.2) === 0.2 && getAffordability() === 0.2, 'the multiplier can be set');
setAffordability(PRICING.default);
ok(FURNITURE.every((f) => priceOf(f.price) > 0), 'every catalogue item has a positive charged price');

console.log('Charged price equals shown price');
startNewLife('lapo');
useEconomyStore.getState().credit(900_000_000, 'test');
beginPlace('plant'); confirmDraft(); // warm-up: the first furniture purchase also pays a one-time task reward, which would blur the money check
for (const m of [0.1, 0.5, 0.9]) {
  setAffordability(m);
  const before = useEconomyStore.getState().money;
  ok(beginPlace('plant'), `beginPlace at multiplier ${m}`);
  ok(confirmDraft(), 'confirm purchase');
  ok(before - useEconomyStore.getState().money === priceOf(getFurniture('plant')!.price, m), `plant charged exactly priceOf() at ${m}`);
}
setAffordability(PRICING.default);

console.log('Interior walls');
let partitions = 0, badH = 0, badOuter = 0;
for (const pid of LAGOS_IDS) {
  const layout = getLayout(getProperty(pid)!.layoutId)!;
  for (const p of wallPieces(layout)) {
    if (p.tall) { if (p.height !== layout.wallHeight) badOuter++; } else { partitions++; if (p.height !== INTERIOR_WALL_HEIGHT || p.height <= 0.95 || p.height >= layout.wallHeight) badH++; }
  }
}
ok(partitions > 0, `there are interior partitions to check (${partitions})`);
ok(badH === 0, `every partition uses the configured height ${INTERIOR_WALL_HEIGHT} (taller than the old 0.95, below the outer walls)`);
ok(badOuter === 0, 'outer walls keep each home\'s own wall height');

console.log('Wall-mounted items sit in front of the wall');
let wallDefs = 0, buried = 0, placedWall = 0;
for (const def of FURNITURE.filter((d) => d.placement.surface === 'wall')) {
  wallDefs++;
  for (const pid of LAGOS_IDS) {
    const layout = getLayout(getProperty(pid)!.layoutId)!;
    const pose = findFreeSpot(def, layout, []);
    if (!pose || !validatePlacement(def, layout, pose, [])) continue;
    placedWall++;
    const t = getTransform(def, { ...pose } as PlacedItem);
    const along = pose.wall === 'left' ? t.position[0] : t.position[2];
    const backFace = along - def.footprint.d / 2 - (pose.wallC ?? 0);
    if (backFace < WALL_T / 2 + WALL_MOUNT_GAP - 1e-6) buried++;
  }
}
ok(wallDefs >= 3 && placedWall > 0, `wall items were placed in the homes (${wallDefs} types, ${placedWall} placements)`);
ok(buried === 0, 'no wall item has its back face inside the wall (visible face clears the wall surface)');
const frame = getFurniture('wall_frame')!;
const back = getTransform(frame, { x: 0, z: 0, rotation: 0, wall: 'back', along: 2, wallC: 0 });
const left = getTransform(frame, { x: 0, z: 0, rotation: 1, wall: 'left', along: 2, wallC: 0 });
ok(Math.abs(back.position[2] - (WALL_T / 2 + WALL_MOUNT_GAP + frame.footprint.d / 2)) < 1e-9 && back.rotationY === 0, 'back-wall frame: offset in +z, facing +z');
ok(Math.abs(left.position[0] - back.position[2]) < 1e-9 && Math.abs(left.rotationY - Math.PI / 2) < 1e-9, 'left-wall frame: same offset in +x, rotated to face +x');

console.log('Camera focus on placement');
const cam = useCameraStore.getState();
cam.clearFocus();
cam.focusOn('a', [1, 1, 1]);
const first = useCameraStore.getState().focus!;
cam.focusOn('a', [9, 9, 9]);
ok(useCameraStore.getState().focus === first, 'a duplicate focus request for the same item inside the window is ignored');
cam.focusOn('b', [2, 2, 2]);
ok(useCameraStore.getState().focus?.id === 'b', 'a different item takes over');
cam.clearFocus();
ok(useCameraStore.getState().focus === null, 'focus can be cleared (player input returns to the normal view)');
const homeNow = getActiveHome()!;
useCameraStore.getState().clearFocus();
const n = homeNow.placed.length;
beginPlace('plant'); // draft only: not placed yet
ok(useCameraStore.getState().focus === null, 'starting a placement never triggers a zoom');
const { useEditorStore } = await import('../src/stores/editorStore');
useEditorStore.getState().setDraft(null);
useEditorStore.setState({ draft: { defId: 'plant', pose: { x: 9999, z: 9999, rotation: 0 }, valid: false, purchase: true } });
ok(confirmDraft() === false && useCameraStore.getState().focus === null && getActiveHome()!.placed.length === n, 'a failed placement does not zoom or place anything');
useEditorStore.getState().setDraft(null);
beginPlace('plant'); confirmDraft();
const f = useCameraStore.getState().focus;
ok(!!f && getActiveHome()!.placed.some((p) => p.uid === f.id), 'a successful placement focuses the placed item');
ok(PLACE_FOCUS.zoomFactor < 1 && PLACE_FOCUS.holdSeconds > 0, 'focus zoom is configured to move closer and to hold for a limited time');
useCameraStore.getState().clearFocus();

console.log('Item information');
const rug = describeItem(getFurniture('rug')!), desk = describeItem(getFurniture('desk')!), tv = describeItem(getFurniture('tv')!);
ok(!rug.functional && rug.activities.length === 0, 'a rug is reported as decorative with no invented activities');
ok(desk.functional && desk.activities[0].effects.some((e) => e.label === 'Energy' && e.delta < 0) && !!desk.activities[0].skill, 'the desk lists its stat effects and the coding XP');
ok(tv.price === priceOf(getFurniture('tv')!.price), 'the information panel price is the charged price');
ok(describeItem(getFurniture('fridge')!).activities[0].requires.length > 0, 'the fridge says it needs food');
ok(FURNITURE.every((d) => { const i = describeItem(d); return i.name && i.category && i.tier && Number.isFinite(i.price); }), 'every item can be described');

console.log('NEPA and backup power');
const base = { outage: false, ibetaOn: false, hasSolar: false, hasGenerator: false, hasIbeta: false, lamps: 0 };
ok(powerMode(base) === 'grid' && lightLevel(base) === 1, 'NEPA on: normal light');
const dark = { ...base, outage: true };
ok(powerMode(dark) === 'dark' && lightLevel(dark) > 0 && lightLevel(dark) < 0.5, 'outage with no backup: dim, never black');
ok(lightLevel({ ...dark, lamps: 2 }) > lightLevel(dark) && lightLevel({ ...dark, lamps: 50 }) <= POWER.lampCap + POWER.dimLevel + 1e-9, 'lamps brighten an outage a little, with a cap');
ok(powerMode({ ...dark, hasIbeta: true }) === 'ibeta' && lightLevel({ ...dark, hasIbeta: true }) < 1, 'Ibeta installed but not switched on: still dim');
ok(lightLevel({ ...dark, hasIbeta: true, ibetaOn: true }) === 1, 'Ibeta switched on: full light');
ok(powerMode({ ...dark, hasGenerator: true }) === 'generator' && lightLevel({ ...dark, hasGenerator: true }) === 1, 'generator restores light with no tap');
ok(powerMode({ ...dark, hasSolar: true }) === 'solar' && lightLevel({ ...dark, hasSolar: true }) === 1, 'solar keeps the house lit during an outage');
ok(powerMode({ ...base, hasSolar: true }) === 'solar', 'solar is a steady state even with NEPA on');
ok(powerMode({ ...dark, hasSolar: true, hasGenerator: true, hasIbeta: true }) === 'solar', 'solar wins when several backups are installed');
// schedule
let rnd = 0.5; const r = () => rnd;
let t = initialTimers(0, true, r);
ok(t.nextAt >= POWER.graceSeconds, 'no outage before the grace period');
let ev = tickPower(t, 10, true, r); ok(ev.event === null, 'nothing happens early');
ev = tickPower(t, t.nextAt, true, r); ok(ev.event === 'outage-start' && ev.timers.outage, 'outage starts when due');
const endsAt = ev.timers.endsAt;
ok(endsAt - t.nextAt >= POWER.outageSeconds[0] && endsAt - t.nextAt <= POWER.outageSeconds[1], 'outage length is inside the configured range');
const again = tickPower(ev.timers, t.nextAt + 1, true, r); ok(again.event === null, 'an outage does not start twice');
const end = tickPower(ev.timers, endsAt, true, r); ok(end.event === 'outage-end' && !end.timers.outage, 'outage ends when due');
const g1 = end.timers.nextAt - endsAt, g2 = tickPower(tickPower(initialTimers(0, false, r), 1e6, false, r).timers, 1e7, false, r).timers.nextAt - 1e7;
ok(g1 >= POWER.gapSeconds[0] && g1 <= POWER.gapSeconds[1] && g2 < g1, 'gaps are inside the configured range and shorter in a home without reliable public power');
ok(Number.isFinite(tickPower(t, Number.MAX_SAFE_INTEGER, true, r).timers.endsAt), 'a huge time jump stays finite');

console.log('Power in the live game');
const home = getActiveHome()!;
useEconomyStore.getState().credit(900_000_000, 'test');
const ps = usePowerStore.getState();
ps.reset();
ok(!ps.switchIbetaOn(), 'tapping the Ibeta with NEPA on does nothing');
ps.force(true);
ok(usePowerStore.getState().outage, 'an outage can begin');
ok(usePowerStore.getState().switchIbetaOn() === true && usePowerStore.getState().switchIbetaOn() === false, 'the Ibeta switches on once; a second tap changes nothing');
usePowerStore.getState().force(false);
ok(!usePowerStore.getState().ibetaOn && !usePowerStore.getState().outage, 'when NEPA returns the Ibeta state is cleared');
// buy the three backups through the normal shop flow and tap them
for (const id of [POWER.items.manual, POWER.items.auto, POWER.items.solar]) {
  const before = useEconomyStore.getState().money;
  ok(beginPlace(id), `${id}: beginPlace`);
  const placedOk = confirmDraft();
  ok(placedOk && before - useEconomyStore.getState().money === priceOf(getFurniture(id)!.price), `${id}: bought once at the shared price`);
}
const b = backupIn(getActiveHome()!.placed);
ok(b.hasIbeta && b.hasGenerator && b.hasSolar, 'backup items are detected from the placed furniture');
ok(getFurniture('ibeta')!.price < getFurniture('generator')!.price && getFurniture('generator')!.price < getFurniture('solar_system')!.price, 'prices rise: Ibeta < generator < solar');
const ibetaItem = getActiveHome()!.placed.find((p) => p.defId === 'ibeta')!;
usePowerStore.getState().force(true);
interactWith(ibetaItem);
ok(usePowerStore.getState().ibetaOn, 'tapping the placed Ibeta during an outage switches it on');
usePowerStore.getState().reset();
void home;
// the loop drives outages and never breaks the simulation
usePowerStore.getState().reset();
for (let i = 0; i < 2000; i++) advance(1);
ok(Number.isFinite(usePowerStore.getState().now) && usePowerStore.getState().now > 1900, 'the simulation loop advances the power clock');

console.log('AFK regression');
ok(JSON.stringify([...AFK_ALLOWED].sort()) === JSON.stringify(['eat', 'pushups', 'relax', 'tv']), 'AFK is still exactly: eat, push-ups, TV, relaxed idle');
ok(JSON.stringify(Object.keys(AFK_NEEDS).sort()) === JSON.stringify(['eat', 'pushups', 'tv']), 'AFK equipment list unchanged');
const everything: PlacedItem[] = FURNITURE.map((d, i) => ({ uid: `x${i}`, defId: d.id, x: 0, z: 0, rotation: 0 }));
ok(afkCandidates(everything).every((c) => AFK_ALLOWED.includes(c.kind)), 'with every new item owned, AFK candidates are still only the four approved kinds');
let bad = 0; for (let i = 0; i < 1000; i++) if (!AFK_ALLOWED.includes(pickAfk(everything).kind)) bad++;
ok(bad === 0, 'pickAfk never returns anything outside the list (1000 draws)');
ok(!afkCandidates(everything).some((c) => c.uid && ['ibeta', 'generator', 'solar_system', 'shower', 'toilet', 'piano', 'speaker', 'bathtub', 'jacuzzi'].includes(everything.find((p) => p.uid === c.uid)!.defId)), 'AFK never targets power, bathroom, piano or speaker items');
void usePropertyStore;

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll v8 checks passed');
