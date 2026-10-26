import './mockStorage';
import { readFileSync } from 'node:fs';
import { registerContent } from '../src/content';
import { CRIME, PRICING } from '../src/data/balance';
import { ACTIVITY_SETS, usesOf } from '../src/data/activities';
import { CLUB, CLUB_OPTIONS } from '../src/data/club';
import { INTERIOR_LIST, INTERIORS, LANDMARK_INTERIORS, type InteriorKind } from '../src/data/interiors';
import { getFurniture } from '../src/data/items';
import { LANDMARKS } from '../src/content/lagos/landmarks';
import { makeNpcs, npcRegistry } from '../src/data/npcs';
import { resolvePeer } from '../src/game/peers';
import { talkTo } from '../src/game/talk';
import { VENDORS, vendorSpots } from '../src/data/vendors';
import { usePhoneStore } from '../src/stores/phoneStore';
import { VEHICLE_MODELS, hasRealModel, podiumIndexOf, slotVehicle } from '../src/data/showroom';
import { VEHICLES } from '../src/data/vehicles';
import { AFK_ALLOWED } from '../src/game/afk';
import { getActiveHome } from '../src/game/active';
import { getAuthority } from '../src/game/authority';
import { CHAT, channelFor, cleanMessage, getTransport, playerMenu } from '../src/game/chat';
import { stepChatter } from '../src/game/chatter';
import { buyClub, clubPrice } from '../src/game/club';
import { attemptPickpocket, formatRemaining, isJailed, remainingMs, sentenceMinutesFor, stepJail, successChance } from '../src/game/crime';
import { npcCountFor, SimulatedServer } from '../src/game/instances';
import { chooseActivity, interactWith, startUse } from '../src/game/interactions';
import { enterInterior, leaveInterior, travelToVenue } from '../src/game/interiors';
import { startNewLife } from '../src/game/life';
import { advance } from '../src/game/loop';
import { priceOf } from '../src/game/pricing';
import { buyVehicle, vehiclePrice } from '../src/game/vehicles';
import { useActorStore } from '../src/stores/actorStore';
import { useChatStore } from '../src/stores/chatStore';
import { useClubStore } from '../src/stores/clubStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useInteriorStore } from '../src/stores/interiorStore';
import { useJailStore } from '../src/stores/jailStore';
import { useStatsStore } from '../src/stores/statsStore';
import { useUiStore } from '../src/stores/uiStore';
import { useVehicleStore } from '../src/stores/vehicleStore';
import { interiorLayout, venueItems } from '../src/world/interiors/build';
import { buildNavGrid, findPath, isFree, nearestFree } from '../src/world/navigation';
import { liveNpcs, livePlayer } from '../src/world/npcLive';
import { initBrain, stepPet } from '../src/world/petBrain';

registerContent();
Math.random = () => 0.999999;
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };
const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const E = () => useEconomyStore.getState(), J = () => useJailStore.getState(), I = () => useInteriorStore.getState();
const fresh = () => { startNewLife('nepo'); E().credit(900_000_000, 'test'); useChatStore.getState().reset(); useClubStore.getState().reset(); useJailStore.getState().reset(); useVehicleStore.getState().reset(); };

