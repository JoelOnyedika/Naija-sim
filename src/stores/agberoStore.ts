import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RoadOutcome = { choice: 'pay' | 'run' | 'fight' | 'talk'; success: boolean; text: string; /** signed naira */ money: number; effects: Record<string, number> };
export interface RoadBlock { opponentId: string; demand: number; finale: boolean }

interface AgberoState {
  /** Story progress (persisted): fights and talks won, bribes paid, escapes, losses, and how the story ended. */
  wins: number; paid: number; escapes: number; losses: number; encounters: number;
  ending: 'joined' | 'reformed' | null;
  /** Trip count at the last roadblock, so two never come back to back. */
  lastTrip: number;
  /** Transient: the roadblock on screen and what happened. */
  active: RoadBlock | null; result: RoadOutcome | null;
  set: (p: Partial<AgberoState>) => void;
  reset: () => void;
}
const fresh = () => ({ wins: 0, paid: 0, escapes: 0, losses: 0, encounters: 0, ending: null as 'joined' | 'reformed' | null, lastTrip: 0, active: null as RoadBlock | null, result: null as RoadOutcome | null });
export const useAgberoStore = create<AgberoState>()(persist((set) => ({
  ...fresh(), set: (p) => set(p), reset: () => set(fresh()),
}), { name: 'nigerialife.agbero', version: 1, partialize: ({ active: _a, result: _r, set: _s, reset: _x, ...rest }) => rest }));
