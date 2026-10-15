import type { Effects } from '@/types/game';

export type ItemCategory = 'storage' | 'designs' | 'sleep' | 'kitchen' | 'bathroom' | 'comfort' | 'fun' | 'skills';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface UseDef {
  label: string;
  seconds: number;
  /** Total effects applied over the duration. */
  effects: Effects;
  /** Cash cost per use (e.g. cooking indomie). */
  cost?: number;
  /** Consumes a food item from the inventory (fridge). */
  needsFood?: boolean;
  /** Energy is restored proportionally and the character lies down. */
  sleep?: boolean;
  pose: 'stand' | 'sit' | 'sleep';
  /** Fires a task event, e.g. 'use:bathe'. */
  event?: string;
  /** Skill practice: XP is granted only when the activity finishes. */
  skill?: { id: 'coding'; xp: number };
  /** While this runs the home is throwing a party (disco lights switch on). */
  party?: boolean;
}

export interface FurnitureDef {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ItemCategory;
  rarity: Rarity;
  glyph: string;
  /** Key into the model registry (three/models/registry.tsx). Swap for GLB loaders later. */
  model: string;
  footprint: { w: number; d: number };
  height: number;
  placement: { surface: 'floor' | 'wall'; collides: boolean; rotatable: boolean; mountHeight?: number };
  /** Where it may go. Default 'indoor'. */
  place?: 'indoor' | 'outdoor' | 'any';
  /** Status / wealth points. */
  style: number;
  sleepRate?: number;
  comfort?: number;
  use?: UseDef;
  /**
   * Needs clear floor to be placed or used (e.g. the gym mat) but does not block walking: nothing solid can be put on it and it
   * cannot be put on anything solid. Rugs, which may go under furniture, do not set this.
   */
  exclusive?: boolean;
}

const floor = { surface: 'floor', collides: true, rotatable: true } as const;