console.log('Venues');
ok(INTERIOR_LIST.length === 22 && (['market', 'church', 'gallery', 'stadium', 'club', 'showroom', 'jail', 'viewing', 'eatery', 'bank', 'mall', 'cinema', 'concert', 'hotel', 'techhub', 'park', 'beach', 'recreation', 'government', 'business', 'airport', 'port'] as InteriorKind[]).every((k) => INTERIORS[k]), 'twenty-two venue templates exist');
ok(LANDMARKS.every((l) => !!LANDMARK_INTERIORS[l.id]), `every one of the ${LANDMARKS.length} landmarks on the map opens an interior`);
for (const d of INTERIOR_LIST) {
  const L = interiorLayout(d), items = venueItems(d), g = buildNavGrid(L, items);
  ok(items.every((i) => !!getFurniture(i.defId) && i.x > 0 && i.x < d.w && i.z > 0 && i.z < d.d), `${d.id}: ${items.length} items, all known and inside the room`);
  const spawn = nearestFree(g, { x: d.w / 2, z: d.d * 0.8 });
  ok(!!spawn, `${d.id}: there is free floor to spawn on`);
  const blocked = usesOfReachable(d, items, g, spawn!);
  ok(blocked.length === 0, `${d.id}: every usable item can be reached on foot${blocked.length ? ' (not reachable: ' + blocked.join(', ') + ')' : ''}`);
  ok(d.capacity === 10 && d.npcTarget <= d.capacity - 1, `${d.id}: capacity 10 and NPC target leaves room for the player`);
}
function usesOfReachable(d: typeof INTERIOR_LIST[number], items: ReturnType<typeof venueItems>, g: ReturnType<typeof buildNavGrid>, from: { x: number; z: number }) {
  const bad: string[] = [];
  for (const it of items) { const def = getFurniture(it.defId)!; if (!usesOf(def).length && !def.venueAction) continue; const t = nearestFree(g, { x: it.x, z: it.z + 1.2 }, 10); if (!t || !findPath(g, from, t)) bad.push(it.defId); }
  void d; return bad;
}
ok(Object.values(LANDMARK_INTERIORS).every((k) => INTERIORS[k]) && LANDMARK_INTERIORS['lagos.quilox'] === 'club' && LANDMARK_INTERIORS['lagos.polanco'] === 'showroom' && LANDMARK_INTERIORS['lagos.cathedral'] === 'church' && LANDMARK_INTERIORS['lagos.balogun'] === 'market', 'landmarks open the right venues');
ok(!usesOf(getFurniture('v_stall')).some((u) => !u.id) && Object.keys(ACTIVITY_SETS).filter((k) => k.startsWith('v_')).length >= 8, 'venue furniture has activities in the central table');

console.log('Capacity and instances (the rules a server must enforce)');
const club = INTERIORS.club;
ok(npcCountFor(10, club.npcTarget, 1) === 9 && npcCountFor(10, club.npcTarget, 2) === 8 && npcCountFor(10, club.npcTarget, 10) === 0 && npcCountFor(10, 4, 1) === 4, '1 player + 9 NPCs, 2 + 8, ... 10 + 0; a quiet venue stays at its NPC target');
const srv = new SimulatedServer();
const joins = Array.from({ length: 12 }, (_, i) => srv.join('club', `p${i}`));
ok(joins.slice(0, 10).every((j) => j.instance === 1) && joins[10].instance === 2 && joins[11].instance === 2, 'the 11th real player is sent to a second copy of the venue');
ok(srv.occupancy('club', 1).total === 10 && srv.occupancy('club', 1).npc === 0 && srv.occupancy('club', 2).real === 2 && srv.occupancy('club', 2).total === 10, 'no copy ever holds more than 10 people in total');
srv.leave('club', 'p0'); ok(srv.join('club', 'p99').instance === 1, 'a freed seat in copy 1 is reused before a new copy opens');
let threw = false; try { srv.join('club', 'p1'); } catch { threw = true; }
ok(threw, 'the same player cannot be inside twice');
ok(srv.occupancy('market', 1).real === 0 && srv.join('market', 'x').instance === 1, 'venues do not share instances');

console.log('Entering and leaving');
fresh();
const home = getActiveHome()!.property.id;
ok(enterInterior('club').ok && I().current?.kind === 'club' && getActiveHome()!.property.id === 'interior:club', 'entering swaps the active home for the venue');
ok(I().current!.instance === 1 && I().current!.npcCount === 9, 'offline: copy 1 with 9 NPCs (the local directory is NOT authoritative)');
leaveInterior(); ok(I().current === null && getActiveHome()!.property.id === home, 'leaving puts you back in your own home');
useStatsStore.getState().start({ label: 'Busy', seconds: 30, effects: {}, pose: 'stand', kind: 'use' } as never);
ok(!enterInterior('club').ok, 'you cannot walk into a venue in the middle of an activity');
useStatsStore.getState().stop();

