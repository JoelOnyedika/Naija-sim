import { create } from 'zustand';

/** One authoritative source of camera rotation. The rig only reads this; the button and swipes only write it. */
export const STEP = Math.PI / 2;          // one button press
export const DEFAULT_AZ = 0.62;           // MVP camera: radians off +z, shows the back and left walls from the open front-right
export const DEFAULT_POLAR = 1.0;         // MVP camera: radians from straight up; never changed by input
export const ZOOM_MIN = 0.7, ZOOM_MAX = 1.3;

interface CameraState {
  /** Button-selected orientation: number of 90-degree steps from the default (unwrapped, so 4 presses = a full turn). */
  steps: number;
  /** Swipe offset from the active button orientation, always within +-90 degrees. */
  offset: number;
  zoom: number;
  rotateStep: () => void;
  swipe: (dAz: number) => void;
  setZoom: (z: number) => void;
  reset: () => void;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const useCameraStore = create<CameraState>((set) => ({
  steps: 0, offset: 0, zoom: 1,
  // The pressed orientation becomes the new reference: the swipe offset restarts at 0, so the camera ends exactly on a 90-degree side.
  rotateStep: () => set((s) => ({ steps: s.steps + 1, offset: 0 })),
  swipe: (dAz) => set((s) => ({ offset: clamp(s.offset + dAz, -STEP, STEP) })),
  setZoom: (z) => set({ zoom: clamp(z, ZOOM_MIN, ZOOM_MAX) }),
  reset: () => set({ steps: 0, offset: 0, zoom: 1 }),
}));
/** The azimuth the camera is heading for. */
export const targetAzimuth = (s: { steps: number; offset: number }) => DEFAULT_AZ + s.steps * STEP + s.offset;
