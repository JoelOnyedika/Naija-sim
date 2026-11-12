import { InitiationNote } from './CampusCard';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ListChecks, X } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { TASKS } from '@/data/tasks';
import { usePhoneStore } from '@/stores/phoneStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUiStore } from '@/stores/uiStore';
import { useDailyStore } from '@/stores/dailyStore';
import { useDailyBadge } from './DailySheet';
import { useTasksTop } from './ActivityChip';

/**
 * Task list on the left. It starts CLOSED: a small pill (list icon, how many tasks, a red dot when a daily reward waits) that
 * opens a tidy card. The card has one highlighted row for daily rewards, then one row per task: an icon tile, the title, and
 * the reward as a small chip. Nothing in it is cramped or tiny; every row is at least a thumb tall.
 */
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
      <AnimatePresence>
        {open && (
          <motion.section key="card" aria-label="Tasks" style={topStyle} initial={{ opacity: 0, x: -24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -24, scale: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="pointer-events-auto absolute left-3 z-30 w-[min(78vw,17rem)] origin-top-left overflow-hidden rounded-2xl border border-white/10 bg-ink/90 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <header className="flex items-center justify-between px-3.5 pb-1.5 pt-3">
              <div>
                <h2 className="font-display text-[15px] font-extrabold leading-none">Tasks</h2>
                <p className="mt-1 text-[11px] font-medium text-white/50">{tasks.length ? `${tasks.length} to do` : 'All caught up'}</p>
              </div>
              <button onClick={() => { sfx.close(); toggle(); }} aria-label="Close tasks" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/70 active:bg-white/20"><X size={15} /></button>
            </header>
            <div className="space-y-1.5 px-2.5 pb-2.5 pt-1">
              <button onClick={() => { sfx.open(); useDailyStore.getState().set({ sheetOpen: true }); }} aria-label="Open daily rewards"
                className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-400/25 to-orange-500/15 px-2.5 py-2 text-left ring-1 ring-amber-300/25 active:brightness-125">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-300/20 text-lg">🎁</span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold leading-tight">Daily rewards</span><span className="block text-[11px] text-amber-100/70">{badge > 0 ? `${badge} waiting for you` : 'Quests and your streak'}</span></span>
                {badge > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-hibiscus px-1.5 text-[11px] font-extrabold tabular-nums">{badge}</span> : <ChevronRight size={16} className="text-white/40" />}
              </button>
              <InitiationNote />
              <AnimatePresence initial={false}>
                {tasks.map((t) => {
                  const go = t.action ? () => { sfx.open(); const ph = usePhoneStore.getState(); ph.openPhone(); ph.openApp(t.action!.app); } : undefined;
                  return (
                    <motion.div key={t.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} onClick={go} role={go ? 'button' : undefined} tabIndex={go ? 0 : undefined} aria-label={go ? `${t.title}: open ${t.action!.app}` : undefined}
                      className={`flex items-center gap-3 rounded-xl bg-white/[0.05] px-2.5 py-2 ${go ? 'active:bg-white/10' : ''}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-lg">{t.icon}</span>
                      <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">{t.title}</span>
                      <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-300">{t.rewardLabel}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!tasks.length && <p className="rounded-xl bg-white/[0.04] px-3 py-3 text-center text-[12px] text-white/55">Nothing left for now. New tasks show up as you play.</p>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!open && (
          <motion.button key="pill" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} onClick={() => { sfx.open(); toggle(); }} aria-label="Show tasks" style={topStyle}
            className="absolute left-3 z-30 flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-ink/85 pl-2.5 pr-3 text-[12px] font-bold shadow-lg backdrop-blur-md active:bg-white/10">
            <ListChecks size={15} className="text-accent-glow" />Tasks<span className="tabular-nums text-white/60">{tasks.length}</span>
            {badge > 0 && <span className="h-2 w-2 rounded-full bg-hibiscus" aria-label="Daily rewards waiting" />}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