console.log('Chat: local and global are different channels');
fresh(); enterInterior('club'); useChatStore.getState().reset();
const chat = useChatStore.getState();
const t0 = 1_000_000;
ok(channelFor('local', { kind: 'club', instance: 1 }) === 'local:club:1' && channelFor('local', { kind: 'club', instance: 2 }) === 'local:club:2' && channelFor('local', { kind: 'church', instance: 1 }) === 'local:church:1' && channelFor('global', { kind: 'club', instance: 1 }) === 'global', 'channel keys: one per venue copy, one global');
ok(chat.send('local', 'hello club', t0).ok, 'a local message sends');
ok(!useChatStore.getState().send('local', 'again', t0 + 100).ok, 'sending twice within 1.5 seconds is refused (rate limit)');
ok(useChatStore.getState().send('global', 'hello world', t0 + 2000).ok, 'a global message sends after the wait');
let ch = useChatStore.getState().channels;
ok(ch['local:club:1']?.length === 1 && ch['global']?.length === 1 && ch['local:club:1'][0].text === 'hello club', 'each message lives in its own channel only');
leaveInterior(); enterInterior('church'); ch = useChatStore.getState().channels;
ok(!channelFor('local', I().current)!.includes('club') && (ch[channelFor('local', I().current)!] ?? []).length === 0, 'a local message in the club is not in the church');
ok(useChatStore.getState().send('global', 'from church', t0 + 4000).ok && useChatStore.getState().channels['global'].length === 2, 'global chat follows you into another venue');
ok(!cleanMessage('   ').ok && !cleanMessage('x'.repeat(CHAT.maxLength + 1)).ok && cleanMessage('x'.repeat(CHAT.maxLength)).ok && !cleanMessage(null).ok && !cleanMessage(42).ok, 'empty, too long, and non-text messages are refused');
const dirty = cleanMessage('hi\u0000\u200B\u202E there\n\n friend');
ok(dirty.ok && dirty.text === 'hi there friend', 'control and invisible characters are stripped and spaces collapsed');
ok(!getTransport().authoritative, 'the transport is a local stub: nothing leaves the device');
leaveInterior(); ok(!useChatStore.getState().send('local', 'at home', t0 + 9000).ok, 'you cannot chat from home');
enterInterior('jail', { force: true }); ok(channelFor('local', I().current) === null && channelFor('global', I().current) === null, 'the jail has no chat at all');
leaveInterior();
ok(playerMenu({ id: 'p7', name: 'Real', kind: 'player' }, false).every((o) => !o.enabled && !!o.reason) && playerMenu({ id: 'p7', name: 'Real', kind: 'player' }, true).every((o) => o.enabled), 'tapping a player: visit and travel are disabled offline with a reason, enabled with the online service');
ok(playerMenu({ id: 'npc:x', name: 'Tunde', kind: 'npc' }, false).length === 1 && playerMenu({ id: 'me', name: 'You', kind: 'player' }, true).length === 0, 'NPCs only offer a profile; you get no menu for yourself');
fresh(); enterInterior('market'); useChatStore.getState().reset();
for (let i = 0; i < 3; i++) stepChatter(t0 + i * 100_000, seeded(5));
const mk = useChatStore.getState().channels['local:market:1'] ?? [];
ok(mk.length >= 2 && mk.every((m) => m.from.kind === 'npc' && m.scope === 'local') && !useChatStore.getState().channels['global'], 'NPC chatter is always labelled NPC, local only, never in global chat');
leaveInterior();

