import { AnimatePresence, motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => { if (!obj) return; setFlash(obj.id); const t = window.setTimeout(() => setFlash(null), 4500); return () => window.clearTimeout(t); }, [obj?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const t = window.setTimeout(() => useObjectiveStore.getState().clearBanner(), 3200); return () => window.clearTimeout(t); }, [banner]);
  // opening the map with an objective somewhere else selects that place, so the map flies to it and offers the trip
  const lastPicked = useRef<string | null>(null);
  useEffect(() => { if (uiMode === 'map' && obj?.landmarkId && lastPicked.current !== obj.id) { lastPicked.current = obj.id; useMapStore.getState().selectLandmark(obj.landmarkId); } }, [uiMode, obj?.id, obj?.landmarkId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (uiMode !== 'home') return null;
  const t = obj?.target, inTargetVenue = !!obj && !!here && (t?.kind === 'npc' || t?.kind === 'point') && t.venue === here.kind;
  const status = obj ? timeStatus(obj, now) : null;
  const where = !obj ? null : inTargetVenue ? (t?.kind === 'npc' ? 'Marked in the scene' : t?.kind === 'point' ? t.label : null) : 'On the map: University of Lagos, Akoka';
  const edge = screen && !screen.on && inTargetVenue ? screen : null;
  return (
    <>
      <AnimatePresence>{banner && <motion.div key="done" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+4.8rem)] z-[60] -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-xl" role="status">{banner}</motion.div>}</AnimatePresence>
      {obj && !dialogue && (
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="pointer-events-auto absolute left-2 top-[calc(env(safe-area-inset-top,0px)+12.6rem)] z-30 w-[min(18.5rem,calc(100vw-4.6rem))] rounded-2xl border border-amber-300/30 bg-black/70 p-2.5 text-white shadow-lg backdrop-blur" data-testid="objective-card" aria-label="Current objective">
          {flash === obj.id && <div className="mb-0.5 text-[9.5px] font-black uppercase tracking-[0.2em] text-amber-300">New objective{obj.optional ? ' (optional)' : ''}</div>}
          <div className="text-[14px] font-black uppercase leading-tight tracking-wide">{obj.title}</div>
          <p className="mt-0.5 text-[12px] leading-snug text-white/80">{obj.instruction}</p>
          {(status || where) && <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-amber-200">{status && <span className={status === 'Missed' ? 'text-rose-300' : ''}>{status}</span>}{where && <span className="font-semibold text-white/60">{where}</span>}</div>}
          {!inTargetVenue && here && <div className="mt-1 text-[11px] text-white/60">Leave this place and open the map to travel there.</div>}
          {!here && <button onClick={() => useUiStore.getState().setMode('map')} className="mt-1.5 rounded-full bg-amber-300 px-3 py-1 text-[12px] font-extrabold text-slate-900 active:scale-95">Open map</button>}
        </motion.div>
      )}
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
