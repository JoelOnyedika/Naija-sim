import { AnimatePresence, motion } from 'framer-motion';
import { Bath, Beef, ChevronUp, Droplet, HeartPulse, Smile, Sparkles, Toilet, Users, Zap, type LucideIcon } from 'lucide-react';
import { useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import type { StatKey } from '@/types/game';
import { STAT_KEYS } from '@/types/game';

const META: Record<StatKey, { label: string; Icon: LucideIcon; color: string }> = {
  hunger: { label: 'Hunger', Icon: Beef, color: '#FF8A3D' }, thirst: { label: 'Thirst', Icon: Droplet, color: '#38BDF8' },
  bladder: { label: 'Toilet', Icon: Toilet, color: '#A3E635' }, happiness: { label: 'Happiness', Icon: Smile, color: '#F472B6' },
  energy: { label: 'Energy', Icon: Zap, color: '#FFC21A' }, hygiene: { label: 'Hygiene', Icon: Bath, color: '#2DD4BF' },
  health: { label: 'Health', Icon: HeartPulse, color: '#F87171' }, social: { label: 'Social', Icon: Users, color: '#A78BFA' },
  charisma: { label: 'Charisma', Icon: Sparkles, color: '#34D399' },
};
const COMPACT: StatKey[] = ['hunger', 'thirst', 'bladder', 'energy', 'happiness'];

function Bar({ k, v, tall }: { k: StatKey; v: number; tall?: boolean }) {
  const { Icon, color, label } = META[k];
  const low = v < 25 && k !== 'charisma';
  return (
    <div className="min-w-0 flex-1" aria-label={`${label} ${Math.round(v)}`}>
      <div className="mb-1 flex items-center gap-1">
        <Icon size={tall ? 15 : 13} color={low ? '#FF4D6D' : color} className={low ? 'animate-pulse' : ''} strokeWidth={2.5} />
        {tall && <span className="text-[11px] font-semibold text-white/80">{label}</span>}
        {tall && <span className="ml-auto text-[11px] tabular-nums text-white/60">{Math.round(v)}</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full" animate={{ width: `${v}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ background: low ? '#FF4D6D' : color }} /></div>
    </div>
  );
}

/** Compact needs strip above the dock; tap to expand to all nine. */
export function StatsWidget() {
  const stats = useStatsStore((s) => s.stats);
  const expanded = useUiStore((s) => s.statsExpanded);
  const toggle = useUiStore((s) => s.toggleStats);
  return (
    <motion.div className="pointer-events-none absolute inset-x-0 bottom-[5.6rem] z-30 flex justify-center px-4" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <motion.button layout onClick={toggle} className="panel pointer-events-auto w-full max-w-sm rounded-lg px-3 py-2 text-left" aria-expanded={expanded}>
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-x-3 gap-y-2.5 pb-1 pt-1">
              {STAT_KEYS.map((k) => <Bar key={k} k={k} v={stats[k]} tall />)}
            </motion.div>
          ) : (
            <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
              {COMPACT.map((k) => <Bar key={k} k={k} v={stats[k]} />)}
              <ChevronUp size={16} className="shrink-0 text-white/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
