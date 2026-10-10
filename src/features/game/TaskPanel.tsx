import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { TASKS } from '@/data/tasks';
import { useTaskStore } from '@/stores/taskStore';
import { useUiStore } from '@/stores/uiStore';

/** Right-hand task list. Slides off-screen so the home is unobstructed. */
export function TaskPanel() {
  const active = useTaskStore((s) => s.active);
  const open = useUiStore((s) => s.taskPanelOpen);
  const toggle = useUiStore((s) => s.toggleTasks);
  const tasks = active.map((id) => TASKS.find((t) => t.id === id)!).filter(Boolean);
  return (
    <>
      <motion.div className="pointer-events-none absolute right-0 top-[8.4rem] z-30 w-[min(78vw,17rem)]" initial={false} animate={{ x: open ? 0 : '104%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}>
        <div className="pointer-events-auto flex flex-col gap-2 pr-3">
          <div className="flex items-center justify-between pl-1">
            <span className="font-display text-sm font-bold drop-shadow">Tasks</span>
            <button onClick={() => { sfx.close(); toggle(); }} aria-label="Hide tasks" className="glass-dark flex h-8 w-8 items-center justify-center rounded-full"><ChevronRight size={16} /></button>
          </div>
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60, scale: 0.9 }} className="glass-dark rounded-2xl px-3 py-2.5">
                <div className="flex items-start gap-2.5"><span className="text-xl leading-none">{t.icon}</span><div className="min-w-0"><div className="text-[13px] font-semibold leading-tight">{t.title}</div><div className="mt-1 inline-block rounded-full bg-danfo/20 px-2 py-0.5 text-[11px] font-bold text-danfo">Reward: {t.rewardLabel}</div></div></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} onClick={() => { sfx.open(); toggle(); }} aria-label="Show tasks"
            className="glass-dark absolute right-0 top-[8.6rem] z-30 flex items-center gap-1 rounded-l-2xl py-2.5 pl-2.5 pr-2 text-xs font-bold">
            <ChevronLeft size={16} />📋<span className="rounded-full bg-danfo px-1.5 text-[11px] text-night">{tasks.length}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
