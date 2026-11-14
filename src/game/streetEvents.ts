import { sfx } from '@/audio/sfx';
import { EVENT_PACING, STREET_EVENTS, getStreetEvent, type EventChoice, type StreetEvent } from '@/data/streetEvents';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { useDailyStore } from '@/stores/dailyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useStoryStore } from '@/stores/storyStore';
import { useInteractStore } from './interact';
import { useLifeStore } from '@/stores/lifeStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { skillName, useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { isJailed } from './crime';
import { dailyHit } from './daily';
import { addRoadWin } from './agbero';
import { applyChain, chainAllows } from './circuits';
import { useAgberoStore } from '@/stores/agberoStore';
import { useTestDriveStore } from '@/stores/testDriveStore';

/**
 * Street moments. While you play, somebody sometimes stops you: a market woman with agbo, an Agbero wanting "ticket", your landlord
 * at the door. `stepEvents` runs once a second from the game loop; when the moment is right it puts one event in `dailyStore.pending`
 * and the EventPrompt card shows it. Every effect comes from data/streetEvents.ts. Dice rolls and payouts are local stand-ins:
 * a real server must decide the roll and pay (same hand-off as game/authority.ts).
 */
const D = () => useDailyStore.getState();
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Where the player is: their own home, or a public venue kind. */
export function placeNow(): { home: boolean; kind: string | null } {
  const cur = useInteriorStore.getState().current;
  return { home: !cur, kind: cur?.kind ?? null };
}

const inHours = (h: number, w?: [number, number]) => !w || (w[0] <= w[1] ? h >= w[0] && h < w[1] : h >= w[0] || h < w[1]);

/** Which events could appear right now (place, hour, life type, cooldown). Exported for tests. */
export function eligibleEvents(now = Date.now()): StreetEvent[] {
  const { home, kind } = placeNow();
  if (kind === 'jail' || kind === 'initiation') return []; // nothing interrupts the forest
  const hour = clockParts(useClockStore.getState().minutes, useClockStore.getState().anchor).hour;
  const life = useLifeStore.getState().lifeType;
  return STREET_EVENTS.filter((e) => {
    const placeOk = e.where === 'home' ? home : e.where === 'venue' ? !home : !home && e.where.includes(kind as never);
    if (!placeOk || !inHours(hour, e.hours) || (e.lifeType && e.lifeType !== life) || !chainAllows(e.chain)) return false;
    return now - (D().lastSeen[e.id] ?? 0) >= e.cooldownMin * 60000;
  });
}

/** Weighted pick. `r` is a number in [0,1) so tests can steer it. */
export function pickEvent(list: StreetEvent[], r = Math.random()): StreetEvent | null {
  const total = list.reduce((a, e) => a + e.weight, 0);
  if (!total) return null;
  let t = r * total;
  for (const e of list) { t -= e.weight; if (t < 0) return e; }
  return list[list.length - 1];
}

/** Is something already on screen that a prompt must not cover or interrupt? */
export function screenBusy(): boolean {
  const ui = useUiStore.getState();
  return !!(useStatsStore.getState().activity || usePhoneStore.getState().open || ui.mode !== 'home' || ui.sceneLoading || ui.actionMenuUid || ui.clubMenuOpen || ui.receiptId
    || ui.showroomVehicle || ui.carReveal || ui.profileOpen || ui.foodPickerUid || ui.detailPropertyId || ui.infoItemId || useInteriorStore.getState().selectedNpc || !!useStoryStore.getState().dialogue || !!useStoryStore.getState().exam || useInteractStore.getState().mode !== 'idle' ||  D().sheetOpen || !!D().pending || !!useAgberoStore.getState().active || !!useTestDriveStore.getState().vehicleId || isJailed());
}

const scheduleNext = (now = Date.now()) => D().set({ nextEventAt: now + rand(EVENT_PACING.minGap, EVENT_PACING.maxGap) * 1000 });
let sessionStarted = false;
/** Forget the per-session first-delay flag (tests and new lives). */
export const resetEventSession = () => { sessionStarted = false; };

/** Called once a second from the game loop. */
export function stepEvents(now = Date.now()): void {
  const s = D();
  if (s.pending) {
    if (now - s.pending.startedAt >= s.pending.seconds * 1000) ignorePending(now);
    return;
  }
  if (!sessionStarted || s.nextEventAt === 0) { sessionStarted = true; if (s.nextEventAt < now) D().set({ nextEventAt: now + EVENT_PACING.firstDelay * 1000 }); return; }
  if (now < s.nextEventAt || screenBusy()) return;
  const ev = pickEvent(eligibleEvents(now));
  if (!ev) { D().set({ nextEventAt: now + 30000 }); return; }
  showEvent(ev, now);
}

