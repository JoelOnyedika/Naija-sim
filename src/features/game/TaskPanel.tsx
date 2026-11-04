import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { TASKS } from '@/data/tasks';
import { usePhoneStore } from '@/stores/phoneStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUiStore } from '@/stores/uiStore';
import { useDailyStore } from '@/stores/dailyStore';
import { useDailyBadge } from './DailySheet';
import { useTasksTop } from './ActivityChip';

/** Compact task list on the left. Collapses to a small badge so the home stays unobstructed. */
export function TaskPanel() {
  const active = useTaskStore((s) => s.active);
  const open = useUiStore((s) => s.taskPanelOpen);
  const toggle = useUiStore((s) => s.toggleTasks);
  const top = useTasksTop();
  const badge = useDailyBadge();
  const topStyle = { top: `calc(env(safe-area-inset-top,0px) + ${top}rem)` };
  const tasks = active.map((id) => TASKS.find((t) => t.id === id)!).filter(Boolean);
  return (
    <>
      <motion.div style={topStyle} className="pointer-events-none absolute left-0 z-30 w-[min(62vw,14rem)]" initial={false} animate={{ x: open ? 0 : '-104%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}>
        <div className="panel pointer-events-auto ml-2 rounded-lg p-1.5">
          <div className="flex items-center justify-between px-1.5 pb-1">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white/70"><ListChecks size={13} className="text-accent-glow" />Tasks</span>
            <button onClick={() => { sfx.close(); toggle(); }} aria-label="Hide tasks" className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10"><ChevronLeft size={16} /></button>
          </div>
          <button onClick={() => { sfx.open(); useDailyStore.getState().set({ sheetOpen: true }); }} aria-label="Open daily rewards" className="mb-0.5 flex w-full items-center gap-2 rounded-md bg-white/[0.08] px-2 py-1.5 text-left active:bg-white/15">
            <span className="text-base leading-none">🎁</span><span className="flex-1 text-[12px] font-bold">Daily rewards</span>
            {badge > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-hibiscus px-1 text-[10px] font-extrabold tabular-nums text-white">{badge}</span>}
          </button>
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex items-start gap-2 border-t border-white/[0.07] px-1.5 py-1.5" onClick={t.action ? () => { sfx.open(); const ph = usePhoneStore.getState(); ph.openPhone(); ph.openApp(t.action!.app); } : undefined} role={t.action ? 'button' : undefined} tabIndex={t.action ? 0 : undefined} aria-label={t.action ? `${t.title}: open ${t.action.app}` : undefined}>
                <span className="text-base leading-none">{t.icon}</span>
                <div className="min-w-0"><div className="text-[12px] font-semibold leading-tight">{t.title}</div><div className="mt-0.5 text-[10.5px] font-medium text-accent-glow">{t.rewardLabel}</div></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} onClick={() => { sfx.open(); toggle(); }} aria-label="Show tasks" style={topStyle}
            className="panel absolute left-0 z-30 flex h-9 items-center gap-1 rounded-r-lg pl-2 pr-1.5 text-xs font-bold">
            <ListChecks size={15} className="text-accent-glow" /><span className="tabular-nums">{tasks.length}</span>{badge > 0 && <span className="h-2 w-2 rounded-full bg-hibiscus" aria-label="Daily rewards waiting" />}<ChevronRight size={14} className="text-white/60" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
