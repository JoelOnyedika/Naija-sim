import './mockStorage';
import { registerContent } from '../src/content';
import { PET_CARE } from '../src/data/balance';
import { ACTIVITY_SETS, blockedReason, needsMenu, usesOf } from '../src/data/activities';
import { FURNITURE, getFurniture } from '../src/data/items';
import { getActiveHome } from '../src/game/active';
import { beginPlace, confirmDraft } from '../src/game/buy';
import { chooseActivity, interactWith, startUse } from '../src/game/interactions';
import { startNewLife } from '../src/game/life';
import { advance } from '../src/game/loop';
import { bondMultiplier, petBlockedReason, petMood, stepPets } from '../src/game/petCare';
import { useActorStore } from '../src/stores/actorStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { usePetStore } from '../src/stores/petStore';
import { useSkillStore } from '../src/stores/skillStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useUiStore } from '../src/stores/uiStore';
import { AFK_ALLOWED, afkCandidates } from '../src/game/afk';
import type { PlacedItem } from '../src/types/game';

registerContent();
Math.random = () => 0.999999;
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

console.log('Definitions');
for (const id of ['pet_cat', 'pet_dog', 'pet_lion']) {
  const l = usesOf(getFurniture(id));
  ok(needsMenu(getFurniture(id)) && l.map((u) => u.petAction).join() === 'pet,feed,play', `${id}: pet it, give food, play (menu opens)`);
}
ok(ACTIVITY_SETS.pet_cat[1].cost! < ACTIVITY_SETS.pet_dog[1].cost! && ACTIVITY_SETS.pet_dog[1].cost! < ACTIVITY_SETS.pet_lion[1].cost!, 'pet food costs rise cat < dog < lion');
ok(!!blockedReason(ACTIVITY_SETS.pet_cat[2], [], () => 0) && blockedReason(ACTIVITY_SETS.pet_cat[2], [{ defId: 'pet_ball' }], () => 0) === null, 'playing needs a pet ball in the house');

console.log('Mood');
ok(petMood({ bond: 0, hunger: 80 }) === 'hungry' && petMood({ bond: 90, hunger: 10 }) === 'devoted' && petMood({ bond: 40, hunger: 20 }) === 'happy' && petMood({ bond: 5, hunger: 20 }) === 'content', 'mood follows hunger and bond');

console.log('In the live game');
startNewLife('nepo');
useEconomyStore.getState().credit(900_000_000, 'test');
const place = (id: string) => { beginPlace(id); confirmDraft(); return getActiveHome()!.placed.filter((p) => p.defId === id).at(-1)!; };
const cat = place('pet_cat'); place('pet_ball');
const pets = () => usePetStore.getState().pets;
stepPets(0.1);
ok(!!pets()[cat.uid] && pets()[cat.uid].name === 'Mimi' && pets()[cat.uid].bond === 0, 'a new pet gets a record with a name and zero bond');
const h0 = pets()[cat.uid].hunger;
advance(100); // 100 s of play
ok(Math.abs(pets()[cat.uid].hunger - (h0 + 100 * PET_CARE.hungerPerSecond)) < 0.5, 'hunger rises with play time');
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 100 } } });
advance(120);
ok(pets()[cat.uid].hunger === 100 && pets()[cat.uid].bond === 0, 'a starving pet cannot go below zero bond, and never dies or disappears');
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 50, bond: 40, last: {} } } });

const act = () => useStatsStore.getState().activity;
const finish = () => { for (let i = 0; i < 40 && act(); i++) advance(1); };
useActorStore.getState().clearOrder();
interactWith(cat);
ok(useUiStore.getState().actionMenuUid === cat.uid, 'tapping the pet opens its action menu');

