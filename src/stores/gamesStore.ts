import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The seat the player holds at a (simulated) table, if any. */
interface GamesState { seat: { tableId: string; cityId: string } | null; setSeat: (s: GamesState['seat']) => void; reset: () => void }
export const useGamesStore = create<GamesState>()(persist((set) => ({ seat: null, setSeat: (seat) => set({ seat }), reset: () => set({ seat: null }) }), { name: 'nigerialife.games', version: 1 }));
