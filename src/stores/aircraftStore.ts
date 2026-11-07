import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Livery } from '@/data/aircraft';

/** Aircraft the player owns, what each cost (a sale returns 70% of that) and how each is painted. A new life starts with none. */
interface AircraftState {
  owned: string[]; paid: Record<string, number>; liveries: Record<string, Livery>;
  add: (id: string, paid: number, livery?: Livery) => void; remove: (id: string) => void; setLivery: (id: string, livery: Livery) => void; reset: () => void;
}
export const useAircraftStore = create<AircraftState>()(persist((set) => ({
  owned: [], paid: {}, liveries: {},
  add: (id, paid, livery) => set((s) => (s.owned.includes(id) ? s : { owned: [...s.owned, id], paid: { ...s.paid, [id]: paid }, liveries: livery ? { ...s.liveries, [id]: livery } : s.liveries })),
  remove: (id) => set((s) => { const paid = { ...s.paid }, liveries = { ...s.liveries }; delete paid[id]; delete liveries[id]; return { owned: s.owned.filter((x) => x !== id), paid, liveries }; }),
  setLivery: (id, livery) => set((s) => (s.owned.includes(id) ? { liveries: { ...s.liveries, [id]: livery } } : s)),
  reset: () => set({ owned: [], paid: {}, liveries: {} }),
}), {
  name: 'nigerialife.aircraft', version: 2,
  migrate: (old) => ({ ...(old as object), liveries: (old as { liveries?: Record<string, Livery> })?.liveries ?? {} }) as never, // v1 saves had no paint: they get the factory colours
  partialize: ({ add: _a, remove: _r, setLivery: _l, reset: _x, ...rest }) => rest,
}));
