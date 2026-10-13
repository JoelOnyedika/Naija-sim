import { create } from 'zustand';

/**
 * Runtime graphics tier, chosen automatically by PerfGovernor from measured frame times. Deliberately not persisted:
 * the right tier depends on the device and what is on screen right now, so every session measures again.
 * 0 = best. Each step down removes the next most expensive thing without touching gameplay.
 */
export const QUALITY_TIERS = [
  { name: 'high', dprCap: 1.75, shadows: true, nightLights: true },
  { name: 'medium', dprCap: 1.25, shadows: true, nightLights: true },
  { name: 'low', dprCap: 1, shadows: true, nightLights: true },
  { name: 'minimal', dprCap: 1, shadows: false, nightLights: false },
] as const;

interface QualityState { tier: number; setTier: (t: number) => void }
export const useQualityStore = create<QualityState>((set) => ({
  tier: 0,
  setTier: (t) => set({ tier: Math.max(0, Math.min(QUALITY_TIERS.length - 1, t)) }),
}));
