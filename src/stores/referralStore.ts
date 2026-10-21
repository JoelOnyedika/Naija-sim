import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { REFERRAL } from '@/data/balance';
import { checkRedeem, checkServerReward, parseCode, spendDelta, type ServerReward } from '@/game/referrals';
import { useEconomyStore, type Transaction } from './economyStore';

/** A friend qualified: this is what a real backend receives. Nothing pays out locally for it. */
export interface QualifiedClaim { claimId: string; referrerCode: string; referredCode: string; spend: number; at: number }

/**
 * What this device knows about invitations.
 *  referred side (works offline): the code you used, your net spending since, and the claim queued for the server once you qualify.
 *  inviter side (needs the server): invitation counts and confirmed rewards arrive only through applyServerSummary / applyServerReward.
 * Persisted across new lives on purpose: you can only ever use one code, and starting a new life must not let you use another.
 */
interface ReferralState {
  referredBy: string | null; redeemedAt: number | null;
  spent: number; lastSeq: number; qualifiedAt: number | null;
  outbox: QualifiedClaim[];
  /** Link code found in the page address, waiting for the player to confirm. */
  pendingRef: string | null;
  invitations: number; pendingRewards: number;
  paid: string[]; confirmed: { claimId: string; amount: number; at: number }[];
  redeem: (raw: string, myCode: string) => { ok: boolean; message: string };
  capture: (raw: string | null | undefined) => void;
  clearPending: () => void;
  absorb: (txs: Transaction[], seq: number, myCode: string) => void;
  applyServerSummary: (s: { invitations: number; pendingRewards: number }) => void;
  applyServerReward: (r: ServerReward, myCode: string) => { ok: boolean; reason?: string };
  reset: () => void;
}
const blank = () => ({ referredBy: null, redeemedAt: null, spent: 0, lastSeq: 0, qualifiedAt: null, outbox: [] as QualifiedClaim[], pendingRef: null, invitations: 0, pendingRewards: 0, paid: [] as string[], confirmed: [] as { claimId: string; amount: number; at: number }[] });

export const useReferralStore = create<ReferralState>()(persist((set, get) => ({
  ...blank(),
  redeem: (raw, myCode) => {
    const s = get(), c = checkRedeem(raw, myCode, !!s.referredBy);
    if (!c.ok) return { ok: false, message: c.message };
    set({ referredBy: c.code, redeemedAt: Date.now(), spent: 0, lastSeq: useEconomyStore.getState().seq, qualifiedAt: null, pendingRef: null });
    return { ok: true, message: `Code ${c.code} applied. Spend ₦${REFERRAL.minSpend.toLocaleString('en-NG')} in the game to qualify your friend.` };
  },
  capture: (raw) => { const c = raw ? parseCode(raw) : null; if (c && !get().referredBy) set({ pendingRef: c }); },
  clearPending: () => set({ pendingRef: null }),
  absorb: (txs, seq, myCode) => {
    const s = get(); if (!s.referredBy) return;
    let last = s.lastSeq;
    if (seq < last) last = 0; // a new life restarted the ledger: count its spending too
    const n = Math.max(0, Math.min(seq - last, txs.length));
    if (n === 0 && last === s.lastSeq) return;
    let spent = s.spent;
    for (const tx of txs.slice(0, n)) spent += spendDelta(tx);
    spent = Math.max(0, spent);
    const patch: Partial<ReferralState> = { spent, lastSeq: seq };
    if (!s.qualifiedAt && spent >= REFERRAL.minSpend && s.referredBy !== myCode) {
      // one claim per referred account, with a stable id so a server can ignore repeats
      const claim: QualifiedClaim = { claimId: `${myCode}>${s.referredBy}`, referrerCode: s.referredBy, referredCode: myCode, spend: spent, at: Date.now() };
      patch.qualifiedAt = claim.at; patch.outbox = s.outbox.some((c) => c.claimId === claim.claimId) ? s.outbox : [...s.outbox, claim];
    }
    set(patch);
  },
  applyServerSummary: (x) => set({ invitations: Math.max(0, Math.floor(Number(x.invitations) || 0)), pendingRewards: Math.max(0, Math.floor(Number(x.pendingRewards) || 0)) }),
  applyServerReward: (r, myCode) => {
    const problem = checkServerReward(r, myCode, get().paid);
    if (problem) return { ok: false, reason: problem };
    const res = useEconomyStore.getState().post({ direction: 'income', amount: r.amount, label: `Invite reward: ${r.referredCode}`, kind: 'reward', meta: { opKey: `referral:${r.claimId}` } });
    if (!res.ok) return { ok: false, reason: res.reason };
    set((s) => ({ paid: [...s.paid, r.claimId], confirmed: [...s.confirmed, { claimId: r.claimId, amount: r.amount, at: Date.now() }] }));
    return { ok: true };
  },
  reset: () => set(blank()),
}), { name: 'nigerialife.referrals', version: 1 }));
