import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { REMOVED_CAR_PRICES } from '@/data/vehicles';

interface VehicleState {
  owned: string[];
  /** What the player paid for each car they own (a sale returns 70% of this). Older saves have no entry: the current price is used. */
  paid: Record<string, number>;
  /** How many times each car has been bought, so buying a car you sold earlier is not mistaken for a double tap. */
  buys: Record<string, number>;
  /** Money owed for cars an old save owned that no longer exist in the game. Paid out once, then cleared. */
  refund: number;
  add: (id: string, paid?: number) => void;
  remove: (id: string) => void;
  clearRefund: () => void;
  reset: (ids?: string[]) => void;
}
/** v1 saves may own cars that were removed because they had no real model: drop them and owe the player their full price. */
export function migrateVehicles(persisted: unknown, from: number): VehicleState {
  const s = (persisted ?? {}) as Partial<VehicleState>; const owned = s.owned ?? [];
  if (from >= 2) return s as VehicleState;
  const gone = owned.filter((id) => id in REMOVED_CAR_PRICES);
  return { ...s, owned: owned.filter((id) => !(id in REMOVED_CAR_PRICES)), paid: {}, buys: {}, refund: gone.reduce((a, id) => a + REMOVED_CAR_PRICES[id], 0) } as VehicleState;
}
export const useVehicleStore = create<VehicleState>()(persist((set) => ({
  owned: [], paid: {}, buys: {}, refund: 0,
  add: (id, paid) => set((s) => (s.owned.includes(id) ? s : { owned: [...s.owned, id], paid: paid === undefined ? s.paid : { ...s.paid, [id]: paid }, buys: { ...s.buys, [id]: (s.buys[id] ?? 0) + 1 } })),
  remove: (id) => set((s) => { const paid = { ...s.paid }; delete paid[id]; return { owned: s.owned.filter((x) => x !== id), paid }; }),
  clearRefund: () => set({ refund: 0 }),
  reset: (ids = []) => set({ owned: ids, paid: {}, buys: {}, refund: 0 }),
}), {
  name: 'nigerialife.vehicles', version: 2,
  migrate: migrateVehicles,
  onRehydrateStorage: () => (state) => {
    if (!state || state.refund <= 0) return;
    const amount = state.refund;
    // after the stores are all up, pay the refund once (dynamic imports avoid a circular import with the economy store)
    setTimeout(() => {
      void Promise.all([import('@/stores/economyStore'), import('@/stores/uiStore')]).then(([{ useEconomyStore }, { toast }]) => {
        const r = useEconomyStore.getState().post({ direction: 'income', amount, label: 'Refund for removed cars', kind: 'refund', meta: { opKey: `vehicle-refund:${amount}:${Date.now()}` } });
        if (r.ok) { useVehicleStore.getState().clearRefund(); toast(`Some old cars were removed from the game. You got your money back.`, 'good'); }
      });
    }, 1500);
  },
}));
