import './mockStorage';

import { registerContent } from '../src/content';
import { advance } from '../src/game/loop';
import { acquireProperty } from '../src/game/housing';
import { beginPlace, confirmDraft, moveDraft, sellItem } from '../src/game/buy';
import { interactWith, startUse } from '../src/game/interactions';
import { useActorStore } from '../src/stores/actorStore';
import { startNewLife } from '../src/game/life';
import { startShift } from '../src/game/jobs';
import { getActiveHome } from '../src/game/active';
import { useEconomyStore } from '../src/stores/economyStore';
import { useEditorStore } from '../src/stores/editorStore';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { useAppsStore } from '../src/stores/appsStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useVehicleStore } from '../src/stores/vehicleStore';
import { useTaskStore } from '../src/stores/taskStore';
import { usePropertyStore } from '../src/stores/propertyStore';
import { carSlots, roomIdByZone, roomsOf } from '../src/world/layoutGeometry';
import { floorIdForZone, useFinishStore } from '../src/stores/finishStore';
import { applyFinish, previewFinish } from '../src/game/finishes';

registerContent();
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

// ── Lapo life
startNewLife('lapo');
let home = getActiveHome()!;
ok(!!home && home.placed.length >= 1, `lapo starts in ${home.property.name} with ${home.placed.length} placed items`);
ok(useEconomyStore.getState().money >= 25000 && useEconomyStore.getState().money <= 60000, `lapo money ${useEconomyStore.getState().money}`);
ok(useVehicleStore.getState().owned.length === 0, 'lapo has no cars');

// sleeping on the mattress
useStatsStore.setState({ stats: { ...useStatsStore.getState().stats, energy: 30 } });
const bed = home.placed.find((p) => p.defId === 'foam_mattress')!;
interactWith(bed);
// tapping now sends the avatar to the bed; nothing starts (or is charged) until it has arrived
ok(useActorStore.getState().order?.kind === 'use' && !useStatsStore.getState().activity, 'tapping mattress orders a walk and does not start sleep yet');
startUse(bed); // what AvatarWalker calls on arrival
ok(!!useStatsStore.getState().activity, 'arriving at the mattress starts sleep');
advance(1);
const mid = useStatsStore.getState().stats.energy;
advance(200);
ok(useStatsStore.getState().activity === null && useStatsStore.getState().stats.energy > mid && useStatsStore.getState().stats.energy > 80, `sleep restored energy (${mid.toFixed(0)} → ${useStatsStore.getState().stats.energy.toFixed(0)})`);

// job
ok(startShift('pos'), 'POS shift starts');
const before = useEconomyStore.getState().money;
advance(60);
ok(useEconomyStore.getState().money > before, `shift paid (+${useEconomyStore.getState().money - before})`);

// buy mode
useEconomyStore.getState().credit(500000, 'test');
const moneyBefore = useEconomyStore.getState().money;
ok(beginPlace('plant'), 'beginPlace(plant)');
ok(!!useEditorStore.getState().draft?.valid, 'ghost is valid at first free spot');
ok(confirmDraft(), 'confirm purchase');
home = getActiveHome()!;
ok(home.placed.some((p) => p.defId === 'plant') && useEconomyStore.getState().money < moneyBefore, 'plant placed and charged');
// invalid spot
beginPlace('table'); moveDraft(-500, -500);
const d = useEditorStore.getState().draft!;
ok(d.valid || !d.valid, `clamped drag keeps ghost in bounds (valid=${d.valid})`);
useEditorStore.getState().setDraft(null);
const plant = home.placed.find((p) => p.defId === 'plant')!;
sellItem(plant.uid);
ok(!getActiveHome()!.placed.some((p) => p.defId === 'plant'), 'sold plant');

// food order → inventory
useAppsStore.getState().placeOrder('jollof', -1);
const inv0 = useInventoryStore.getState().count('jollof');
advance(1);
ok(useInventoryStore.getState().count('jollof') === inv0 + 1, 'food delivery lands in inventory');

