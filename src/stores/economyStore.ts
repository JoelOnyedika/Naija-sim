import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';

export type TxKind = 'income' | 'purchase' | 'transfer' | 'reward' | 'salary' | 'bet' | 'invest' | 'food' | 'visit';
/**
 * Amounts are whole naira stored as plain numbers. The largest value the game allows (a ₦50B transfer) is far below
 * Number.MAX_SAFE_INTEGER (~9e15), so integer arithmetic here is exact. Formatting (₦1.2M) is display-only.
 */
export interface Transaction {
  id: string; kind: TxKind; amount: number; label: string; at: number; counterparty?: string;
  /** Present on transfers so the history and chat cards can show who, what and how it ended. */
  status?: 'completed'; description?: string; sender?: string; recipient?: string;
}
export type TxMeta = Partial<Pick<Transaction, 'description' | 'sender' | 'recipient' | 'status'>>;

interface EconomyState {
  money: number;
  transactions: Transaction[];
  credit: (amount: number, label: string, kind?: TxKind, counterparty?: string, meta?: TxMeta) => void;
  /** Returns false (and charges nothing) if the player cannot afford it. */
  debit: (amount: number, label: string, kind?: TxKind, counterparty?: string, meta?: TxMeta) => boolean;
  reset: (money: number) => void;
}

const MAX = 300;
const log = (list: Transaction[], t: Omit<Transaction, 'id' | 'at'>) => [{ ...t, id: uid(), at: Date.now() }, ...list].slice(0, MAX);

export const useEconomyStore = create<EconomyState>()(persist((set, get) => ({
  money: 0, transactions: [],
  credit: (amount, label, kind = 'income', counterparty, meta) => set((s) => ({ money: s.money + amount, transactions: log(s.transactions, { kind, amount, label, counterparty, ...meta }) })),
  debit: (amount, label, kind = 'purchase', counterparty, meta) => {
    if (get().money < amount) return false;
    set((s) => ({ money: s.money - amount, transactions: log(s.transactions, { kind, amount: -amount, label, counterparty, ...meta }) }));
    return true;
  },
  reset: (money) => set({ money, transactions: [] }),
}), { name: 'nigerialife.economy', version: 1 }));
