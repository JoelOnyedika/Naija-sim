import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Progress of the Mama Agbo chain and the owambe circuit (persisted; a new life starts them again). */
interface CircuitState {
  steps: { mama: number; owambe: number };
  ending: { mama: string | null; owambe: string | null };
  set: (p: Partial<Pick<CircuitState, 'steps' | 'ending'>>) => void; reset: () => void;
}
const fresh = () => ({ steps: { mama: 0, owambe: 0 }, ending: { mama: null as string | null, owambe: null as string | null } });
export const useCircuitStore = create<CircuitState>()(persist((set) => ({ ...fresh(), set: (p) => set(p), reset: () => set(fresh()) }), { name: 'nigerialife.circuits', version: 1, partialize: ({ set: _s, reset: _r, ...rest }) => rest }));
