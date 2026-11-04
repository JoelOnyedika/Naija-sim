import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** One quest the player was given today. */
export interface QuestRun { id: string; progress: number; claimed: boolean }
/** A street moment waiting for an answer. */
export interface PendingEvent { eventId: string; startedAt: number; seconds: number }

interface DailyState {
  /** Local calendar day (YYYY-MM-DD) the quests below belong to. */
  dayKey: string;
  quests: QuestRun[];
  bonusClaimed: boolean;
  /** Weekly goals: the week they belong to (Monday date), the three goals and the chest. */
  weekKey: string;
  weekly: QuestRun[];
  weeklyBonusClaimed: boolean;
  /** The week the free streak shield was last spent in. */
  shieldWeek: string;
  /** Last day the login reward was claimed, and the current streak. */
  lastClaimDay: string | null;
  streak: number;
  /** Next position on the 7-day calendar (0..6). */
  cycleIndex: number;
  /** Street moments: when each one last appeared (ms), when the next may start, how many were answered in total. */
  lastSeen: Record<string, number>;
  nextEventAt: number;
  pending: PendingEvent | null;
  answered: number;
  /** The daily sheet is open. Not persisted. */
  sheetOpen: boolean;
  set: (p: Partial<DailyState>) => void;
  reset: () => void;
  /** A new life clears street-moment history but keeps the calendar, streak and today's quests, so starting over cannot re-claim rewards. */
  newLife: () => void;
}
const fresh = () => ({ dayKey: '', quests: [] as QuestRun[], bonusClaimed: false, weekKey: '', weekly: [] as QuestRun[], weeklyBonusClaimed: false, shieldWeek: '', lastClaimDay: null as string | null, streak: 0, cycleIndex: 0, lastSeen: {} as Record<string, number>, nextEventAt: 0, pending: null as PendingEvent | null, answered: 0 });

export const useDailyStore = create<DailyState>()(persist((set) => ({
  ...fresh(), sheetOpen: false,
  set: (p) => set(p),
  reset: () => set({ ...fresh(), sheetOpen: false }),
  newLife: () => set({ lastSeen: {}, nextEventAt: 0, pending: null, answered: 0, sheetOpen: false }),
}), { name: 'nigerialife.daily', version: 1, partialize: ({ sheetOpen: _s, pending: _p, set: _set, reset: _reset, newLife: _n, ...rest }) => rest }));