// pet it
const happy0 = useStatsStore.getState().stats.happiness;
chooseActivity(cat, 'pet_it'); useActorStore.getState().clearOrder(); startUse(cat);
ok(act()?.label === 'Pet it' && act()?.effects.happiness === Math.round(6 * bondMultiplier(cat.uid)) && bondMultiplier(cat.uid) === 1.2, 'petting gives happiness boosted by bond (bond 40 = +20%)');
finish();
ok(pets()[cat.uid].bond === 42, 'a finished pet-it adds 2 bond');
void happy0;
chooseActivity(cat, 'pet_it'); useActorStore.getState().clearOrder(); startUse(cat); finish();
ok(pets()[cat.uid].bond === 42, 'repeating it straight away gives no extra bond (cooldown), so it cannot be spammed');

// feed
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 10 } } });
const m0 = useEconomyStore.getState().money;
chooseActivity(cat, 'feed_pet');
ok(useActorStore.getState().order === null && m0 === useEconomyStore.getState().money, 'a full pet refuses food and nothing is charged');
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 80 } } });
chooseActivity(cat, 'feed_pet'); useActorStore.getState().clearOrder(); startUse(cat);
ok(m0 - useEconomyStore.getState().money === PET_CARE.foodCost.cat, 'feeding charges the pet food price once');
finish();
ok(Math.abs(pets()[cat.uid].hunger - (80 - PET_CARE.feedRelief)) < 1 && pets()[cat.uid].bond === 46, 'feeding removes hunger and adds 4 bond');
for (let i = 0; i < 30; i++) advance(1);
ok(useEconomyStore.getState().money === m0 - PET_CARE.foodCost.cat, 'no second charge afterwards');

// play
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 90 } } });
chooseActivity(cat, 'play_pet');
ok(useActorStore.getState().order === null, 'a very hungry pet will not play');
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], hunger: 20, last: {} } } });
const xp0 = useSkillStore.getState().xp.fitness ?? 0, b0 = pets()[cat.uid].bond;
chooseActivity(cat, 'play_pet'); useActorStore.getState().clearOrder(); startUse(cat); finish();
ok(pets()[cat.uid].bond === b0 + 5 && (useSkillStore.getState().xp.fitness ?? 0) === xp0 + 2, 'playing adds 5 bond and 2 fitness XP');

// cancel
const bBefore = pets()[cat.uid].bond;
usePetStore.setState({ pets: { [cat.uid]: { ...pets()[cat.uid], last: {} } } });
chooseActivity(cat, 'pet_it'); useActorStore.getState().clearOrder(); startUse(cat);
for (let i = 0; i < 2; i++) advance(1);
useStatsStore.getState().stop();
for (let i = 0; i < 20; i++) advance(1);
ok(pets()[cat.uid].bond === bBefore, 'a cancelled activity adds no bond');

console.log('Records follow the pet');
const dog = place('pet_dog'); stepPets(0.1);
usePetStore.setState({ pets: { ...pets(), [dog.uid]: { ...pets()[dog.uid], bond: 60 } } });
const { setPlaced } = await import('../src/game/active');
setPlaced(getActiveHome()!.property.id, getActiveHome()!.placed.filter((p) => p.uid !== dog.uid)); // stored away
const dog2 = place('pet_dog'); stepPets(0.1);
ok(pets()[dog2.uid]?.bond === 60 && !pets()[dog.uid], 'a pet that was stored and placed again keeps its bond');
ok(petBlockedReason(ACTIVITY_SETS.pet_dog[0], 'nope') === null, 'unknown pets never crash the checks');
usePetStore.getState().reset();
ok(Object.keys(pets()).length === 0, 'a new life clears pet records');

console.log('AFK regression');
const every: PlacedItem[] = FURNITURE.map((d, i) => ({ uid: `x${i}`, defId: d.id, x: 0, z: 0, rotation: 0 }));
ok(JSON.stringify([...AFK_ALLOWED].sort()) === JSON.stringify(['eat', 'pushups', 'relax', 'tv']) && afkCandidates(every).every((c) => AFK_ALLOWED.includes(c.kind)), 'AFK is unchanged and never uses pets');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll pet stats checks passed');
