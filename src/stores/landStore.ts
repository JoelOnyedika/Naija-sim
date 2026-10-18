import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OwnedPlot { cost: number; value: number; boughtAt: number }
export interface LandEvent { id: string; plotId: string; kind: 'bought' | 'sold'; amount: number; at: number }
/** Land the player owns, in EVERY city (keyed by plot id, never by the selected city). */
interface LandState {
  owned: Record<string, OwnedPlot>;
  /** Total gain/loss from plots already sold (sale proceeds minus what they cost). */
  realized: number;
  history: LandEvent[];
  /** Last game week the weekly appreciation ran for (guards against doing it twice). */
  lastGrowthPeriod: number;
  reset: () => void;
}
const fresh = () => ({ owned: {}, realized: 0, history: [], lastGrowthPeriod: -1 });
export const useLandStore = create<LandState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.land', version: 1 }));
