import './mockStorage';
import { registerContent } from '../src/content';
import { ACTIVITY_SETS, blockedReason, needsMenu, usesOf } from '../src/data/activities';
import { FURNITURE, getFurniture } from '../src/data/items';
import { getActiveHome } from '../src/game/active';
import { beginPlace, confirmDraft } from '../src/game/buy';
import { chooseActivity, interactWith, startUse } from '../src/game/interactions';
import { describeItem } from '../src/game/itemInfo';
import { startNewLife } from '../src/game/life';
import { advance } from '../src/game/loop';
import { useActorStore } from '../src/stores/actorStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useSkillStore } from '../src/stores/skillStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useUiStore } from '../src/stores/uiStore';
import { AFK_ALLOWED } from '../src/game/afk';

registerContent();
Math.random = () => 0.999999; // the Lapo life gifts random money inside the loop; pin it so money checks are exact
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

console.log('Definitions');
for (const [id, list] of Object.entries(ACTIVITY_SETS)) {
  ok(!!getFurniture(id) && list.every((u) => !!u.id) && new Set(list.map((u) => u.id)).size === list.length, `${id}: item exists and activity ids are unique`);
  ok(list.every((u) => u.seconds > 0 && Number.isFinite(u.seconds) && Object.values(u.effects).every(Number.isFinite) && (u.payout ?? 0) >= 0 && (u.cost ?? 0) >= 0), `${id}: durations, effects, costs and payouts are valid numbers`);
}
ok(usesOf(getFurniture('desk')).map((u) => u.id).join() === 'learn_code,practice_code,code_task,social_media', 'the desk offers learn, practise, coding task and social media');
ok(needsMenu(getFurniture('desk')) && needsMenu(getFurniture('speaker')) && !needsMenu(getFurniture('toilet')) && !needsMenu(getFurniture('fridge')), 'only objects with several choices open a menu; the toilet and fridge stay one tap');
ok(FURNITURE.filter((f) => f.use).every((f) => usesOf(f).length >= 1), 'every item that had a use still has one');
const code = usesOf(getFurniture('desk')).find((u) => u.id === 'practice_code')!;
ok(code.label === 'Practise coding' && code.seconds === 12 && code.skill?.xp === 10, 'the old desk action is unchanged (same label, time and XP)');

console.log('Requirements');
const lvl = (n: number) => () => n;
const disco = usesOf(getFurniture('disco_light'))[0], task = usesOf(getFurniture('desk')).find((u) => u.id === 'code_task')!;
ok(/speaker/i.test(blockedReason(disco, [], lvl(0)) ?? ''), 'dancing under the disco light with no speaker gives the friendly speaker message');
ok(blockedReason(disco, [{ defId: 'speaker' }], lvl(0)) === null, 'with a speaker it can start');
ok(/level 2/.test(blockedReason(task, [], lvl(1)) ?? '') && blockedReason(task, [], lvl(2)) === null, 'the coding task needs coding level 2');

console.log('Flow in the live game');
startNewLife('nepo');
useEconomyStore.getState().credit(900_000_000, 'test');
const place = (id: string) => { beginPlace(id); confirmDraft(); return getActiveHome()!.placed.filter((p) => p.defId === id).at(-1)!; };
const desk = place('desk'), toilet = place('toilet'), disco2 = place('disco_light');
const actor = () => useActorStore.getState();
const stats = () => useStatsStore.getState();
const finish = () => { for (let i = 0; i < 60 && stats().activity; i++) advance(1); };

actor().clearOrder();
interactWith(toilet);
ok(actor().order?.kind === 'use' && useUiStore.getState().actionMenuUid === null, 'toilet: one tap goes straight there, no menu');
actor().clearOrder();
interactWith(desk);
ok(useUiStore.getState().actionMenuUid === desk.uid && actor().order === null && !stats().activity, 'desk: tap opens the action menu and starts nothing yet');

