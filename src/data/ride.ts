import type { Effects } from '@/types/game';
import type { SkillId } from '@/stores/skillStore';

/**
 * Destinations and travel for the Ride app. These are GAME places, described in general terms: no street addresses, no opening
 * hours, no player counts (no presence data exists). A trip is a SIMULATION: the player pays, game time passes and stats
 * change, but the character is not moved in the 3D world. Every fare, duration and effect is a game rule defined here.
 */
export type Distance = 'near' | 'mid' | 'far';
export interface ActivityDef { id: string; label: string; cost: number; minutes: number; effects: Effects; skill?: { id: SkillId; xp: number }; note?: string }
export interface Destination { id: string; name: string; cityId: string; category: 'Market' | 'Food' | 'Work' | 'Fitness' | 'Nightlife' | 'Outdoors' | 'Shopping'; glyph: string; blurb: string; distance: Distance; activities: ActivityDef[] }

const eat = (id: string, label: string, cost: number, effects: Effects): ActivityDef => ({ id, label, cost, minutes: 25, effects, note: 'Eaten there, so it does not go to your inventory.' });
export const DESTINATIONS: Destination[] = [
  { id: 'balogun', name: 'Balogun Market', cityId: 'lagos', category: 'Market', glyph: '🛍️', blurb: 'Fabrics, accessories and fearless bargaining.', distance: 'mid', activities: [{ id: 'browse', label: 'Browse the stalls', cost: 0, minutes: 40, effects: { happiness: 6, energy: -10, social: 4 } }, { id: 'haggle', label: 'Haggle for fabric', cost: 6_000, minutes: 30, effects: { charisma: 0.6, happiness: 8, energy: -8 } }] },
  { id: 'cchub', name: 'CC Hub', cityId: 'lagos', category: 'Work', glyph: '💡', blurb: 'A busy tech hub in Yaba.', distance: 'mid', activities: [{ id: 'cowork', label: 'Co-work for a few hours', cost: 3_000, minutes: 120, effects: { energy: -18, hunger: -10, social: 6 }, skill: { id: 'coding', xp: 10 } }] },
  { id: 'ifitness', name: 'iFitness', cityId: 'lagos', category: 'Fitness', glyph: '🏋️', blurb: 'Weights, treadmills and loud motivation.', distance: 'near', activities: [{ id: 'workout', label: 'Work out', cost: 5_000, minutes: 60, effects: { energy: -22, hunger: -10, thirst: -14, hygiene: -12, happiness: 10 }, skill: { id: 'fitness', xp: 10 } }] },
  { id: 'quilox', name: 'Quilox', cityId: 'lagos', category: 'Nightlife', glyph: '🍾', blurb: 'Lagos nightlife at full volume.', distance: 'far', activities: [{ id: 'club', label: 'Spend the night out', cost: 25_000, minutes: 180, effects: { social: 30, happiness: 18, energy: -22, hygiene: -10, thirst: -12 } }] },
  { id: 'amala', name: 'Iya Basira Amala Spot', cityId: 'lagos', category: 'Food', glyph: '🥣', blurb: 'A buka serving hot amala, gbegiri and ewedu.', distance: 'near', activities: [eat('amala', 'Order amala and ewedu', 3_800, { hunger: 48, happiness: 9 }), { id: 'wash', label: 'Wash your hands', cost: 0, minutes: 2, effects: { hygiene: 6 } }] },
  { id: 'mamaput', name: 'Mama Put Kitchen', cityId: 'lagos', category: 'Food', glyph: '🍛', blurb: 'Jollof, zobo and generous portions.', distance: 'near', activities: [eat('jollof', 'Jollof rice and chicken', 4_500, { hunger: 50, happiness: 8 }), eat('zobo', 'Chilled zobo', 800, { thirst: 35, happiness: 4 })] },
  { id: 'ekobites', name: 'Eko Bites', cityId: 'lagos', category: 'Food', glyph: '🌯', blurb: 'Shawarma and cold drinks.', distance: 'near', activities: [eat('shawarma', 'Chicken shawarma', 6_500, { hunger: 38, happiness: 10 })] },
  { id: 'compvillage', name: 'Computer Village', cityId: 'lagos', category: 'Shopping', glyph: '📱', blurb: 'Phones, gadgets and repairs.', distance: 'mid', activities: [{ id: 'window', label: 'Window-shop gadgets', cost: 0, minutes: 35, effects: { happiness: 5, energy: -8 } }] },
  { id: 'freedom', name: 'Freedom Park', cityId: 'lagos', category: 'Outdoors', glyph: '🌳', blurb: 'Open air, live music and calm.', distance: 'mid', activities: [{ id: 'relax', label: 'Relax in the park', cost: 0, minutes: 60, effects: { happiness: 12, energy: 4, social: 5 } }] },
  { id: 'wuse', name: 'Wuse Market', cityId: 'abuja', category: 'Market', glyph: '🧺', blurb: 'Produce, fabric and everyday goods.', distance: 'mid', activities: [{ id: 'browse', label: 'Browse the stalls', cost: 0, minutes: 40, effects: { happiness: 6, energy: -10, social: 4 } }] },
  { id: 'abjsuya', name: 'Abuja Suya Spot', cityId: 'abuja', category: 'Food', glyph: '🍢', blurb: 'Late-night suya with extra yaji.', distance: 'near', activities: [eat('suya', 'Suya (spicy)', 5_000, { hunger: 32, happiness: 12 })] },
  { id: 'phwater', name: 'Waterfront Walk', cityId: 'port-harcourt', category: 'Outdoors', glyph: '🌊', blurb: 'A stroll by the water.', distance: 'near', activities: [{ id: 'walk', label: 'Take a walk', cost: 0, minutes: 45, effects: { happiness: 10, energy: -4 } }] },
  { id: 'phpepper', name: 'Pepper Soup Joint', cityId: 'port-harcourt', category: 'Food', glyph: '🍲', blurb: 'Hot pepper soup and cold drinks.', distance: 'near', activities: [eat('pepper', 'Catfish pepper soup', 6_000, { hunger: 40, happiness: 11 })] },
  { id: 'beninwalk', name: 'Arts and Bronze Walk', cityId: 'edo', category: 'Outdoors', glyph: '🗿', blurb: 'Galleries and street art.', distance: 'mid', activities: [{ id: 'tour', label: 'Take the walking tour', cost: 2_000, minutes: 70, effects: { happiness: 12, charisma: 0.4, energy: -10 } }] },
];
export const getDestination = (id: string) => DESTINATIONS.find((d) => d.id === id);

