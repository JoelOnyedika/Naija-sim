import type { SkillId } from '@/stores/skillStore';
import type { Effects } from '@/types/game';

export type ItemCategory = 'pets' | 'storage' | 'designs' | 'sleep' | 'kitchen' | 'bathroom' | 'comfort' | 'fun' | 'skills';
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
  skill?: { id: SkillId; xp: number };
  /** While this runs the home is throwing a party (disco lights switch on). */
  party?: boolean;
  /** Stable id inside the item's activity list (data/activities.ts). */
  id?: string;
  /** Emoji shown on the activity's card in the action menu. */
  glyph?: string;
  /** Equipment that must be in the active home. Each entry is satisfied by ANY of its item ids. `hint` is the message when it is missing. */
  requires?: { anyOf: string[]; hint: string }[];
  /** Minimum skill level before this can be started. */
  minSkill?: { id: SkillId; level: number };
  /** Money paid ONCE when the activity finishes (never when it is cancelled). */
  payout?: number;
  /** Pet care activity: updates the pet's bond / hunger when it finishes (game/petCare.ts). */
  petAction?: 'pet' | 'feed' | 'play';
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
  /** Several choices on one object: tapping it opens an action menu (see data/activities.ts, which wins over `use`). */
  uses?: UseDef[];
  /** Tapping this opens a phone app instead of running a use action. The wardrobe opens the Boutique catalogue (owned clothes). */
  opensApp?: 'boutique';
  /**
   * Needs clear floor to be placed or used (e.g. the gym mat) but does not block walking: nothing solid can be put on it and it
   * cannot be put on anything solid. Rugs, which may go under furniture, do not set this.
   */
  exclusive?: boolean;
  /**
   * Backup power during NEPA outages (see game/power.ts). 'manual' must be tapped during an outage, 'auto' starts by itself,
   * 'solar' keeps the house powered all the time. Backup items are functional, not decorative.
   */
  power?: 'manual' | 'auto' | 'solar';
  /** A live pet (see world/petBrain.ts). It wanders the home on its own instead of standing where it was placed. */
  pet?: 'cat' | 'dog' | 'lion';
  /** Belongs to a public interior (market stall, pew, bar...). Never sold in the shop. */
  venue?: boolean;
  /** A pet toy: pets walk to it and play. */
  toy?: boolean;
  /** Tapping it opens a venue screen instead of the activity menu (club menu, showroom). */
  venueAction?: 'club_bar' | 'showroom';
}

const floor = { surface: 'floor', collides: true, rotatable: true } as const;

