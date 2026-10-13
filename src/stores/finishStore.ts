import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinishKind } from '@/data/finishes';

/** What one home currently wears. Missing = the layout's own floors/walls. */
export interface AppliedFinishes {
  /** Floor for every living area and bedroom that has no floor of its own. Kitchens and bathrooms never take it. */
  floor?: string;
  /** Per-room floors, keyed by room id (see world/layoutGeometry roomsOf). Each room changes alone. */
  rooms?: Record<string, string>;
  wall?: string;
}
/** A floor try-on is for one room or for 'all' (living areas and bedrooms). */
export interface PreviewFinishes { floor?: string; wall?: string; floorRoom?: string }

interface FinishState {
  /** Finish ids the player has paid for (re-applying one in another home is free). */
  owned: string[];
  /** propertyId -> applied finishes. Each home remembers its own; one home never changes another. */
  byProperty: Record<string, AppliedFinishes>;
  /** Unconfirmed try-on for the active home. Never persisted, never charged. */
  preview: PreviewFinishes;
  /** Which room the floor picker is aimed at: 'all' or a room id. Not persisted. */
  floorRoom: string;
  setFloorRoom: (room: string) => void;
  setPreview: (kind: FinishKind, id: string | null) => void;
  clearPreview: () => void;
  commit: (propertyId: string, kind: FinishKind, id: string, room?: string, clearRooms?: string[]) => void;
  reset: () => void;
}

export const useFinishStore = create<FinishState>()(persist((set) => ({
  owned: [], byProperty: {}, preview: {}, floorRoom: 'all',
  setFloorRoom: (floorRoom) => set((s) => ({ floorRoom, preview: s.preview.floor ? { floor: s.preview.floor, floorRoom } : s.preview })),
  // One try-on at a time: choosing another replaces the previous one.
  setPreview: (kind, id) => set((s) => ({ preview: id ? (kind === 'floor' ? { floor: id, floorRoom: s.floorRoom } : { [kind]: id }) : {} })),
  clearPreview: () => set({ preview: {} }),
  commit: (propertyId, kind, id, room, clearRooms = []) => set((s) => {
    const cur = s.byProperty[propertyId] ?? {};
    let next: AppliedFinishes;
    if (kind === 'floor' && room && room !== 'all') next = { ...cur, rooms: { ...cur.rooms, [room]: id } };
    else if (kind === 'floor') { const rooms = { ...cur.rooms }; for (const k of clearRooms) delete rooms[k]; next = { ...cur, floor: id, rooms }; }
    else next = { ...cur, [kind]: id };
    return { owned: s.owned.includes(id) ? s.owned : [...s.owned, id], byProperty: { ...s.byProperty, [propertyId]: next }, preview: {} };
  }),
  reset: () => set({ owned: [], byProperty: {}, preview: {}, floorRoom: 'all' }),
}), { name: 'nigerialife.finishes', version: 1, partialize: (s) => ({ owned: s.owned, byProperty: s.byProperty }) }));

/** The floor finish id to draw in one zone: the live try-on wins, then the room's own floor, then the home-wide floor (never for kitchens or bathrooms). */
export function floorIdForZone(applied: AppliedFinishes | undefined, preview: PreviewFinishes, roomId: string | undefined, kind: string): string | undefined {
  const shared = kind !== 'kitchen' && kind !== 'bathroom';
  if (preview.floor) {
    const scope = preview.floorRoom ?? 'all';
    return scope === 'all' ? (shared ? preview.floor : applied?.rooms?.[roomId ?? ''] ?? undefined) : scope === roomId ? preview.floor : (applied?.rooms?.[roomId ?? ''] ?? (shared ? applied?.floor : undefined));
  }
  return applied?.rooms?.[roomId ?? ''] ?? (shared ? applied?.floor : undefined);
}
export const effectiveWall = (applied: AppliedFinishes | undefined, preview: PreviewFinishes) => preview.wall ?? applied?.wall;