export type Method = 'walk' | 'keke' | 'danfo' | 'okada' | 'cab' | 'own';
export interface MethodDef { id: Method; label: string; glyph: string; fare: Record<Distance, number>; minutes: Record<Distance, number>; effects: Effects; needsCar?: boolean; blurb: string }
export const METHODS: MethodDef[] = [
  { id: 'walk', label: 'Trek', glyph: '🚶🏾', fare: { near: 0, mid: 0, far: 0 }, minutes: { near: 12, mid: 30, far: 65 }, effects: { energy: -9, thirst: -8, hygiene: -5 }, blurb: 'Free, slow and tiring.' },
  { id: 'keke', label: 'Keke', glyph: '🛺', fare: { near: 500, mid: 900, far: 1_800 }, minutes: { near: 8, mid: 18, far: 35 }, effects: { energy: -2 }, blurb: 'Cheap and cheerful.' },
  { id: 'danfo', label: 'Danfo', glyph: '🚌', fare: { near: 300, mid: 600, far: 1_200 }, minutes: { near: 12, mid: 26, far: 48 }, effects: { energy: -2, social: 2 }, blurb: 'The cheapest ride, with a conductor.' },
  { id: 'okada', label: 'Okada', glyph: '🏍️', fare: { near: 700, mid: 1_300, far: 2_600 }, minutes: { near: 5, mid: 11, far: 21 }, effects: { energy: -3, hygiene: -3 }, blurb: 'Fastest through traffic.' },
  { id: 'cab', label: 'Cab', glyph: '🚕', fare: { near: 2_500, mid: 5_000, far: 10_000 }, minutes: { near: 7, mid: 15, far: 28 }, effects: { energy: -1 }, blurb: 'Comfortable and air-conditioned.' },
  { id: 'own', label: 'Your car', glyph: '🚗', fare: { near: 0, mid: 0, far: 0 }, minutes: { near: 6, mid: 13, far: 24 }, effects: { energy: -1 }, needsCar: true, blurb: 'Needs a car you own. Fuel is not simulated, so it is free.' },
];
export const getMethod = (id: Method) => METHODS.find((m) => m.id === id)!;