const xp0 = useSkillStore.getState().xp.coding ?? 0, money0 = useEconomyStore.getState().money;
chooseActivity(desk, 'learn_code');
ok(useUiStore.getState().actionMenuUid === null && actor().order?.kind === 'use', 'choosing an activity closes the menu and sends the character to the desk');
actor().clearOrder();
startUse(desk);
ok(stats().activity?.label === 'Learn to code' && stats().activity?.skill?.xp === 6, 'on arrival the chosen activity (not the default) starts');
finish();
ok((useSkillStore.getState().xp.coding ?? 0) === xp0 + 6, 'learn to code gives exactly +6 coding XP');
for (let i = 0; i < 30; i++) advance(1);
ok((useSkillStore.getState().xp.coding ?? 0) === xp0 + 6 && useEconomyStore.getState().money === money0, 'nothing is rewarded twice afterwards');

// coding task: gated, paid once, never paid when cancelled
useSkillStore.setState({ xp: { coding: 0 } });
chooseActivity(desk, 'code_task');
ok(actor().order === null, 'coding task is refused below coding level 2');
useSkillStore.setState({ xp: { coding: 20 } });
chooseActivity(desk, 'code_task'); actor().clearOrder(); startUse(desk);
ok(stats().activity?.payout === 3500, 'coding task starts at level 2 with its payout recorded');
const mBefore = useEconomyStore.getState().money;
for (let i = 0; i < 5; i++) advance(1);
stats().stop(); // cancel half way
for (let i = 0; i < 30; i++) advance(1);
ok(useEconomyStore.getState().money === mBefore && (useSkillStore.getState().xp.coding ?? 0) === 20, 'a cancelled coding task pays nothing and gives no XP');
chooseActivity(desk, 'code_task'); actor().clearOrder(); startUse(desk);
const m2 = useEconomyStore.getState().money; finish();
ok(useEconomyStore.getState().money - m2 === 3500, 'a finished coding task pays exactly ₦3,500, once');
for (let i = 0; i < 30; i++) advance(1);
ok(useEconomyStore.getState().money - m2 === 3500, 'and not again afterwards');

// social media
const s0 = { ...stats().stats }; chooseActivity(desk, 'social_media'); actor().clearOrder(); startUse(desk);
ok(stats().activity?.effects.social === 6 && stats().activity?.effects.happiness === 9, 'social media lists its own effects');
finish();
ok(stats().stats.happiness > s0.happiness - 3 && stats().stats.social > s0.social - 3, 'social media improves happiness and social (net of normal decay)');

// disco light: needs a speaker, re-checked on arrival
actor().clearOrder();
chooseActivity(disco2, 'dance_floor');
ok(actor().order === null && !stats().activity, 'disco light without a speaker: refused, nothing starts');
const speaker = place('speaker');
chooseActivity(disco2, 'dance_floor');
ok(actor().order?.kind === 'use', 'with a speaker placed, the dance is allowed');
actor().clearOrder();
const { setPlaced } = await import('../src/game/active');
setPlaced(getActiveHome()!.property.id, getActiveHome()!.placed.filter((p) => p.uid !== speaker.uid));
startUse(disco2);
ok(!stats().activity, 'if the speaker disappears before the character arrives, the activity does not start');

console.log('Information panel');
const info = describeItem(getFurniture('desk')!);
ok(info.activities.length === 4 && info.activities.some((a) => a.requires.includes('Coding level 2') && a.effects.some((e) => e.label.startsWith('Money') && e.delta === 3500)), 'the desk panel lists all four activities, the level gate and the payout');
ok(describeItem(getFurniture('disco_light')!).activities[0].requires.some((r) => r.includes('Tower speaker')), 'the disco light panel says it needs a speaker');

console.log('AFK regression');
ok(JSON.stringify([...AFK_ALLOWED].sort()) === JSON.stringify(['eat', 'pushups', 'relax', 'tv']), 'AFK is still exactly eat, push-ups, TV, relaxed idle');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll activity checks passed');
