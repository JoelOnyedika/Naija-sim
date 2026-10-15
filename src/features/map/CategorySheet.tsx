import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useAdsUiStore } from '@/stores/adsUiStore';
import type { StateDefinition } from '@/types/world';
import { BillboardPanel, GovernmentPanel, SeaPanel } from './ads/Panels';

/** Bottom-up panel for the selected map category. Collapsible so it never permanently covers the 3D map. */
export function CategorySheet({ state }: { state: StateDefinition }) {
  const category = useAdsUiStore((s) => s.category);
  const [open, setOpen] = useState(true);
  const title = category === 'ads' ? 'Billboards' : category === 'sea' ? 'Sea Ads' : 'Government';
  return (
    <motion.div className="absolute inset-x-0 bottom-0 z-[58] flex justify-center px-2 pb-[5.8rem]" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="glass-dark w-full max-w-md rounded-[1.75rem]">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 font-display text-lg font-bold">{title}{open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="max-h-[calc(100dvh-21rem)] overflow-y-auto px-4 pb-4">
                {!state.ads && category !== 'government' ? <p className="rounded-2xl bg-white/[0.06] p-3 text-sm text-white/65">This city does not sell advertising yet.</p>
                  : category === 'ads' ? <BillboardPanel state={state} /> : category === 'sea' ? <SeaPanel state={state} /> : <GovernmentPanel state={state} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
