import type { Effects } from '@/types/game';

/**
 * One yardstick for "what should this cost?". Every stat point has a naira value, and the game's own hand-priced items set the rate:
 * across 131 activities and foods that the designers priced by hand, the median price is 1.5 naira per naira of stat value (a plate of
 * jollof, ₦4,500, gives about ₦3,000 of value). Anything unpriced is priced the same way, so a new activity gets a fair price from
 * its effects instead of a guess. Change a value or the ratio here and every auto-priced activity follows.
 * Naira here are balance values; a server must own them (game/authority.ts).
 */
export const STAT_VALUE: Record<string, number> = { hunger: 45, thirst: 25, happiness: 90, social: 90, charisma: 300, energy: 40, hygiene: 40, health: 100 };
/** Naira charged per naira of value. The median of the hand-priced activities. */
export const MARKET_RATIO = 1.5;
/** Losing a point (a drain) is worth this share of gaining one. */
export const DRAIN_CREDIT = 0.6;
export const PRICE_FLOOR = 200, PRICE_CEILING = 12_000;

/** What the effects are worth, in naira of value (gains count in full, drains reduce it). */
export function valueOf(effects: Effects): number {
  return Object.entries(effects).reduce((t, [k, v]) => { const n = (v as number | undefined) ?? 0; return t + n * (STAT_VALUE[k] ?? 50) * (n > 0 ? 1 : DRAIN_CREDIT); }, 0);
}
const nice = (n: number) => (n < 1000 ? Math.round(n / 50) * 50 : n < 5000 ? Math.round(n / 100) * 100 : Math.round(n / 500) * 500);
/** The fair price of something with these effects. `share` below 1 is for things that are only partly paid for (a round of drinks while you chat). */
export function fairPrice(effects: Effects, share = 1): number {
  return Math.max(PRICE_FLOOR, Math.min(PRICE_CEILING, nice(valueOf(effects) * MARKET_RATIO * share)));
}
