import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Where the player is in the (simulated) Ride world: `at` is a destination id, or null when they are home. */
interface RideState { at: string | null; trips: number; visits: Record<string, number>; setAt: (id: string | null) => void; countTrip: (destId: string) => void; reset: () => void }
export const useRideStore = create<RideState>()(persist((set) => ({
  at: null, trips: 0, visits: {},
  setAt: (at) => set({ at }),
  countTrip: (destId) => set((s) => ({ at: destId, trips: s.trips + 1, visits: { ...s.visits, [destId]: (s.visits[destId] ?? 0) + 1 } })),
  reset: () => set({ at: null, trips: 0, visits: {} }),
}), { name: 'nigerialife.ride', version: 1 }));
