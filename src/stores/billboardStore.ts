import { create } from 'zustand';
import type { BillboardContent } from '@/types/world';

/**
 * Runtime replacement of billboard content (not persisted). Today this is only a seam: a future ad system would call
 * `setBillboardContent(id, {...})`. Nothing here fetches, sells or serves ads.
 */
interface BillboardState { overrides: Record<string, Partial<BillboardContent>>; set: (id: string, c: Partial<BillboardContent> | null) => void }
export const useBillboardStore = create<BillboardState>((set) => ({
  overrides: {},
  set: (id, c) => set((s) => {
    const next = { ...s.overrides };
    if (c) next[id] = c; else delete next[id];
    return { overrides: next };
  }),
}));
export const setBillboardContent = (id: string, content: Partial<BillboardContent> | null) => useBillboardStore.getState().set(id, content);
