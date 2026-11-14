import { createJSONStorage } from 'zustand/middleware';

/** localStorage that never throws (private mode, full disk, blocked storage): a failed save or load just means "nothing saved". Used by the camera, story, objective and weapon stores. */
const raw = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export const safeJsonStorage = createJSONStorage(() => raw);
