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

/** Move into a property you own. Your furniture moves with you; what does not fit goes to the inventory. */
export function moveInto(propertyId: string) {
  const store = usePropertyStore.getState();
  const prop = getProperty(propertyId), layout = prop && getLayout(prop.layoutId);
  if (!prop || !layout) return;
  const current = getActiveHome();
  let carry: string[] = [];
  if (current && current.property.id !== propertyId) {
    carry = current.placed.map((p) => p.defId);
    store.setFurniture(current.property.id, []);
  }
  const target = store.furniture[propertyId] ?? [];
  const { placed, leftover } = autoPlace(layout, carry, target);
  leftover.forEach((id) => useInventoryStore.getState().add(id));
  store.setFurniture(propertyId, placed);
  store.setActive(propertyId);
  if (leftover.length) toast(`${leftover.length} item${leftover.length > 1 ? 's' : ''} did not fit and went to your inventory`);
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
