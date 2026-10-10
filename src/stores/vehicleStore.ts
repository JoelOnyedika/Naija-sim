import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VehicleState { owned: string[]; add: (id: string) => void; reset: (ids?: string[]) => void }
export const useVehicleStore = create<VehicleState>()(persist((set) => ({
  owned: [],
  add: (id) => set((s) => (s.owned.includes(id) ? s : { owned: [...s.owned, id] })),
  reset: (ids = []) => set({ owned: ids }),
}), { name: 'nigerialife.vehicles', version: 1 }));
