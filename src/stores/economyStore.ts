import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';
import { useClockStore } from './clockStore';

export type TxKind =
  | 'income' | 'purchase' | 'transfer' | 'reward' | 'salary' | 'bet' | 'invest' | 'food' | 'visit'
  | 'savings' | 'bond' | 'interest' | 'bill' | 'tax' | 'refund' | 'business';
export type TxStatus = 'completed' | 'pending' | 'failed' | 'reversed';
export interface TxRef { type: string; id: string }

/**
 * Money is whole naira stored as plain numbers. The largest value the game allows (a ₦50B transfer) is far below
 * Number.MAX_SAFE_INTEGER (~9e15), so integer arithmetic is exact. Rates are applied in basis points with Math.floor
 * (see data/economy.ts). Formatting (₦1.2M) is display-only.
 *
 * `amount` is signed (negative = money left the wallet) and is what older code and saves rely on. The newer fields are
 * optional so legacy records stay valid.
 */
export interface Transaction {
  id: string; kind: TxKind; amount: number; label: string; at: number; counterparty?: string;
  /** Present on transfers so the history and chat cards can show who, what and how it ended. */
  status?: TxStatus; description?: string; sender?: string; recipient?: string;
  direction?: 'income' | 'expense';
  /** Movement between the player's own accounts (savings, bonds). It is not income or expense. */
  internal?: boolean;
  /** In-game clock minutes when it happened (the game's time system). */
  gameMinutes?: number;
  balanceBefore?: number; balanceAfter?: number;
  reference?: string;
  /** The entity this relates to (a bond, a bill, an order...). */
  ref?: TxRef;
  currency?: 'NGN';
}
export type TxMeta = Partial<Pick<Transaction, 'description' | 'sender' | 'recipient' | 'status' | 'internal' | 'ref'>> & {
  /** Idempotency key. A second post with the same key changes nothing. Scheduled events and one-off operations use it. */
  opKey?: string;
};

export type PostResult = { ok: true; tx: Transaction } | { ok: false; reason: 'invalid' | 'insufficient' | 'duplicate' };
export interface PostInput { direction: 'income' | 'expense'; amount: number; label: string; kind: TxKind; counterparty?: string; meta?: TxMeta }

interface EconomyState {
  money: number;
  transactions: Transaction[];
  /** Lifetime totals. Kept as counters so they stay right after old history is trimmed. Internal movements are excluded. */
  lifetimeIncome: number;
  lifetimeExpense: number;
  /** Sequence for reference numbers. */
  seq: number;
  /** Recent idempotency keys (bounded). */
  applied: string[];
  /** The one place money moves. Validates, applies once, records. */
  post: (input: PostInput) => PostResult;
  credit: (amount: number, label: string, kind?: TxKind, counterparty?: string, meta?: TxMeta) => void;
  /** Returns false (and charges nothing) if the player cannot afford it. */
  debit: (amount: number, label: string, kind?: TxKind, counterparty?: string, meta?: TxMeta) => boolean;
  reset: (money: number) => void;
}

const MAX_TX = 1000, MAX_KEYS = 2000;
export const refOf = (t: Transaction) => t.reference ?? `NL-${t.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** Pure: the persisted-state migration, exported so it can be tested. */
export function migrateEconomy(persisted: unknown, version: number): Partial<EconomyState> {
  const s = (persisted ?? {}) as Partial<EconomyState>;
  if (version >= 2) return s;
  const txs = (s.transactions ?? []).map((t) => ({ ...t, direction: t.direction ?? (t.amount < 0 ? 'expense' : 'income') } as Transaction));
  const totals = txs.reduce((a, t) => (t.internal ? a : t.amount < 0 ? { ...a, e: a.e - t.amount } : { ...a, i: a.i + t.amount }), { i: 0, e: 0 });
  return { ...s, transactions: txs, lifetimeIncome: totals.i, lifetimeExpense: totals.e, seq: txs.length, applied: [] };
}

export const useEconomyStore = create<EconomyState>()(persist((set, get) => ({
  money: 0, transactions: [], lifetimeIncome: 0, lifetimeExpense: 0, seq: 0, applied: [],
  post: ({ direction, amount, label, kind, counterparty, meta }) => {
    const amt = Math.round(amount);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amt) || amt <= 0) return { ok: false, reason: 'invalid' };
    const s = get();
    const { opKey, ...rest } = meta ?? {};
    if (opKey && s.applied.includes(opKey)) return { ok: false, reason: 'duplicate' };
    if (direction === 'expense' && s.money < amt) return { ok: false, reason: 'insufficient' };
    const after = direction === 'expense' ? s.money - amt : s.money + amt;
    const seq = s.seq + 1;
    const tx: Transaction = {
      id: uid(), kind, amount: direction === 'expense' ? -amt : amt, label, at: Date.now(), counterparty, direction,
      gameMinutes: useClockStore.getState().minutes, balanceBefore: s.money, balanceAfter: after,
      reference: `NL-${String(seq).padStart(6, '0')}`, currency: 'NGN', status: 'completed', ...rest,
    };
    set({
      money: after, seq,
      transactions: [tx, ...s.transactions].slice(0, MAX_TX),
      lifetimeIncome: s.lifetimeIncome + (direction === 'income' && !tx.internal ? amt : 0),
      lifetimeExpense: s.lifetimeExpense + (direction === 'expense' && !tx.internal ? amt : 0),
      applied: opKey ? [...s.applied, opKey].slice(-MAX_KEYS) : s.applied,
    });
    return { ok: true, tx };
  },
  credit: (amount, label, kind = 'income', counterparty, meta) => { get().post({ direction: 'income', amount, label, kind, counterparty, meta }); },
  debit: (amount, label, kind = 'purchase', counterparty, meta) => {
    if (amount === 0) return true; // free items need no ledger entry
    return get().post({ direction: 'expense', amount, label, kind, counterparty, meta }).ok;
  },
  reset: (money) => set({ money, transactions: [], lifetimeIncome: 0, lifetimeExpense: 0, seq: 0, applied: [] }),
}), { name: 'nigerialife.economy', version: 2, migrate: (p, v) => migrateEconomy(p, v) as EconomyState }));
