import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { objectiveRoute, timeStatus } from '@/game/objectiveText';
import { requestTalkTo } from '@/game/story';
import { useClockStore } from '@/stores/clockStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useMapStore } from '@/stores/mapStore';
import { useObjectiveStore } from '@/stores/objectiveStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * The "Important" section of the Tasks menu: the story objective, its instruction and its time (a countdown, "open now", "missed"),
 * kept out of the game view so nothing covers the scene. Tapping it takes you where it needs you: the map at the place, or straight into
 * the conversation when you are already there. The Tasks button glows and pings while a new or newly ready important task is unseen.
 */
export function ImportantTasks() {
  const obj = useObjectiveStore((s) => s.current), now = useClockStore((s) => s.minutes), here = useInteriorStore((s) => s.current?.kind);
  if (!obj) return null;
  const status = timeStatus(obj, now), open = !!status && status.startsWith('Open');
  const go = () => {
    sfx.open(); const r = objectiveRoute(obj, here);
    useUiStore.setState({ taskPanelOpen: false });
    if (r.kind === 'talk') requestTalkTo(r.castId);
    else if (r.kind === 'map') { if (r.landmarkId) useMapStore.getState().selectLandmark(r.landmarkId); useUiStore.getState().setMode('map'); }
  };
  return (
    <section aria-label="Important task" data-testid="important-task">
      <h3 className="px-1 pb-1 pt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Important{obj.optional ? ' (optional)' : ''}</h3>
      <motion.button initial={{ scale: 0.97 }} animate={{ scale: 1 }} onClick={go} aria-label={`${obj.title}. ${obj.instruction}`}
        className={`flex w-full items-start gap-2.5 rounded-xl bg-gradient-to-r from-amber-400/30 to-orange-500/15 px-2.5 py-2.5 text-left ring-1 active:brightness-125 ${open ? 'ring-amber-300' : 'ring-amber-300/40'}`}>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black uppercase leading-tight tracking-wide">{obj.title}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-white/80">{obj.instruction}</span>
          {status && <span className={`mt-1 block text-[11.5px] font-bold ${status === 'Missed' ? 'text-rose-300' : open ? 'text-emerald-300' : 'text-amber-200'}`}>{status}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-center pt-0.5"><ChevronRight size={18} className="text-amber-200" /><span className="text-[9px] font-bold uppercase text-amber-200/80">{here && objectiveRoute(obj, here).kind !== 'map' ? 'Go' : 'Map'}</span></span>
      </motion.button>
    </section>
  );
}
