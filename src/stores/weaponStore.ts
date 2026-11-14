import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJsonStorage } from '@/core/safeStorage';
import type { WeaponId } from '@/data/weapons';

/** What the player carries. `equipped` is part of the player's synced state in the open world (a server will own it). */
interface WeaponState {
  owned: WeaponId[]; equipped: WeaponId | null; heat: number;
  set: (p: Partial<WeaponState>) => void; reset: () => void;
}
export const useWeaponStore = create<WeaponState>()(persist((set) => ({
  owned: [], equipped: null, heat: 0,
  set: (p) => set(p), reset: () => set({ owned: [], equipped: null, heat: 0 }),
}), { name: 'nigerialife.weapons', version: 1, storage: safeJsonStorage, partialize: ({ owned, equipped, heat }) => ({ owned, equipped, heat }) as never }));