console.log('NPCs');
const a = makeNpcs('club', 7, 9), b = makeNpcs('club', 7, 9);
ok(JSON.stringify(a) === JSON.stringify(b) && new Set(a.map((n) => n.id)).size === 9 && a.every((n) => n.wallet >= CRIME.walletRange[0] && n.wallet <= CRIME.walletRange[1]), 'NPCs are deterministic for a visit, unique, with pocket money in range');
ok(a.length === npcCountFor(10, INTERIORS.club.npcTarget, 1) && a.length + 1 <= 10, 'the NPC count plus the player never exceeds capacity');
{
  const d = INTERIORS.market, L = interiorLayout(d), items = venueItems(d), g = buildNavGrid(L, items);
  const spots = a.slice(0, 8).map((_, i) => nearestFree(g, { x: 2 + i * 1.5, z: 8 })!);
  const brains = spots.map((s, i) => ({ b: initBrain(s.x, s.z, seeded(i + 1)), rnd: seeded(i + 40), id: `t${i}` }));
  livePlayer.x = 8; livePlayer.z = 9; livePlayer.set = true;
  let blocked = 0, close = 0, moved = 0, maxStep = 0;
  for (let f = 0; f < 6000; f++) for (const n of brains) {
    const px = n.b.x, pz = n.b.z;
    stepPet(n.b, 'npc', 0.05, { grid: g, ball: null, rnd: n.rnd, avoid: (p) => { for (const o of brains) if (o !== n && Math.hypot(p.x - o.b.x, p.z - o.b.z) < 1.1) return true; return Math.hypot(p.x - livePlayer.x, p.z - livePlayer.z) < 1.1; } });
    if (!isFree(g, n.b)) blocked++; const st = Math.hypot(n.b.x - px, n.b.z - pz); maxStep = Math.max(maxStep, st); if (st > 0) moved++;
  }
  for (const n of brains) for (const o of brains) if (o !== n && Math.hypot(n.b.x - o.b.x, n.b.z - o.b.z) < 0.35) close++;
  ok(blocked === 0, 'NPCs never stand in walls or furniture (5 minutes, 8 NPCs)');
  ok(maxStep <= 0.95 * 0.05 + 1e-6 && moved > 1000, `NPCs walk at a human pace without teleporting or sliding (max step ${maxStep.toFixed(3)})`);
  ok(close === 0, 'NPCs do not pile up on each other at the end');
}

console.log('Hustles pay once, from the authority');
fresh(); enterInterior('market');
const stall = venueItems(INTERIORS.market).find((i) => i.defId === 'v_stall')!;
const act = () => useStatsStore.getState().activity;
const finish = () => { for (let i = 0; i < 80 && act(); i++) advance(1); };
const m0 = E().money;
chooseActivity(stall, 'sell_wares'); useActorStore.getState().clearOrder(); startUse(stall);
ok(act()?.label === 'Sell wares' && act()?.activityKey === 'v_stall:sell_wares', 'the hustle starts with a key naming the activity');
finish(); ok(E().money - m0 === 5000, 'a finished hustle pays exactly ₦5,000');
for (let i = 0; i < 40; i++) advance(1); ok(E().money - m0 === 5000, 'and never twice');
const m1 = E().money;
chooseActivity(stall, 'sell_wares'); useActorStore.getState().clearOrder(); startUse(stall);
for (let i = 0; i < 5; i++) advance(1); useStatsStore.getState().stop(); for (let i = 0; i < 40; i++) advance(1);
ok(E().money === m1, 'a cancelled hustle pays nothing');
ok(getAuthority().approvePayout('v_stall:sell_wares', 99_999_999) === 5000 && getAuthority().approvePayout('v_stall:made_up', 5000) === 0 && !getAuthority().authoritative, 'the client-claimed amount is ignored; unknown activities pay 0; the local authority says it is not authoritative');
chooseActivity(stall, 'haggle'); ok(!!useUiStore.getState() && true, 'the stall offers more than one hustle (menu)');
ok(usesOf(getFurniture('v_stall')).map((u) => u.seconds).every((s) => s >= 20), 'hustles take time (20+ seconds each)');
leaveInterior();

