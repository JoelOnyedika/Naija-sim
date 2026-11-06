import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Whether the player has a bodyguard and how many times he has stepped in. Persisted; a new life starts without one. */
interface GuardState { hired: boolean; stops: { agbero: number; thieves: number }; hire: () => void; dismiss: () => void; stop: (k: 'agbero' | 'thieves') => void; reset: () => void }
const fresh = () => ({ hired: false, stops: { agbero: 0, thieves: 0 } });
export const useBodyguardStore = create<GuardState>()(persist((set) => ({
  ...fresh(), hire: () => set({ hired: true }), dismiss: () => set({ hired: false }), stop: (k) => set((s) => ({ stops: { ...s.stops, [k]: s.stops[k] + 1 } })), reset: () => set(fresh()),
}), { name: 'nigerialife.bodyguard', version: 1, partialize: ({ hire: _h, dismiss: _d, stop: _s, reset: _r, ...rest }) => rest }));
