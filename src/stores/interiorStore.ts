import { create } from 'zustand';
import type { InteriorKind } from '@/data/interiors';

/**
 * Where the player is when they are not at home. Not persisted: closing the game puts you back home (or in jail, which is
 * restored from the jail record, see stores/jailStore.ts).
 */
export interface InteriorPresence {
  kind: InteriorKind;
  /** Display name: the landmark's name (Balogun Market) or the template label. */
  name: string;
  landmarkId?: string;
  /** Which copy of the venue (1, 2, ...). Real multiplayer fills one up to its capacity, then opens the next. */
  instance: number;
  /** NPC count for this visit (capacity minus real players, capped by the template's target). */
  npcCount: number;
  /** Seed so the same visit always spawns the same NPCs. */
  seed: number;
  /** A vehicle chosen on the phone, kept for the showroom purchase flow. */
  vehicleId?: string;
}
interface InteriorState { current: InteriorPresence | null; set: (p: InteriorPresence | null) => void; setVehicle: (id: string | undefined) => void;
  /** NPC whose profile sheet is open. */
  selectedNpc: string | null; selectNpc: (id: string | null) => void }
export const useInteriorStore = create<InteriorState>((set) => ({
  current: null, selectedNpc: null,
  selectNpc: (selectedNpc) => set({ selectedNpc }),
  set: (current) => set({ current, selectedNpc: null }),
  setVehicle: (vehicleId) => set((s) => (s.current ? { current: { ...s.current, vehicleId } } : s)),
}));
export const inInterior = () => useInteriorStore.getState().current !== null;
