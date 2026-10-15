import { motion } from 'framer-motion';
import { HudPill } from '@/ui/HudPill';

/** Top bar on the home screen: the shared HUD capsules (time, people, sound, cash). */
export function Hud() {
  return (
    <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2.5 pt-safe" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      <HudPill />
    </motion.div>
  );
}
