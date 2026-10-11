import { useInventoryStore } from '@/stores/inventoryStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { getProperty, resolveLegacyProperty } from '@/world/registry';

/**
 * Run once after content is registered. Saves made when the catalogue was larger can point at houses that no longer
 * exist. Each retired home becomes its nearest current tier (ownership is kept, nothing is charged), and the furniture
 * that was placed in it goes back to the player's inventory because the new layout has different walls.
 */
export function reconcileSavedHomes() {
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
