import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clamp } from '@/core/format';
import { CONFIG } from '@/data/config';
import { STAT_KEYS, type Effects, type Stats } from '@/types/game';
import type { SkillId } from './skillStore';

export const FRESH_STATS: Stats = { hunger: 80, thirst: 80, bladder: 85, happiness: 70, energy: 90, hygiene: 85, health: 100, social: 55, charisma: 5 };

export interface Activity {
  id: string;
  label: string;
  seconds: number;
  elapsed: number;
  /** Totals spread evenly over the duration. */
  effects: Effects;
  pose: 'stand' | 'sit' | 'sleep';
  /** uid of the placed item the character walks to. */
  targetUid?: string;
  kind: 'use' | 'job' | 'social' | 'visit';
  doneMessage?: string;
  /** Fired when finished, e.g. a task event. */
  event?: string;
  /** Set on career shifts, so finishing one counts toward that career's progress. */
  careerId?: string;
  /** Paid out at the end (jobs). */
  payout?: number;
  /** Pet care action to record when this finishes. */
  petAction?: 'pet' | 'feed' | 'play';
  slept?: boolean;
  /** Skill XP granted on completion (practice items). */
  skill?: { id: SkillId; xp: number };
  /** True while a house party is running. */
  party?: boolean;
}

interface StatsState {
  stats: Stats;
  activity: Activity | null;
  apply: (e: Effects, scale?: number) => Effects;
  start: (a: Omit<Activity, 'id' | 'elapsed'>) => boolean;
  stop: () => void;
  tick: (dt: number) => Activity | null;
  reset: () => void;
}

const sleepGain = (a: Activity) => a.effects.energy ?? 0;

export const useStatsStore = create<StatsState>()(persist((set, get) => ({
  stats: { ...FRESH_STATS }, activity: null,

  apply: (e, scale = 1) => {
    const stats = { ...get().stats };
    for (const k of STAT_KEYS) if (e[k]) stats[k] = clamp(stats[k] + (e[k] as number) * scale, 0, 100);
    set({ stats });
    return e;
  },

  start: (a) => {
    if (get().activity) return false;
    set({ activity: { ...a, id: Math.random().toString(36).slice(2), elapsed: 0 } });
    return true;
  },
  stop: () => set({ activity: null }),

  /** Advances needs and the current activity. Returns the activity if it just finished. */
  tick: (dt) => {
    const s = get();
    const stats = { ...s.stats };
    const sleeping = s.activity?.pose === 'sleep';
    const mult = sleeping ? 0.35 : 1;
    for (const [k, perMin] of Object.entries(CONFIG.decayPerMin)) {
      const key = k as keyof Stats;
      stats[key] -= (perMin / 60) * dt * mult;
    }
    // health: suffers when basics hit zero, slowly recovers when they are fine
    const low = [stats.hunger, stats.thirst, stats.hygiene].filter((v) => v < 12).length;
    if (low > 0) stats.health -= 0.06 * low * dt;
    else if (stats.hunger > 40 && stats.thirst > 40 && stats.hygiene > 40) stats.health += 0.03 * dt;
    if (stats.bladder < 5) { stats.happiness -= 0.1 * dt; stats.hygiene -= 0.05 * dt; }

    let activity = s.activity;
    let finished: Activity | null = null;
    if (activity) {
      const step = Math.min(dt, activity.seconds - activity.elapsed);
      const frac = activity.seconds > 0 ? step / activity.seconds : 1;
      for (const k of STAT_KEYS) if (activity.effects[k]) stats[k] += (activity.effects[k] as number) * frac;
      activity = { ...activity, elapsed: activity.elapsed + step };
      if (activity.elapsed >= activity.seconds - 1e-6) { finished = activity; activity = null; }
    }
    for (const k of STAT_KEYS) stats[k] = clamp(stats[k], 0, 100);
    set({ stats, activity });
    return finished;
  },
  reset: () => set({ stats: { ...FRESH_STATS }, activity: null }),
}), { name: 'nigerialife.stats', version: 1, partialize: (s) => ({ stats: s.stats }) }));

export { sleepGain };
export const moodOf = (s: Stats) => {
  const avg = (s.hunger + s.thirst + s.bladder + s.happiness + s.energy + s.hygiene) / 6;
  if (s.energy < 20) return { label: 'Tired', emoji: '😴' };
  if (s.hunger < 20 || s.thirst < 20) return { label: 'Hungry', emoji: '😩' };
  if (s.bladder < 15) return { label: 'Pressed', emoji: '😖' };
  if (avg > 75) return { label: 'Happy', emoji: '😊' };
  if (avg > 55) return { label: 'Okay', emoji: '🙂' };
  if (avg > 35) return { label: 'Stressed', emoji: '😕' };
  return { label: 'Low', emoji: '😞' };
};
