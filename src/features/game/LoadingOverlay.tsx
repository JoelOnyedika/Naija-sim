import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { Logo } from '@/ui/Logo';

/** If a load somehow never reports back, the overlay still leaves: the player is never trapped behind it. */
const WATCHDOG_MS = 10_000;

/**
 * Shown while a home (or a brand-new life) is being built. The 3D scene reports when its first frames are up, so
 * the bar is indeterminate on purpose: there is no real percentage to show, and an invented one would be a lie.
 */
export function LoadingOverlay({ label = 'Setting up your home' }: { label?: string }) {
  const loading = useUiStore((s) => s.sceneLoading);
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => { console.warn('[loading] scene did not report ready in time; releasing the overlay'); useUiStore.getState().setSceneLoading(false); }, WATCHDOG_MS);
    return () => window.clearTimeout(t);
  }, [loading]);
  return (
    <AnimatePresence>
      {loading && (
        <motion.div key="load" role="status" aria-live="polite" className="absolute inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-ink" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <Logo />
          <div className="w-44">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/10"><motion.i className="absolute inset-y-0 w-1/3 rounded-full bg-accent" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} /></div>
            <p className="mt-3 text-center text-[13px] font-medium text-white/60">{label}…</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
