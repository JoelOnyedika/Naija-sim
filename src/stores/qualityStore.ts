import { create } from 'zustand';

/**
 * Runtime graphics tier, chosen automatically by PerfGovernor from measured frame times. Deliberately not persisted:
 * the right tier depends on the device and what is on screen right now, so every session measures again.
 * 0 = best. Each step down lowers resolution (and finally drops shadow maps). Room lights and lamp glow are the look of
 * the game, so `nightLights` is true in EVERY tier: a slow phone must never lose them (that was the "lighting disappears
 * after a few seconds" bug, when the governor reached the old `minimal` tier).
 */
export const QUALITY_TIERS = [
  { name: 'high', dprCap: 1.75, shadows: true, nightLights: true },
  { name: 'medium', dprCap: 1.25, shadows: true, nightLights: true },
  { name: 'low', dprCap: 1, shadows: true, nightLights: true },
  { name: 'minimal', dprCap: 0.85, shadows: false, nightLights: true },
] as const;

interface QualityState { tier: number; setTier: (t: number) => void }
export const useQualityStore = create<QualityState>((set) => ({
  tier: 0,
  setTier: (t) => set({ tier: Math.max(0, Math.min(QUALITY_TIERS.length - 1, t)) }),
}));
