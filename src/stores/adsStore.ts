import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/core/format';
import { slotDurationMs, slotPrice, slotProblem } from '@/game/ads/slots';
import { validateDetails } from '@/game/ads/validate';
import type { AdKind, AdSubmission } from '@/types/ads';
import { getState } from '@/world/registry';

/**
 * Ad submissions for both products. Persisted in THIS BROWSER's localStorage under `nigerialife.ads`: refreshing the page
 * keeps every ad and its timestamps (so the 3-day clock is never reset), but nothing is shared between players or devices
 * and a technical user can edit it. That is a development stand-in; a real backend is needed for shared inventory,
 * payment verification and trustworthy moderation (docs/ADS_AND_MAP.md, "Production requirements").
 */
type Result = { ok: true; id: string } | { ok: false; error: string };
export interface DraftInput { stateId: string; kind: AdKind; slotId: string; advertiser: string; description: string; websiteUrl?: string; imageDataUrl: string; imageWidth: number; imageHeight: number }

interface AdsState {
  submissions: AdSubmission[];
  /** Bumped by the sweep so subscribers re-read expiry. */
  tick: number;
  /** Set if the browser refused to save (storage full / blocked), so the UI can say so instead of pretending. */
  storageError: string | null;
  saveDraft: (input: DraftInput, replaceId?: string) => Result;
  /** SIMULATED checkout. Moves a draft to pending and charges nothing. Re-checks the slot first. */
  submit: (id: string) => Result;
  /** Moderation (dev-only today; the future admin UI/back end calls these). */
  approve: (id: string, now?: number) => Result;
  reject: (id: string, reason: string, now?: number) => Result;
  discard: (id: string) => void;
  /** Mark ads past their expiresAt as expired. Returns how many changed. */
  sweep: (now?: number) => number;
  reset: () => void;
}

const failing = { current: null as string | null };
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); failing.current = null; } catch { failing.current = 'Your browser could not save this advertisement (storage is full or blocked).'; useAdsStore.setState({ storageError: failing.current }); } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const useAdsStore = create<AdsState>()(persist((set, get) => ({
  submissions: [], tick: 0, storageError: null,

  saveDraft: (i, replaceId) => {
    const state = getState(i.stateId);
    if (!state?.ads) return { ok: false, error: 'This city does not sell advertising yet.' };
    const problems = validateDetails(i);
    const first = Object.values(problems)[0];
    if (first) return { ok: false, error: first };
    if (!i.imageDataUrl) return { ok: false, error: 'Upload an advertisement image first.' };
    const price = slotPrice(state, i.kind, i.slotId);
    if (price === null) return { ok: false, error: 'Choose a placement first.' };
    const others = get().submissions.filter((s) => s.id !== replaceId);
    const problem = slotProblem(state, others, i.kind, i.slotId, Date.now());
    if (problem) return { ok: false, error: problem };
    const id = replaceId ?? uid();
    const draft: AdSubmission = {
      id, stateId: i.stateId, kind: i.kind, slotId: i.slotId, advertiser: i.advertiser.trim(), description: i.description.trim(), websiteUrl: i.websiteUrl?.trim() || undefined,
      imageDataUrl: i.imageDataUrl, imageWidth: i.imageWidth, imageHeight: i.imageHeight, price, status: 'draft', paymentStatus: 'none', createdAt: Date.now(), durationMs: slotDurationMs(state.ads, i.kind),
    };
    set({ submissions: [...others, draft] });
    return { ok: true, id };
  },

  submit: (id) => {
    const s = get().submissions.find((x) => x.id === id);
    if (!s || s.status !== 'draft') return { ok: false, error: 'That advertisement is not a draft any more.' };
    const state = getState(s.stateId);
    if (!state) return { ok: false, error: 'Unknown city.' };
    const now = Date.now();
    const problem = slotProblem(state, get().submissions.filter((x) => x.id !== id), s.kind, s.slotId, now);
    if (problem) return { ok: false, error: `${problem} Pick another position.` };
    set({ submissions: get().submissions.map((x) => (x.id === id ? { ...x, status: 'pending', paymentStatus: 'simulated', submittedAt: now } : x)) });
    return { ok: true, id };
  },

  approve: (id, now = Date.now()) => {
    const s = get().submissions.find((x) => x.id === id);
    if (!s || s.status !== 'pending') return { ok: false, error: 'Only pending advertisements can be approved.' };
    set({ submissions: get().submissions.map((x) => (x.id === id ? { ...x, status: 'active', reviewedAt: now, activatedAt: now, expiresAt: now + x.durationMs } : x)), tick: get().tick + 1 });
    return { ok: true, id };
  },
  reject: (id, reason, now = Date.now()) => {
    const s = get().submissions.find((x) => x.id === id);
    if (!s || s.status !== 'pending') return { ok: false, error: 'Only pending advertisements can be rejected.' };
    set({ submissions: get().submissions.map((x) => (x.id === id ? { ...x, status: 'rejected', reviewedAt: now, rejectReason: reason.trim() || 'Does not meet the advertising rules.' } : x)), tick: get().tick + 1 });
    return { ok: true, id };
  },
  discard: (id) => set({ submissions: get().submissions.filter((x) => !(x.id === id && x.status === 'draft')) }),

  sweep: (now = Date.now()) => {
    let n = 0;
    const submissions = get().submissions.map((x) => (x.status === 'active' && x.expiresAt !== undefined && now >= x.expiresAt ? (n++, { ...x, status: 'expired' as const }) : x));
    if (n) set({ submissions, tick: get().tick + 1 });
    return n;
  },
  reset: () => set({ submissions: [], tick: 0 }),
}), {
  name: 'nigerialife.ads', version: 1, storage: createJSONStorage(() => safeStorage),
  partialize: (s) => ({ submissions: s.submissions }),
  // expiry is timestamp-based, so a reload only has to sweep once to put the stored state right
  onRehydrateStorage: () => (state) => { state?.sweep(); },
}));

if (typeof window !== 'undefined') window.setInterval(() => useAdsStore.getState().sweep(), 30_000);
