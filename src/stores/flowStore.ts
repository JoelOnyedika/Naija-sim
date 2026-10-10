import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Phase = 'landing' | 'login' | 'signup' | 'character' | 'roulette' | 'summary' | 'game';
interface FlowState { phase: Phase; go: (p: Phase) => void }
export const useFlowStore = create<FlowState>()(persist((set) => ({
  phase: 'landing', go: (phase) => set({ phase }),
}), { name: 'nigerialife.flow', version: 1 }));
