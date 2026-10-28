import { useInteriorStore } from '@/stores/interiorStore';
import { useStatsStore } from '@/stores/statsStore';
import { useUiStore } from '@/stores/uiStore';
import type { StatKey } from '@/types/game';
import { sfx } from '@/audio/sfx';
import { useStripTop } from './ActivityChip';
import { STAT_META } from './statMeta';

const KEYS: StatKey[] = ['hunger', 'thirst', 'bladder', 'energy', 'happiness'];

/**
 * Inside a venue the big profile and needs block is gone; this small strip sits in the left stack, under the activity circle.
 * Tap it to open your profile (all the stats and skills live there).
 */
export function StatsStrip() {
  const inVenue = useInteriorStore((s) => !!s.current), stats = useStatsStore((s) => s.stats), top = useStripTop();
  if (!inVenue) return null;
  return (
    <button onClick={() => { sfx.pop(); useUiStore.getState().setProfileOpen(true); }} aria-label="Your needs. Tap for your profile" style={{ top: `calc(env(safe-area-inset-top,0px) + ${top}rem)` }} className="absolute left-3 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-night/80 px-2.5 py-1.5 backdrop-blur active:bg-white/10">
      {KEYS.map((k) => {
        const { Icon, color } = STAT_META[k], v = stats[k], low = v < 25;
        return (
          <span key={k} className="flex w-7 flex-col items-center gap-0.5" aria-label={`${STAT_META[k].label} ${Math.round(v)}`}>
            <Icon size={12} color={low ? '#FF4D6D' : color} strokeWidth={2.5} className={low ? 'animate-pulse' : ''} />
            <span className="h-[3px] w-full overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full" style={{ width: `${v}%`, background: low ? '#FF4D6D' : color }} /></span>
          </span>
        );
      })}
    </button>
  );
}