export const FURNITURE: FurnitureDef[] = [
  // ---- Sleep
  { id: 'foam_mattress', name: 'Foam mattress', description: 'Thin and firm. Beats the floor.', price: 35000, category: 'sleep', rarity: 'common', glyph: '🛏️', model: 'foam_mattress', footprint: { w: 1.0, d: 1.9 }, height: 0.25, placement: floor, style: 1, sleepRate: 0.6, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  { id: 'bed', name: 'Wooden bed', description: 'Proper frame, proper mattress, two pillows.', price: 180000, category: 'sleep', rarity: 'uncommon', glyph: '🛌', model: 'bed', footprint: { w: 1.6, d: 2.0 }, height: 0.9, placement: floor, style: 4, sleepRate: 1, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  { id: 'king_bed', name: 'King-size bed', description: 'Upholstered headboard. Sleep like a Chairman.', price: 650000, category: 'sleep', rarity: 'epic', glyph: '👑', model: 'king_bed', footprint: { w: 1.95, d: 2.15 }, height: 1.1, placement: floor, style: 9, sleepRate: 1.35, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  // ---- Storage
  { id: 'wardrobe', name: 'Wardrobe', description: 'Two doors, hanging rail, room for your agbada.', price: 120000, category: 'storage', rarity: 'uncommon', glyph: '🚪', model: 'wardrobe', footprint: { w: 1.2, d: 0.6 }, height: 2.0, placement: floor, style: 3 },
  { id: 'bookshelf', name: 'Bookshelf', description: 'Books for show. A few for reading.', price: 60000, category: 'storage', rarity: 'common', glyph: '📚', model: 'bookshelf', footprint: { w: 0.9, d: 0.35 }, height: 1.9, placement: floor, style: 2, use: { label: 'Read', seconds: 10, effects: { charisma: 2, energy: -2 }, pose: 'stand' } },
  // ---- Kitchen
  { id: 'fridge', name: 'Fridge-freezer', description: 'Keeps the water cold and the leftovers honest.', price: 450000, category: 'kitchen', rarity: 'rare', glyph: '🧊', model: 'fridge', footprint: { w: 0.7, d: 0.7 }, height: 1.8, placement: floor, style: 6, use: { label: 'Eat', seconds: 4, effects: {}, needsFood: true, pose: 'stand' } },
  { id: 'cooker', name: 'Gas cooker', description: 'Four burners and a gas cylinder.', price: 80000, category: 'kitchen', rarity: 'common', glyph: '🍳', model: 'cooker', footprint: { w: 0.6, d: 0.6 }, height: 0.9, placement: floor, style: 2, use: { label: 'Cook indomie (₦400)', seconds: 6, cost: 400, effects: { hunger: 28 }, pose: 'stand' } },
  { id: 'cabinet', name: 'Kitchen cabinet', description: 'Counter with cupboards underneath.', price: 90000, category: 'kitchen', rarity: 'common', glyph: '🗄️', model: 'cabinet', footprint: { w: 1.8, d: 0.6 }, height: 0.9, placement: floor, style: 3 },
  { id: 'table', name: 'Dining table', description: 'Seats two comfortably, four if you squeeze.', price: 60000, category: 'kitchen', rarity: 'common', glyph: '🍽️', model: 'table', footprint: { w: 1.2, d: 0.7 }, height: 0.78, placement: floor, style: 2 },
  { id: 'dispenser', name: 'Water dispenser', description: 'Hot and cold. Thirst solved.', price: 150000, category: 'kitchen', rarity: 'uncommon', glyph: '🚰', model: 'dispenser', footprint: { w: 0.35, d: 0.35 }, height: 1.05, placement: floor, style: 3, use: { label: 'Drink water', seconds: 3, effects: { thirst: 45 }, pose: 'stand' } },
  // ---- Bathroom
  { id: 'bucket', name: 'Bath bucket', description: 'Bucket bath. Fast, cheap, effective.', price: 5000, category: 'bathroom', rarity: 'common', glyph: '🪣', model: 'bucket', footprint: { w: 0.4, d: 0.4 }, height: 0.4, placement: floor, place: 'any', style: 0, use: { label: 'Bucket bath', seconds: 7, effects: { hygiene: 55 }, pose: 'stand', event: 'use:bathe' } },
  { id: 'shower', name: 'Shower cubicle', description: 'Glass cubicle with a rain head.', price: 250000, category: 'bathroom', rarity: 'rare', glyph: '🚿', model: 'shower', footprint: { w: 0.9, d: 0.9 }, height: 2.2, placement: floor, style: 6, use: { label: 'Shower', seconds: 5, effects: { hygiene: 100, happiness: 4 }, pose: 'stand', event: 'use:bathe' } },
  { id: 'toilet', name: 'Water closet', description: 'The most important room in any house.', price: 180000, category: 'bathroom', rarity: 'uncommon', glyph: '🚽', model: 'toilet', footprint: { w: 0.45, d: 0.7 }, height: 0.8, placement: floor, style: 3, use: { label: 'Use toilet', seconds: 4, effects: { bladder: 100, hygiene: -3 }, pose: 'stand' } },
  // ---- Comfort
  { id: 'sofa', name: 'Three-seater sofa', description: 'Deep cushions. Good for Sunday afternoons.', price: 350000, category: 'comfort', rarity: 'rare', glyph: '🛋️', model: 'sofa', footprint: { w: 1.9, d: 0.85 }, height: 0.85, placement: floor, style: 6, use: { label: 'Relax', seconds: 6, effects: { happiness: 8, energy: 3 }, pose: 'sit' } },
  { id: 'chair', name: 'Plastic chair', description: 'Every Nigerian home has at least four.', price: 15000, category: 'comfort', rarity: 'common', glyph: '🪑', model: 'chair', footprint: { w: 0.5, d: 0.5 }, height: 0.95, placement: floor, place: 'any', style: 1, use: { label: 'Sit', seconds: 5, effects: { happiness: 3 }, pose: 'sit' } },
  { id: 'ac', name: 'Split air conditioner', description: 'Wall-mounted. Cold room, deep sleep.', price: 650000, category: 'comfort', rarity: 'epic', glyph: '❄️', model: 'ac', footprint: { w: 1.0, d: 0.25 }, height: 0.3, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 2.0 }, style: 8, comfort: 0.35 },
  { id: 'fan', name: 'Standing fan', description: 'Makes sleep better in the heat.', price: 45000, category: 'comfort', rarity: 'common', glyph: '🌀', model: 'fan', footprint: { w: 0.45, d: 0.45 }, height: 1.2, placement: floor, style: 1, comfort: 0.15 },
  { id: 'generator', name: 'Generator', description: 'Pass-your-neighbour. NEPA cannot stress you.', price: 380000, category: 'comfort', rarity: 'rare', glyph: '⚡', model: 'generator', footprint: { w: 0.8, d: 0.55 }, height: 0.65, placement: floor, place: 'any', style: 4, comfort: 0.1 },
  // ---- Fun
  { id: 'tv', name: 'TV and stand', description: 'Flat screen on a wooden unit.', price: 320000, category: 'fun', rarity: 'rare', glyph: '📺', model: 'tv', footprint: { w: 1.2, d: 0.4 }, height: 1.1, placement: floor, style: 6, use: { label: 'Watch TV', seconds: 12, effects: { happiness: 22, energy: -3 }, pose: 'sit' } },
  { id: 'gaming_setup', name: 'Gaming setup', description: 'Big monitor, console, RGB. Obviously.', price: 480000, category: 'fun', rarity: 'epic', glyph: '🎮', model: 'gaming_setup', footprint: { w: 1.2, d: 0.6 }, height: 1.1, placement: floor, style: 7, use: { label: 'Play games', seconds: 12, effects: { happiness: 28, energy: -5 }, pose: 'sit' } },
  { id: 'piano', name: 'Keyboard piano', description: 'Weighted keys and a proper stand.', price: 900000, category: 'fun', rarity: 'epic', glyph: '🎹', model: 'piano', footprint: { w: 1.4, d: 0.5 }, height: 0.95, placement: floor, style: 8, use: { label: 'Play keys', seconds: 10, effects: { happiness: 10, charisma: 2, energy: -3 }, pose: 'stand' } },
  // ---- Skills
  { id: 'desk', name: 'Desk and laptop', description: 'A proper desk and a laptop that can actually code.', price: 140000, category: 'skills', rarity: 'uncommon', glyph: '💻', model: 'desk', footprint: { w: 1.2, d: 0.6 }, height: 1.2, placement: floor, style: 4, use: { label: 'Practise coding', seconds: 12, effects: { energy: -6, happiness: -2 }, pose: 'sit', skill: { id: 'coding', xp: 10 }, event: 'use:study' } },
  // ---- Designs
  { id: 'rug', name: 'Ankara rug', description: 'Bold pattern that ties the room together.', price: 35000, category: 'designs', rarity: 'common', glyph: '🟧', model: 'rug', footprint: { w: 2.0, d: 1.4 }, height: 0.03, placement: { surface: 'floor', collides: false, rotatable: true }, style: 2 },
  { id: 'wall_frame', name: 'Wall frame', description: 'Sunset over the lagoon, framed.', price: 25000, category: 'designs', rarity: 'common', glyph: '🖼️', model: 'wall_frame', footprint: { w: 0.8, d: 0.06 }, height: 0.6, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.5 }, style: 2 },
  { id: 'plant', name: 'Potted plant', description: 'A little green for the corner.', price: 12000, category: 'designs', rarity: 'common', glyph: '🪴', model: 'plant', footprint: { w: 0.45, d: 0.45 }, height: 1.0, placement: floor, place: 'any', style: 2 },
  { id: 'lamp', name: 'Floor lamp', description: 'Warm light for late nights.', price: 30000, category: 'designs', rarity: 'uncommon', glyph: '💡', model: 'lamp', footprint: { w: 0.35, d: 0.35 }, height: 1.6, placement: floor, place: 'any', style: 3 },
  // ---- Added in the customisation pass. Every entry is its own item: owning a bathtub never replaces a shower.
  { id: 'washbasin', name: 'Washbasin', description: 'Pedestal basin with a proper tap.', price: 95000, category: 'bathroom', rarity: 'common', glyph: '🚰', model: 'washbasin', footprint: { w: 0.6, d: 0.5 }, height: 1.0, placement: floor, style: 2, use: { label: 'Wash up', seconds: 3, effects: { hygiene: 20 }, pose: 'stand' } },
  { id: 'bathtub', name: 'Bathtub', description: 'Long, deep and white. A real soak.', price: 420000, category: 'bathroom', rarity: 'rare', glyph: '🛁', model: 'bathtub', footprint: { w: 0.85, d: 1.75 }, height: 0.6, placement: floor, style: 6, use: { label: 'Take a bath', seconds: 8, effects: { hygiene: 100, happiness: 10, energy: 2 }, pose: 'stand', event: 'use:bathe' } },
  { id: 'jacuzzi', name: 'Jacuzzi', description: 'Round, bubbling and completely unnecessary.', price: 1400000, category: 'bathroom', rarity: 'epic', glyph: '♨️', model: 'jacuzzi', footprint: { w: 1.9, d: 1.9 }, height: 0.65, placement: floor, style: 9, use: { label: 'Soak in the jacuzzi', seconds: 10, effects: { hygiene: 100, happiness: 25, energy: 8 }, pose: 'stand', event: 'use:bathe' } },
  { id: 'bedside_table', name: 'Bedside table', description: 'Two drawers for the small things.', price: 45000, category: 'sleep', rarity: 'common', glyph: '🕯️', model: 'bedside_table', footprint: { w: 0.48, d: 0.42 }, height: 0.5, placement: floor, style: 2 },
  { id: 'coffee_table', name: 'Coffee table', description: 'Low wooden table with a lower shelf.', price: 85000, category: 'comfort', rarity: 'uncommon', glyph: '☕', model: 'coffee_table', footprint: { w: 1.05, d: 0.6 }, height: 0.45, placement: floor, style: 3 },
  { id: 'gym_rug', name: 'Gym mat', description: 'Thick foam mat. Room to do push-ups on, and your character will do a few when idle.', price: 45000, category: 'fun', rarity: 'common', glyph: '🏋️', model: 'gym_rug', footprint: { w: 0.9, d: 1.9 }, height: 0.05, placement: { surface: 'floor', collides: false, rotatable: true }, exclusive: true, style: 1, use: { label: 'Do push-ups', seconds: 10, effects: { energy: -8, happiness: 4, hunger: -4, thirst: -5 }, pose: 'stand', event: 'use:workout' } },
  { id: 'speaker', name: 'Tower speaker', description: 'Loud enough for the whole compound. Starts a house party.', price: 150000, category: 'fun', rarity: 'rare', glyph: '🔊', model: 'speaker', footprint: { w: 0.4, d: 0.36 }, height: 1.0, placement: floor, style: 4, use: { label: 'Start a party', seconds: 14, effects: { happiness: 20, social: 6, energy: -4 }, pose: 'stand', party: true, event: 'use:party' } },
  { id: 'wall_shelf', name: 'Wall shelf', description: 'A shelf for books and one tasteful pot.', price: 35000, category: 'storage', rarity: 'common', glyph: '📚', model: 'wall_shelf', footprint: { w: 1.0, d: 0.24 }, height: 0.3, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.4 }, style: 2 },
  { id: 'disco_light', name: 'Disco light', description: 'Spins colour across the room. Only when there is a party.', price: 120000, category: 'fun', rarity: 'rare', glyph: '🪩', model: 'disco_light', footprint: { w: 0.4, d: 0.4 }, height: 1.4, placement: floor, style: 4 },
];

const byId = new Map(FURNITURE.map((f) => [f.id, f]));
export const getFurniture = (id: string) => byId.get(id);

export const ITEM_CATEGORIES: { id: ItemCategory; label: string; icon: string }[] = [
  { id: 'storage', label: 'Storage', icon: '🗄️' },
  { id: 'designs', label: 'Designs', icon: '🎨' },
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { id: 'comfort', label: 'Comfort', icon: '🛋️' },
  { id: 'fun', label: 'Fun', icon: '🎮' },
  { id: 'skills', label: 'Skills', icon: '📖' },
];

export const RARITY_COLOR: Record<Rarity, string> = { common: '#9BB3A8', uncommon: '#4ADE80', rare: '#38BDF8', epic: '#C084FC' };
