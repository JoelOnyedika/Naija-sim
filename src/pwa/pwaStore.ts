import { create } from 'zustand';

/**
 * Install and update state for the PWA (registered in pwa/register.ts). Not saved: the browser owns it.
 *  - `canInstall`: the browser offered an install prompt (Chrome and Edge on Android and desktop). iOS has no prompt: use Share > Add to Home Screen.
 *  - `updateReady`: a newer version has been downloaded and is waiting; `applyUpdate` swaps it in and reloads.
 */
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
interface PwaState {
  canInstall: boolean; installed: boolean; updateReady: boolean; offlineReady: boolean; ios: boolean;
  prompt: BeforeInstallPromptEvent | null; waiting: ServiceWorker | null;
  set: (p: Partial<PwaState>) => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  applyUpdate: () => void;
}
export const usePwaStore = create<PwaState>((set, get) => ({
  canInstall: false, installed: false, updateReady: false, offlineReady: false, ios: false, prompt: null, waiting: null,
  set: (p) => set(p),
  promptInstall: async () => {
    const e = get().prompt; if (!e) return 'unavailable';
    await e.prompt(); const r = await e.userChoice; set({ prompt: null, canInstall: false, installed: r.outcome === 'accepted' }); return r.outcome;
  },
  applyUpdate: () => { const w = get().waiting; if (w) w.postMessage('SKIP_WAITING'); else window.location.reload(); },
}));
export type { BeforeInstallPromptEvent };
