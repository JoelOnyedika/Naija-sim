import { create } from 'zustand';
import { PLACE_FOCUS } from '@/data/balance';
import type { Shot } from '@/world/cameraShots';

/** One authoritative source of camera rotation. The rig only reads this; the button and swipes only write it. */
export const STEP = Math.PI / 2;          // one button press
export const DEFAULT_AZ = 0.62;           // MVP camera: radians off +z, shows the back and left walls from the open front-right
export const DEFAULT_POLAR = 1.0;         // MVP camera: radians from straight up (0 = looking straight down)
/** Vertical drag tilts the camera between these two elevations (radians from straight up). Tweak here to change how far it goes. */
export const POLAR_MIN = 0.7;             // most top-down view
export const POLAR_MAX = 1.2;             // lowest, most side-on view
/** How far the player can zoom (1 = the default framing). Lower is closer. Wider than before so mouse and touch can really get in. */
export const ZOOM_MIN = 0.32, ZOOM_MAX = 1.5;
/** Close View: the camera sits this many metres from the player (before zoom), at this elevation (radians from straight up). Tweak here. */
export const CLOSE = { distance: 8.8, polar: 0.95, polarMin: 0.75, polarMax: 1.2, lookHeight: 1.0, follow: 6, narrowBelow: 9 } as const;

/** A short "look at what I just placed" request. `at` is when it was made (ms); the rig eases in, holds, then eases back. */
export interface CameraFocus { id: string; point: [number, number, number]; at: number }

/** A running cinematic shot. `until` is a hard deadline (ms): the rig drops the shot when it passes, so a scene can never trap the camera. */
export interface Cinematic { shot: Shot; until: number }
/** The longest any cinematic shot may be held without being refreshed. */
export const CINEMATIC_MAX_MS = 120_000;
interface CameraState {
  /** The temporary cinematic camera (null = the player's own view). Set by game/interact.ts and the story; always ends. */
  cinematic: Cinematic | null;
  setCinematic: (shot: Shot, maxMs?: number) => void;
  endCinematic: () => void;
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
  /** Where the view is slid to, in world metres from the house centre (x, z). [0, 0] = centred on the house. */
  pan: [number, number];
  rotateStep: () => void;
  swipe: (dAz: number) => void;
  setZoom: (z: number) => void;
  /** Slide the view by a world-space step, kept within `limit` metres of the house centre. */
  panBy: (dx: number, dz: number, limit: number) => void;
  recenter: () => void;
  tiltBy: (dPolar: number) => void;
  reset: () => void;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const useCameraStore = create<CameraState>((set, get) => ({
  steps: 0, offset: 0, zoom: 1, polar: DEFAULT_POLAR, pan: [0, 0], focus: null, cinematic: null,
  setCinematic: (shot, maxMs = CINEMATIC_MAX_MS) => set({ cinematic: { shot, until: Date.now() + maxMs } }),
  endCinematic: () => { if (get().cinematic) set({ cinematic: null }); },
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
  panBy: (dx, dz, limit) => set((s) => { let x = s.pan[0] + dx, z = s.pan[1] + dz; const m = Math.hypot(x, z); if (m > limit) { x *= limit / m; z *= limit / m; } return { pan: [x, z] }; }),
  recenter: () => set({ pan: [0, 0] }),
  tiltBy: (d) => set((s) => ({ polar: clamp(s.polar + d, POLAR_MIN, POLAR_MAX) })),
  reset: () => set({ steps: 0, offset: 0, zoom: 1, polar: DEFAULT_POLAR, pan: [0, 0], focus: null, cinematic: null }),
}));
/** The azimuth the camera is heading for. */
export const targetAzimuth = (s: { steps: number; offset: number }) => DEFAULT_AZ + s.steps * STEP + s.offset;
