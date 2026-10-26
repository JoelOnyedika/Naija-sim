import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatRemaining, isJailed, remainingMs } from '@/game/crime';
import { useJailStore } from '@/stores/jailStore';
import { INTERIORS } from '@/data/interiors';
import { leaveInterior } from '@/game/interiors';
import { useInteriorStore } from '@/stores/interiorStore';
import { toast, useUiStore } from '@/stores/uiStore';

/**
 * Chrome for being inside a public interior: where you are, how many people are here, and the way back home. Redecorating is
 * switched off here (you do not own the place), so Build/Buy sends you straight back to normal view.
 */
export function InteriorShell() {
  const here = useInteriorStore((s) => s.current);
  const mode = useUiStore((s) => s.mode);
  useEffect(() => { if (here && mode === 'buy') { useUiStore.getState().setMode('home'); toast('You cannot redecorate somewhere you do not own.', 'bad'); } }, [here, mode]);
  const sentence = useJailStore((s) => s.sentence);
  const [, tick] = useState(0);
  useEffect(() => { if (!sentence) return; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [sentence]);
  // while serving time there is no map, no redecorating and no leaving
  useEffect(() => { if (isJailed() && (mode === 'map' || mode === 'buy')) { useUiStore.getState().setMode('home'); toast('You are serving time.', 'bad'); } }, [mode, sentence]);
  const def = here ? INTERIORS[here.kind] : null;
  return (
    <AnimatePresence>
      {here && def && mode === 'home' && (
        <motion.div key="interior" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top,0px)+4.2rem)] z-30">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-night/85 py-1.5 pl-1.5 pr-3 backdrop-blur">
            {here.kind !== 'jail' && <button onClick={leaveInterior} aria-label="Leave and go home" className="flex h-9 items-center gap-1 rounded-xl bg-white/10 px-2.5 text-[13px] font-bold active:bg-white/20"><ArrowLeft size={16} />Leave</button>}
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-extrabold">{here.name}</div>
              <div className="text-[11px] text-white/60">{sentence && here.kind === 'jail' ? `Time left ${formatRemaining(remainingMs())}` : `Copy ${here.instance} · ${1 + here.npcCount} of ${def.capacity} here`}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
