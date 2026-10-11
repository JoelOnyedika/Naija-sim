import { AnimatePresence, motion } from 'framer-motion';
import { Square } from 'lucide-react';
import { useStatsStore } from '@/stores/statsStore';

export function ActivityBanner() {
  const activity = useStatsStore((s) => s.activity);
  const stop = useStatsStore((s) => s.stop);
  return (
    <AnimatePresence>
      {activity && (
        <motion.div key="act" className="pointer-events-none absolute inset-x-0 top-[3.7rem] z-[45] flex justify-center px-4" initial={{ y: -30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }}>
          <div className="panel pointer-events-auto w-full max-w-xs rounded-lg p-3">
            <div className="mb-1.5 flex items-center justify-between"><span className="font-display font-bold">{activity.label}</span><span className="text-xs tabular-nums text-white/60">{Math.max(0, Math.ceil(activity.seconds - activity.elapsed))}s</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-glow transition-[width] duration-1000 ease-linear" style={{ width: `${(activity.elapsed / activity.seconds) * 100}%` }} /></div>
            <button onClick={stop} className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/60"><Square size={10} />{activity.pose === 'sleep' ? 'Wake up' : 'Stop'}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