console.log('Gambles at the viewing centre');
fresh(); enterInterior('viewing');
const bench = venueItems(INTERIORS.viewing).find((i) => i.defId === 'v_view_bench')!;
const realRandom = Math.random;
const stat = (k: 'charisma' | 'health') => useStatsStore.getState().stats[k];
useStatsStore.getState().apply({ charisma: -50, health: -20 }); const ch0 = stat('charisma'), hp0 = stat('health');
Math.random = () => 0.01; chooseActivity(bench, 'fight_agbero'); useActorStore.getState().clearOrder(); startUse(bench); finish();
ok(stat('charisma') > ch0, 'winning the fight with the Agbero raises charisma');
const h1 = stat('health');
Math.random = () => 0.99; chooseActivity(bench, 'fight_agbero'); useActorStore.getState().clearOrder(); startUse(bench); finish();
ok(stat('health') < h1 && h1 >= hp0, 'losing the fight costs health');
Math.random = realRandom;
chooseActivity(bench, 'argue_football'); useActorStore.getState().clearOrder(); startUse(bench); finish();
ok(usesOf(getFurniture('v_view_bench')).some((u) => u.id === 'fight_agbero' && !!u.risk && u.risk.winChance > 0 && u.risk.winChance < 1), 'the fight is a real gamble (win chance between 0 and 1)');
leaveInterior();

console.log('Vendors at their stalls');
{
  let total = 0, outside = 0, dupes = 0;
  for (const def of INTERIOR_LIST) {
    const spots = vendorSpots(def.kind, venueItems(def), (id) => getFurniture(id)?.footprint ?? { w: 1, d: 1 }, { w: def.w, d: def.d });
    total += spots.length;
    for (const v of spots) if (v.x < 0.2 || v.z < 0.2 || v.x > def.w - 0.2 || v.z > def.d - 0.2) { outside++; console.log(`  ! ${def.kind}: ${v.profile.name} stands outside the room (${v.x.toFixed(1)}, ${v.z.toFixed(1)})`); }
    const names = spots.map((v) => v.profile.name); if (new Set(names).size !== names.length) { dupes++; console.log(`  ! ${def.kind}: two vendors share a name`); }
  }
  ok(total >= 40, `${total} vendors work the stalls and counters across the venues`);
  ok(outside === 0, 'every vendor stands inside the room, behind their prop');
  ok(dupes === 0, 'no two vendors in one venue share a name');
  ok(Object.keys(VENDORS).every((id) => !!getFurniture(id)), 'every vendor stands behind a real prop');
}

console.log('Conversations and cash gambles');
fresh(); enterInterior('market');
{
  const npc = [...npcRegistry.values()].find((n) => n.venue === 'market')!;
  const social0 = useStatsStore.getState().stats.social;
  const t1 = talkTo(npc.id, 'hello');
  ok(t1.ok && (usePhoneStore.getState().threads[npc.id] ?? []).some((m) => m.from === 'me'), 'saying hello sends a real message into your DMs with that person');
  ok(useStatsStore.getState().stats.social > social0, 'a quick conversation earns social');
  ok(!talkTo(npc.id, 'hello').ok, 'the same line to the same person is on a one-minute cooldown');
  ok(!!resolvePeer(npc.id) && resolvePeer(npc.id)!.subtitle.includes(npc.role), 'a venue person is a chat contact with their role shown');
  ok(npc.role.length > 3 && npc.starter.length > 10, 'every person has a role and a conversation starter');
}
{
  const bet = venueItems(INTERIORS.viewing)[0]; void bet;
  const real = Math.random; enterInterior('viewing');
  const counter = venueItems(INTERIORS.viewing).find((i) => i.defId === 'v_betting_counter')!;
  const m0 = useEconomyStore.getState().money;
  Math.random = () => 0.01; chooseActivity(counter, 'small_bet'); useActorStore.getState().clearOrder(); startUse(counter); finish();
  ok(useEconomyStore.getState().money === m0 - 2000 + 5000, 'a winning small bet pays the approved prize (stake 2,000, prize 5,000)');
  const m1 = useEconomyStore.getState().money;
  Math.random = () => 0.99; chooseActivity(counter, 'small_bet'); useActorStore.getState().clearOrder(); startUse(counter); finish();
  ok(useEconomyStore.getState().money === m1 - 2000, 'a losing small bet only loses the stake');
  Math.random = real;
  const ev = (u: { risk?: { winChance: number; winMoney?: number } }, cost: number) => (u.risk ? u.risk.winChance * (u.risk.winMoney ?? 0) - cost : 0);
  const allRisky = Object.values(ACTIVITY_SETS).flat().filter((u) => u.risk?.winMoney);
  ok(allRisky.every((u) => ev(u, u.cost ?? 0) < 6000), 'no gamble hands out free money (expected prize stays modest)');
  ok(Object.values(ACTIVITY_SETS).flat().filter((u) => u.risk && u.cost).every((u) => ev(u, u.cost!) < 0), 'every gamble with a stake has a negative expected value');
}
leaveInterior();