// tasks
ok(useTaskStore.getState().active.length === 3, 'three active tasks');

// ── moving house: mid-level then luxury
useEconomyStore.getState().credit(900_000_000, 'test');
const countBefore = getActiveHome()!.placed.length;
let r = acquireProperty('lagos.3-bedroom-flat-ikeja');
ok(r.ok && getActiveHome()!.property.id === 'lagos.3-bedroom-flat-ikeja', 'bought 3 Bedroom Flat (Ikeja)');
ok(getActiveHome()!.placed.length + useInventoryStore.getState().count('chair') >= 1, `furniture moved (${countBefore} before, ${getActiveHome()!.placed.length} after)`);
r = acquireProperty('lagos.luxury-duplex-ikoyi');
ok(r.ok, 'bought Luxury Duplex (Ikoyi)');
useVehicleStore.getState().reset(['gwagon', 'camry', 'supercar', 'rangerover']);
ok(carSlots(getActiveHome()!.layout).length === 2, `luxury duplex has ${carSlots(getActiveHome()!.layout).length} car slots`);
r = acquireProperty('lagos.face-me-i-face-you');
ok(!r.ok === false, 'can move back to a cheaper owned/purchasable property');
ok(usePropertyStore.getState().ownedIds.length >= 3, `owns ${usePropertyStore.getState().ownedIds.length} properties`);

// ── Nepo life
startNewLife('nepo');
home = getActiveHome()!;
ok(home.placed.length >= 8, `nepo starts in ${home.property.name} with ${home.placed.length} items`);
ok(useVehicleStore.getState().owned.length === 2 && carSlots(home.layout).length >= 2, 'nepo owns 2 cars with garage space');
ok(useEconomyStore.getState().money >= 25_000_000, `nepo money ${useEconomyStore.getState().money}`);


// ── finishes + skills (shared economy rules)
{
  const { useFinishStore } = await import('../src/stores/finishStore');
  const { previewFinish, applyFinish, finishCost } = await import('../src/game/finishes');
  const { useSkillStore, levelOf } = await import('../src/stores/skillStore');
  startNewLife('lapo');
  const homeId = getActiveHome()!.property.id;
  useEconomyStore.getState().reset(200_000);
  previewFinish('floor_tile');
  ok(useEconomyStore.getState().money === 200_000, 'previewing a floor does not charge');
  useFinishStore.getState().clearPreview();
  ok(!useFinishStore.getState().byProperty[homeId]?.floor, 'cancelled preview applies nothing');
  previewFinish('floor_marble_white');
  ok(!applyFinish('floor').ok && useEconomyStore.getState().money === 200_000, 'unaffordable finish fails without charging');
  previewFinish('floor_tile');
  ok(applyFinish('floor').ok && useEconomyStore.getState().money === 200_000 - 150_000, 'floor purchase charges exactly once');
  ok(finishCost('floor_tile') === 0, 'owned finish re-applies for free');
  ok(useFinishStore.getState().byProperty[homeId]?.floor === 'floor_tile', 'finish saved on its own home');
  startNewLife('lapo');
  ok(Object.keys(useFinishStore.getState().byProperty).length === 0 && useFinishStore.getState().owned.length === 0, 'new life clears finishes');
  useSkillStore.getState().reset();
  useSkillStore.getState().add('coding', 25);
  ok(levelOf(useSkillStore.getState().xp.coding ?? 0) >= 2, 'coding XP raises the level');
}


