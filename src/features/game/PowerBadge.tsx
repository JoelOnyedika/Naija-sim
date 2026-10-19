import { AnimatePresence, motion } from 'framer-motion';
import { usePower } from '@/game/powerHooks';
import { usePowerStore } from '@/stores/powerStore';

const LABEL: Record<string, { text: string; tone: string }> = {
  dark: { text: '🔦 NEPA out', tone: 'text-rose-200' },
  ibeta: { text: '⚡ Tap your Ibeta', tone: 'text-amber-200' },
  'ibeta-on': { text: '🔌 Ibeta on', tone: 'text-emerald-200' },
  generator: { text: '⚡ Generator on', tone: 'text-emerald-200' },
  solar: { text: '☀️ Solar on', tone: 'text-emerald-200' },
};

/** Small status chip while NEPA is out, so a blackout in daylight is still obvious. Hidden when the power is normal. */
export function PowerBadge() {
  const outage = usePowerStore((s) => s.outage);
  const { mode } = usePower();
  const l = LABEL[mode];
  return (
    <AnimatePresence>
      {outage && l && (
        <motion.div key="power" role="status" className={`panel pointer-events-none absolute left-[3.8rem] top-[calc(env(safe-area-inset-top,0px)+4.4rem)] z-20 rounded-full px-3 py-1.5 text-[12px] font-bold ${l.tone}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {l.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
