import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJsonStorage } from '@/core/safeStorage';

/**
 * The one objective the player is working on, shown the same way everywhere: a card on screen, a marker in the 3D world, an arrow when the
 * target is off screen, a highlighted landmark on the map, and an interaction prompt when close. Saved with the game; the story
 * (game/story.ts) sets and replaces it and re-creates it after a reload.
 */
export type ObjectiveTarget =
  | { kind: 'npc'; castId: string; venue: string; /** shown on the prompt */ verb: string }
  | { kind: 'point'; venue: string; x: number; z: number; label: string }
  | { kind: 'landmark'; landmarkId: string; label: string };
export interface Objective {
  id: string; title: string; instruction: string; target: ObjectiveTarget;
  /** game minute of a meeting: the card shows a countdown to it (and "now" inside the window) */ at?: number; until?: number;
  optional?: boolean;
  /** highlighted on the map (a landmark id) */ landmarkId?: string;
}
export interface ScreenMark { x: number; y: number; on: boolean; angle: number; dist: number }
interface ObjectiveState {
  current: Objective | null;
  /** Latest finished objective title, for the completion banner. */
  doneBanner: string | null;
  /** Transient: where the target is on screen (written by the 3D marker). */
  screen: ScreenMark | null;
  /** Transient: the player is close enough to interact with the target. */
  near: boolean;
  set: (o: Objective | null) => void;
  complete: (banner?: string) => void;
  clearBanner: () => void;
  setScreen: (s: ScreenMark | null) => void;
  setNear: (n: boolean) => void;
  reset: () => void;
}
export const useObjectiveStore = create<ObjectiveState>()(persist((set, get) => ({
  current: null, doneBanner: null, screen: null, near: false,
  set: (current) => set({ current, near: false, screen: null }),
  complete: (banner) => set({ current: null, doneBanner: banner ?? (get().current ? get().current!.title : null), near: false, screen: null }),
  clearBanner: () => set({ doneBanner: null }),
  setScreen: (screen) => set({ screen }),
  setNear: (near) => { if (get().near !== near) set({ near }); },
  reset: () => set({ current: null, doneBanner: null, screen: null, near: false }),
}), { name: 'nigerialife.objective', version: 1, storage: safeJsonStorage, partialize: ({ current }) => ({ current }) as never }));