/** Put an event on screen right now. */
export function showEvent(ev: StreetEvent, now = Date.now()): void {
  D().set({ pending: { eventId: ev.id, startedAt: now, seconds: ev.seconds ?? EVENT_PACING.defaultSeconds }, lastSeen: { ...D().lastSeen, [ev.id]: now } });
  sfx.notify();
}

/** What a choice needs in the wallet before it can be picked. */
export const choiceNeeds = (c: EventChoice): number => c.cost ?? Math.max(0, -(c.risk?.winMoney ?? 0));
export const canPick = (c: EventChoice): boolean => useEconomyStore.getState().money >= choiceNeeds(c);

/** Move money by a signed amount. A payment is capped at what the player has. */
function moveMoney(delta: number, label: string, who: string) {
  const e = useEconomyStore.getState();
  if (delta > 0) e.credit(delta, label, 'reward', who);
  else if (delta < 0) { const pay = Math.min(-delta, e.money); if (pay > 0) e.debit(pay, label, 'purchase', who); }
}

const finish = (now = Date.now()) => { D().set({ pending: null }); scheduleNext(now); };

export type AnswerResult = { ok: true; text: string; won?: boolean } | { ok: false; reason: string };

/** The player picked a choice for the event on screen. */
export function answerEvent(choiceId: string, now = Date.now()): AnswerResult {
  const p = D().pending; const ev = p && getStreetEvent(p.eventId);
  if (!p || !ev) return { ok: false, reason: 'Nothing to answer' };
  const c = ev.choices.find((x) => x.id === choiceId);
  if (!c) return { ok: false, reason: 'No such choice' };
  const label = `${ev.who}: ${ev.title}`;
  if (c.cost) {
    if (!useEconomyStore.getState().debit(c.cost, label, 'purchase', ev.who)) { sfx.error(); toast('Omo, your money no reach.', 'bad'); return { ok: false, reason: 'insufficient' }; }
  } else if (!canPick(c)) { sfx.error(); toast('Omo, your money no reach.', 'bad'); return { ok: false, reason: 'insufficient' }; }
  const stats = useStatsStore.getState();
  let text = c.text, won: boolean | undefined;
  if (c.risk) {
    won = Math.random() < c.risk.winChance;
    stats.apply((won ? c.risk.winEffects : c.risk.loseEffects) ?? {});
    moveMoney((won ? c.risk.winMoney : c.risk.loseMoney) ?? 0, label, ev.who);
    text = won ? c.risk.winText : c.risk.loseText;
  } else {
    if (c.effects) stats.apply(c.effects);
    if (c.money) moveMoney(c.money, label, ev.who);
  }
  if (c.skill) { const { before, after } = useSkillStore.getState().add(c.skill.id, c.skill.xp); text += after > before ? ` ${skillName(c.skill.id)} level ${after}!` : ` +${c.skill.xp} ${skillName(c.skill.id)} XP`; }
  const bad = c.risk ? !won : false;
  toast(text, bad ? 'bad' : 'good'); (bad ? sfx.error : sfx.coin)();
  if (ev.id === 'agbero_levy' && c.id === 'argue' && won) addRoadWin();
  applyChain(ev, c, won);
  dailyHit('street'); if (c.tag) dailyHit(`street:${c.tag}`);
  D().set({ answered: D().answered + 1 });
  finish(now);
  return { ok: true, text, won };
}

/** The timer ran out, or the player closed the card. */
export function ignorePending(now = Date.now()): void {
  const p = D().pending; const ev = p && getStreetEvent(p.eventId);
  if (!p || !ev) { D().set({ pending: null }); return; }
  if (ev.ignore.effects) useStatsStore.getState().apply(ev.ignore.effects);
  toast(ev.ignore.text);
  finish(now);
}

/** Expected naira gain of a choice, for tests: a staked gamble must be negative. */
export function expectedGain(c: EventChoice): number {
  const base = -(c.cost ?? 0);
  if (!c.risk) return base + (c.money ?? 0);
  const r = c.risk;
  return base + r.winChance * (r.winMoney ?? 0) + (1 - r.winChance) * (r.loseMoney ?? 0);
}
