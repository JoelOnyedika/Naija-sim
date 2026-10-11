import type { FloorKind, WallFinish } from '@/types/world';

export type FinishKind = 'floor' | 'wall';

/** A flooring option. `tint` multiplies the base texture so one texture can give several looks. */
export interface FloorFinish { id: string; kind: 'floor'; name: string; category: 'basic' | 'tile' | 'wood' | 'stone'; price: number; floor: FloorKind; tint?: string; swatch: string; rough?: number }
/** A wall option: plain paint, wallpaper (patterned) or a premium finish. */
export interface WallFinishDef { id: string; kind: 'wall'; name: string; category: 'paint' | 'wallpaper' | 'premium'; price: number; color: string; finish: WallFinish; pattern?: 'stripes' | 'dots' | 'diamond'; accent?: string; swatch: string }
export type FinishDef = FloorFinish | WallFinishDef;

/** Prices are per home and scaled to this game's economy (furniture runs from a few thousand to ~650k). */
export const FLOORS: FloorFinish[] = [
  { id: 'floor_cement', kind: 'floor', name: 'Plain cement', category: 'basic', price: 0, floor: 'cement', swatch: '#A59E92' },
  { id: 'floor_tile', kind: 'floor', name: 'Plain tile', category: 'tile', price: 150_000, floor: 'tile', swatch: '#D9D3C4' },
  { id: 'floor_terrazzo', kind: 'floor', name: 'Terrazzo', category: 'tile', price: 380_000, floor: 'terrazzo', swatch: '#C9BFB0' },
  { id: 'floor_wood_light', kind: 'floor', name: 'Light wood', category: 'wood', price: 520_000, floor: 'wood', swatch: '#C79A62' },
  { id: 'floor_wood_dark', kind: 'floor', name: 'Dark wood', category: 'wood', price: 640_000, floor: 'wood', tint: '#8F6B55', swatch: '#7A5640' },
  { id: 'floor_marble_white', kind: 'floor', name: 'White marble', category: 'stone', price: 1_200_000, floor: 'marble', swatch: '#EDEDEA', rough: 0.25 },
  { id: 'floor_marble_black', kind: 'floor', name: 'Black marble', category: 'stone', price: 1_500_000, floor: 'marble', tint: '#4A4A50', swatch: '#34343A', rough: 0.25 },
];

export const WALLS: WallFinishDef[] = [
  { id: 'wall_cream', kind: 'wall', name: 'Cream paint', category: 'paint', price: 40_000, color: '#EFE6D2', finish: 'painted', swatch: '#EFE6D2' },
  { id: 'wall_sky', kind: 'wall', name: 'Sky blue paint', category: 'paint', price: 40_000, color: '#B9D4EA', finish: 'painted', swatch: '#B9D4EA' },
  { id: 'wall_sage', kind: 'wall', name: 'Sage paint', category: 'paint', price: 40_000, color: '#B7CDB0', finish: 'painted', swatch: '#B7CDB0' },
  { id: 'wall_terracotta', kind: 'wall', name: 'Terracotta paint', category: 'paint', price: 45_000, color: '#D9946F', finish: 'painted', swatch: '#D9946F' },
  { id: 'wall_charcoal', kind: 'wall', name: 'Charcoal paint', category: 'paint', price: 55_000, color: '#4A4F57', finish: 'painted', swatch: '#4A4F57' },
  { id: 'wall_stripes', kind: 'wall', name: 'Striped wallpaper', category: 'wallpaper', price: 120_000, color: '#F1EADB', accent: '#C9B98F', pattern: 'stripes', finish: 'painted', swatch: '#D8CBA6' },
  { id: 'wall_dots', kind: 'wall', name: 'Dotted wallpaper', category: 'wallpaper', price: 130_000, color: '#DCE8E4', accent: '#7FA89C', pattern: 'dots', finish: 'painted', swatch: '#A9C7BE' },
  { id: 'wall_diamond', kind: 'wall', name: 'Diamond wallpaper', category: 'wallpaper', price: 160_000, color: '#2E3A4D', accent: '#B8892F', pattern: 'diamond', finish: 'painted', swatch: '#5B5A58' },
  { id: 'wall_marble', kind: 'wall', name: 'Marble cladding', category: 'premium', price: 900_000, color: '#F4F2EC', finish: 'marble', swatch: '#F4F2EC' },
];

const all: FinishDef[] = [...FLOORS, ...WALLS];
export const getFinish = (id: string) => all.find((f) => f.id === id);
/** What every home starts with: nothing applied, so the layout's own floors and walls show. */
export const FINISH_TABS: { id: 'floors' | 'walls'; label: string; icon: string; kind: FinishKind }[] = [
  { id: 'floors', label: 'Floors', icon: '🟫', kind: 'floor' },
  { id: 'walls', label: 'Walls', icon: '🧱', kind: 'wall' },
];