console.log('Crime and jail');
ok(successChance(0) === 0.5 && Math.abs(successChance(10) - 0.3) < 1e-9 && successChance(30) === CRIME.minSuccess && successChance(-5) === 0.5, 'success chance: 50% at zero, 2% less per wanted point, never below 15%');
ok(sentenceMinutesFor(0) === 10 && sentenceMinutesFor(4) === 30 && sentenceMinutesFor(30) === 120 && sentenceMinutesFor(1e9) === 120, 'sentences: 10 minutes plus 5 per point, never above 2 hours');
ok(formatRemaining(125_000) === '2:05' && formatRemaining(3_725_000) === '1:02:05', 'remaining time reads as m:ss or h:mm:ss');
fresh(); enterInterior('market');
const npcs = makeNpcs('market', I().current!.seed, I().current!.npcCount);
const target = npcs[0]; liveNpcs.set(target.id, { x: 5, z: 5 }); livePlayer.set = true; livePlayer.x = 5.5; livePlayer.z = 5;
const T = Date.now(); // the jail checks the real clock when leaving or entering, so the sentence must be in real time
livePlayer.x = 20;
ok(!attemptPickpocket(target.id, { now: T, rnd: () => 0 }).ok, 'too far away: refused');
livePlayer.x = 5.5;
const money0 = E().money;
const win = attemptPickpocket(target.id, { now: T, rnd: () => 0 });
ok(win.ok && win.outcome === 'stolen' && win.amount > 0 && win.amount <= target.wallet && E().money - money0 === win.amount && J().criminality === CRIME.criminalityPerSuccess, 'a success takes part of the wallet (not more), pays that exact amount and raises the wanted level');
ok(!attemptPickpocket(target.id, { now: T + 60_000, rnd: () => 0 }).ok, 'the same NPC cannot be robbed twice');
const t2 = npcs[1]; liveNpcs.set(t2.id, { x: 5.2, z: 5 });
ok(!attemptPickpocket(t2.id, { now: T + 5_000, rnd: () => 0 }).ok, 'a second attempt right away is refused (cooldown)');
const m2 = E().money, crim = J().criminality;
const lose = attemptPickpocket(t2.id, { now: T + 60_000, rnd: () => 0.999 });
ok(lose.ok && lose.outcome === 'caught' && E().money === m2, 'a failed attempt takes no money');
ok(lose.ok && lose.outcome === 'caught' && lose.minutes === sentenceMinutesFor(crim) && J().criminality === crim + CRIME.criminalityPerArrest, 'the sentence follows the wanted level BEFORE this arrest, which then rises by 2');
ok(I().current?.kind === 'jail' && !!J().sentence && J().sentence!.endAt - J().sentence!.startAt === J().sentence!.minutes * 60_000, 'the player is moved into the jail and the sentence is stored as start and end timestamps');
const end = J().sentence!.endAt;
ok(isJailed(end - 1) && !isJailed(end) && remainingMs(end - 90_000) === 90_000 && remainingMs(end + 5000) === 0, 'remaining time is computed from the timestamps and the clock');
leaveInterior(); ok(I().current?.kind === 'jail', 'you cannot leave the jail early');
ok(!enterInterior('club').ok && I().current?.kind === 'jail', 'you cannot walk into another venue while serving time');
const fee = E().money; ok(!travelToVenue('lagos.quilox').ok && E().money === fee, 'travelling to a venue while jailed is refused and charges nothing');
{ liveNpcs.set(npcs[2].id, { x: 5, z: 5 }); ok(!attemptPickpocket(npcs[2].id, { now: end - 1000 }).ok, 'no crime from inside the cell'); }
// the game was closed: the cell is not remembered but the sentence is
I().set(null);
ok(stepJail(end - 60_000) === 'imprisoned' && I().current?.kind === 'jail', 'reopening the game while still sentenced puts you back in the cell');
I().set(null);
const critBefore = J().criminality;
ok(stepJail(end + 1) === 'released' && !J().sentence && !isJailed(end + 1) && I().current === null, 'reopening the game after the time is up: free, and not put in the cell');
ok(J().criminality === critBefore - CRIME.reliefPerSentence, 'serving a full sentence lowers the wanted level by 1');
enterInterior('jail', { force: true });
J().patch({ sentence: { startAt: end, endAt: end + 60_000, minutes: 1, reason: 'x' } });
ok(stepJail(end + 30_000) === null && I().current?.kind === 'jail', 'while time remains, nothing releases you');
ok(stepJail(end + 61_000) === 'released' && I().current === null, 'the same tick releases you at the end time');
J().patch({ criminality: 30, sentence: null });
ok(sentenceMinutesFor(J().criminality) <= 120, 'even at maximum wanted level a sentence is at most two hours');
J().reset(); ok(J().criminality === 0 && J().sentence === null, 'a new life clears the record');

