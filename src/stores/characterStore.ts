import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyItem, type BoutiqueItem, ACCESSORIES, BEARD_STYLES, BOTTOM_STYLES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SHOE_STYLES, SKIN_TONES, TOP_STYLES } from '@/data/clothing';
import type { Appearance } from '@/types/game';

/** The new character look (v37): bowl cut, black vest over a light tee, gold ear stud. Everyone's existing character is moved to it once. */
export const NEW_LOOK = { hairStyle: 'bowl', top: 'vest', topColor: '#1B1F24', accessory: 'stud' } as const;
export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#8A5A3C', hairStyle: 'bowl', hairColor: '#0E0B0A', top: 'vest', topColor: '#1B1F24', bottom: 'jeans', bottomColor: '#2B4C7E', shoes: 'sneakers', shoeColor: '#F4F1EA', accessory: 'stud', body: 'masc', eye: EYE_COLORS[0], beard: 'none',
};

interface CharacterState {
  created: boolean;
  /** The character's display name, chosen on the creation screen. */
  name: string;
  setName: (n: string) => void;
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
  created: false, name: '', appearance: DEFAULT_APPEARANCE, ownedClothes: [],
  setName: (name) => set({ name: name.slice(0, 16) }),
  set: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
  randomize: () => set((s) => {
    const body = Math.random() < 0.5 ? 'masc' as const : 'femme' as const;
    return { appearance: {
      ...s.appearance, body, eye: pick(EYE_COLORS), beard: body === 'masc' && Math.random() < 0.45 ? pick(BEARD_STYLES).id : 'none',
      skin: pick(SKIN_TONES), hairStyle: pick(HAIR_STYLES).id, hairColor: pick(HAIR_COLORS),
      top: pick(TOP_STYLES).id, topColor: pick(CLOTH_COLORS), bottom: pick(BOTTOM_STYLES).id, bottomColor: pick(CLOTH_COLORS),
      shoes: pick(SHOE_STYLES).id, shoeColor: pick(CLOTH_COLORS), accessory: pick(ACCESSORIES).id,
    } };
  }),
  finish: () => set({ created: true }),
  equip: (item) => set((s) => ({ appearance: applyItem(s.appearance, item) })),
  own: (id) => set((s) => (s.ownedClothes.includes(id) ? s : { ownedClothes: [...s.ownedClothes, id] })),
}), {
  name: 'nigerialife.character', version: 2,
  // v37: move every saved character to the new look once. Skin, eyes, beard, trousers and shoes stay as they were.
  migrate: (persisted, from) => {
    const p = (persisted ?? {}) as Partial<CharacterState>;
    if (from < 2 && p.appearance) p.appearance = { ...p.appearance, ...NEW_LOOK };
    return p as CharacterState;
  },
  // Older saves lack the newer appearance fields (shoes, accessory...): fill them from the defaults instead of dropping the save.
  merge: (saved, current) => {
    const p = (saved ?? {}) as Partial<CharacterState>;
    return { ...current, ...p, appearance: { ...current.appearance, ...(p.appearance ?? {}) } };
  },
}));
