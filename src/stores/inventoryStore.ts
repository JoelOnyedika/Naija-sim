import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InventoryState {
  items: Record<string, number>;
  add: (id: string, qty?: number) => void;
  remove: (id: string, qty?: number) => boolean;
  count: (id: string) => number;
  reset: (items?: Record<string, number>) => void;
}
export const useInventoryStore = create<InventoryState>()(persist((set, get) => ({
  items: {},
  add: (id, qty = 1) => set((s) => ({ items: { ...s.items, [id]: (s.items[id] ?? 0) + qty } })),
  remove: (id, qty = 1) => {
    const have = get().items[id] ?? 0;
    if (have < qty) return false;
    const next = { ...get().items };
    if (have - qty <= 0) delete next[id]; else next[id] = have - qty;
    set({ items: next });
    return true;
  },
  count: (id) => get().items[id] ?? 0,
  reset: (items = {}) => set({ items: { ...items } }),
}), { name: 'nigerialife.inventory', version: 1 }));
