import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Family and relationship state. The player's status is always 'single' for now. `links` is the data model a future marriage
 * system will use (two people, a kind, a start time) and is deliberately EMPTY: nothing creates links yet, no second character
 * is made, and the UI says marriage is not available.
 */
export type RelationshipStatus = 'single';
export interface FamilyLink { id: string; a: string; b: string; kind: 'spouse' | 'child'; since: number }
const START_BONDS: Record<string, number> = { mama: 80, daddy: 65, ada: 70, baba: 55 };
interface FamilyState { status: RelationshipStatus; links: FamilyLink[]; bonds: Record<string, number>; bump: (id: string, n: number) => void; reset: () => void }
export const useFamilyStore = create<FamilyState>()(persist((set) => ({
  status: 'single', links: [], bonds: { ...START_BONDS },
  bump: (id, n) => set((s) => ({ bonds: { ...s.bonds, [id]: Math.min(100, (s.bonds[id] ?? 50) + n) } })),
  reset: () => set({ status: 'single', links: [], bonds: { ...START_BONDS } }),
}), { name: 'nigerialife.family', version: 1 }));
