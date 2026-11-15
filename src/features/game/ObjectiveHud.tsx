import { AnimatePresence, motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { timeStatus } from '@/game/objectiveText';
import { cancelInteraction, useInteractStore } from '@/game/interact';
import { requestTalkTo } from '@/game/story';
import { useClockStore } from '@/stores/clockStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useObjectiveStore } from '@/stores/objectiveStore';
import { useStoryStore } from '@/stores/storyStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * Objective guidance on screen: the objective card (title, instruction, target, countdown), a "NEW OBJECTIVE" flash, a completion banner, an arrow
 * at the screen edge pointing at an off-screen target, the interaction prompt when close, and a Stop following button. The 3D marker itself is
 * drawn by three/property/InteractionDriver.tsx.
 */
export function ObjectiveHud() {
  const obj = useObjectiveStore((s) => s.current), banner = useObjectiveStore((s) => s.doneBanner), screen = useObjectiveStore((s) => s.screen), near = useObjectiveStore((s) => s.near);
  const here = useInteriorStore((s) => s.current), now = useClockStore((s) => s.minutes), dialogue = useStoryStore((s) => !!s.dialogue || !!s.exam), mode = useInteractStore((s) => s.mode), following = useInteractStore((s) => s.label);
  const uiMode = useUiStore((s) => s.mode);
  useEffect(() => { if (!banner) return; const t = window.setTimeout(() => useObjectiveStore.getState().clearBanner(), 3200); return () => window.clearTimeout(t); }, [banner]);
  // opening the map with an objective somewhere else selects that place, so the map flies to it and offers the trip
  const lastPicked = useRef<string | null>(null);
  useEffect(() => { if (uiMode === 'map' && obj?.landmarkId && lastPicked.current !== obj.id) { lastPicked.current = obj.id; useMapStore.getState().selectLandmark(obj.landmarkId); } }, [uiMode, obj?.id, obj?.landmarkId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (uiMode !== 'home') return null;
  const t = obj?.target, inTargetVenue = !!obj && !!here && (t?.kind === 'npc' || t?.kind === 'point') && t.venue === here.kind;
  const status = obj ? timeStatus(obj, now) : null;
  const edge = screen && !screen.on && inTargetVenue ? screen : null;
  return (
    <>
      <AnimatePresence>{banner && <motion.div key="done" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+4.8rem)] z-[60] -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-xl" role="status">{banner}</motion.div>}</AnimatePresence>
      {edge && !dialogue && (
        <div className="pointer-events-none absolute z-30" style={{ left: `clamp(24px, ${edge.x}px, calc(100% - 24px))`, top: `clamp(100px, ${edge.y}px, calc(100% - 150px))` }} aria-hidden>
          <div className="flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-300 text-slate-900 shadow-lg" style={{ transform: `translate(-50%, -50%) rotate(${edge.angle + Math.PI / 2}rad)` }}><Navigation size={18} /></div>
        </div>
      )}
      {obj && near && !dialogue && mode === 'idle' && obj.target.kind === 'npc' && (
        <motion.button initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => requestTalkTo((obj.target as { castId: string }).castId)} data-testid="interact-prompt"
          className="pointer-events-auto absolute bottom-[12.5rem] left-1/2 z-40 -translate-x-1/2 rounded-full bg-amber-300 px-5 py-3 text-[14.5px] font-extrabold text-slate-900 shadow-xl active:scale-95">{obj.target.verb}</motion.button>
      )}
      {obj && near && !dialogue && mode === 'idle' && obj.target.kind === 'point' && status && status.startsWith('Open') && (
        <div className="pointer-events-none absolute bottom-[12.5rem] left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-[13px] font-bold text-white">Wait here. Bayo is coming.</div>
      )}
      {mode === 'follow' && (
        <button onClick={() => cancelInteraction()} data-testid="stop-follow" className="pointer-events-auto absolute bottom-[12.5rem] left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[13px] font-extrabold text-white shadow-lg active:scale-95">Following {following}. Tap to stop</button>
      )}
    </>
  );
}
