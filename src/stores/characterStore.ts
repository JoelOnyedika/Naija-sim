import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyItem, type BoutiqueItem, ACCESSORIES, BOTTOM_STYLES, CLOTH_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import type { Appearance } from '@/types/game';

export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#8A5A3C', hairStyle: 'lowcut', hairColor: '#0E0B0A', top: 'tee', topColor: '#FFC21A', bottom: 'jeans', bottomColor: '#2B4C7E', shoes: 'sneakers', shoeColor: '#F4F1EA', accessory: 'none',
};

interface CharacterState {
  created: boolean;
  appearance: Appearance;
  ownedClothes: string[];
  set: (patch: Partial<Appearance>) => void;
  randomize: () => void;
  finish: () => void;
  /** Put on a boutique item (the caller has already paid for it, if it was not owned). */
  equip: (item: BoutiqueItem) => void;
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
      shoes: pick(SHOE_STYLES).id, shoeColor: pick(CLOTH_COLORS), accessory: pick(ACCESSORIES).id,
    },
  })),
  finish: () => set({ created: true }),
  equip: (item) => set((s) => ({ appearance: applyItem(s.appearance, item) })),
  own: (id) => set((s) => (s.ownedClothes.includes(id) ? s : { ownedClothes: [...s.ownedClothes, id] })),
}), {
  name: 'nigerialife.character', version: 1,
  // Older saves lack the newer appearance fields (shoes, accessory...): fill them from the defaults instead of dropping the save.
  merge: (saved, current) => {
    const p = (saved ?? {}) as Partial<CharacterState>;
    return { ...current, ...p, appearance: { ...current.appearance, ...(p.appearance ?? {}) } };
  },
}));
