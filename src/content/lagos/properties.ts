import { HOUSE_TIERS, house, type HomeCfg, type TierId } from '@/world/layoutBuilders';
import type { Palette, PropertyCategory, PropertyDefinition, PropertyLayout } from '@/types/world';

/**
 * Lagos housing catalogue. Prices are examples: tune them here, nothing else needs to change.
 * Each entry pairs a listing (PropertyDefinition) with a function that builds its 3D layout. Room counts, bathrooms
 * and parking in the listing are read from HOUSE_TIERS (world/layoutBuilders.ts), the same source the layout uses.
 */
interface Entry { property: Omit<PropertyDefinition, 'stateId' | 'layoutId'>; layout: (id: string) => PropertyLayout }

const pal = (wall: string, trim: string, accent: string): Palette => ({ wall, trim, accent });
const L = (s: string) => `lagos.${s}`;

function entry(id: string, areaId: string, name: string, category: PropertyCategory, price: number, tier: TierId, level: number, description: string, cfg: Omit<HomeCfg, 'id' | 'tier'>): Entry {
  const t = HOUSE_TIERS[tier], starter = tier <= 2;
  return {
    property: {
      id, areaId, name, category, price, unit: starter ? 'rooms' : 'bedrooms', rooms: t.mainRooms, bedrooms: t.bedrooms, bathrooms: t.bathrooms,
      garageBays: 0, parkingSpaces: t.parkingBays, description, cta: starter ? 'move_in' : 'buy', luxuryLevel: level,
    },
    layout: (lid) => house({ ...cfg, id: lid, tier }),
  };
}

/** Six properties on five layout tiers (tier 1 is shared by the two cheapest homes). */
export const ENTRIES: Entry[] = [
  // tier 1 · Lapo Baby: one studio room, no parking
  entry(L('face-me-i-face-you'), L('mushin'), 'Face-Me-I-Face-You', 'starter', 500_000, 1, 1, 'Basic one-room accommodation.',
    { floor: 'cement', finish: 'rough', windowStyle: 'burglar', palette: pal('#CDBB8C', '#7A5C2E', '#D8344A'), wallHeight: 2.6, ground: 'dirt', publicPower: false }),
  entry(L('self-contain-mushin'), L('mushin'), 'Self Contain', 'starter', 1_500_000, 1, 2, 'Your own studio with bathroom and kitchenette behind one door.',
    { floor: 'cement', finish: 'painted', windowStyle: 'sash', palette: pal('#BFD8B0', '#4C7A4A', '#FFC21A'), wallHeight: 2.7, size: 6.0, kitchenette: true }),
  // tier 2 · Starter Plus: bedroom + living room, 1 parking bay
  entry(L('room-and-parlour-yaba'), L('yaba'), 'Room & Parlour', 'starter', 4_500_000, 2, 3, 'Room and parlour close to the tech hubs, with one parking bay.',
    { floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F0CFB0', '#8A5A3C', '#2B4C7E'), wallHeight: 2.7 }),
  // tier 3 · Middle-tier: 2 bedrooms + living room, 2 parking bays
  entry(L('3-bedroom-flat-ikeja'), L('ikeja'), '3 Bedroom Flat', 'midLevel', 22_000_000, 3, 5, 'GRA-style flat with two bedrooms, a living room and two parking bays.',
    { floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F4EFE4', '#FFFFFF', '#19A388'), wallHeight: 2.8 }),
  // tier 4 · Premium: 2 bedrooms, living room, kitchen/dining, 3 parking bays
  entry(L('detached-duplex-lekki'), L('lekki'), '4 Bedroom Detached Duplex', 'upperClass', 85_000_000, 4, 7, 'Lekki home with a living room, kitchen and dining area, and three parking bays.',
    { floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F6F1E7', '#FFFFFF', '#B8892F'), wallHeight: 3.1 }),
  // tier 5 · Luxury: 3 bedrooms, living room, kitchen/dining, 3 parking bays
  entry(L('luxury-duplex-ikoyi'), L('ikoyi'), 'Luxury 4 Bedroom Duplex', 'luxury', 180_000_000, 5, 8, 'Designer finishes, three bedrooms, a grand living room and three parking bays.',
    { floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FAF7F0', '#D8C48A', '#B8892F'), wallHeight: 3.4 }),
];
