import { faceMeIFaceYou, residence, roomAndParlour, selfContain } from '@/world/layoutBuilders';
import type { Palette, PropertyCategory, PropertyDefinition, PropertyLayout } from '@/types/world';

/**
 * Lagos housing catalogue. Prices are examples: tune them here, nothing else needs to change.
 * Each entry pairs a listing (PropertyDefinition) with a function that builds its 3D layout.
 */
interface Entry { property: Omit<PropertyDefinition, 'stateId' | 'layoutId'>; layout: (id: string) => PropertyLayout }

const pal = (wall: string, trim: string, accent: string): Palette => ({ wall, trim, accent });

function starter(id: string, areaId: string, name: string, price: number, rooms: number, description: string, layout: Entry['layout'], level = 1): Entry {
  return { property: { id, areaId, name, category: 'starter', price, unit: 'rooms', rooms, bedrooms: 1, bathrooms: 1, garageBays: 0, parkingSpaces: 0, description, cta: 'move_in', luxuryLevel: level }, layout };
}

function home(id: string, areaId: string, name: string, category: PropertyCategory, price: number, beds: number, baths: number, garageBays: number, parkingSpaces: number, level: number, description: string, layout: Entry['layout']): Entry {
  return { property: { id, areaId, name, category, price, unit: 'bedrooms', rooms: beds + 1, bedrooms: beds, bathrooms: baths, garageBays, parkingSpaces, description, cta: 'buy', luxuryLevel: level }, layout };
}

const L = (s: string) => `lagos.${s}`;

/** Six properties, one per rung of the ladder. Quality over quantity: add a rung only when it brings a new layout. */
export const ENTRIES: Entry[] = [
  // 1 · Basic low-income housing
  starter(L('face-me-i-face-you'), L('mushin'), 'Face-Me-I-Face-You', 500_000, 1, 'Basic accommodation in a shared compound.',
    (id) => faceMeIFaceYou({ id, palette: pal('#CDBB8C', '#7A5C2E', '#D8344A') }), 1),
  // 2 · Modest upgrade
  starter(L('self-contain-mushin'), L('mushin'), 'Self Contain', 1_500_000, 1, 'Your own bedroom, bathroom and kitchenette behind one door.',
    (id) => selfContain({ id, palette: pal('#BFD8B0', '#4C7A4A', '#FFC21A') }), 2),
  // 3 · Comfortable room and parlour
  starter(L('room-and-parlour-yaba'), L('yaba'), 'Room & Parlour', 4_500_000, 2, 'Room and parlour close to the tech hubs.',
    (id) => roomAndParlour({ id, palette: pal('#F0CFB0', '#8A5A3C', '#2B4C7E') }), 3),

  // ── Mid-level flats ──,
  // 4 · Modern family home
  home(L('3-bedroom-flat-ikeja'), L('ikeja'), '3 Bedroom Flat', 'midLevel', 22_000_000, 3, 3, 0, 2, 5, 'GRA-style flat with guest toilet and parking.',
    (id) => residence({ id, beds: 3, baths: 3, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F4EFE4', '#FFFFFF', '#19A388'), parkingSpaces: 2, fence: 'brick', ground: 'paving', balcony: true, stairs: false })),
  // 5 · Premium duplex
  home(L('detached-duplex-lekki'), L('lekki'), '4 Bedroom Detached Duplex', 'upperClass', 85_000_000, 4, 4, 2, 0, 7, 'Luxury duplex in Lekki.',
    (id) => residence({ id, beds: 4, baths: 4, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F6F1E7', '#FFFFFF', '#B8892F'), stairs: true, garageBays: 2, terrace: true, pillars: true, garden: 3.4, fence: 'ironbar', ground: 'paving', trees: 3, wallHeight: 3.1, grand: 0.5 })),
  // 6 · High-end luxury
  home(L('luxury-duplex-ikoyi'), L('ikoyi'), 'Luxury 4 Bedroom Duplex', 'luxury', 180_000_000, 4, 5, 3, 0, 8, 'Designer finishes, double-height living room, three-car garage.',
    (id) => residence({ id, beds: 4, baths: 5, floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FAF7F0', '#D8C48A', '#B8892F'), stairs: true, garageBays: 3, terrace: true, pillars: true, garden: 4.0, fence: 'ironbar', ground: 'paving', trees: 4, wallHeight: 3.4, grand: 0.9 })),
];
