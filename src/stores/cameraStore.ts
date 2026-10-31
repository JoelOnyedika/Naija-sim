import { create } from 'zustand';
import { PLACE_FOCUS } from '@/data/balance';

/** One authoritative source of camera rotation. The rig only reads this; the button and swipes only write it. */
export const STEP = Math.PI / 2;          // one button press
export const DEFAULT_AZ = 0.62;           // MVP camera: radians off +z, shows the back and left walls from the open front-right
export const DEFAULT_POLAR = 1.0;         // MVP camera: radians from straight up (0 = looking straight down)
/** Vertical drag tilts the camera between these two elevations (radians from straight up). Tweak here to change how far it goes. */
export const POLAR_MIN = 0.7;             // most top-down view
export const POLAR_MAX = 1.2;             // lowest, most side-on view
/** How far the player can zoom (1 = the default framing). Lower is closer. Wider than before so mouse and touch can really get in. */
export const ZOOM_MIN = 0.32, ZOOM_MAX = 1.5;

/** A short "look at what I just placed" request. `at` is when it was made (ms); the rig eases in, holds, then eases back. */
export interface CameraFocus { id: string; point: [number, number, number]; at: number }

interface CameraState {
  focus: CameraFocus | null;
  /** Ease toward a placed item. Ignored if the same item was just focused (duplicate state updates). */
  focusOn: (id: string, point: [number, number, number]) => void;
  /** Back to the normal view (player input, new placement, leaving Buy mode, or the hold timer). */
  clearFocus: () => void;
  /** Button-selected orientation: number of 90-degree steps from the default (unwrapped, so 4 presses = a full turn). */
  steps: number;
  /** Swipe offset from the active button orientation, always within +-90 degrees. */
  offset: number;
  zoom: number;
  /** Camera elevation, radians from straight up, always within POLAR_MIN..POLAR_MAX. */
  polar: number;
  rotateStep: () => void;
  swipe: (dAz: number) => void;
  setZoom: (z: number) => void;
  tiltBy: (dPolar: number) => void;
  reset: () => void;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const useCameraStore = create<CameraState>((set, get) => ({
  steps: 0, offset: 0, zoom: 1, polar: DEFAULT_POLAR, focus: null,
  focusOn: (id, point) => {
    const f = get().focus, now = Date.now();
    if (f && f.id === id && now - f.at < PLACE_FOCUS.dedupeMs) return;
    set({ focus: { id, point, at: now } });
  },
  clearFocus: () => { if (get().focus) set({ focus: null }); },
  // The pressed orientation becomes the new reference: the swipe offset restarts at 0, so the camera ends exactly on a 90-degree side.
  rotateStep: () => set((s) => ({ steps: s.steps + 1, offset: 0 })),
  swipe: (dAz) => set((s) => ({ offset: clamp(s.offset + dAz, -STEP, STEP) })),
  setZoom: (z) => set({ zoom: clamp(z, ZOOM_MIN, ZOOM_MAX) }),
  tiltBy: (d) => set((s) => ({ polar: clamp(s.polar + d, POLAR_MIN, POLAR_MAX) })),
  reset: () => set({ steps: 0, offset: 0, zoom: 1, polar: DEFAULT_POLAR, focus: null }),
}));
/** The azimuth the camera is heading for. */
export const targetAzimuth = (s: { steps: number; offset: number }) => DEFAULT_AZ + s.steps * STEP + s.offset;
