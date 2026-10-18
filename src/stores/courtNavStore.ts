import { create } from 'zustand';

/** One-shot navigation hint (not saved): Police sets it so Court opens straight on a case. */
export const useCourtNav = create<{ caseId: string | null; go: (id: string | null) => void }>((set) => ({ caseId: null, go: (caseId) => set({ caseId }) }));
