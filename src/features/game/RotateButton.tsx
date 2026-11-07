import { motion } from 'framer-motion';
import { LocateFixed, RotateCw } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { useCameraStore } from '@/stores/cameraStore';
import { useUiStore } from '@/stores/uiStore';

/** Turns the camera 90 degrees around the house per press (4 presses = full circle). Top right, just under the HUD row. */
export function RotateButton() {
  const mode = useUiStore((s) => s.mode);
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
      {moved && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); sfx.click(); useCameraStore.getState().recenter(); }}
          aria-label="Centre the view on the house" title="Centre on the house" data-testid="recenter-view" className="panel pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg">
          <LocateFixed size={18} className="text-accent-glow" />
        </motion.button>
      )}
    </div>
  );
}
