import { POWER } from '@/data/balance';
import type { PlacedItem } from '@/types/game';

/**
 * NEPA outages and backup power: pure rules. The store (stores/powerStore.ts) keeps the state, the loop calls `tickPower`,
 * and the lighting reads `lightLevel`. Keeping this file free of React and stores makes it testable on its own.
 *
 *   grid          NEPA is on: normal light.
 *   solar         Solar installed: normal light, outages do not touch the house, nothing to manage.
 *   generator     Regular generator installed: starts by itself when NEPA goes, normal light.
 *   ibeta         Ibeta installed: the player must tap it during the outage; until then the house is dim.
 *   ibeta-on      Ibeta was tapped: normal light until NEPA returns.
 *   dark          Outage, no working backup: dim (never black); each floor lamp adds a little light.
 */
export type PowerMode = 'grid' | 'solar' | 'generator' | 'ibeta' | 'ibeta-on' | 'dark';

export interface PowerInputs { outage: boolean; ibetaOn: boolean; hasSolar: boolean; hasGenerator: boolean; hasIbeta: boolean; lamps: number }

export function backupIn(placed: readonly PlacedItem[]) {
  const has = (id: string) => placed.some((p) => p.defId === id);
  return {
    hasSolar: has(POWER.items.solar), hasGenerator: has(POWER.items.auto), hasIbeta: has(POWER.items.manual),
    lamps: placed.filter((p) => p.defId === 'lamp').length,
  };
}

/** Which source is powering the house right now. Solar always wins, then the automatic generator, then a switched-on Ibeta. */
export function powerMode(i: PowerInputs): PowerMode {
  if (i.hasSolar) return 'solar';
  if (!i.outage) return 'grid';
  if (i.hasGenerator) return 'generator';
  if (i.hasIbeta) return i.ibetaOn ? 'ibeta-on' : 'ibeta';
  return 'dark';
}

/** 0..1 multiplier for the room lights. Always above zero so the house stays navigable. */
export function lightLevel(i: PowerInputs): number {
  const m = powerMode(i);
  if (m === 'grid' || m === 'solar' || m === 'generator' || m === 'ibeta-on') return 1;
  return Math.min(1, POWER.dimLevel + Math.min(POWER.lampCap, i.lamps * POWER.lampBonus));
}

export interface Timers { outage: boolean; nextAt: number; endsAt: number }

const between = ([lo, hi]: [number, number], rnd: () => number) => lo + (hi - lo) * rnd();
const gapFor = (reliable: boolean, rnd: () => number) => between(POWER.gapSeconds, rnd) * (reliable ? 1 : POWER.unreliableGapFactor);

/** First schedule after the game starts. `now` is seconds of play. */
export function initialTimers(now: number, reliable: boolean, rnd: () => number = Math.random): Timers {
  return { outage: false, nextAt: now + POWER.graceSeconds + gapFor(reliable, rnd) * 0.5, endsAt: 0 };
}

export type PowerEvent = 'outage-start' | 'outage-end' | null;

/** Advance the schedule. Pure: returns the new timers and the event (if any) that just happened. */
export function tickPower(t: Timers, now: number, reliable: boolean, rnd: () => number = Math.random): { timers: Timers; event: PowerEvent } {
  if (!t.outage && now >= t.nextAt) return { timers: { outage: true, nextAt: 0, endsAt: now + between(POWER.outageSeconds, rnd) }, event: 'outage-start' };
  if (t.outage && now >= t.endsAt) return { timers: { outage: false, nextAt: now + gapFor(reliable, rnd), endsAt: 0 }, event: 'outage-end' };
  return { timers: t, event: null };
}
