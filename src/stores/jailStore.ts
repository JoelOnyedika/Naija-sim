import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CRIME } from '@/data/balance';

/**
 * Criminal record and jail sentence. The sentence is two real timestamps (start, end), NOT a countdown: closing the game does not
 * pause it, and on return the remaining time is computed from the clock. Client-side only: a player can change their device clock,
 * so a multiplayer server must hold these timestamps (see CrimeAuthority in game/crime.ts).
 */
export interface Sentence { startAt: number; endAt: number; minutes: number; reason: string }
interface JailState {
  /** Wanted level, 0..CRIME.maxCriminality. Raises sentences and lowers pickpocket success. */
  criminality: number;
  sentence: Sentence | null;
  lastAttemptAt: number;
  record: { attempts: number; thefts: number; arrests: number; stolen: number };
  patch: (p: Partial<Pick<JailState, 'criminality' | 'sentence' | 'lastAttemptAt'>>) => void;
  note: (kind: 'attempt' | 'theft' | 'arrest', amount?: number) => void;
  reset: () => void;
}
const blank = () => ({ criminality: 0, sentence: null as Sentence | null, lastAttemptAt: 0, record: { attempts: 0, thefts: 0, arrests: 0, stolen: 0 } });
export const clampCriminality = (n: number) => Math.min(CRIME.maxCriminality, Math.max(0, Number.isFinite(n) ? n : 0));

export const useJailStore = create<JailState>()(persist((set) => ({
  ...blank(),
  patch: (p) => set((s) => ({ ...s, ...p, criminality: p.criminality === undefined ? s.criminality : clampCriminality(p.criminality) })),
  note: (kind, amount = 0) => set((s) => ({ record: { attempts: s.record.attempts + (kind === 'attempt' ? 1 : 0), thefts: s.record.thefts + (kind === 'theft' ? 1 : 0), arrests: s.record.arrests + (kind === 'arrest' ? 1 : 0), stolen: s.record.stolen + (kind === 'theft' ? Math.max(0, amount) : 0) } })),
  reset: () => set(blank()),
}), { name: 'nigerialife.jail', version: 1 }));
