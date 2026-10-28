import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { sfx } from '@/audio/sfx';
import { runNextQueued } from '@/game/interactions';
import { useQueueStore } from '@/stores/queueStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useStatsStore } from '@/stores/statsStore';

/** Top of the left rail in rem below the safe area: the venue header takes the first slot when you are inside one. */
export const RAIL_TOP = 4.2;
export const VENUE_HEADER_H = 3.3;
export const CHIP_H = 3.4;
export const STRIP_H = 2.3;

/** Where the left rail starts (below the venue header, if any). The chip, then the task list, stack from here. */
export const useRailTop = () => RAIL_TOP + (useInteriorStore((s) => !!s.current) ? VENUE_HEADER_H : 0);
/** Where the small needs strip sits (venues only): below the activity circle while one runs. */
export const useStripTop = () => useRailTop() + (useStatsStore((s) => !!s.activity) ? CHIP_H : 0);
/** Where the task list starts: below the strip (inside a venue) and the activity circle while one runs. */
export const useTasksTop = () => useStripTop() + (useInteriorStore((s) => !!s.current) ? STRIP_H : 0);

const R = 19, C = 2 * Math.PI * R;

/**
 * What you are doing, as a small circle at the top left: a progress ring with the activity's emoji, its name, seconds left, a
 * cancel button and a "+N next" count for anything lined up behind it. Replaces the old wide progress bar.
 */
export function ActivityChip() {
  const activity = useStatsStore((s) => s.activity);
  const stop = useStatsStore((s) => s.stop);
  const queue = useQueueStore((s) => s.queue);
  const top = useRailTop();
  // when an activity ends (finished or cancelled) start the next queued one
  const was = useRef(false);
  useEffect(() => useStatsStore.subscribe((s) => {
    const busy = !!s.activity;
    if (was.current && !busy && useQueueStore.getState().queue.length) setTimeout(() => { if (!useStatsStore.getState().activity) runNextQueued(); }, 450);
    was.current = busy;
  }), []);
  const pct = activity ? Math.min(1, activity.elapsed / activity.seconds) : 0;
  return (
    <AnimatePresence>
      {activity && (
        <motion.div key="chip" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} style={{ top: `calc(env(safe-area-inset-top,0px) + ${top}rem)` }} className="pointer-events-none absolute left-3 z-[45] max-w-[min(70vw,16rem)]">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-night/85 py-1 pl-1 pr-1.5 backdrop-blur">
            <div className="relative h-11 w-11 shrink-0">
              <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90"><circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3.5" /><circle cx="22" cy="22" r={R} fill="none" stroke="#4C8DFF" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear' }} /></svg>
              <div className="absolute inset-0 flex items-center justify-center text-[18px] leading-none">{activity.glyph ?? '⏳'}</div>
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-bold">{activity.label}</div>
              <div className="text-[11px] tabular-nums text-white/60">{Math.max(0, Math.ceil(activity.seconds - activity.elapsed))}s{queue.length ? ` · ${queue.length} next` : ''}</div>
            </div>
            <button onClick={() => { sfx.close(); stop(); }} aria-label={activity.pose === 'sleep' ? 'Wake up' : 'Cancel'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"><X size={15} /></button>
          </div>
          {queue.length > 0 && (
            <div className="pointer-events-auto mt-1 flex flex-wrap gap-1">
              {queue.map((q, i) => (
                <button key={`${q.uid}${i}`} onClick={() => useQueueStore.getState().removeAt(i)} aria-label={`Remove ${q.label} from the line`} className="flex items-center gap-1 rounded-full border border-white/10 bg-night/80 px-2 py-1 text-[11px] font-semibold backdrop-blur"><span>{q.glyph ?? '•'}</span><span className="max-w-[7rem] truncate">{q.label}</span><X size={11} className="text-white/50" /></button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
