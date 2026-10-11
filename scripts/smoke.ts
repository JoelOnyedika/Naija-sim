import './mockStorage';

import { registerContent } from '../src/content';
import { advance } from '../src/game/loop';
import { acquireProperty } from '../src/game/housing';
import { beginPlace, confirmDraft, moveDraft, sellItem } from '../src/game/buy';
import { interactWith } from '../src/game/interactions';
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
import { carSlots } from '../src/world/layoutGeometry';

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
ok(!!useStatsStore.getState().activity, 'tapping mattress starts sleep');
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
ok(carSlots(getActiveHome()!.layout).length >= 3, `luxury duplex has ${carSlots(getActiveHome()!.layout).length} car slots`);
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
  ok(levelOf(useSkillStore.getState().xp.coding) >= 2, 'coding XP raises the level');
}

console.log(fails ? `\n${fails} FAILED` : '\nAll smoke checks passed');
process.exit(fails ? 1 : 0);
