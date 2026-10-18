import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Last game period each scheduled event has already run for. This is what makes scheduled events run once per period. */
interface SchedulerState { last: Record<string, number>; mark: (id: string, period: number) => void; reset: () => void }
export const useSchedulerStore = create<SchedulerState>()(persist((set) => ({
  last: {},
  mark: (id, period) => set((s) => ({ last: { ...s.last, [id]: period } })),
  reset: () => set({ last: {} }),
}), { name: 'nigerialife.scheduler', version: 1 }));
