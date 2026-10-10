import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';

export type TxKind = 'income' | 'purchase' | 'transfer' | 'reward' | 'salary' | 'bet' | 'invest' | 'food' | 'visit';
export interface Transaction { id: string; kind: TxKind; amount: number; label: string; at: number; counterparty?: string }

interface EconomyState {
  money: number;
  transactions: Transaction[];
  credit: (amount: number, label: string, kind?: TxKind, counterparty?: string) => void;
  /** Returns false (and charges nothing) if the player cannot afford it. */
  debit: (amount: number, label: string, kind?: TxKind, counterparty?: string) => boolean;
  reset: (money: number) => void;
}

const MAX = 60;
const log = (list: Transaction[], t: Omit<Transaction, 'id' | 'at'>) => [{ ...t, id: uid(), at: Date.now() }, ...list].slice(0, MAX);

export const useEconomyStore = create<EconomyState>()(persist((set, get) => ({
  money: 0, transactions: [],
  credit: (amount, label, kind = 'income', counterparty) => set((s) => ({ money: s.money + amount, transactions: log(s.transactions, { kind, amount, label, counterparty }) })),
  debit: (amount, label, kind = 'purchase', counterparty) => {
    if (get().money < amount) return false;
    set((s) => ({ money: s.money - amount, transactions: log(s.transactions, { kind, amount: -amount, label, counterparty }) }));
    return true;
  },
  reset: (money) => set({ money, transactions: [] }),
}), { name: 'nigerialife.economy', version: 1 }));
