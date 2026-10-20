import { create } from 'zustand';
import { CONFIG } from '@/data/config';

export type GameMode = 'home' | 'buy' | 'map';
export type ToastTone = 'info' | 'good' | 'bad';
export interface Toast { id: number; text: string; tone: ToastTone }

interface UiState {
  mode: GameMode;
  taskPanelOpen: boolean;
  statsExpanded: boolean;
  /** The character profile sheet (tap the portrait in the stats bar). */
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
  /** Shop item whose information panel is open (the eye button). Never purchases anything. */
  infoItemId: string | null;
  setInfoItem: (id: string | null) => void;
  /** Buy catalog sheet visible (slides down when hidden but Buy mode stays active). */
  catalogOpen: boolean;
  /** Selected catalogue tab (kept here so it survives the catalogue unmounting while an item is being placed). */
  catalogTab: string;
  /** True from the moment a home (or a new life) starts building until its first frames are on screen. */
  sceneLoading: boolean;
  /** Money spent since entering Buy mode. */
  buySpent: number;
  budgetStart: number;
  detailPropertyId: string | null;
  housesAreaFilter: string | null;
  foodPickerUid: string | null;
  /** Placed item whose action menu is open (items with several activities). */
  actionMenuUid: string | null;
  setActionMenu: (uid: string | null) => void;
  online: number;
  toasts: Toast[];
  banner: { id: number; title: string; body: string; icon: string } | null;
  setMode: (m: GameMode) => void;
  toggleTasks: () => void;
  toggleStats: () => void;
  setCatalogOpen: (v: boolean) => void;
  setCatalogTab: (t: string) => void;
  setSceneLoading: (v: boolean) => void;
  addSpent: (n: number) => void;
  startBuy: (money: number) => void;
  openProperty: (id: string | null) => void;
  setHousesArea: (id: string | null) => void;
  setFoodPicker: (uid: string | null) => void;
  tickOnline: () => void;
  toast: (text: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  showBanner: (b: { title: string; body: string; icon: string }) => void;
  hideBanner: () => void;
}

let nextId = 1;
export const useUiStore = create<UiState>((set, get) => ({
  mode: 'home', taskPanelOpen: true, statsExpanded: false, profileOpen: false, setProfileOpen: (profileOpen) => set({ profileOpen }), infoItemId: null, setInfoItem: (infoItemId) => set({ infoItemId }), catalogOpen: true, catalogTab: 'sleep', sceneLoading: false, buySpent: 0, budgetStart: 0,
  detailPropertyId: null, housesAreaFilter: null, foodPickerUid: null, actionMenuUid: null, setActionMenu: (actionMenuUid) => set({ actionMenuUid }),
  online: Math.round((CONFIG.online.min + CONFIG.online.max) / 2), toasts: [], banner: null,
  setMode: (mode) => set({ mode }),
  toggleTasks: () => set((s) => ({ taskPanelOpen: !s.taskPanelOpen })),
  toggleStats: () => set((s) => ({ statsExpanded: !s.statsExpanded })),
  setCatalogOpen: (catalogOpen) => set({ catalogOpen }),
  setCatalogTab: (catalogTab) => set({ catalogTab }),
  setSceneLoading: (sceneLoading) => set({ sceneLoading }),
  addSpent: (n) => set((s) => ({ buySpent: s.buySpent + n })),
  startBuy: (money) => set({ mode: 'buy', catalogOpen: true, buySpent: 0, budgetStart: money }),
  openProperty: (detailPropertyId) => set({ detailPropertyId }),
  setHousesArea: (housesAreaFilter) => set({ housesAreaFilter }),
  setFoodPicker: (foodPickerUid) => set({ foodPickerUid }),
  tickOnline: () => set((s) => {
    const drift = Math.round((Math.random() - 0.5) * 420);
    return { online: Math.min(CONFIG.online.max, Math.max(CONFIG.online.min, s.online + drift)) };
  }),
  toast: (text, tone = 'info') => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    setTimeout(() => get().dismissToast(id), 2800);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  showBanner: (b) => {
    const id = nextId++;
    set({ banner: { id, ...b } });
    setTimeout(() => { if (get().banner?.id === id) set({ banner: null }); }, 4200);
  },
  hideBanner: () => set({ banner: null }),
}));
export const toast = (text: string, tone: ToastTone = 'info') => useUiStore.getState().toast(text, tone);
