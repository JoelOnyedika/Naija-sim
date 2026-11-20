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
}), { name: 'nigerialife.weapons', version: 2, storage: safeJsonStorage,
  // v1 saves could hold the old pistols or the rifle: anyone who carried one now has the AK-47
  migrate: ((old: { owned?: string[]; equipped?: string | null; heat?: number } | undefined) => ({ owned: old?.owned?.length ? ['ak47'] : [], equipped: old?.equipped ? 'ak47' : null, heat: old?.heat ?? 0 })) as never, partialize: ({ owned, equipped, heat }) => ({ owned, equipped, heat }) as never }));
