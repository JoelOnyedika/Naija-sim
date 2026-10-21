import type { WallPattern } from '@/three/textures';
import type { FloorKind, WallFinish } from '@/types/world';

export type FinishKind = 'floor' | 'wall';

/** A flooring option. `tint` multiplies the base texture so one texture can give several looks. */
export interface FloorFinish { id: string; kind: 'floor'; name: string; category: 'basic' | 'tile' | 'wood' | 'stone'; price: number; floor: FloorKind; tint?: string; swatch: string; rough?: number }
/** A wall option: plain paint, wallpaper (patterned) or a premium finish. */
export type WallCategory = 'paint' | 'stripes' | 'geometric' | 'textured' | 'panel' | 'classic' | 'premium';
export interface WallFinishDef { id: string; kind: 'wall'; name: string; category: WallCategory; price: number; color: string; finish: WallFinish; pattern?: WallPattern; accent?: string; swatch: string; rough?: number }
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
  { id: 'wall_cream', kind: 'wall', name: 'Cream paint', category: 'paint', price: 40000, color: '#EFE6D2', finish: 'painted', swatch: '#EFE6D2' },
  { id: 'wall_sky', kind: 'wall', name: 'Sky blue paint', category: 'paint', price: 40000, color: '#B9D4EA', finish: 'painted', swatch: '#B9D4EA' },
  { id: 'wall_sage', kind: 'wall', name: 'Sage paint', category: 'paint', price: 40000, color: '#B7CDB0', finish: 'painted', swatch: '#B7CDB0' },
  { id: 'wall_terracotta', kind: 'wall', name: 'Terracotta paint', category: 'paint', price: 45000, color: '#D9946F', finish: 'painted', swatch: '#D9946F' },
  { id: 'wall_charcoal', kind: 'wall', name: 'Charcoal paint', category: 'paint', price: 55000, color: '#4A4F57', finish: 'painted', swatch: '#4A4F57' },
  { id: 'wall_white', kind: 'wall', name: 'Bright white paint', category: 'paint', price: 40000, color: '#F7F6F2', finish: 'painted', swatch: '#F7F6F2' },
  { id: 'wall_ivory', kind: 'wall', name: 'Ivory paint', category: 'paint', price: 40000, color: '#F3EBDD', finish: 'painted', swatch: '#F3EBDD' },
  { id: 'wall_blush', kind: 'wall', name: 'Blush pink paint', category: 'paint', price: 42000, color: '#EBC9C4', finish: 'painted', swatch: '#EBC9C4' },
  { id: 'wall_lavender', kind: 'wall', name: 'Lavender paint', category: 'paint', price: 42000, color: '#CFC6E3', finish: 'painted', swatch: '#CFC6E3' },
  { id: 'wall_mint', kind: 'wall', name: 'Mint paint', category: 'paint', price: 42000, color: '#C4E3D4', finish: 'painted', swatch: '#C4E3D4' },
  { id: 'wall_teal', kind: 'wall', name: 'Deep teal paint', category: 'paint', price: 55000, color: '#2F6F73', finish: 'painted', swatch: '#2F6F73' },
  { id: 'wall_navy', kind: 'wall', name: 'Navy paint', category: 'paint', price: 55000, color: '#26364F', finish: 'painted', swatch: '#26364F' },
  { id: 'wall_mustard', kind: 'wall', name: 'Mustard paint', category: 'paint', price: 48000, color: '#D9A93A', finish: 'painted', swatch: '#D9A93A' },
  { id: 'wall_olive', kind: 'wall', name: 'Olive paint', category: 'paint', price: 48000, color: '#7D8456', finish: 'painted', swatch: '#7D8456' },
  { id: 'wall_burgundy', kind: 'wall', name: 'Burgundy paint', category: 'paint', price: 58000, color: '#6E2A38', finish: 'painted', swatch: '#6E2A38' },
  { id: 'wall_coffee', kind: 'wall', name: 'Coffee brown paint', category: 'paint', price: 52000, color: '#6B4A38', finish: 'painted', swatch: '#6B4A38' },
  { id: 'wall_black', kind: 'wall', name: 'Matt black paint', category: 'paint', price: 60000, color: '#1F2125', finish: 'painted', swatch: '#1F2125' },
  { id: 'wall_stripes', kind: 'wall', name: 'Striped wallpaper', category: 'stripes', price: 120000, color: '#F1EADB', accent: '#C9B98F', pattern: 'stripes', finish: 'painted', swatch: '#D8CBA6' },
  { id: 'wall_pinstripe_navy', kind: 'wall', name: 'Navy pinstripe', category: 'stripes', price: 115000, color: '#E9ECF2', accent: '#26364F', pattern: 'pinstripe', finish: 'painted', swatch: '#9AA3B8' },
  { id: 'wall_pinstripe_black', kind: 'wall', name: 'Black pinstripe', category: 'stripes', price: 125000, color: '#F4F2EC', accent: '#1F2125', pattern: 'pinstripe', finish: 'painted', swatch: '#A8A6A0' },
  { id: 'wall_wide_sage', kind: 'wall', name: 'Wide sage stripes', category: 'stripes', price: 130000, color: '#EEF1E6', accent: '#B7CDB0', pattern: 'wide_stripes', finish: 'painted', swatch: '#C9D8C0' },
  { id: 'wall_wide_coral', kind: 'wall', name: 'Wide coral stripes', category: 'stripes', price: 130000, color: '#FBEFE6', accent: '#E9967A', pattern: 'wide_stripes', finish: 'painted', swatch: '#F0BFA8' },
  { id: 'wall_chevron_gold', kind: 'wall', name: 'Gold chevron', category: 'stripes', price: 170000, color: '#2B2E36', accent: '#C9A24A', pattern: 'chevron', finish: 'painted', swatch: '#7A683A' },
  { id: 'wall_herring_grey', kind: 'wall', name: 'Grey herringbone', category: 'stripes', price: 150000, color: '#E6E5E1', accent: '#9A9890', pattern: 'herringbone', finish: 'painted', swatch: '#BDBBB4' },
  { id: 'wall_dots', kind: 'wall', name: 'Dotted wallpaper', category: 'geometric', price: 130000, color: '#DCE8E4', accent: '#7FA89C', pattern: 'dots', finish: 'painted', swatch: '#A9C7BE' },
  { id: 'wall_dots_pink', kind: 'wall', name: 'Pink polka dots', category: 'geometric', price: 135000, color: '#F8E6E8', accent: '#D9788A', pattern: 'dots', finish: 'painted', swatch: '#EBB5BE' },
  { id: 'wall_checks_bw', kind: 'wall', name: 'Black & white checks', category: 'geometric', price: 160000, color: '#F4F4F2', accent: '#26272B', pattern: 'checks', finish: 'painted', swatch: '#8B8B8B' },
  { id: 'wall_checks_teal', kind: 'wall', name: 'Teal checks', category: 'geometric', price: 160000, color: '#E6F1EF', accent: '#2F6F73', pattern: 'checks', finish: 'painted', swatch: '#7FB1AC' },
  { id: 'wall_grid_blue', kind: 'wall', name: 'Blueprint grid', category: 'geometric', price: 140000, color: '#1F3D6B', accent: '#8FB4E8', pattern: 'grid', finish: 'painted', swatch: '#4C6FA3' },
  { id: 'wall_trellis_green', kind: 'wall', name: 'Green trellis', category: 'geometric', price: 175000, color: '#EDF1E3', accent: '#6F8F5A', pattern: 'trellis', finish: 'painted', swatch: '#A5BC94' },
  { id: 'wall_ankara_red', kind: 'wall', name: 'Ankara bloom (red)', category: 'geometric', price: 185000, color: '#F3E3C3', accent: '#B83A2E', pattern: 'ankara', finish: 'painted', swatch: '#D98B73' },
  { id: 'wall_ankara_blue', kind: 'wall', name: 'Ankara bloom (indigo)', category: 'geometric', price: 185000, color: '#F2EAD6', accent: '#27408B', pattern: 'ankara', finish: 'painted', swatch: '#7C8FC4' },
  { id: 'wall_waves_blue', kind: 'wall', name: 'Soft waves', category: 'geometric', price: 150000, color: '#E4EEF4', accent: '#6FA3C4', pattern: 'waves', finish: 'painted', swatch: '#A8C8DC' },
  { id: 'wall_linen_sand', kind: 'wall', name: 'Sand linen', category: 'textured', price: 140000, color: '#E8DCC4', accent: '#8C7A58', pattern: 'linen', finish: 'painted', swatch: '#D6C8A8' },
  { id: 'wall_linen_grey', kind: 'wall', name: 'Grey linen', category: 'textured', price: 140000, color: '#D4D6D8', accent: '#6B7076', pattern: 'linen', finish: 'painted', swatch: '#BFC2C5' },
  { id: 'wall_speckle_white', kind: 'wall', name: 'Speckled plaster', category: 'textured', price: 150000, color: '#F1EFEA', accent: '#5B5A56', pattern: 'speckle', finish: 'painted', swatch: '#D6D3CB' },
  { id: 'wall_plaster_clay', kind: 'wall', name: 'Clay plaster', category: 'textured', price: 190000, color: '#D9B79A', accent: '#8A5A3A', pattern: 'plaster', finish: 'painted', swatch: '#C9A283' },
  { id: 'wall_plaster_stone', kind: 'wall', name: 'Stone plaster', category: 'textured', price: 190000, color: '#CFCFC8', accent: '#6A6A64', pattern: 'plaster', finish: 'painted', swatch: '#B8B8B0' },
  { id: 'wall_brick_white', kind: 'wall', name: 'Painted white brick', category: 'textured', price: 200000, color: '#F2F0EB', accent: '#C9C5BC', pattern: 'brick', finish: 'painted', swatch: '#DAD6CC' },
  { id: 'wall_bamboo_natural', kind: 'wall', name: 'Bamboo', category: 'textured', price: 220000, color: '#D9C48F', accent: '#8A7230', pattern: 'bamboo', finish: 'painted', swatch: '#B79F5C' },
  { id: 'wall_panels_cream', kind: 'wall', name: 'Cream wall panels', category: 'panel', price: 240000, color: '#F1E9D8', accent: '#BFAF8A', pattern: 'panels', finish: 'painted', swatch: '#D6C9A8' },
  { id: 'wall_panels_grey', kind: 'wall', name: 'Grey wall panels', category: 'panel', price: 250000, color: '#9CA2A8', accent: '#6E747A', pattern: 'panels', finish: 'painted', swatch: '#85898F' },
  { id: 'wall_panels_navy', kind: 'wall', name: 'Navy wall panels', category: 'panel', price: 270000, color: '#2B3A55', accent: '#8C99B4', pattern: 'panels', finish: 'painted', swatch: '#4C5A78' },
  { id: 'wall_arches_blush', kind: 'wall', name: 'Blush arches', category: 'panel', price: 230000, color: '#F4E1DC', accent: '#D4A29A', pattern: 'arches', finish: 'painted', swatch: '#E5BDB6' },
  { id: 'wall_diamond', kind: 'wall', name: 'Diamond wallpaper', category: 'classic', price: 160000, color: '#2E3A4D', accent: '#B8892F', pattern: 'diamond', finish: 'painted', swatch: '#5B5A58' },
  { id: 'wall_diamond_cream', kind: 'wall', name: 'Cream diamond', category: 'classic', price: 160000, color: '#F1E9D8', accent: '#B8892F', pattern: 'diamond', finish: 'painted', swatch: '#D9C48F' },
  { id: 'wall_damask_burgundy', kind: 'wall', name: 'Burgundy damask', category: 'classic', price: 210000, color: '#5E2230', accent: '#D9B66B', pattern: 'damask', finish: 'painted', swatch: '#8A4A55' },
  { id: 'wall_damask_green', kind: 'wall', name: 'Green damask', category: 'classic', price: 210000, color: '#1F4E47', accent: '#D9B66B', pattern: 'damask', finish: 'painted', swatch: '#4C7A70' },
  { id: 'wall_deco_gold', kind: 'wall', name: 'Art deco fans', category: 'classic', price: 280000, color: '#1F2125', accent: '#C9A24A', pattern: 'deco_fan', finish: 'painted', swatch: '#7A683A' },
  { id: 'wall_scallop_teal', kind: 'wall', name: 'Scallop teal', category: 'classic', price: 200000, color: '#E5F0EE', accent: '#2F8F8A', pattern: 'scallop', finish: 'painted', swatch: '#7FBDB8' },
  { id: 'wall_marble', kind: 'wall', name: 'Marble cladding', category: 'premium', price: 900_000, color: '#F4F2EC', finish: 'marble', swatch: '#F4F2EC' },
  { id: 'wall_marble_grey', kind: 'wall', name: 'Grey marble cladding', category: 'premium', price: 1_050_000, color: '#B9BCC0', finish: 'marble', swatch: '#B9BCC0' },
  { id: 'wall_marble_black', kind: 'wall', name: 'Black marble cladding', category: 'premium', price: 1_300_000, color: '#3A3A40', finish: 'marble', swatch: '#3A3A40' },
];

const all: FinishDef[] = [...FLOORS, ...WALLS];
export const getFinish = (id: string) => all.find((f) => f.id === id);
/** What every home starts with: nothing applied, so the layout's own floors and walls show. */
export const FINISH_TABS: { id: 'floors' | 'walls'; label: string; icon: string; kind: FinishKind }[] = [
  { id: 'floors', label: 'Floors', icon: '🟫', kind: 'floor' },
  { id: 'walls', label: 'Walls', icon: '🧱', kind: 'wall' },
];

/** Wall categories shown as filter chips in the House Design tab, in display order. */
export const WALL_CATEGORIES: { id: WallCategory; label: string }[] = [
  { id: 'paint', label: 'Paint' }, { id: 'stripes', label: 'Stripes' }, { id: 'geometric', label: 'Geometric' },
  { id: 'textured', label: 'Textured' }, { id: 'panel', label: 'Panels' }, { id: 'classic', label: 'Classic' }, { id: 'premium', label: 'Premium' },
];
