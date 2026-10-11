import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SkillId = 'coding';
export const SKILLS: { id: SkillId; name: string; icon: string }[] = [{ id: 'coding', name: 'Coding', icon: '💻' }];

/** XP needed for each level grows gently: level n needs 20 * n * (n - 1) / 2 + ... see levelOf. */
export const levelOf = (xp: number) => Math.floor((1 + Math.sqrt(1 + (8 * xp) / 20)) / 2);
/** XP at which `level` starts. */
export const xpForLevel = (level: number) => (20 * level * (level - 1)) / 2;

interface SkillState { xp: Record<SkillId, number>; add: (id: SkillId, xp: number) => { before: number; after: number }; reset: () => void }
export const useSkillStore = create<SkillState>()(persist((set, get) => ({
  xp: { coding: 0 },
  add: (id, xp) => {
    const before = levelOf(get().xp[id] ?? 0);
    set((s) => ({ xp: { ...s.xp, [id]: (s.xp[id] ?? 0) + xp } }));
    return { before, after: levelOf(get().xp[id]) };
  },
  reset: () => set({ xp: { coding: 0 } }),
}), { name: 'nigerialife.skills', version: 1 }));
