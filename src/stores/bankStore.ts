import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Everything banking owns that is not the wallet itself: savings, bonds, bills, tax records, credibility signals. */
export interface SavingsEntry { id: string; kind: 'deposit' | 'withdraw' | 'interest'; amount: number; balanceAfter: number; at: number; txId?: string }
export interface BondHolding { id: string; defId: string; name: string; principal: number; expectedReturn: number; boughtAt: number; maturesAt: number; status: 'active' | 'matured'; paidAt?: number }
export interface BillRecord {
  id: string; defId: string; label: string; glyph: string; assetId: string; assetLabel: string; amount: number;
  period: number; dueAt: number; status: 'paid' | 'overdue'; paidAt?: number; txId?: string; onTime: boolean;
}
export interface TaxRecord { id: string; period: number; taxable: number; tax: number; status: 'paid' | 'unpaid'; paidAt?: number; txId?: string }
export interface TransferSignal { count: number; lastDay: number }

interface BankState {
  savings: { balance: number; entries: SavingsEntry[] };
  bonds: BondHolding[];
  bills: BillRecord[];
  taxes: TaxRecord[];
  /** Weekly runs at which the savings balance met the consistency minimum. */
  savingsWeeks: number;
  /** Last game week the savings run executed for (so a week is never counted twice). */
  lastSavingsPeriod: number;
  /** Verified transfers per contact, for Credibility (with farming limits applied when recorded). */
  transferSignals: Record<string, TransferSignal>;
  reset: () => void;
}
const fresh = () => ({ savings: { balance: 0, entries: [] }, bonds: [], bills: [], taxes: [], savingsWeeks: 0, lastSavingsPeriod: -1, transferSignals: {} });
export const useBankStore = create<BankState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.bank', version: 1 }));
