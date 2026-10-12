import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlacedItem } from '@/types/game';

/** Ownership + the player's active home + furniture placed in each owned property. */
interface PropertyState {
  ownedIds: string[];
  activeId: string | null;
  /** propertyId → placed furniture (fixtures are never stored: they come from the layout). */
  furniture: Record<string, PlacedItem[]>;
  /** propertyId → how the home was laid out when the player moved out (restored if they move back). */
  stash: Record<string, PlacedItem[]>;
  setStash: (propertyId: string, items: PlacedItem[] | null) => void;
  setFurniture: (propertyId: string, items: PlacedItem[]) => void;
  own: (propertyId: string) => void;
  setActive: (propertyId: string) => void;
  reset: () => void;
}
export const usePropertyStore = create<PropertyState>()(persist((set) => ({
  ownedIds: [], activeId: null, furniture: {}, stash: {},
  setStash: (propertyId, items) => set((s) => {
    const next = { ...s.stash };
    if (items && items.length) next[propertyId] = items; else delete next[propertyId];
    return { stash: next };
  }),
  setFurniture: (propertyId, items) => set((s) => ({ furniture: { ...s.furniture, [propertyId]: items.filter((i) => !i.fixed) } })),
  own: (id) => set((s) => (s.ownedIds.includes(id) ? s : { ownedIds: [...s.ownedIds, id] })),
  setActive: (id) => set({ activeId: id }),
  reset: () => set({ ownedIds: [], activeId: null, furniture: {}, stash: {} }),
}), { name: 'nigerialife.property', version: 1 }));
