import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The player's work life. One job at a time; progress in each career is remembered if they switch away. */
export interface CareerProgress { rank: number; shiftsInRank: number; totalShifts: number }
export interface CareerEvent { careerId: string; kind: 'hired' | 'promoted' | 'quit'; rank: number; at: number }
interface CareerState {
  /** The current job, or null when unemployed. */
  employed: { careerId: string; since: number } | null;
  progress: Record<string, CareerProgress>;
  /** Offers from applications, waiting to be accepted: careerId to the rank offered. */
  offers: Record<string, { rank: number; at: number }>;
  history: CareerEvent[];
  /** Careers where a promotion notice was already sent for the current rank. */
  notified: Record<string, number>;
  reset: () => void;
}
const fresh = () => ({ employed: null, progress: {}, offers: {}, history: [], notified: {} });
export const useCareerStore = create<CareerState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.career', version: 1 }));
