import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { LENDERS, LOAN_RULES, type LenderId } from '@/data/loans';
import { useInteriorStore } from '@/stores/interiorStore';
import { useLoanStore, type Visit, type Where } from '@/stores/loanStore';
import { useStatsStore } from '@/stores/statsStore';
import { fighterNow, oddsFight, oddsRun } from './agbero';
import { arrestPlayer, isJailed } from './crime';
import { huntedLoans, owedOn, seize } from './loans';

/**
 * Loan collectors. Once a loan has been overdue for half a game day, its lender sends people. Every `rollSeconds` of real play, wherever you
 * are (at home, in a venue, doing an activity), there is a `chance` (30%) they find you, and the same roll happens when a trip ends (the street).
 * After a visit they leave you alone for `cooldownSeconds`. `policeShare` of visits bring police: then losing means jail (10 minutes).
 *   hide  (home only) 50%, or 35% with police      run   the Agbero run odds + 15 points (police -5)      fight  the Agbero fight odds (police -20)
 *   pay   always works: they take what you have, up to what you owe
 * Lose against collectors: beaten (health, mood) and they take half of what you owe from your wallet. Lose against police: arrested.
 * Like all dice in this game, a server must roll these in a real multiplayer version.
 */
const V = () => useLoanStore.getState();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export type VisitChoice = 'pay' | 'hide' | 'run' | 'fight';
let pendingNext: (() => void) | null = null;

export const oddsHide = (police: boolean) => (police ? 0.35 : 0.5);
export const oddsRunAway = (v: Pick<Visit, 'lender' | 'men' | 'police'>) => clamp(oddsRun(fighterNow(), LENDERS[v.lender].collectors.power, v.men) + 0.15 - (v.police ? 0.05 : 0), 0.1, 0.92);
export const oddsFightThem = (v: Pick<Visit, 'lender' | 'men' | 'police'>) => clamp(oddsFight(fighterNow(), LENDERS[v.lender].collectors.power, v.men) - (v.police ? 0.2 : 0), 0.03, 0.85);
export const oddsOf = (c: VisitChoice, v: Visit): number => (c === 'pay' ? 1 : c === 'hide' ? oddsHide(v.police) : c === 'run' ? oddsRunAway(v) : oddsFightThem(v));

/** Who is after you right now: the lender with the longest overdue hunted loan, and what you owe them. */
export function hunter(): { lender: LenderId; owed: number } | null {
  const hunted = huntedLoans(); if (!hunted.length) return null;
  const first = [...hunted].sort((a, b) => a.dueAt - b.dueAt)[0], lender = first.lender;
  return { lender, owed: hunted.filter((l) => l.lender === lender).reduce((a, l) => a + owedOn(l), 0) };
}

export function startVisit(where: Where, rnd: () => number = Math.random, next?: () => void): boolean {
  const h = hunter(); if (!h || V().visit || isJailed()) return false;
  const d = LENDERS[h.lender];
  const men = 1 + Math.min(d.collectors.maxMen - 1, Math.floor(rnd() * d.collectors.maxMen)), police = rnd() < LOAN_RULES.policeShare;
  pendingNext = next ?? null;
  V().set({ visit: { lender: h.lender, where, police, men, owed: h.owed, result: null }, lastVisitAt: Date.now(), visits: V().visits + 1 });
  sfx.notify();
  return true;
}

/** The 30% roll: used both by the timer and when a trip ends. */
export function maybeCollectors(where: Where, next?: () => void, rnd: () => number = Math.random, nowMs = Date.now()): boolean {
  if (!huntedLoans().length || V().visit || isJailed()) return false;
  if (nowMs - V().lastVisitAt < LOAN_RULES.cooldownSeconds * 1000) return false;
  if (rnd() >= LOAN_RULES.chance) return false;
  return startVisit(where, rnd, next);
}

/** Called every game tick: one roll per `rollSeconds`, wherever you are. */
export function stepCollectors(nowMs = Date.now(), rnd: () => number = Math.random): void {
  if (!huntedLoans().length) return;
  if (nowMs - V().lastRollAt < LOAN_RULES.rollSeconds * 1000) return;
  V().set({ lastRollAt: nowMs });
  const where: Where = useInteriorStore.getState().current ? 'venue' : 'home';
  maybeCollectors(where, undefined, rnd, nowMs);
}

const beat = (extra: number) => useStatsStore.getState().apply({ health: -(18 + extra * 4), happiness: -8, energy: -6 });

export function chooseVisit(choice: VisitChoice, rnd: () => number = Math.random): Visit['result'] {
  const v = V().visit; if (!v || v.result) return null;
  if (choice === 'hide' && v.where !== 'home') return null;
  const d = LENDERS[v.lender], win = choice === 'pay' || rnd() < oddsOf(choice, v);
  let text = '', tone: 'good' | 'bad' = 'good';
  const who = v.police ? `${d.collectors.crew} and the police` : d.collectors.crew;
  if (choice === 'pay') {
    const took = seize(v.owed), left = Math.max(0, v.owed - took);
    text = took >= v.owed ? `You pay ${formatNaira(took)}. ${who} write something down and leave.` : took > 0 ? `You hand over ${formatNaira(took)}, all you have. They say they will be back for ${formatNaira(left)}.` : 'Your pockets are empty. They promise to be back.';
    tone = took > 0 ? 'good' : 'bad';
  } else if (win) {
    if (choice === 'hide') text = 'You keep quiet and still. They knock, curse, and finally go away.';
    else if (choice === 'run') text = v.where === 'home' ? 'You slip out the back and lose them in the next street.' : 'You dive into the crowd and they lose you.';
    else { text = v.police ? 'You break free and scatter them. Running from police is a bad habit, though.' : 'You fight your way out. They back off, shouting.'; useStatsStore.getState().apply({ charisma: 2, energy: -12, health: -4 }); if (v.police) { /* resisting police is remembered */ } }
  } else {
    tone = 'bad';
    if (v.police) { text = `${choice === 'hide' ? 'They break the door' : choice === 'run' ? 'The police catch you' : 'The police overpower you'}. You are arrested: ${LOAN_RULES.jailMinutes} minutes in a cell.`; arrestPlayer(LOAN_RULES.jailMinutes, 'Loan default'); }
    else { const took = seize(Math.round(v.owed * 0.5)); beat(v.men); text = `${choice === 'hide' ? 'They force the door.' : choice === 'run' ? 'They catch you.' : 'They are too many.'} You are beaten${took ? ` and they take ${formatNaira(took)}` : ''}.`; }
  }
  const result = { text, tone, choice };
  V().set({ visit: { ...v, result } });
  (tone === 'good' ? sfx.coin : sfx.error)();
  return result;
}

export function finishVisit(): void {
  V().set({ visit: null, lastVisitAt: Date.now() });
  const n = pendingNext; pendingNext = null; n?.();
}
