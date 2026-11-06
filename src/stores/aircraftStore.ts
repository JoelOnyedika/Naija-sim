import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Aircraft the player owns and what each cost (a sale returns 70% of that). A new life starts with none. */
interface AircraftState { owned: string[]; paid: Record<string, number>; add: (id: string, paid: number) => void; remove: (id: string) => void; reset: () => void }
export const useAircraftStore = create<AircraftState>()(persist((set) => ({
  owned: [], paid: {},
  add: (id, paid) => set((s) => (s.owned.includes(id) ? s : { owned: [...s.owned, id], paid: { ...s.paid, [id]: paid } })),
  remove: (id) => set((s) => { const paid = { ...s.paid }; delete paid[id]; return { owned: s.owned.filter((x) => x !== id), paid }; }),
  reset: () => set({ owned: [], paid: {} }),
}), { name: 'nigerialife.aircraft', version: 1, partialize: ({ add: _a, remove: _r, reset: _x, ...rest }) => rest }));
