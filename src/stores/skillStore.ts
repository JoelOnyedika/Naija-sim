import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Skills (one system for the whole game). Charisma is NOT a skill: it is a stat in statsStore and careers read it from there.
 * XP is stored per skill; missing keys (older saves) count as 0.
 */
export type SkillId = 'coding' | 'cooking' | 'fitness' | 'driving' | 'communication' | 'finance' | 'creativity' | 'teaching' | 'business';
export const SKILLS: { id: SkillId; name: string; icon: string }[] = [
  { id: 'coding', name: 'Coding', icon: '💻' }, { id: 'cooking', name: 'Cooking', icon: '🍳' }, { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'driving', name: 'Driving', icon: '🚗' }, { id: 'communication', name: 'Communication', icon: '🗣️' }, { id: 'finance', name: 'Finance', icon: '📊' },
  { id: 'creativity', name: 'Creativity', icon: '🎨' }, { id: 'teaching', name: 'Teaching', icon: '📚' }, { id: 'business', name: 'Business', icon: '💼' },
];
export const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)?.name ?? id;

/** Level n starts at 10 * n * (n - 1) XP: level 2 at 20, level 3 at 60, level 4 at 120. */
export const levelOf = (xp: number) => Math.floor((1 + Math.sqrt(1 + (8 * xp) / 20)) / 2);
/** XP at which `level` starts. */
export const xpForLevel = (level: number) => (20 * level * (level - 1)) / 2;

type XpMap = Partial<Record<SkillId, number>>;
interface SkillState { xp: XpMap; add: (id: SkillId, xp: number) => { before: number; after: number }; level: (id: SkillId) => number; reset: () => void }
export const useSkillStore = create<SkillState>()(persist((set, get) => ({
  xp: { coding: 0 },
  add: (id, xp) => {
    const before = levelOf(get().xp[id] ?? 0);
    set((s) => ({ xp: { ...s.xp, [id]: (s.xp[id] ?? 0) + xp } }));
    return { before, after: levelOf(get().xp[id] ?? 0) };
  },
  level: (id) => levelOf(get().xp[id] ?? 0),
  reset: () => set({ xp: { coding: 0 } }),
}), { name: 'nigerialife.skills', version: 1 }));
