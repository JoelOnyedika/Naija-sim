import { useInventoryStore } from '@/stores/inventoryStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { getFurniture } from '@/data/items';
import { fixturesOf, validatePlacement } from '@/world/placement';
import { getLayout, getProperty, resolveLegacyProperty } from '@/world/registry';
import type { PlacedItem } from '@/types/game';

/**
 * Run once after content is registered. Saves made when the catalogue was larger can point at houses that no longer
 * exist. Each retired home becomes its nearest current tier (ownership is kept, nothing is charged), and the furniture
 * that was placed in it goes back to the player's inventory because the new layout has different walls.
 */
/**
 * Layouts can change between versions. Furniture that no longer fits its home's current walls, doors or zones goes back
 * to the inventory (nothing is deleted or charged); everything that still fits stays exactly where it was.
 */
function revalidateFurniture() {
  const ps = usePropertyStore.getState(), inv = useInventoryStore.getState();
  const next = { ...ps.furniture };
  let changed = false;
  for (const [id, items] of Object.entries(ps.furniture)) {
    const prop = getProperty(id), layout = prop && getLayout(prop.layoutId);
    if (!layout) continue;
    const kept: PlacedItem[] = [];
    for (const item of items) {
      const def = getFurniture(item.defId);
      if (def && validatePlacement(def, layout, item, [...fixturesOf(layout), ...kept])) kept.push(item);
      else { inv.add(item.defId); changed = true; }
    }
    if (kept.length !== items.length) next[id] = kept;
  }
  if (changed) usePropertyStore.setState({ furniture: next });
}

export function reconcileSavedHomes() {
  revalidateFurniture();
  const ps = usePropertyStore.getState();
  const stale = [...new Set([...ps.ownedIds, ...(ps.activeId ? [ps.activeId] : []), ...Object.keys(ps.furniture)])].filter((id) => !getProperty(id));
  if (!stale.length) return;
  const inv = useInventoryStore.getState();
  const owned = new Set(ps.ownedIds.filter((id) => getProperty(id)));
  const furniture = { ...ps.furniture };
  let active = ps.activeId;
  for (const id of stale) {
    const next = resolveLegacyProperty(id);
    for (const item of furniture[id] ?? []) if (!item.fixed) inv.add(item.defId);
    delete furniture[id];
    if (ps.ownedIds.includes(id) && next) owned.add(next);
    if (active === id) active = next ?? null;
  }
  if (active && !getProperty(active)) active = null;
  if (!active && owned.size) active = [...owned][0];
  usePropertyStore.setState({ ownedIds: [...owned], activeId: active, furniture });
}
