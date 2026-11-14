import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJsonStorage } from '@/core/safeStorage';

/**
 * The player's chosen camera: Normal View (the existing top-down orbit around the venue) or Close View (a closer, elevated
 * camera that follows the player). Saved, so it is remembered between venues and between sessions. The temporary cinematic camera
 * lives in cameraStore and always returns to this choice.
 */
export type ViewMode = 'normal' | 'close';
interface ViewState { view: ViewMode; setView: (v: ViewMode) => void; toggle: () => void }
export const useViewStore = create<ViewState>()(persist((set, get) => ({
  view: 'normal',
  setView: (view) => set({ view }),
  toggle: () => set({ view: get().view === 'normal' ? 'close' : 'normal' }),
}), { name: 'nigerialife.view', version: 1, storage: safeJsonStorage }));
