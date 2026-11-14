import { motion } from 'framer-motion';
import { LocateFixed, RotateCw, ScanEye, Map as MapIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useViewStore } from '@/stores/viewStore';
import { sfx } from '@/audio/sfx';
import { useCameraStore } from '@/stores/cameraStore';
import { useUiStore } from '@/stores/uiStore';

/** Turns the camera 90 degrees around the house per press (4 presses = full circle). Top right, just under the HUD row. */
export function RotateButton() {
  const mode = useUiStore((s) => s.mode);
  const view = useViewStore((s) => s.view);
  // keyboard: V switches between Normal View and Close View
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) useViewStore.getState().toggle(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const moved = useCameraStore((s) => Math.hypot(s.pan[0], s.pan[1]) > 0.4);
  if (mode !== 'home' && mode !== 'buy') return null;
  return (
    <div className="pointer-events-none absolute right-2 top-[calc(env(safe-area-inset-top,0px)+4.1rem)] z-20 flex flex-col gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); sfx.click(); useCameraStore.getState().rotateStep(); }}
        aria-label="Rotate view 90 degrees"
        title="Rotate view 90°"
        data-testid="rotate-view"
        className="panel pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg"
      >
        <RotateCw size={18} className="text-accent-glow" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); sfx.click(); useViewStore.getState().toggle(); }}
        aria-label={view === 'normal' ? 'Switch to Close View' : 'Switch to Normal View'} aria-pressed={view === 'close'}
        title={view === 'normal' ? 'Close View (V)' : 'Normal View (V)'} data-testid="view-toggle"
        className={`panel pointer-events-auto flex h-[3.1rem] w-10 flex-col items-center justify-center gap-0.5 rounded-lg ${view === 'close' ? 'ring-1 ring-accent-glow' : ''}`}
      >
        {view === 'normal' ? <MapIcon size={16} className="text-accent-glow" /> : <ScanEye size={16} className="text-accent-glow" />}
        <span className="text-[8.5px] font-bold uppercase leading-none tracking-wide text-white/80">{view === 'normal' ? 'Normal' : 'Close'}</span>
      </motion.button>
      {moved && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); sfx.click(); useCameraStore.getState().recenter(); }}
          aria-label="Centre the view on the house" title="Centre on the house" data-testid="recenter-view" className="panel pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg">
          <LocateFixed size={18} className="text-accent-glow" />
        </motion.button>
      )}
    </div>
  );
}
