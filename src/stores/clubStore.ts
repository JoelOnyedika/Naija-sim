import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CLUB } from '@/data/club';

/** A receipt exists ONLY for a purchase that was really charged: `txId` is the economy ledger entry that paid for it. */
export interface Receipt {
  id: string; txId: string; at: number; club: string; player: string;
  lines: { id: string; name: string; price: number; qty?: number }[]; total: number; status: 'paid';
}
/** One line of the live club feed. `mine` = the player did it; the others are simulated patrons (local simulation, not real players). */
export interface FeedItem { id: string; who: string; text: string; amount: number; at: number; mine: boolean; big: boolean }
export type Burst = { id: number; kind: 'rain' | 'confetti' };
export interface Announcement { id: string; name: string; amount: number; style: 'hype' | 'big' | 'mega'; at: number }
interface ClubState {
  receipts: Receipt[]; lastAnnounceAt: number; seq: number;
  /** The banner on screen right now (not saved). */
  announcement: Announcement | null;
  /** Live feed and effects (not saved). `since` = when this stay in the club began: the bill is everything paid after it. */
  feed: FeedItem[]; burst: Burst | null; since: number;
  pushFeed: (f: FeedItem) => void; setBurst: (kind: Burst['kind'] | null) => void; startStay: (at?: number) => void;
  addReceipt: (r: Receipt) => void;
  announce: (a: Announcement | null) => void;
  nextId: () => number;
  reset: () => void;
}
export const useClubStore = create<ClubState>()(persist((set, get) => ({
  receipts: [], lastAnnounceAt: 0, seq: 0, announcement: null, feed: [], burst: null, since: 0,
  pushFeed: (f) => set((s) => ({ feed: [f, ...s.feed].slice(0, CLUB.feedKeep) })),
  setBurst: (kind) => set((s) => ({ burst: kind ? { id: (s.burst?.id ?? 0) + 1, kind } : null })),
  startStay: (at = Date.now()) => set({ since: at }),
  addReceipt: (r) => set((s) => ({ receipts: [r, ...s.receipts].slice(0, CLUB.maxReceipts) })),
  announce: (a) => set((s) => ({ announcement: a, lastAnnounceAt: a ? a.at : s.lastAnnounceAt })),
  nextId: () => { const n = get().seq + 1; set({ seq: n }); return n; },
  reset: () => set({ receipts: [], lastAnnounceAt: 0, seq: 0, announcement: null, feed: [], burst: null, since: 0 }),
}), { name: 'nigerialife.club', version: 1, partialize: (s) => ({ receipts: s.receipts, lastAnnounceAt: s.lastAnnounceAt, seq: s.seq }) }));
