import { sfx } from '@/audio/sfx';
import { getFinish, type FinishKind } from '@/data/finishes';
import { useEconomyStore } from '@/stores/economyStore';
import { useFinishStore } from '@/stores/finishStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { roomsOf } from '@/world/layoutGeometry';
import { getActiveHome } from './active';

/** Try a finish on the active home. Free, reversible, never saved. */
export function previewFinish(id: string) {
  const def = getFinish(id); if (!def) return;
  useFinishStore.getState().setPreview(def.kind, id);
}
export const cancelFinishPreview = () => useFinishStore.getState().clearPreview();

/** Does buying/applying `id` cost money right now? Owned finishes and free ones apply at no charge. */
export function finishCost(id: string): number {
  const def = getFinish(id); if (!def) return 0;
  return useFinishStore.getState().owned.includes(id) ? 0 : def.price;
}

/**
 * Buy (if needed) and apply a finish to the active home. Validates first, charges exactly once through the shared
 * economy store, and applies only to this home. Calling it again with nothing previewed or the same finish is a no-op.
 */
export function applyFinish(kind: FinishKind): { ok: boolean; error?: string } {
  const home = getActiveHome();
  const id = useFinishStore.getState().preview[kind];
  const def = id ? getFinish(id) : undefined;
  if (!home || !id || !def || def.kind !== kind) return { ok: false, error: 'Nothing selected.' };
  const scope = kind === 'floor' ? (useFinishStore.getState().preview.floorRoom ?? 'all') : 'all';
  const cur = useFinishStore.getState().byProperty[home.property.id];
  const same = kind === 'floor' && scope !== 'all' ? cur?.rooms?.[scope] === id : cur?.[kind] === id;
  if (same) { useFinishStore.getState().clearPreview(); return { ok: true }; }
  const cost = finishCost(id);
  if (cost > 0 && !useEconomyStore.getState().debit(cost, def.name, 'purchase')) { sfx.error(); toast('Your money no reach for that finish.', 'bad'); return { ok: false, error: 'Not enough money.' }; }
  if (cost > 0) useUiStore.getState().addSpent(cost);
  // 'all' = living areas and bedrooms; the rooms that had their own floor go back to following it
  const sharedRooms = roomsOf(home.layout).filter((r) => r.kind !== 'kitchen' && r.kind !== 'bathroom').map((r) => r.id);
  useFinishStore.getState().commit(home.property.id, kind, id, scope, sharedRooms);
  sfx.purchase();
  const roomLabel = scope === 'all' ? home.property.name : roomsOf(home.layout).find((r) => r.id === scope)?.label ?? home.property.name;
  toast(`${def.name} applied to ${roomLabel}.`, 'good');
  return { ok: true };
}
