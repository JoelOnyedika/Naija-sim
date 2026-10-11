import type { Accessory, Appearance, BottomStyle, HairStyle, ShoeStyle, TopStyle } from '@/types/game';

export const SKIN_TONES = ['#F1C9A5', '#D9A273', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'];
export const HAIR_COLORS = ['#0E0B0A', '#2B1B14', '#6B3F23', '#B9892F', '#C23B3B', '#5A3E9C', '#E9E4DA'];
export const CLOTH_COLORS = ['#FFC21A', '#0B8F4D', '#FFFFFF', '#1B1F24', '#2B4C7E', '#C23B3B', '#E4572E', '#8A63D2', '#19C3A6'];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'bald', label: 'Bald' }, { id: 'lowcut', label: 'Low cut' }, { id: 'fade', label: 'Fade' }, { id: 'afro', label: 'Afro' },
  { id: 'braids', label: 'Braids' }, { id: 'dreads', label: 'Locs' }, { id: 'bun', label: 'Bun' },
];
export const TOP_STYLES: { id: TopStyle; label: string }[] = [
  { id: 'tee', label: 'T-shirt' }, { id: 'shirt', label: 'Shirt' }, { id: 'hoodie', label: 'Hoodie' }, { id: 'jacket', label: 'Jacket' }, { id: 'kaftan', label: 'Kaftan' }, { id: 'jersey', label: 'Jersey' },
];
export const BOTTOM_STYLES: { id: BottomStyle; label: string }[] = [
  { id: 'jeans', label: 'Jeans' }, { id: 'shorts', label: 'Shorts' }, { id: 'trousers', label: 'Trousers' }, { id: 'skirt', label: 'Skirt' }, { id: 'dress', label: 'Dress' },
];

export const SHOE_STYLES: { id: ShoeStyle; label: string }[] = [
  { id: 'sneakers', label: 'Sneakers' }, { id: 'boots', label: 'Boots' }, { id: 'sandals', label: 'Sandals' }, { id: 'barefoot', label: 'Barefoot' },
];
export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'glasses', label: 'Glasses' }, { id: 'cap', label: 'Cap' }, { id: 'chain', label: 'Chain' },
];

export type BoutiqueSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'extra';
export interface BoutiqueItem { id: string; name: string; slot: BoutiqueSlot; style: string; color?: string; price: number; glyph: string }
export const BOUTIQUE: BoutiqueItem[] = [
  { id: 'b-tee-black', name: 'Black tee', slot: 'top', style: 'tee', color: '#1B1F24', price: 8000, glyph: '👕' },
  { id: 'b-shirt-white', name: 'White office shirt', slot: 'top', style: 'shirt', color: '#F4F1EA', price: 16000, glyph: '👔' },
  { id: 'b-hoodie-green', name: 'Green hoodie', slot: 'top', style: 'hoodie', color: '#0B8F4D', price: 28000, glyph: '🧥' },
  { id: 'b-jacket-denim', name: 'Denim jacket', slot: 'top', style: 'jacket', color: '#2B4C7E', price: 38000, glyph: '🧥' },
  { id: 'b-jersey-eagles', name: 'Super Eagles-style jersey', slot: 'top', style: 'jersey', color: '#0B8F4D', price: 22000, glyph: '⚽' },
  { id: 'b-kaftan-gold', name: 'Gold kaftan', slot: 'top', style: 'kaftan', color: '#E5A400', price: 45000, glyph: '👘' },
  { id: 'b-kaftan-white', name: 'White senator kaftan', slot: 'top', style: 'kaftan', color: '#F4F1EA', price: 60000, glyph: '👘' },
  { id: 'b-jeans-blue', name: 'Blue denim jeans', slot: 'bottom', style: 'jeans', color: '#2B4C7E', price: 18000, glyph: '👖' },
  { id: 'b-trousers-black', name: 'Black trousers', slot: 'bottom', style: 'trousers', color: '#1B1F24', price: 24000, glyph: '👖' },
  { id: 'b-shorts-white', name: 'White shorts', slot: 'bottom', style: 'shorts', color: '#F4F1EA', price: 9000, glyph: '🩳' },
  { id: 'b-skirt-red', name: 'Red skirt', slot: 'bottom', style: 'skirt', color: '#C23B3B', price: 15000, glyph: '👗' },
  { id: 'b-dress-purple', name: 'Purple dress', slot: 'bottom', style: 'dress', color: '#8A63D2', price: 35000, glyph: '👗' },
  { id: 'b-sneakers-white', name: 'White sneakers', slot: 'shoes', style: 'sneakers', color: '#F4F1EA', price: 15000, glyph: '👟' },
  { id: 'b-boots-black', name: 'Black boots', slot: 'shoes', style: 'boots', color: '#1B1F24', price: 35000, glyph: '🥾' },
  { id: 'b-sandals-tan', name: 'Tan sandals', slot: 'shoes', style: 'sandals', color: '#B77B4E', price: 9000, glyph: '🩴' },
  { id: 'b-hair-fade', name: 'Fade', slot: 'hair', style: 'fade', price: 3000, glyph: '💈' },
  { id: 'b-hair-afro', name: 'Afro', slot: 'hair', style: 'afro', price: 5000, glyph: '💇' },
  { id: 'b-hair-braids', name: 'Braids', slot: 'hair', style: 'braids', price: 12000, glyph: '💇' },
  { id: 'b-hair-locs', name: 'Locs', slot: 'hair', style: 'dreads', price: 15000, glyph: '💇' },
  { id: 'b-hair-bun', name: 'Bun', slot: 'hair', style: 'bun', price: 4000, glyph: '💇' },
  { id: 'b-x-glasses', name: 'Round glasses', slot: 'extra', style: 'glasses', price: 10000, glyph: '👓' },
  { id: 'b-x-cap', name: 'Cap', slot: 'extra', style: 'cap', price: 8000, glyph: '🧢' },
  { id: 'b-x-chain', name: 'Gold chain', slot: 'extra', style: 'chain', price: 40000, glyph: '⛓️' },
];

/** What wearing an item does to an appearance. Shared by the Boutique preview and the real purchase. */
export function applyItem(a: Appearance, it: BoutiqueItem): Appearance {
  switch (it.slot) {
    case 'top': return { ...a, top: it.style as TopStyle, topColor: it.color ?? a.topColor, bottom: a.bottom === 'dress' ? 'jeans' : a.bottom };
    case 'bottom': return it.style === 'dress' ? { ...a, bottom: 'dress', topColor: it.color ?? a.topColor } : { ...a, bottom: it.style as BottomStyle, bottomColor: it.color ?? a.bottomColor };
    case 'shoes': return { ...a, shoes: it.style as ShoeStyle, shoeColor: it.color ?? a.shoeColor };
    case 'hair': return { ...a, hairStyle: it.style as HairStyle };
    case 'extra': return { ...a, accessory: it.style as Accessory };
  }
}