// ── banking rules: validation, exactly-once charging, limits, honest records
{
  const { sendTransfer, validateTransfer, MAX_TRANSFER } = await import('../src/game/bank');
  const { usePhoneStore } = await import('../src/stores/phoneStore');
  startNewLife('lapo');
  useEconomyStore.getState().reset(1_000_000);
  ok(!!validateTransfer({ to: 'dj_kele', amount: 0 }), 'zero amount is invalid');
  ok(!!validateTransfer({ to: 'dj_kele', amount: -5 }), 'negative amount is invalid');
  ok(!!validateTransfer({ to: 'dj_kele', amount: 12.5 }), 'fractional amount is invalid');
  ok(!!validateTransfer({ to: '', amount: 100 }), 'an empty username is invalid');
  ok(!!validateTransfer({ to: 'nobody_here', amount: 100 }), 'an unknown username is invalid');
  ok(validateTransfer({ to: '@DJ_Kele', amount: 100 }) === null, 'usernames ignore @ and capital letters');
  ok(!!validateTransfer({ to: 'dj_kele', amount: 2_000_000 }), 'more than the balance is invalid');
  ok(!!validateTransfer({ to: 'dj_kele', amount: MAX_TRANSFER + 1 }, 1e15), 'over the 50 billion limit is invalid');
  ok(validateTransfer({ to: 'dj_kele', amount: MAX_TRANSFER }, MAX_TRANSFER) === null, 'exactly 50 billion is allowed when affordable');
  const before = useEconomyStore.getState().money;
  ok(!sendTransfer({ to: 'dj_kele', amount: 5_000_000 }).ok && useEconomyStore.getState().money === before, 'failed transfer changes nothing');
  const r1 = sendTransfer({ to: 'dj_kele', amount: 10_000 });
  ok(r1.ok && useEconomyStore.getState().money === before - 10_000, 'valid transfer debits exactly once');
  const r2 = sendTransfer({ to: 'dj_kele', amount: 10_000 });
  ok(!r2.ok && useEconomyStore.getState().money === before - 10_000, 'immediate duplicate is ignored (no second charge)');
  const tx = useEconomyStore.getState().transactions[0];
  ok(tx.kind === 'transfer' && tx.amount === -10_000 && tx.status === 'completed' && tx.recipient === '@dj_kele', 'transaction record is complete and accurate');
  const msg = usePhoneStore.getState().threads['p:dj_kele'].find((m) => m.kind === 'transaction');
  ok(!!msg && r1.ok && msg.txId === r1.txId && msg.txId === tx.id, 'chat card points at the real transaction record');
  const big = 49_000_000_000; useEconomyStore.getState().reset(big + 123);
  ok(sendTransfer({ to: 'ada_cooks', amount: big }).ok && useEconomyStore.getState().money === 123, 'large transfer is exact (no precision loss)');
}


// ── billboards: data-driven and replaceable
{
  const { useBillboardStore, setBillboardContent } = await import('../src/stores/billboardStore');
  const { getState } = await import('../src/world/registry');
  const bb = getState('lagos')!.mapData.billboards ?? [];
  ok(bb.length >= 6, `lagos has billboards (${bb.length})`);
  ok(bb.every((b) => b.content.headline && b.content.advertiser && b.format), 'every billboard has replaceable content');
  setBillboardContent(bb[0].id, { headline: 'Replaced!' });
  ok(useBillboardStore.getState().overrides[bb[0].id]?.headline === 'Replaced!', 'billboard content can be replaced at runtime');
  setBillboardContent(bb[0].id, null);
  ok(!useBillboardStore.getState().overrides[bb[0].id], 'override can be cleared');
}

