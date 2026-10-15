import type { CosmeticKind } from '@/stores/actorStore';
import type { PlacedItem } from '@/types/game';

/**
 * AFK behaviour. After AFK_DELAY_S seconds without player input the avatar may do ONE cosmetic thing from the list below
 * and nothing else. The list is closed on purpose: toilet, shower, sleeping, piano, dancing, vomiting and every other
 * activity are not in it and `pickAfk` cannot return them.
 *
 * Cosmetic means VISUAL ONLY. This module and the walker's cosmetic branch never call statsStore.start/apply,
 * economyStore.credit/debit, the task store or the inventory; the activity lives in actorStore.cosmetic, not in the
 * simulation. Any player input cancels it at once.
 */
export const AFK_DELAY_S = 15;
export const AFK_DURATION_S: [number, number] = [12, 20];
export const AFK_ALLOWED: readonly CosmeticKind[] = ['tv', 'eat', 'pushups', 'relax'];

/** Furniture ids each cosmetic needs. 'gym_rug' is the Gym mat in the Buy catalogue (Fun). */
export const AFK_NEEDS: Record<Exclude<CosmeticKind, 'relax'>, string> = { tv: 'tv', eat: 'fridge', pushups: 'gym_rug' };

export interface AfkChoice { kind: CosmeticKind; uid?: string }

export function afkCandidates(items: PlacedItem[]): AfkChoice[] {
  const out: AfkChoice[] = [{ kind: 'relax' }];
  for (const kind of ['tv', 'eat', 'pushups'] as const) {
    const it = items.find((i) => i.defId === AFK_NEEDS[kind]);
    if (it) out.push({ kind, uid: it.uid });
  }
  return out;
}

export function pickAfk(items: PlacedItem[], rnd: () => number = Math.random, not?: CosmeticKind): AfkChoice {
  const c = afkCandidates(items).filter((x) => x.kind !== not);
  const pool = c.length ? c : afkCandidates(items);
  return pool[Math.floor(rnd() * pool.length)];
}
