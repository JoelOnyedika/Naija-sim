import type { LifeTypeId, PhoneType } from '@/types/game';

export interface LifeTypeDef {
  id: LifeTypeId;
  name: string;
  tagline: string;
  /** Roulette odds come from CONFIG.nepoChance; this is just for display. */
  rarityLabel: string;
  moneyRange: [number, number];
  phone: PhoneType;
  phoneName: string;
  /** Furniture auto-placed in the starting home. */
  startingFurniture: string[];
  /** Furniture left in the inventory. */
  startingInventory: Record<string, number>;
  startingVehicles: string[];
  conditions: string[];
  color: string;
}

export const LIFE_TYPES: Record<LifeTypeId, LifeTypeDef> = {
  lapo: {
    id: 'lapo', name: 'Lapo Baby', tagline: 'Start small. Hustle hard.', rarityLabel: 'Common',
    moneyRange: [25000, 60000], phone: 'android', phoneName: 'Tecno-style Android',
    startingFurniture: ['foam_mattress', 'bucket', 'fan'], startingInventory: { chair: 1, indomie: 2 }, startingVehicles: [],
    conditions: ['Low starting cash', 'Basic compound room', 'Budget Android phone', 'Basic furniture'],
    color: '#9BB3A8',
  },
  nepo: {
    id: 'nepo', name: 'Nepo Baby', tagline: 'Papa get long legs.', rarityLabel: 'Rare',
    moneyRange: [25_000_000, 80_000_000], phone: 'ios', phoneName: 'iPhone-style flagship',
    startingFurniture: ['king_bed', 'sofa', 'tv', 'fridge', 'ac', 'rug', 'plant', 'wardrobe', 'wall_frame', 'lamp'],
    startingInventory: { table: 1, chair: 2, jollof: 2, zobo: 2 },
    startingVehicles: ['gwagon', 'camry'],
    conditions: ['Serious starting cash', 'Upscale Lekki home with garage', 'Flagship iPhone', 'Furnished and fancy'],
    color: '#FFC21A',
  },
};
