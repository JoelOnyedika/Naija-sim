import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BOTTOM_STYLES, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import type { Appearance, BottomStyle, TopStyle } from '@/types/game';

export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#8A5A3C', hairStyle: 'lowcut', hairColor: '#0E0B0A', top: 'tee', topColor: '#FFC21A', bottom: 'jeans', bottomColor: '#2B4C7E',
};

interface CharacterState {
  created: boolean;
  appearance: Appearance;
  ownedClothes: string[];
  set: (patch: Partial<Appearance>) => void;
  randomize: () => void;
  finish: () => void;
  wear: (slot: 'top' | 'bottom', style: TopStyle | BottomStyle, color: string) => void;
  own: (id: string) => void;
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const useCharacterStore = create<CharacterState>()(persist((set) => ({
  created: false, appearance: DEFAULT_APPEARANCE, ownedClothes: [],
  set: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
  randomize: () => set((s) => ({
    appearance: {
      ...s.appearance, skin: pick(SKIN_TONES), hairStyle: pick(HAIR_STYLES).id, hairColor: pick(HAIR_COLORS),
      top: pick(TOP_STYLES).id, topColor: pick(CLOTH_COLORS), bottom: pick(BOTTOM_STYLES).id, bottomColor: pick(CLOTH_COLORS),
    },
  })),
  finish: () => set({ created: true }),
  wear: (slot, style, color) => set((s) => ({ appearance: { ...s.appearance, ...(slot === 'top' ? { top: style as TopStyle, topColor: color } : { bottom: style as BottomStyle, bottomColor: color }) } })),
  own: (id) => set((s) => (s.ownedClothes.includes(id) ? s : { ownedClothes: [...s.ownedClothes, id] })),
}), { name: 'nigerialife.character', version: 1 }));
