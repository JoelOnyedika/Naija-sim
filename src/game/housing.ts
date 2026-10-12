import { toast } from '@/stores/uiStore';
import { getFurniture } from '@/data/items';
import { copy } from '@/data/copy';
import type { PlacedItem } from '@/types/game';
import { uid } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { findFreeSpot, fixturesOf, validatePlacement } from '@/world/placement';
import { getLayout, getProperty } from '@/world/registry';
import type { PropertyLayout } from '@/types/world';
import { getActiveHome } from './active';

/** Place furniture ids one by one into free spots. Returns what was placed and what did not fit. */
export function autoPlace(layout: PropertyLayout, defIds: string[], existing: PlacedItem[] = []) {
  const placed = [...existing];
  const leftover: string[] = [];
  for (const id of defIds) {
    const def = getFurniture(id);
    if (!def) continue;
    const pose = findFreeSpot(def, layout, placed);
    if (pose && validatePlacement(def, layout, pose, [...fixturesOf(layout), ...placed])) placed.push({ uid: uid(), defId: id, ...pose });
    else leftover.push(id);
  }
  return { placed, leftover };
}

/** The bed that goes into a new home: one the player already owns (stored or just moved out), else the cheapest sleeping item. */
function pickBed(carried: PlacedItem[]): string {
  const isBed = (id: string) => ['foam_mattress', 'bed', 'king_bed'].includes(id);
  const own = carried.find((p) => isBed(p.defId))?.defId ?? Object.keys(useInventoryStore.getState().items).find(isBed);
  return own ?? 'foam_mattress';
}

/**
 * Move into a property you own.
 *  - Everything in the home you are leaving goes to storage (your inventory); how it was laid out is remembered.
 *  - A home you have not lived in since moving in gets only a bed (taken from storage; a basic mattress if you own none).
 *  - Moving back to a home you left restores it exactly as it was: its furniture comes back out of storage.
 */
export function moveInto(propertyId: string) {
  const store = usePropertyStore.getState(), inv = useInventoryStore.getState();
  const prop = getProperty(propertyId), layout = prop && getLayout(prop.layoutId);
  if (!prop || !layout) return;
  const current = getActiveHome();
  const leaving = current && current.property.id !== propertyId ? current.placed.filter((p) => !p.fixed) : null;
  if (current && leaving) {
    store.setStash(current.property.id, leaving);
    store.setFurniture(current.property.id, []);
    leaving.forEach((p) => inv.add(p.defId));
  }
  const saved = usePropertyStore.getState().stash[propertyId];
  if (saved?.length) {
    // coming back: put everything back where it was (only what is still in storage can return)
    const restored: PlacedItem[] = [];
    for (const item of saved) {
      const def = getFurniture(item.defId);
      if (!def || inv.count(item.defId) < 1) continue;
      if (!validatePlacement(def, layout, item, [...fixturesOf(layout), ...restored])) continue;
      inv.remove(item.defId); restored.push(item);
    }
    store.setFurniture(propertyId, restored);
    store.setStash(propertyId, null);
  } else if (leaving) {
    // new home: just a bed
    const bedId = pickBed(leaving);
    const { placed } = autoPlace(layout, [bedId], []);
    if (placed.length) { if (inv.count(bedId) > 0) inv.remove(bedId); store.setFurniture(propertyId, placed); }
    else store.setFurniture(propertyId, []);
    if (leaving.length) toast(`Your furniture is in storage. Only a bed is set up in ${prop.name}.`);
  }
  store.setActive(propertyId);
}

/** Buy (or move into) a property. Pure data: works for any state's properties. */
export function acquireProperty(propertyId: string): { ok: boolean; error?: string } {
  const prop = getProperty(propertyId);
  if (!prop) return { ok: false, error: 'Property not found.' };
  const { ownedIds, activeId } = usePropertyStore.getState();
  if (ownedIds.includes(propertyId)) {
    if (activeId === propertyId) return { ok: false, error: 'You already live here.' };
    moveInto(propertyId);
    return { ok: true };
  }
  if (!useEconomyStore.getState().debit(prop.price, `${prop.name}`, 'purchase')) { return { ok: false, error: copy.broke() }; }
  usePropertyStore.getState().own(propertyId);
  moveInto(propertyId);
  return { ok: true };
}