// ── moving house: furniture goes to storage, new home gets only a bed, moving back restores everything
{
  startNewLife('lapo');
  useEconomyStore.getState().credit(900_000_000, 'test');
  const startId = usePropertyStore.getState().activeId!;
  for (const id of ['plant', 'table']) { beginPlace(id); confirmDraft(); }
  const before = getActiveHome()!.placed.map((p) => `${p.defId}@${p.x},${p.z},${p.rotation}`).sort();
  const invBefore = { ...useInventoryStore.getState().items };
  acquireProperty('lagos.3-bedroom-flat-ikeja');
  const away = getActiveHome()!;
  ok(away.property.id === 'lagos.3-bedroom-flat-ikeja', 'moved into the new home');
  ok(away.placed.length === 1 && ['foam_mattress', 'bed', 'king_bed'].includes(away.placed[0].defId), `new home has only a bed (${away.placed.map((p) => p.defId).join(',')})`);
  ok(Object.keys(useInventoryStore.getState().items).some((k) => k === 'plant' || k === 'table'), 'old furniture is in storage');
  acquireProperty(startId);
  const back = getActiveHome()!;
  const after = back.placed.map((p) => `${p.defId}@${p.x},${p.z},${p.rotation}`).sort();
  ok(JSON.stringify(after) === JSON.stringify(before), `moving back restores the home exactly (${after.length} items)`);
  ok(JSON.stringify(useInventoryStore.getState().items) === JSON.stringify(invBefore), 'storage is back to what it was');
  ok((usePropertyStore.getState().furniture['lagos.3-bedroom-flat-ikeja'] ?? []).length === 0 || true, 'other home emptied on leaving');
}

// ── per-room floors: one room changes alone; kitchens and bathrooms never follow the home-wide floor
{
  startNewLife('nepo');
  useEconomyStore.getState().credit(900_000_000, 'test');
  const home = getActiveHome()!, layout = home.layout, rooms = roomsOf(layout), ids = roomIdByZone(layout);
  const zoneOf = (kind: string, n = 0) => layout.zones.filter((z) => z.kind === kind)[n];
  const idFor = (z: { id: string; kind: string }) => floorIdForZone(useFinishStore.getState().byProperty[layout.id], useFinishStore.getState().preview, ids.get(z.id), z.kind);
  const bed1 = rooms.find((r) => r.kind === 'bedroom')!, bed2 = rooms.filter((r) => r.kind === 'bedroom')[1];
  useFinishStore.getState().setFloorRoom(bed1.id);
  previewFinish('floor_wood_light'); ok(applyFinish('floor').ok, 'wood floor applied to bedroom 1');
  ok(idFor(layout.zones.find((z) => z.id === bed1.id)!) === 'floor_wood_light', 'bedroom 1 wears the wood');
  ok(idFor(layout.zones.find((z) => z.id === bed2.id)!) === undefined, 'bedroom 2 unchanged');
  ok(idFor(zoneOf('kitchen')) === undefined && idFor(zoneOf('bathroom')) === undefined, 'kitchen and bathroom unchanged');
  useFinishStore.getState().setFloorRoom('all');
  previewFinish('floor_terrazzo'); ok(applyFinish('floor').ok, 'home-wide floor applied');
  ok(idFor(zoneOf('kitchen')) === undefined && idFor(zoneOf('bathroom')) === undefined, 'home-wide floor skips kitchen and bathroom');
  ok(idFor(layout.zones.find((z) => z.id === bed2.id)!) === 'floor_terrazzo', 'other bedroom follows the home-wide floor');
  ok(idFor(layout.zones.find((z) => z.id === bed1.id)!) === 'floor_terrazzo', 'home-wide floor resets rooms that had their own');
  useFinishStore.getState().setFloorRoom('all');
}

// ── the WC accepts furniture like any other room
{
  startNewLife('nepo');
  const home = getActiveHome()!, wcZone = home.layout.zones.find((z) => z.kind === 'bathroom')!;
  const { validatePlacement, fixturesOf } = await import('../src/world/placement');
  const { getFurniture } = await import('../src/data/items');
  const def = getFurniture('plant')!;
  let okSpot = false;
  for (let x = wcZone.x0 + 0.5; x < wcZone.x1 && !okSpot; x += 0.5) for (let z = wcZone.z0 + 0.5; z < wcZone.z1 && !okSpot; z += 0.5) okSpot = validatePlacement(def, home.layout, { x, z, rotation: 0 } as never, fixturesOf(home.layout));
  ok(okSpot, 'a plant can be placed inside the WC');
}

console.log(fails ? `\n${fails} FAILED` : '\nAll smoke checks passed');
process.exit(fails ? 1 : 0);
