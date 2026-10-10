import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LifeTypeId } from '@/types/game';

interface LifeState {
  lifeType: LifeTypeId | null;
  startedAt: string | null;
  startingMoney: number;
  startingPropertyId: string | null;
  /** Lives lived so far (increments on Start New Life). */
  lifeNumber: number;
  /** Rolled but not yet "started": lets the roulette animate toward a pre-decided result. */
  pending: LifeTypeId | null;
  setPending: (t: LifeTypeId | null) => void;
  begin: (p: { type: LifeTypeId; money: number; propertyId: string }) => void;
  clear: () => void;
}

export const useLifeStore = create<LifeState>()(persist((set) => ({
  lifeType: null, startedAt: null, startingMoney: 0, startingPropertyId: null, lifeNumber: 0, pending: null,
  setPending: (pending) => set({ pending }),
  begin: ({ type, money, propertyId }) => set((s) => ({ lifeType: type, startedAt: new Date().toISOString(), startingMoney: money, startingPropertyId: propertyId, lifeNumber: s.lifeNumber + 1, pending: null })),
  clear: () => set({ lifeType: null, startedAt: null, startingMoney: 0, startingPropertyId: null, pending: null }),
}), { name: 'nigerialife.life', version: 1 }));
