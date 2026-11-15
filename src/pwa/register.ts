import { toast } from '@/stores/uiStore';
import { usePwaStore, type BeforeInstallPromptEvent } from './pwaStore';

/**
 * Registers the service worker (public/sw.js) in production builds only, so development is never served from a cache.
 * Also tracks the install prompt and whether the app already runs as an installed app, and tells the player when a new version is ready.
 */
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function registerPwa() {
  if (typeof window === 'undefined') return;
  const st = usePwaStore.getState();
  st.set({ installed: isStandalone(), ios: /iphone|ipad|ipod/i.test(navigator.userAgent) });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); usePwaStore.getState().set({ prompt: e as BeforeInstallPromptEvent, canInstall: true }); });
  window.addEventListener('appinstalled', () => { usePwaStore.getState().set({ installed: true, canInstall: false, prompt: null }); toast('Nigeria Life is installed', 'good'); });
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const watch = (w: ServiceWorker | null) => w?.addEventListener('statechange', () => {
        if (w.state === 'installed') {
          if (navigator.serviceWorker.controller) { usePwaStore.getState().set({ updateReady: true, waiting: reg.waiting ?? w }); toast('A new version is ready. Open Settings to refresh.', 'info'); }
          else usePwaStore.getState().set({ offlineReady: true });
        }
      });
      if (reg.waiting && navigator.serviceWorker.controller) usePwaStore.getState().set({ updateReady: true, waiting: reg.waiting });
      watch(reg.installing); reg.addEventListener('updatefound', () => watch(reg.installing));
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000); // look for a new version every half hour while the game is open
    }).catch(() => { /* no service worker: the game still works online */ });
    let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; if (usePwaStore.getState().updateReady) window.location.reload(); });
  });
}
