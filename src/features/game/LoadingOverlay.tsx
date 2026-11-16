import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { Logo } from '@/ui/Logo';

/** If a load somehow never reports back, the overlay still leaves: the player is never trapped behind it. */
const WATCHDOG_MS = 10_000;

/**
 * Shown while a home (or a brand-new life) is being built. The 3D scene reports when its first frames are up, so
 * the bar is indeterminate on purpose: there is no real percentage to show, and an invented one would be a lie.
 */
const TIPS = ['Danfo dey come, no rush.', 'Pay your bills before NEPA does it for you.', 'Haggle at Balogun. Never pay the first price.', 'Not every senior wants your good.', 'Keep your battery and your hustle alive.', 'Jollof tastes better with friends.'];
export function LoadingOverlay({ label = 'Setting up your home' }: { label?: string }) {
  const loading = useUiStore((s) => s.sceneLoading);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => { if (!loading) return; const t = window.setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2400); return () => window.clearInterval(t); }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => { console.warn('[loading] scene did not report ready in time; releasing the overlay'); useUiStore.getState().setSceneLoading(false); }, WATCHDOG_MS);
    return () => window.clearTimeout(t);
  }, [loading]);
  return (
    <AnimatePresence>
      {loading && (
        <motion.div key="load" role="status" aria-live="polite" className="absolute inset-0 z-[90] flex flex-col items-center justify-center gap-7 overflow-hidden bg-night px-8" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <div className="hero-orb left-[-4rem] top-[20%] h-64 w-64 bg-naija/40" /><div className="hero-orb bottom-[12%] right-[-3rem] h-56 w-56 bg-danfo/25" />
          <span className="animate-float text-6xl drop-shadow-lg">🚌</span>
          <Logo size="lg" center />
          <div className="w-60">
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10"><motion.i className="absolute inset-y-0 w-2/5 rounded-full" style={{ background: 'linear-gradient(90deg,#0B8F4D,#FFC21A)' }} animate={{ x: ['-100%', '260%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} /></div>
            <p className="mt-3 text-center text-[13px] font-semibold text-white/70">{label}…</p>
          </div>
          <AnimatePresence mode="wait"><motion.p key={tip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="max-w-xs text-center text-sm italic text-danfo-soft/90">“{TIPS[tip]}”</motion.p></AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
