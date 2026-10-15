import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { useCameraStore } from '@/stores/cameraStore';
import { useUiStore } from '@/stores/uiStore';

/** Turns the camera 90 degrees around the house per press (4 presses = full circle). Top right, just under the HUD row. */
export function RotateButton() {
  const mode = useUiStore((s) => s.mode);
  if (mode !== 'home' && mode !== 'buy') return null;
  return (
    <div className="pointer-events-none absolute right-2 top-[calc(env(safe-area-inset-top,0px)+4.1rem)] z-20">
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
    </div>
  );
}
