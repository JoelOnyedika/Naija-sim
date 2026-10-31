import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** How many trips the player has taken (a cheap proxy for "how long have they played") and what they saw last. */
interface TravelState { trips: number; last: string | null; record: (scenario: string) => void }
export const useTravelStore = create<TravelState>()(persist((set) => ({
  trips: 0, last: null,
  record: (scenario) => set((s) => ({ trips: s.trips + 1, last: scenario })),
}), { name: 'nigerialife.travel', version: 1 }));
