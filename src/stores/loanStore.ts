import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LenderId } from '@/data/loans';

export interface Loan {
  id: string; lender: LenderId; principal: number; interest: number; total: number; takenAt: number; dueAt: number;
  /** Paid so far (naira). */
  paid: number; status: 'active' | 'repaid'; repaidAt?: number; onTime?: boolean;
}
export interface LenderRecord { onTime: number; late: number }
export type Where = 'home' | 'venue' | 'street';
export interface Visit {
  lender: LenderId; where: Where; police: boolean; men: number; owed: number;
  /** Set once the player has chosen. */
  result: { text: string; tone: 'good' | 'bad'; choice: string } | null;
}
interface LoanState {
  loans: Loan[];
  record: Record<LenderId, LenderRecord>;
  /** Real timestamps of the last visit and the last roll. */
  lastVisitAt: number; lastRollAt: number; visits: number;
  /** Transient: the visit on screen. */
  visit: Visit | null;
  set: (p: Partial<LoanState>) => void;
  reset: () => void;
}
const blank = () => ({ loans: [] as Loan[], record: { ofay: { onTime: 0, late: 0 }, falmfay: { onTime: 0, late: 0 }, kwikkash: { onTime: 0, late: 0 } } as Record<LenderId, LenderRecord>, lastVisitAt: 0, lastRollAt: 0, visits: 0, visit: null as Visit | null });
export const useLoanStore = create<LoanState>()(persist((set) => ({ ...blank(), set: (p) => set(p), reset: () => set(blank()) }), { name: 'nigerialife.loans', version: 1, partialize: ({ visit: _v, set: _s, reset: _r, ...rest }) => rest }));
