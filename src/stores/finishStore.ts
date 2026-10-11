import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinishKind } from '@/data/finishes';

/** What one home currently wears. Missing = the layout's own floors/walls. */
export interface AppliedFinishes { floor?: string; wall?: string }

interface FinishState {
  /** Finish ids the player has paid for (re-applying one in another home is free). */
  owned: string[];
  /** propertyId -> applied finishes. Each home remembers its own; one home never changes another. */
  byProperty: Record<string, AppliedFinishes>;
  /** Unconfirmed try-on for the active home. Never persisted, never charged. */
  preview: AppliedFinishes;
  setPreview: (kind: FinishKind, id: string | null) => void;
  clearPreview: () => void;
  commit: (propertyId: string, kind: FinishKind, id: string) => void;
  reset: () => void;
}

export const useFinishStore = create<FinishState>()(persist((set) => ({
  owned: [], byProperty: {}, preview: {},
  // One try-on at a time: choosing another replaces the previous one.
  setPreview: (kind, id) => set({ preview: id ? { [kind]: id } : {} }),
  clearPreview: () => set({ preview: {} }),
  commit: (propertyId, kind, id) => set((s) => ({
    owned: s.owned.includes(id) ? s.owned : [...s.owned, id],
    byProperty: { ...s.byProperty, [propertyId]: { ...s.byProperty[propertyId], [kind]: id } },
    preview: {},
  })),
  reset: () => set({ owned: [], byProperty: {}, preview: {} }),
}), { name: 'nigerialife.finishes', version: 1, partialize: (s) => ({ owned: s.owned, byProperty: s.byProperty }) }));

/** The finishes to draw for a home: the live preview wins over what is saved. */
export function effectiveFinishes(applied: AppliedFinishes | undefined, preview: AppliedFinishes): AppliedFinishes {
  return { floor: preview.floor ?? applied?.floor, wall: preview.wall ?? applied?.wall };
}
