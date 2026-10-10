import type { BottomStyle, HairStyle, TopStyle } from '@/types/game';

export const SKIN_TONES = ['#F1C9A5', '#D9A273', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'];
export const HAIR_COLORS = ['#0E0B0A', '#2B1B14', '#6B3F23', '#B9892F', '#C23B3B', '#5A3E9C', '#E9E4DA'];
export const CLOTH_COLORS = ['#FFC21A', '#0B8F4D', '#FFFFFF', '#1B1F24', '#2B4C7E', '#C23B3B', '#E4572E', '#8A63D2', '#19C3A6'];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'bald', label: 'Bald' }, { id: 'lowcut', label: 'Low cut' }, { id: 'afro', label: 'Afro' },
  { id: 'braids', label: 'Braids' }, { id: 'dreads', label: 'Dreads' }, { id: 'bun', label: 'Bun' },
];
export const TOP_STYLES: { id: TopStyle; label: string }[] = [
  { id: 'tee', label: 'T-shirt' }, { id: 'hoodie', label: 'Hoodie' }, { id: 'kaftan', label: 'Kaftan' }, { id: 'jersey', label: 'Jersey' },
];
export const BOTTOM_STYLES: { id: BottomStyle; label: string }[] = [
  { id: 'jeans', label: 'Jeans' }, { id: 'shorts', label: 'Shorts' }, { id: 'trousers', label: 'Trousers' }, { id: 'skirt', label: 'Skirt' },
];

export interface BoutiqueItem { id: string; name: string; slot: 'top' | 'bottom'; style: TopStyle | BottomStyle; color: string; price: number; glyph: string }
export const BOUTIQUE: BoutiqueItem[] = [
  { id: 'b-kaftan-gold', name: 'Gold kaftan', slot: 'top', style: 'kaftan', color: '#E5A400', price: 45000, glyph: '👘' },
  { id: 'b-kaftan-white', name: 'White senator kaftan', slot: 'top', style: 'kaftan', color: '#F4F1EA', price: 60000, glyph: '👘' },
  { id: 'b-hoodie-green', name: 'Naija green hoodie', slot: 'top', style: 'hoodie', color: '#0B8F4D', price: 28000, glyph: '🧥' },
  { id: 'b-jersey-eagles', name: 'Super Eagles-style jersey', slot: 'top', style: 'jersey', color: '#0B8F4D', price: 22000, glyph: '👕' },
  { id: 'b-tee-black', name: 'Black tee', slot: 'top', style: 'tee', color: '#1B1F24', price: 8000, glyph: '👕' },
  { id: 'b-jeans-blue', name: 'Blue denim jeans', slot: 'bottom', style: 'jeans', color: '#2B4C7E', price: 18000, glyph: '👖' },
  { id: 'b-trousers-black', name: 'Black trousers', slot: 'bottom', style: 'trousers', color: '#1B1F24', price: 24000, glyph: '👖' },
  { id: 'b-shorts-white', name: 'White shorts', slot: 'bottom', style: 'shorts', color: '#F4F1EA', price: 9000, glyph: '🩳' },
];