export const FURNITURE: FurnitureDef[] = [
  // ---- v8 catalogue (models in three/models/catalogue.tsx)
  { id: 'dining_chair', name: 'Dining chair', description: 'Slatted wood back. Pulls up to any table.', price: 20000, category: 'comfort', rarity: 'common', glyph: '🪑', model: 'dining_chair', footprint: { w: 0.45, d: 0.45 }, height: 0.95, placement: floor, place: 'any', style: 1, use: { label: 'Sit', seconds: 5, effects: { happiness: 3 }, pose: 'sit' } },
  { id: 'stool', name: 'Bar stool', description: 'Steel legs, round painted seat.', price: 12000, category: 'comfort', rarity: 'common', glyph: '🪑', model: 'stool', footprint: { w: 0.4, d: 0.4 }, height: 0.68, placement: floor, style: 1, use: { label: 'Sit', seconds: 5, effects: { happiness: 2 }, pose: 'sit' } },
  { id: 'office_chair', name: 'Office chair', description: 'Five-star base, mesh back, armrests.', price: 85000, category: 'skills', rarity: 'uncommon', glyph: '💺', model: 'office_chair', footprint: { w: 0.6, d: 0.6 }, height: 1.15, placement: floor, style: 3, use: { label: 'Sit', seconds: 5, effects: { happiness: 3 }, pose: 'sit' } },
  { id: 'armchair', name: 'Teal armchair', description: 'Deep seat, rolled arms, a mustard cushion.', price: 220000, category: 'comfort', rarity: 'rare', glyph: '🛋️', model: 'armchair', footprint: { w: 0.9, d: 0.85 }, height: 0.95, placement: floor, style: 5, use: { label: 'Relax', seconds: 6, effects: { happiness: 8, energy: 3 }, pose: 'sit' } },
  { id: 'side_table', name: 'Brass side table', description: 'Round marble-look top on a brass pedestal.', price: 30000, category: 'comfort', rarity: 'common', glyph: '🟤', model: 'side_table', footprint: { w: 0.55, d: 0.55 }, height: 0.56, placement: floor, style: 3 },
  { id: 'locker', name: 'Steel locker', description: 'Two doors, vents, a proper handle.', price: 55000, category: 'storage', rarity: 'common', glyph: '🗄️', model: 'locker', footprint: { w: 0.55, d: 0.5 }, height: 1.8, placement: floor, style: 2 },
  { id: 'shelf_unit', name: 'Open shelving', description: 'Five shelves of books, boxes and ornaments.', price: 95000, category: 'storage', rarity: 'uncommon', glyph: '📚', model: 'shelf_unit', footprint: { w: 0.95, d: 0.36 }, height: 1.72, placement: floor, style: 4 },
  { id: 'shoe_rack', name: 'Shoe rack', description: 'Three tiers. Every home needs one by the door.', price: 25000, category: 'storage', rarity: 'common', glyph: '👟', model: 'shoe_rack', footprint: { w: 0.85, d: 0.3 }, height: 0.52, placement: floor, style: 1 },
  { id: 'rug_round', name: 'Round rug', description: 'Four rings of colour.', price: 28000, category: 'designs', rarity: 'common', glyph: '⭕', model: 'rug_round', footprint: { w: 1.6, d: 1.6 }, height: 0.03, placement: { surface: 'floor', collides: false, rotatable: true }, style: 2 },
  { id: 'rug_runner', name: 'Runner rug', description: 'Long and narrow, for hallways.', price: 22000, category: 'designs', rarity: 'common', glyph: '🟦', model: 'rug_runner', footprint: { w: 0.7, d: 2.0 }, height: 0.03, placement: { surface: 'floor', collides: false, rotatable: true }, style: 2 },
  { id: 'rug_persian', name: 'Persian-style rug', description: 'Deep red and gold with a central medallion.', price: 180000, category: 'designs', rarity: 'epic', glyph: '🟥', model: 'rug_persian', footprint: { w: 2.4, d: 1.7 }, height: 0.04, placement: { surface: 'floor', collides: false, rotatable: true }, style: 8 },
  { id: 'wall_art_abstract', name: 'Abstract canvas', description: 'Bold shapes on cream. Big and loud.', price: 45000, category: 'designs', rarity: 'uncommon', glyph: '🎨', model: 'wall_art_abstract', footprint: { w: 0.9, d: 0.06 }, height: 0.9, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.5 }, style: 3 },
  { id: 'wall_photos', name: 'Photo cluster', description: 'Four framed photographs, hung together.', price: 38000, category: 'designs', rarity: 'common', glyph: '📷', model: 'wall_photos', footprint: { w: 0.9, d: 0.05 }, height: 0.8, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.5 }, style: 2 },
  { id: 'wall_panel', name: 'Slatted wood panel', description: 'Warm wooden slats, floor-to-eye-level.', price: 70000, category: 'designs', rarity: 'uncommon', glyph: '🟫', model: 'wall_panel', footprint: { w: 0.7, d: 0.07 }, height: 1.5, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.2 }, style: 4 },
  { id: 'wall_clock', name: 'Wall clock', description: 'Plain face, red second hand.', price: 28000, category: 'designs', rarity: 'common', glyph: '🕒', model: 'wall_clock', footprint: { w: 0.52, d: 0.06 }, height: 0.52, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.9 }, style: 1 },
  { id: 'wall_mirror', name: 'Gold mirror', description: 'Tall gold frame.', price: 65000, category: 'designs', rarity: 'uncommon', glyph: '🪞', model: 'wall_mirror', footprint: { w: 0.62, d: 0.06 }, height: 1.2, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.3 }, style: 4 },
  { id: 'neon_sign', name: 'Neon sign', description: 'Pink and cyan. Very late-night.', price: 140000, category: 'designs', rarity: 'rare', glyph: '✨', model: 'neon_sign', footprint: { w: 1.0, d: 0.05 }, height: 0.5, placement: { surface: 'wall', collides: true, rotatable: false, mountHeight: 1.6 }, style: 6 },
  { id: 'ring_light', name: 'Ring light', description: 'Tall tripod stand with a phone holder.', price: 65000, category: 'skills', rarity: 'uncommon', glyph: '💡', model: 'ring_light', footprint: { w: 0.5, d: 0.5 }, height: 1.75, placement: floor, style: 3 },
  { id: 'camera_tripod', name: 'Camera and tripod', description: 'Mirrorless body, long lens, steady legs.', price: 90000, category: 'skills', rarity: 'uncommon', glyph: '📸', model: 'camera_tripod', footprint: { w: 0.5, d: 0.5 }, height: 1.2, placement: floor, style: 3 },
  { id: 'dj_deck', name: 'DJ deck', description: 'Two turntables, a mixer and light strip.', price: 600000, category: 'fun', rarity: 'epic', glyph: '🎧', model: 'dj_deck', footprint: { w: 1.5, d: 0.65 }, height: 1.1, placement: floor, style: 9 },
  { id: 'bedside_lamp', name: 'Bedside lamp', description: 'Small, warm, brass stem.', price: 18000, category: 'designs', rarity: 'common', glyph: '🛋️', model: 'bedside_lamp', footprint: { w: 0.3, d: 0.3 }, height: 0.4, placement: floor, place: 'any', style: 1 },
  { id: 'pet_bed', name: 'Pet bed', description: 'Round and padded.', price: 30000, category: 'pets', rarity: 'common', glyph: '🛏️', model: 'pet_bed', footprint: { w: 0.7, d: 0.7 }, height: 0.14, placement: { surface: 'floor', collides: false, rotatable: true }, style: 1 },
  { id: 'pet_bowl', name: 'Pet bowls', description: 'Food and water.', price: 9000, category: 'pets', rarity: 'common', glyph: '🥣', model: 'pet_bowl', footprint: { w: 0.4, d: 0.2 }, height: 0.07, placement: { surface: 'floor', collides: false, rotatable: true }, style: 0 },
  // ---- Venue furniture for public interiors (not sold; models in three/models/venue.tsx)
  { id: 'v_stall', name: 'Market stall', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🛍️', model: 'v_stall', footprint: { w: 1.9, d: 1.0 }, height: 2.2, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_sacks', name: 'Sacks of goods', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '📦', model: 'v_sacks', footprint: { w: 1.0, d: 0.6 }, height: 0.8, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_pew', name: 'Church pew', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🪑', model: 'v_pew', footprint: { w: 1.9, d: 0.5 }, height: 1.1, placement: { surface: 'floor', collides: false, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_altar', name: 'Altar', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '⛪', model: 'v_altar', footprint: { w: 2.0, d: 0.9 }, height: 1.8, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_plinth', name: 'Sculpture plinth', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🗿', model: 'v_plinth', footprint: { w: 0.7, d: 0.7 }, height: 1.4, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_bleachers', name: 'Stadium seating', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🏟️', model: 'v_bleachers', footprint: { w: 3.0, d: 1.8 }, height: 1.3, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_kiosk', name: 'Snack kiosk', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🥤', model: 'v_kiosk', footprint: { w: 1.3, d: 0.9 }, height: 1.9, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_club_bar', name: 'Club bar', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🍾', model: 'v_club_bar', venueAction: 'club_bar', footprint: { w: 3.1, d: 0.9 }, height: 2.0, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_dj_booth', name: 'DJ booth', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🎧', model: 'v_dj_booth', footprint: { w: 2.2, d: 0.9 }, height: 1.6, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_speaker_stack', name: 'Speaker stack', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🔊', model: 'v_speaker_stack', footprint: { w: 0.8, d: 0.6 }, height: 2.4, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_podium', name: 'Showroom podium', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🚗', model: 'v_podium', venueAction: 'showroom', footprint: { w: 3.4, d: 3.4 }, height: 0.22, placement: { surface: 'floor', collides: false, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_cell_bed', name: 'Cell bunk', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '🛏️', model: 'v_cell_bed', footprint: { w: 1.0, d: 2.0 }, height: 0.6, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  { id: 'v_bars', name: 'Cell bars', description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: '⛓️', model: 'v_bars', footprint: { w: 3.0, d: 0.2 }, height: 2.1, placement: { surface: 'floor', collides: true, rotatable: true }, place: 'any', style: 0, venue: true },
  // ---- Pets: valuable, animated, never block walking
  { id: 'pet_ball', name: 'Pet ball', description: 'A rubber ball. Pets love chasing it.', price: 8000, category: 'pets', rarity: 'common', glyph: '🎾', model: 'pet_ball', footprint: { w: 0.25, d: 0.25 }, height: 0.2, placement: { surface: 'floor', collides: false, rotatable: false }, place: 'any', style: 0, toy: true },
  { id: 'pet_cat', name: 'Cat', description: 'A proper house cat. Wanders, hops and bats the ball around.', price: 450000, category: 'pets', rarity: 'rare', glyph: '🐱', model: 'pet_cat', footprint: { w: 0.5, d: 0.5 }, height: 0.5, placement: { surface: 'floor', collides: false, rotatable: false }, place: 'any', style: 5, pet: 'cat' },
  { id: 'pet_dog', name: 'Dog', description: 'Loyal and energetic. Goes for the ball first.', price: 900000, category: 'pets', rarity: 'epic', glyph: '🐶', model: 'pet_dog', footprint: { w: 0.7, d: 0.7 }, height: 0.7, placement: { surface: 'floor', collides: false, rotatable: false }, place: 'any', style: 7, pet: 'dog' },
  { id: 'pet_lion', name: 'Lion', description: 'A young lion. Slow, heavy and very much a flex.', price: 12000000, category: 'pets', rarity: 'epic', glyph: '🦁', model: 'pet_lion', footprint: { w: 1.2, d: 1.2 }, height: 1.1, placement: { surface: 'floor', collides: false, rotatable: false }, place: 'any', style: 10, pet: 'lion' },
  // ---- Sleep
  { id: 'foam_mattress', name: 'Foam mattress', description: 'Thin and firm. Beats the floor.', price: 35000, category: 'sleep', rarity: 'common', glyph: '🛏️', model: 'foam_mattress', footprint: { w: 1.0, d: 1.9 }, height: 0.25, placement: floor, style: 1, sleepRate: 0.6, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  { id: 'bed', name: 'Wooden bed', description: 'Proper frame, proper mattress, two pillows.', price: 180000, category: 'sleep', rarity: 'uncommon', glyph: '🛌', model: 'bed', footprint: { w: 1.6, d: 2.0 }, height: 0.9, placement: floor, style: 4, sleepRate: 1, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  { id: 'king_bed', name: 'King-size bed', description: 'Upholstered headboard. Sleep like a Chairman.', price: 650000, category: 'sleep', rarity: 'epic', glyph: '👑', model: 'king_bed', footprint: { w: 1.95, d: 2.15 }, height: 1.1, placement: floor, style: 9, sleepRate: 1.35, use: { label: 'Sleep', seconds: 0, effects: {}, sleep: true, pose: 'sleep' } },
  // ---- Storage
  { id: 'wardrobe', name: 'Wardrobe', opensApp: 'boutique', description: 'Two doors, hanging rail, room for your agbada. Tap to change outfit.', price: 120000, category: 'storage', rarity: 'uncommon', glyph: '🚪', model: 'wardrobe', footprint: { w: 1.2, d: 0.6 }, height: 2.0, placement: floor, style: 3 },
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
  { id: 'generator', name: 'Generator', description: 'Proper standby set with auto-start. NEPA takes light, it starts by itself.', price: 380000, category: 'comfort', rarity: 'rare', glyph: '⚡', model: 'generator', footprint: { w: 0.8, d: 0.55 }, height: 0.65, placement: floor, place: 'any', style: 4, comfort: 0.1, power: 'auto' },
  { id: 'ibeta', name: 'Ibeta Pass My Neighbor', description: 'Small petrol set. When NEPA takes light, you must tap it to start it.', price: 150000, category: 'comfort', rarity: 'uncommon', glyph: '🔌', model: 'ibeta', footprint: { w: 0.65, d: 0.45 }, height: 0.66, placement: floor, place: 'any', style: 2, power: 'manual' },
  { id: 'solar_system', name: 'Solar power system', description: 'Panels, inverter and battery. The house stays lit, NEPA or no NEPA.', price: 2600000, category: 'comfort', rarity: 'epic', glyph: '☀️', model: 'solar_system', footprint: { w: 1.4, d: 0.8 }, height: 0.95, placement: floor, place: 'any', style: 9, power: 'solar' },
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
  { id: 'pets', label: 'Pets', icon: '🐾' },
];

export const RARITY_COLOR: Record<Rarity, string> = { common: '#9BB3A8', uncommon: '#4ADE80', rare: '#38BDF8', epic: '#C084FC' };
