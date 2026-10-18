import type { BoutiqueItem, BoutiqueSlot } from './clothing';

/** Shop categories (a category can cover several character slots) and occasion filters. */
export const SHOP_CATEGORIES: { id: string; label: string; icon: string; slots: BoutiqueSlot[] }[] = [
  { id: 'clothes', label: 'Clothes', icon: '👕', slots: ['top', 'bottom'] },
  { id: 'shoes', label: 'Shoes', icon: '👟', slots: ['shoes'] },
  { id: 'bags', label: 'Bags', icon: '👜', slots: ['bag'] },
  { id: 'wigs', label: 'Wigs and hair', icon: '💇🏾', slots: ['hair'] },
  { id: 'accessories', label: 'Accessories', icon: '🕶️', slots: ['extra'] },
];
export const OCCASIONS = [
  { id: 'Home', icon: '🏠' }, { id: 'Sleep', icon: '🌙' }, { id: 'Date Night', icon: '💕' }, { id: 'Party', icon: '🎉' }, { id: 'Work', icon: '💼' }, { id: 'Gym', icon: '🏋️' }, { id: 'Everyday', icon: '☀️' },
] as const;
export type Occasion = (typeof OCCASIONS)[number]['id'];

const BY_STYLE: Record<string, Occasion[]> = {
  tee: ['Home', 'Everyday', 'Gym'], shirt: ['Work', 'Everyday'], hoodie: ['Home', 'Sleep', 'Everyday'], jacket: ['Everyday', 'Date Night', 'Party'], jersey: ['Gym', 'Everyday'], kaftan: ['Work', 'Party', 'Date Night'],
  jeans: ['Everyday', 'Date Night'], trousers: ['Work', 'Everyday', 'Date Night'], shorts: ['Home', 'Gym', 'Sleep'], skirt: ['Party', 'Date Night', 'Everyday'], dress: ['Party', 'Date Night'],
  tote: ['Everyday', 'Work'], backpack: ['Everyday', 'Gym'], crossbody: ['Everyday', 'Date Night'], clutch: ['Party', 'Date Night'], handbag: ['Work', 'Party', 'Date Night'],
};
const BY_SLOT: Record<BoutiqueSlot, Occasion[]> = { top: ['Everyday'], bottom: ['Everyday'], shoes: ['Everyday'], hair: ['Everyday', 'Party'], extra: ['Everyday'], bag: ['Everyday'] };
/** Occasion tags come from the item's style, so a new item gets sensible tags without editing this file. */
export function occasionsOf(it: BoutiqueItem): Occasion[] {
  if (BY_STYLE[it.style]) return BY_STYLE[it.style];
  if (it.slot === 'shoes') return /sneak|train|run/.test(it.style) ? ['Gym', 'Everyday'] : /heel|loafer|oxford|formal/.test(it.style) ? ['Work', 'Party', 'Date Night'] : /slide|slipper|sandal/.test(it.style) ? ['Home', 'Everyday'] : ['Everyday'];
  return BY_SLOT[it.slot];
}
/** Whether the character model can show this item. Bags are collectable but not drawn yet. */
export const canPreview = (it: BoutiqueItem) => it.slot !== 'bag';
