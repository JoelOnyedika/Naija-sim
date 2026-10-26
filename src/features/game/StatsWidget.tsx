import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '@/audio/sfx';
import { ChevronUp } from 'lucide-react';
import { useCharacterStore } from '@/stores/characterStore';
import { useStatsStore } from '@/stores/statsStore';
import { Portrait } from '@/ui/Portrait';
import { STAT_META } from './statMeta';
import { SKILLS, levelOf, useSkillStore, xpForLevel } from '@/stores/skillStore';
import { useUiStore } from '@/stores/uiStore';
import type { StatKey } from '@/types/game';
import { STAT_KEYS } from '@/types/game';

const COMPACT: StatKey[] = ['hunger', 'thirst', 'bladder', 'energy', 'happiness'];

function Bar({ k, v, tall }: { k: StatKey; v: number; tall?: boolean }) {
  const { Icon, color, label } = STAT_META[k];
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
  const skillXp = useSkillStore((s) => s.xp);
  const appearance = useCharacterStore((s) => s.appearance);
  const hasLow = COMPACT.some((k) => stats[k] < 25);
  return (
    <motion.div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--dock-gap,4.9rem)+0.7rem+var(--panel-h,0px))] z-30 flex justify-center px-4" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <div className="pointer-events-auto flex w-full max-w-sm items-stretch gap-2">
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => { sfx.pop(); useUiStore.getState().setProfileOpen(true); }} aria-label="Open your profile" className="relative shrink-0 self-end rounded-full p-0.5" style={{ background: hasLow ? 'linear-gradient(160deg,#FF4D6D,#FF8A3D)' : 'linear-gradient(160deg,#5B93FF,#2DD4BF)' }}>
        <Portrait a={appearance} size={58} className="rounded-full bg-night" />
      </motion.button>
      <motion.button layout onClick={toggle} className="panel min-w-0 flex-1 rounded-2xl px-3 py-2 text-left" aria-expanded={expanded}>
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-x-3 gap-y-2.5 pb-1 pt-1">
              {STAT_KEYS.map((k) => <Bar key={k} k={k} v={stats[k]} tall />)}
              {SKILLS.filter((sk) => sk.id === 'coding' || (skillXp[sk.id] ?? 0) > 0).map((sk) => {
                const xp = skillXp[sk.id] ?? 0, lv = levelOf(xp), lo = xpForLevel(lv), hi = xpForLevel(lv + 1);
                return (
                  <div key={sk.id} className="col-span-3 border-t border-white/10 pt-2">
                    <div className="mb-1 flex items-center justify-between text-[11.5px] font-semibold"><span>{sk.icon} {sk.name} · Lv {lv}</span><span className="text-white/50">{xp - lo}/{hi - lo} XP</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((xp - lo) / (hi - lo)) * 100)}%` }} /></div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
              {COMPACT.map((k) => <Bar key={k} k={k} v={stats[k]} />)}
              <ChevronUp size={16} className="shrink-0 text-white/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      </div>
    </motion.div>
  );
}