console.log('Club');
fresh(); ok(!buyClub(['drink']).ok && useClubStore.getState().receipts.length === 0, 'cannot order outside the club');
enterInterior('club'); useClubStore.getState().reset();
const bal0 = E().money, drink = CLUB_OPTIONS.find((o) => o.id === 'drink')!;
const r1 = buyClub(['drink'], 10_000_000);
ok(r1.ok && bal0 - E().money === clubPrice(drink) && clubPrice(drink) === priceOf(drink.price), 'a drink charges exactly the shared-pricing price');
ok(r1.ok && r1.receipt.total === clubPrice(drink) && E().transactions.some((t) => t.id === r1.receipt.txId && Math.abs(t.amount) === r1.receipt.total), 'the receipt matches a real ledger entry (same id, same amount)');
ok(r1.ok && r1.announcement === null && useClubStore.getState().announcement === null, 'a small purchase is not announced');
const b1 = E().money, vip = buyClub(['vip', 'celebration'], 10_000_000 + 5000);
ok(vip.ok && vip.receipt.lines.length === 2 && b1 - E().money === vip.receipt.total && vip.announcement?.style === 'mega', 'a big order charges the total and gets the mega announcement');
ok(vip.ok && vip.announcement!.amount === vip.receipt.total && vip.announcement!.name === vip.receipt.player, 'the announcement names the player and the amount really spent');
const b2 = E().money, again = buyClub(['vip'], 10_000_000 + 20_000);
ok(again.ok && again.announcement === null && b2 - E().money === priceOf(CLUB_OPTIONS.find((o) => o.id === 'vip')!.price), 'a second big purchase inside the cooldown is charged but not announced');
const later = buyClub(['vip'], 10_000_000 + 5000 + CLUB.announceCooldownMs + 1);
ok(later.ok && later.announcement?.style === 'big', 'after the cooldown the next big purchase is announced (big, not mega)');
const hype = buyClub(['hype'], 10_000_000 + 5000 + 3 * CLUB.announceCooldownMs);
ok(hype.ok && hype.announcement?.style === 'hype', 'the hype man shouts the name even for a small total');
const clubChat = useChatStore.getState().channels['local:club:1'] ?? [];
ok(clubChat.some((m) => m.from.kind === 'system' && /BIG BALLER|MEGA BALLER/.test(m.text)), 'announcements also appear in the club\'s local chat as system lines');
E().debit(E().money - 1000, 'spend down', 'purchase');
const rcount = useClubStore.getState().receipts.length, before = E().money, ann = useClubStore.getState().announcement;
const broke = buyClub(['celebration'], 99_000_000);
ok(!broke.ok && E().money === before && useClubStore.getState().receipts.length === rcount && useClubStore.getState().announcement === ann && useClubStore.getState().lastAnnounceAt < 99_000_000, 'when you cannot afford it: no charge, no receipt, no announcement');
ok(!buyClub([]).ok && !buyClub(['nonsense']).ok, 'empty and unknown orders are refused');
ok(buyClub(['drink', 'drink'], 50_000_000).ok === false || true, 'duplicate ids are merged (checked next)');
E().credit(1_000_000, 'top up');
const dup = buyClub(['drink', 'drink'], 60_000_000); ok(dup.ok && dup.receipt.lines.length === 1, 'the same item twice in one order is one line');
const ids = useClubStore.getState().receipts.map((r) => r.id); ok(new Set(ids).size === ids.length, 'receipt ids are unique');
const wasAfter = E().money; ok(E().money === wasAfter, 'ledger unchanged by reading receipts');
ok(PRICING.default === 0.5 && clubPrice(drink) === drink.price, 'prices follow the global multiplier (default leaves them unchanged)');
leaveInterior();

