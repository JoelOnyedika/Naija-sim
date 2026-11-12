import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { LENDERS, LOAN_RULES, type LenderId } from '@/data/loans';
import { useInteriorStore } from '@/stores/interiorStore';
import { useLoanStore, type Visit, type Where } from '@/stores/loanStore';
import { useStatsStore } from '@/stores/statsStore';
import { fighterNow, oddsFight, oddsRun } from './agbero';
import { isJailed } from './crime';
import { huntedLoans, owedOn, seize } from './loans';

/**
 * Loan collectors (harassment, never violence or jail). Once a loan has been overdue for half a game day, its lender sends people to make
 * your life unpleasant: they knock, shout your name, and make a scene in front of everyone. A visit comes about every ten minutes of play
 * (`rollSeconds` + `chance` + `cooldownSeconds` in data/loans.ts), wherever you are, and also when a trip ends (the street).
 *   hide  (home only) 50%     run  the Agbero run odds + 15 points     confront  the Agbero fight odds (no blows, a shouting match)     pay  always works
 * Lose: you are humiliated, which costs happiness, social and a little energy, and they take a small part of your cash for "recovery fees"
 * toward the loan. Dice are local; a server must roll them in a real multiplayer version.
 */
const V = () => useLoanStore.getState();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export type VisitChoice = 'pay' | 'hide' | 'run' | 'fight';
let pendingNext: (() => void) | null = null;

export const oddsHide = () => 0.5;
export const oddsRunAway = (v: Pick<Visit, 'lender' | 'men'>) => clamp(oddsRun(fighterNow(), LENDERS[v.lender].collectors.power, v.men) + 0.15, 0.1, 0.92);
export const oddsFightThem = (v: Pick<Visit, 'lender' | 'men'>) => clamp(oddsFight(fighterNow(), LENDERS[v.lender].collectors.power, v.men), 0.03, 0.85);
export const oddsOf = (c: VisitChoice, v: Visit): number => (c === 'pay' ? 1 : c === 'hide' ? oddsHide() : c === 'run' ? oddsRunAway(v) : oddsFightThem(v));

/** Who is after you right now: the lender with the longest overdue hunted loan, and what you owe them. */
export function hunter(): { lender: LenderId; owed: number } | null {
  const hunted = huntedLoans(); if (!hunted.length) return null;
  const first = [...hunted].sort((a, b) => a.dueAt - b.dueAt)[0], lender = first.lender;
  return { lender, owed: hunted.filter((l) => l.lender === lender).reduce((a, l) => a + owedOn(l), 0) };
}

export function startVisit(where: Where, rnd: () => number = Math.random, next?: () => void): boolean {
  const h = hunter(); if (!h || V().visit || isJailed()) return false;
  const d = LENDERS[h.lender];
  const men = 1 + Math.min(d.collectors.maxMen - 1, Math.floor(rnd() * d.collectors.maxMen));
  pendingNext = next ?? null;
  V().set({ visit: { lender: h.lender, where, men, owed: h.owed, result: null }, lastVisitAt: Date.now(), visits: V().visits + 1 });
  sfx.notify();
  return true;
}

/** The roll: used both by the timer and when a trip ends. */
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
  maybeCollectors(useInteriorStore.getState().current ? 'venue' : 'home', undefined, rnd, nowMs);
}

const humiliate = (men: number) => useStatsStore.getState().apply({ happiness: -(10 + men * 3), social: -4, energy: -4 });

export function chooseVisit(choice: VisitChoice, rnd: () => number = Math.random): Visit['result'] {
  const v = V().visit; if (!v || v.result) return null;
  if (choice === 'hide' && v.where !== 'home') return null;
  const d = LENDERS[v.lender], win = choice === 'pay' || rnd() < oddsOf(choice, v);
  let text = '', tone: 'good' | 'bad' = 'good';
  if (choice === 'pay') {
    const took = seize(v.owed), left = Math.max(0, v.owed - took);
    text = took >= v.owed ? `You pay ${formatNaira(took)}. ${d.collectors.crew} apologise for the trouble and leave.` : took > 0 ? `You hand over ${formatNaira(took)}, all you have. They say they will be back for ${formatNaira(left)}.` : 'Your pockets are empty. They promise to be back.';
    tone = took > 0 ? 'good' : 'bad';
  } else if (win) {
    text = choice === 'hide' ? 'You keep quiet and still. They knock, curse, and finally go away.'
      : choice === 'run' ? (v.where === 'home' ? 'You slip out the back and lose them in the next street.' : 'You dive into the crowd and they lose you.')
      : 'You shout back louder than they do. The neighbours side with you and the collectors leave, embarrassed.';
    if (choice === 'fight') useStatsStore.getState().apply({ charisma: 2, energy: -6 });
  } else {
    tone = 'bad';
    const fee = seize(Math.round(v.owed * 0.1));
    humiliate(v.men);
    text = `${choice === 'hide' ? 'They know you are inside and they will not stop knocking.' : choice === 'run' ? 'They catch up and block your way.' : 'They out-shout you.'} "${d.collectors.shout}" Everyone is watching.${fee ? ` They also charge ${formatNaira(fee)} in "recovery fees".` : ''}`;
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
