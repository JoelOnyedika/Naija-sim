import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJsonStorage } from '@/core/safeStorage';

/**
 * The player's chosen camera: Normal View (the existing top-down orbit around the venue) or Close View (a closer, elevated
 * camera that follows the player). Saved, so it is remembered between venues and between sessions. The temporary cinematic camera
 * lives in cameraStore and always returns to this choice.
 */
export type ViewMode = 'normal' | 'close';
/**
 * Players cannot switch the camera yet: there is no character controller, so Close View makes no sense while you tap to walk. The
 * system stays built (button, key, saving) behind this switch for when the controller and the storyline missions arrive; the cinematic
 * camera used by scenes is not affected. Set to true to bring the toggle back.
 */
export const VIEW_TOGGLE_ENABLED = false;
/** The view the camera actually uses (always Normal while the toggle is off, even if an old save says close). */
export const effectiveView = (v: ViewMode): ViewMode => (VIEW_TOGGLE_ENABLED ? v : 'normal');
interface ViewState { view: ViewMode; setView: (v: ViewMode) => void; toggle: () => void }
export const useViewStore = create<ViewState>()(persist((set, get) => ({
  view: 'normal',
  setView: (view) => set({ view }),
  toggle: () => set({ view: get().view === 'normal' ? 'close' : 'normal' }),
}), { name: 'nigerialife.view', version: 1, storage: safeJsonStorage }));
