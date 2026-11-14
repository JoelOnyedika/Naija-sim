import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJsonStorage } from '@/core/safeStorage';
import type { Flags, Grade, Stage } from '@/data/story';
import type { ExamState } from '@/game/exam';

export type Recruit = 'none' | 'met' | 'blending' | 'offered' | 'invited' | 'member' | 'ended';
export interface Dialogue { nodeId: string; line: number; /** the line is fully typed out */ }
export interface Confraternity { member: boolean; rank: number; reputation: number; alias: string; joinedAt: number }

export interface StoryState {
  flags: Flags;
  /** Index into MISSIONS; MISSIONS.length means the Campus Life hub. */
  mission: number;
  /** Progress per step id (a count). */
  steps: Record<string, number>;
  hubCount: number; hubRounds: number;
  /** Total campus tasks done, and how many since the last "blending in" scene. */
  tasksDone: number; tasksSinceScene: number;
  /** Real seconds spent on campus, plus when the current visit began (null = not there). */
  campusSeconds: number; campusSince: number | null;
  /** The guided plot stage (data/story.ts). Saved; transient scenes are normalised again after a reload (game/story.ts restoreStory). */
  stage: Stage; reoffers: number;
  recruit: Recruit; trust: number; refusedCount: number; moreAsked: number; lastPressureAt: number;
  /** Game minute of the initiation, how many times it was missed, and whether the "follow me" scene already ran for it. */
  initiationAt: number | null; missed: number;
  grade: Grade | null;
  confraternity: Confraternity;
  /** Things a member owns (the bracelet). Guns live in weaponStore. */
  items: string[];
  /** Transient: dialogue on screen, and the exam sheet. Not saved. */
  dialogue: Dialogue | null;
  exam: ExamState | null;
  /** Transient: the beating effect is running. */
  beating: boolean;
  set: (p: Partial<StoryState>) => void;
  setFlags: (f: Flags) => void;
  reset: () => void;
}
const blank = () => ({
  flags: {} as Flags, mission: 0, steps: {} as Record<string, number>, hubCount: 0, hubRounds: 0, tasksDone: 0, tasksSinceScene: 0,
  campusSeconds: 0, campusSince: null as number | null, stage: 'arrival' as Stage, reoffers: 0, recruit: 'none' as Recruit, trust: 0, refusedCount: 0, moreAsked: 0, lastPressureAt: 0,
  initiationAt: null as number | null, missed: 0, grade: null as Grade | null,
  confraternity: { member: false, rank: 0, reputation: 0, alias: '', joinedAt: 0 } as Confraternity, items: [] as string[],
  dialogue: null as Dialogue | null, exam: null as ExamState | null, beating: false,
});
export const useStoryStore = create<StoryState>()(persist((set) => ({
  ...blank(),
  set: (p) => set(p),
  setFlags: (f) => set((s) => ({ flags: { ...s.flags, ...f } })),
  reset: () => set(blank()),
}), { name: 'nigerialife.story', version: 2, storage: safeJsonStorage,
  // v2 (guided story): old saves get a stage from their recruit state
  migrate: (persisted, from) => { const p = (persisted ?? {}) as Partial<StoryState>; if (from < 2) p.stage = p.recruit === 'member' ? 'member' : p.recruit === 'ended' ? 'ended' : p.recruit === 'invited' ? 'meeting' : 'arrival'; return p as StoryState; },
  partialize: ({ dialogue: _d, exam: _e, beating: _b, set: _s, setFlags: _sf, reset: _r, ...rest }) => rest as never }));
