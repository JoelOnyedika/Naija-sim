import { CHAINS, RECIPE_BONUS, levelFor, type ChainId } from '@/data/circuits';
import { useCircuitStore } from '@/stores/circuitStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';

const C = () => useCircuitStore.getState();
export const chainLevel = (id: ChainId): 0 | 1 | 2 | 3 => levelFor(id, C().steps[id]);
export const chainEnding = (id: ChainId): string | null => C().ending[id];

/** Does a street moment with this chain requirement fit the player's progress right now? */
export function chainAllows(req?: { id: ChainId; min?: number; max?: number; open?: boolean }): boolean {
  if (!req) return true;
  const l = chainLevel(req.id);
  return l >= (req.min ?? 0) && l <= (req.max ?? 3) && (!req.open || chainEnding(req.id) === null);
}

/** Called after a street moment is answered: counts a step, records an ending, and applies the family-recipe perk to agbo. */
export function applyChain(ev: { chain?: { id: ChainId } }, c: { step?: ChainId; ending?: string; tag?: string }, won?: boolean): void {
  if (c.tag === 'agbo' && chainEnding('mama') === 'recipe') { useStatsStore.getState().apply(RECIPE_BONUS); }
  if (c.ending && ev.chain) { C().set({ ending: { ...C().ending, [ev.chain.id]: c.ending } }); toast(`${CHAINS[ev.chain.id].title}: ${CHAINS[ev.chain.id].endings[c.ending] ?? 'story complete'}`, 'good'); return; }
  if (!c.step || won === false) return;
  const id = c.step, before = chainLevel(id);
  C().set({ steps: { ...C().steps, [id]: C().steps[id] + 1 } });
  const after = chainLevel(id);
  if (after > before) toast(`${CHAINS[id].icon} ${CHAINS[id].title}: you are now "${CHAINS[id].levels[after]}"`, 'info');
}
