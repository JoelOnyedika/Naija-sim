import { create } from 'zustand';
import type { Pt } from '@/world/navigation';

/**
 * Who of the named cast is standing in the current venue, and where they appear. Not saved: the story script (game/story.ts) puts
 * people where the current stage needs them every time the venue is entered, so a reload can never leave a ghost behind.
 */
export interface Placed { id: string; x: number; z: number; yaw: number; /** the venue kind they belong to */ venue: string }
interface CastState {
  present: Record<string, Placed>;
  spawn: (id: string, venue: string, at: Pt, yaw?: number) => void;
  despawn: (id: string) => void;
  clear: () => void;
}
export const useCastStore = create<CastState>((set) => ({
  present: {},
  spawn: (id, venue, at, yaw = 0) => set((s) => ({ present: { ...s.present, [id]: { id, venue, x: at.x, z: at.z, yaw } } })),
  despawn: (id) => set((s) => { const n = { ...s.present }; delete n[id]; return { present: n }; }),
  clear: () => set({ present: {} }),
}));
