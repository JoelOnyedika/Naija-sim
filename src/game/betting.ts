import { useEconomyStore } from '@/stores/economyStore';

/**
 * The betting slip at the viewing centre. Six matches a day, three outcomes each (home, draw, away). The house takes a margin:
 * the offered odds are fair odds shrunk by 12%, so every single bet and every accumulator loses money on average (a test checks
 * it). You pick up to five matches, set a stake, and the results come in one at a time. After a correct leg you may cash out for
 * less than the full win. Outcomes are drawn from the TRUE probabilities with a random source passed in, so a server (or a
 * test) can decide them. All money is in-game naira.
 */
export type Pick = 'H' | 'D' | 'A';
export interface Match { id: string; home: string; away: string; p: Record<Pick, number>; odds: Record<Pick, number> }
export const BET = { margin: 0.12, minStake: 500, maxStake: 5_000_000, maxLegs: 5, cashOutCut: 0.9, matchesPerDay: 6 };

const TEAMS = ['Eko Lions', 'Naija Eagles', 'Kano Kings', 'Delta Pirates', 'Ibadan Hawks', 'Benin Bronze', 'Calabar Cobras', 'Jos Miners', 'Sokoto Sultans', 'Owerri Sharks', 'Abeokuta Rocks', 'Ilorin Rams', 'Warri Waves', 'Kaduna Kites'];
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const odd = (p: number) => Math.max(1.1, Math.round((1 / (p * (1 + BET.margin))) * 20) / 20);

/** Today's matches: the same for everyone on the same game day. */
export function matchesFor(day: number): Match[] {
  const r = rng(day * 7919 + 13), pool = [...TEAMS], out: Match[] = [];
  for (let i = 0; i < BET.matchesPerDay; i++) {
    const home = pool.splice(Math.floor(r() * pool.length), 1)[0], away = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const a = (0.6 + r() * 0.8) * 1.15, b = 0.6 + r() * 0.8, d = 0.27 - (0.12 * Math.abs(a - b)) / (a + b), pH = (1 - d) * (a / (a + b)), pA = (1 - d) * (b / (a + b));
    const p = { H: pH, D: d, A: pA };
    out.push({ id: `d${day}m${i}`, home, away, p, odds: { H: odd(pH), D: odd(d), A: odd(pA) } });
  }
  return out;
}

export interface Leg { matchId: string; pick: Pick }
export interface LegResult { matchId: string; pick: Pick; outcome: Pick; score: [number, number]; won: boolean }
export interface Ticket { id: string; legs: Leg[]; stake: number; odds: number; potential: number; results: LegResult[]; matches: Match[] }
export type PlaceResult = { ok: true; ticket: Ticket } | { ok: false; message: string };

export const combinedOdds = (m: Match[], legs: Leg[]) => Math.round(legs.reduce((a, l) => a * (m.find((x) => x.id === l.matchId)?.odds[l.pick] ?? 1), 1) * 100) / 100;

function draw(m: Match, r: () => number): { outcome: Pick; score: [number, number] } {
  const u = r(), g1 = r(), g2 = r(), x = r(); // always four random numbers per match, so a scripted source lines up
  const outcome: Pick = u < m.p.H ? 'H' : u < m.p.H + m.p.D ? 'D' : 'A', extra = 1 + Math.floor(x * 2);
  let h = Math.floor(g1 * 3), a = Math.floor(g2 * 3);
  if (outcome === 'D') a = h; else if (outcome === 'H') { if (h <= a) h = a + extra; } else if (a <= h) a = h + extra;
  return { outcome, score: [h, a] };
}

/** Take the stake and draw every result now (the screen only reveals them one by one). */
export function placeBet(day: number, legs: Leg[], stake: number, r: () => number = Math.random): PlaceResult {
  const matches = matchesFor(day);
  if (!Array.isArray(legs) || legs.length < 1 || legs.length > BET.maxLegs) return { ok: false, message: `Pick 1 to ${BET.maxLegs} matches.` };
  if (new Set(legs.map((l) => l.matchId)).size !== legs.length) return { ok: false, message: 'One pick per match.' };
  if (legs.some((l) => !matches.some((m) => m.id === l.matchId) || !['H', 'D', 'A'].includes(l.pick))) return { ok: false, message: 'That match is not on the board.' };
  if (!Number.isFinite(stake) || !Number.isInteger(stake) || stake < BET.minStake || stake > BET.maxStake) return { ok: false, message: `Stake must be ₦${BET.minStake.toLocaleString('en-NG')} to ₦${BET.maxStake.toLocaleString('en-NG')}.` };
  const id = `bet-${day}-${Math.floor(r() * 1e9)}`;
  const paid = useEconomyStore.getState().post({ direction: 'expense', amount: stake, label: 'Betting slip', kind: 'bet', counterparty: 'Viewing centre', meta: { opKey: `${id}:stake` } });
  if (!paid.ok) return { ok: false, message: paid.reason === 'duplicate' ? 'That slip was already placed.' : 'You do not have enough cash for that stake.' };
  const odds = combinedOdds(matches, legs), results = legs.map((l) => { const m = matches.find((x) => x.id === l.matchId)!, d = draw(m, r); return { ...l, outcome: d.outcome, score: d.score, won: d.outcome === l.pick }; });
  return { ok: true, ticket: { id, legs, stake, odds, potential: Math.round(stake * odds), results, matches } };
}

/** What the bookmaker offers to settle early after `shown` legs were revealed (all correct so far). 0 once a leg has lost. */
export function cashOutValue(t: Ticket, shown: number): number {
  if (shown < 1 || shown >= t.legs.length || t.results.slice(0, shown).some((x) => !x.won)) return 0;
  let v = t.stake;
  t.legs.forEach((l, i) => { const m = t.matches.find((x) => x.id === l.matchId)!; v *= m.odds[l.pick] * (i < shown ? 1 : m.p[l.pick]); });
  return Math.floor(v * BET.cashOutCut);
}
export type Settlement = { paid: number; kind: 'won' | 'lost' | 'cashed'; nearMiss: boolean };
/** Pay out a ticket. `cashedAt` = the number of legs shown when the player took the cash-out, if they did. */
export function settleBet(t: Ticket, cashedAt?: number): Settlement {
  const lost = t.results.filter((x) => !x.won).length;
  let paid = 0, kind: Settlement['kind'] = 'lost';
  if (cashedAt !== undefined) { paid = cashOutValue(t, cashedAt); kind = paid > 0 ? 'cashed' : 'lost'; }
  else if (lost === 0) { paid = t.potential; kind = 'won'; }
  if (paid > 0) useEconomyStore.getState().post({ direction: 'income', amount: paid, label: kind === 'won' ? 'Betting slip won' : 'Betting slip cashed out', kind: 'bet', counterparty: 'Viewing centre', meta: { opKey: `${t.id}:payout` } });
  return { paid, kind, nearMiss: kind === 'lost' && lost === 1 && t.legs.length > 1 };
}
