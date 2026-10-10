import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firstStateId } from '@/world/registry';

interface MapState {
  /** Which state's map is shown. null = the first registered state (see useStateId). */
  stateId: string | null;
  selectedAreaId: string | null;
  selectedLandmarkId: string | null;
  visits: Record<string, number>;
  setState: (id: string) => void;
  selectArea: (id: string | null) => void;
  selectLandmark: (id: string | null) => void;
  recordVisit: (id: string) => void;
  reset: () => void;
}
export const useMapStore = create<MapState>()(persist((set) => ({
  stateId: null, selectedAreaId: null, selectedLandmarkId: null, visits: {},
  setState: (stateId) => set({ stateId, selectedAreaId: null, selectedLandmarkId: null }),
  selectArea: (id) => set({ selectedAreaId: id, selectedLandmarkId: null }),
  selectLandmark: (id) => set({ selectedLandmarkId: id, selectedAreaId: null }),
  recordVisit: (id) => set((s) => ({ visits: { ...s.visits, [id]: (s.visits[id] ?? 0) + 1 } })),
  reset: () => set({ selectedAreaId: null, selectedLandmarkId: null, visits: {} }),
}), { name: 'nigerialife.map', version: 1, partialize: (s) => ({ stateId: s.stateId, visits: s.visits }) }));

/** The state currently in view, resolved against the registry. */
export const currentStateId = () => useMapStore.getState().stateId ?? firstStateId();
export const useStateId = () => useMapStore((s) => s.stateId) ?? firstStateId();
