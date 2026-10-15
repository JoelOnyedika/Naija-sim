import { create } from 'zustand';
import type { AdKind } from '@/types/ads';

/** Map-screen UI state for advertising (not persisted): which category tab, which sheet is open, the placement picker, the wizard. */
export type MapCategory = 'ads' | 'neighbours' | 'sea' | 'government';
export type Sheet = { type: 'billboard'; slotId: string } | { type: 'sea'; submissionId: string } | null;
export interface Wizard { kind: AdKind; slotId: string | null }

interface AdsUiState {
  /** The open More-menu panel, or null for the clean map. */
  category: MapCategory | null;
  /** Names toggle: show neighbourhood and district labels and every landmark name. */
  names: boolean;
  toggleNames: () => void;
  sheet: Sheet;
  wizard: Wizard | null;
  /** While picking a Sea Ads position: the slot chosen so far. The 3D scene draws green/red markers while this is set. */
  picker: { selected: string | null } | null;
  /** Map point the camera should look at (billboard / sea position), or null. */
  focus: [number, number] | null;
  setFocus: (p: [number, number] | null) => void;
  setCategory: (c: MapCategory | null) => void;
  openSheet: (s: Sheet) => void;
  startWizard: (w: Wizard) => void;
  closeWizard: () => void;
  startPicker: (selected?: string | null) => void;
  pick: (slotId: string | null) => void;
  endPicker: () => void;
  reset: () => void;
}
export const useAdsUiStore = create<AdsUiState>((set) => ({
  category: null, names: false, toggleNames: () => set((s) => ({ names: !s.names })), sheet: null, wizard: null, picker: null, focus: null,
  setFocus: (focus) => set({ focus }),
  setCategory: (category) => set({ category, sheet: null }),
  openSheet: (sheet) => set({ sheet }),
  startWizard: (wizard) => set({ wizard, sheet: null }),
  closeWizard: () => set({ wizard: null, picker: null }),
  startPicker: (selected = null) => set({ picker: { selected } }),
  pick: (slotId) => set((s) => (s.picker ? { picker: { selected: slotId } } : s)),
  endPicker: () => set({ picker: null }),
  reset: () => set({ category: null, sheet: null, wizard: null, picker: null, focus: null }),
}));
