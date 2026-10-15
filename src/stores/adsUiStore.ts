import { create } from 'zustand';
import type { AdKind } from '@/types/ads';

/** Map-screen UI state for advertising (not persisted): which category tab, which sheet is open, the placement picker, the wizard. */
export type MapCategory = 'ads' | 'government' | 'sea';
export type Sheet = { type: 'billboard'; slotId: string } | { type: 'sea'; submissionId: string } | null;
export interface Wizard { kind: AdKind; slotId: string | null }

interface AdsUiState {
  category: MapCategory;
  sheet: Sheet;
  wizard: Wizard | null;
  /** While picking a Sea Ads position: the slot chosen so far. The 3D scene draws green/red markers while this is set. */
  picker: { selected: string | null } | null;
  /** Map point the camera should look at (billboard / sea position), or null. */
  focus: [number, number] | null;
  setFocus: (p: [number, number] | null) => void;
  setCategory: (c: MapCategory) => void;
  openSheet: (s: Sheet) => void;
  startWizard: (w: Wizard) => void;
  closeWizard: () => void;
  startPicker: (selected?: string | null) => void;
  pick: (slotId: string | null) => void;
  endPicker: () => void;
  reset: () => void;
}
export const useAdsUiStore = create<AdsUiState>((set) => ({
  category: 'ads', sheet: null, wizard: null, picker: null, focus: null,
  setFocus: (focus) => set({ focus }),
  setCategory: (category) => set({ category, sheet: null }),
  openSheet: (sheet) => set({ sheet }),
  startWizard: (wizard) => set({ wizard, sheet: null }),
  closeWizard: () => set({ wizard: null, picker: null }),
  startPicker: (selected = null) => set({ picker: { selected } }),
  pick: (slotId) => set((s) => (s.picker ? { picker: { selected: slotId } } : s)),
  endPicker: () => set({ picker: null }),
  reset: () => set({ category: 'ads', sheet: null, wizard: null, picker: null, focus: null }),
}));
