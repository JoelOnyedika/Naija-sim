import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CLUB } from '@/data/club';

/** A receipt exists ONLY for a purchase that was really charged: `txId` is the economy ledger entry that paid for it. */
export interface Receipt {
  id: string; txId: string; at: number; club: string; player: string;
  lines: { id: string; name: string; price: number }[]; total: number; status: 'paid';
}
export interface Announcement { id: string; name: string; amount: number; style: 'hype' | 'big' | 'mega'; at: number }
interface ClubState {
  receipts: Receipt[]; lastAnnounceAt: number; seq: number;
  /** The banner on screen right now (not saved). */
  announcement: Announcement | null;
  addReceipt: (r: Receipt) => void;
  announce: (a: Announcement | null) => void;
  nextId: () => number;
  reset: () => void;
}
export const useClubStore = create<ClubState>()(persist((set, get) => ({
  receipts: [], lastAnnounceAt: 0, seq: 0, announcement: null,
  addReceipt: (r) => set((s) => ({ receipts: [r, ...s.receipts].slice(0, CLUB.maxReceipts) })),
  announce: (a) => set((s) => ({ announcement: a, lastAnnounceAt: a ? a.at : s.lastAnnounceAt })),
  nextId: () => { const n = get().seq + 1; set({ seq: n }); return n; },
  reset: () => set({ receipts: [], lastAnnounceAt: 0, seq: 0, announcement: null }),
}), { name: 'nigerialife.club', version: 1, partialize: (s) => ({ receipts: s.receipts, lastAnnounceAt: s.lastAnnounceAt, seq: s.seq }) }));
