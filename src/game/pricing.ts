import { PRICING } from '@/data/balance';

/**
 * One pricing function for every eligible shop item (furniture, backup power, later clothing, bags, vehicles).
 * Shops show `priceOf(base)` and charge `priceOf(base)`, so displayed and charged prices cannot disagree.
 * The multiplier is a future admin setting; changing it here is the only thing a dashboard has to do.
 * In multiplayer the server must own this value and compute the charge itself.
 */
let multiplier: number = PRICING.default;

/** Clamp to the allowed range; anything non-finite falls back to the default. */
export function sanitizeMultiplier(m: unknown): number {
  const n = typeof m === 'number' && Number.isFinite(m) ? m : PRICING.default;
  return Math.min(PRICING.max, Math.max(PRICING.min, n));
}

export const getAffordability = () => multiplier;
export function setAffordability(m: number): number { multiplier = sanitizeMultiplier(m); return multiplier; }

/** Whole naira, never negative, never NaN. A base price of 0 stays 0 (free items stay free). */
export function priceOf(base: number, m: number = multiplier): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const factor = sanitizeMultiplier(m) / PRICING.neutral;
  return Math.max(1, Math.round(base * factor));
}