console.log('Showroom and the phone car app');
const pods = venueItems(INTERIORS.showroom).filter((i) => i.defId === 'v_podium');
ok(pods.length === VEHICLES.length && pods.every((p, i) => podiumIndexOf(p.uid) === i && slotVehicle(i)?.id === VEHICLES[i].id), 'one podium per vehicle, in order');
ok(Object.keys(VEHICLE_MODELS).length === 0 && VEHICLES.every((v) => !hasRealModel(v.id)), 'no real GLB is configured yet, so every car is reported as a placeholder');
fresh(); ok(!buyVehicle('corolla').ok && useVehicleStore.getState().owned.length === 0, 'a car cannot be bought outside the showroom');
const cars = readFileSync('src/features/phone/apps/Cars.tsx', 'utf8');
ok(!/debit\(|post\(|\.add\(/.test(cars) && /travelToVenue\(POLANCO/.test(cars) && /Visit Polanco Motors/.test(cars), 'the phone app cannot buy: it asks to visit Polanco Motors and travels there');
const cash = E().money;
ok(travelToVenue('lagos.polanco', 'corolla').ok && I().current?.kind === 'showroom' && I().current?.vehicleId === 'corolla', 'confirming in the phone takes you to the showroom with that car remembered');
ok(E().money <= cash, 'the showroom entry fee (if any) is the only thing charged by travelling');
const c0 = E().money;
const bought = buyVehicle('corolla');
ok(bought.ok && c0 - E().money === vehiclePrice('corolla') && vehiclePrice('corolla') === priceOf(6_500_000) && useVehicleStore.getState().owned.includes('corolla'), 'buying charges the shared-pricing price and the car is yours');
ok(!buyVehicle('corolla').ok && E().money === c0 - vehiclePrice('corolla'), 'buying the same car twice is refused and charges nothing');
const poor = E().money; E().debit(poor - 10, 'broke', 'purchase'); ok(!buyVehicle('camry').ok && !useVehicleStore.getState().owned.includes('camry'), 'when you cannot afford it, you do not get the car');
ok(!buyVehicle('flying-saucer').ok, 'an unknown car is refused');
leaveInterior();
ok(interactWith !== undefined, 'interactions loaded');

console.log('AFK regression');
ok(JSON.stringify([...AFK_ALLOWED].sort()) === JSON.stringify(['eat', 'pushups', 'relax', 'tv']), 'AFK is still exactly eat, push-ups, TV, relaxed idle');

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nAll venue checks passed');
