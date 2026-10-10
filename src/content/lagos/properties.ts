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

export const ENTRIES: Entry[] = [
  // ── Starter: compound housing ──
  starter(L('face-me-i-face-you'), L('mushin'), 'Face-Me-I-Face-You', 500_000, 1, 'Basic accommodation in a shared compound.',
    (id) => faceMeIFaceYou({ id, palette: pal('#CDBB8C', '#7A5C2E', '#D8344A') }), 1),
  starter(L('7-by-7-yaba'), L('yaba'), '7 by 7', 750_000, 1, 'Compact accommodation in a busy Lagos neighbourhood.',
    (id) => faceMeIFaceYou({ id, roomSize: 2.7, neighbours: 3, palette: pal('#9CC4D8', '#3B6B80', '#FFC21A') }), 1),
  starter(L('7-by-7-mushin'), L('mushin'), '7 by 7', 600_000, 1, 'Small room, small rent culture, big hustle energy.',
    (id) => faceMeIFaceYou({ id, roomSize: 2.7, neighbours: 2, fence: 'zinc', palette: pal('#D9B38C', '#7A4B2A', '#0B8F4D') }), 1),
  starter(L('self-contain-mushin'), L('mushin'), 'Self Contain', 1_500_000, 1, 'Your own bedroom, bathroom and kitchenette behind one door.',
    (id) => selfContain({ id, palette: pal('#BFD8B0', '#4C7A4A', '#FFC21A') }), 2),
  starter(L('self-contain-agege'), L('agege'), 'Self Contain', 1_800_000, 1, 'Compact self-contained unit in a quiet Agege street.',
    (id) => selfContain({ id, palette: pal('#E7D3A8', '#8C6D3C', '#D8344A') }), 2),
  starter(L('room-and-parlour-mushin'), L('mushin'), 'Room & Parlour', 2_800_000, 2, 'Separate bedroom and parlour in a simple compound.',
    (id) => roomAndParlour({ id, floor: 'cement', palette: pal('#E6D3A3', '#7A5C2E', '#0B8F4D') }), 2),
  starter(L('room-and-parlour-agege'), L('agege'), 'Room & Parlour', 3_200_000, 2, 'Tiled parlour, small kitchen and a gated compound.',
    (id) => roomAndParlour({ id, palette: pal('#CFE0C3', '#4C7A4A', '#FFC21A') }), 3),
  starter(L('room-and-parlour-yaba'), L('yaba'), 'Room & Parlour', 4_500_000, 2, 'Room and parlour close to the tech hubs.',
    (id) => roomAndParlour({ id, palette: pal('#F0CFB0', '#8A5A3C', '#2B4C7E') }), 3),

  // ── Mid-level flats ──
  home(L('mini-flat-yaba'), L('yaba'), 'Mini Flat', 'midLevel', 8_500_000, 1, 1, 0, 1, 3, 'Modern one-bedroom flat with parking.',
    (id) => residence({ id, beds: 1, baths: 1, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#EFE6D2', '#FFFFFF', '#0B8F4D'), parkingSpaces: 1, fence: 'brick', ground: 'paving', balcony: true, rowDepth: 3.8, livingDepth: 3.6 })),
  home(L('mini-flat-lagos-island'), L('lagos-island'), 'Mini Flat', 'midLevel', 9_500_000, 1, 1, 0, 0, 3, 'One-bedroom flat in the heart of the Island. No parking, all the action.',
    (id) => residence({ id, beds: 1, baths: 1, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#E9DFC6', '#FFFFFF', '#E4572E'), fence: 'brick', ground: 'concrete', balcony: true, rowDepth: 3.8, livingDepth: 3.6 })),
  home(L('2-bedroom-flat-surulere'), L('surulere'), '2 Bedroom Flat', 'midLevel', 10_000_000, 2, 1, 0, 1, 3, 'Family flat on a lively Surulere street.',
    (id) => residence({ id, beds: 2, baths: 1, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F0E4C8', '#FFFFFF', '#FFC21A'), parkingSpaces: 1, fence: 'brick', ground: 'paving', balcony: true })),
  home(L('2-bedroom-flat-yaba'), L('yaba'), '2 Bedroom Flat', 'midLevel', 12_000_000, 2, 2, 0, 1, 4, 'Two bedrooms, ensuite master, parking in the compound.',
    (id) => residence({ id, beds: 2, baths: 2, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#EEE7D8', '#FFFFFF', '#0B8F4D'), parkingSpaces: 1, fence: 'brick', ground: 'paving', balcony: true })),
  home(L('2-bedroom-flat-lagos-island'), L('lagos-island'), '2 Bedroom Flat', 'midLevel', 14_000_000, 2, 2, 0, 0, 4, 'Compact two-bedroom with city views.',
    (id) => residence({ id, beds: 2, baths: 2, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#E7E1D6', '#FFFFFF', '#2B4C7E'), fence: 'brick', ground: 'concrete', balcony: true })),
  home(L('3-bedroom-flat-yaba'), L('yaba'), '3 Bedroom Flat', 'midLevel', 15_000_000, 3, 2, 0, 1, 4, 'Modern family apartment.',
    (id) => residence({ id, beds: 3, baths: 2, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F2EADB', '#FFFFFF', '#0B8F4D'), parkingSpaces: 1, fence: 'brick', ground: 'paving', balcony: true })),
  home(L('3-bedroom-flat-surulere'), L('surulere'), '3 Bedroom Flat', 'midLevel', 17_000_000, 3, 2, 0, 2, 4, 'Spacious flat with space for two cars.',
    (id) => residence({ id, beds: 3, baths: 2, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#EFE6CF', '#FFFFFF', '#E5A400'), parkingSpaces: 2, fence: 'brick', ground: 'paving', balcony: true })),
  home(L('3-bedroom-flat-ikeja'), L('ikeja'), '3 Bedroom Flat', 'midLevel', 22_000_000, 3, 3, 0, 2, 5, 'GRA-style flat with guest toilet and parking.',
    (id) => residence({ id, beds: 3, baths: 3, floor: 'tile', finish: 'painted', windowStyle: 'sash', palette: pal('#F4EFE4', '#FFFFFF', '#19A388'), parkingSpaces: 2, fence: 'brick', ground: 'paving', balcony: true, stairs: false })),
  home(L('4-bedroom-flat-ikeja'), L('ikeja'), '4 Bedroom Flat', 'midLevel', 35_000_000, 4, 3, 0, 2, 5, 'Large flat with a proper balcony and double parking.',
    (id) => residence({ id, beds: 4, baths: 3, floor: 'tile', finish: 'render', windowStyle: 'sash', palette: pal('#F5F0E6', '#FFFFFF', '#0B8F4D'), parkingSpaces: 2, fence: 'brick', ground: 'paving', balcony: true })),
  home(L('4-bedroom-flat-lekki'), L('lekki'), '4 Bedroom Flat', 'midLevel', 48_000_000, 4, 4, 0, 2, 6, 'Four bedrooms, four bathrooms, a short drive from the beach.',
    (id) => residence({ id, beds: 4, baths: 4, floor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F7F3EA', '#FFFFFF', '#1F4E47'), parkingSpaces: 2, fence: 'brick', ground: 'paving', balcony: true })),

  // ── Upper class ──
  home(L('3-bedroom-luxury-apartment-lekki'), L('lekki'), '3 Bedroom Luxury Apartment', 'upperClass', 55_000_000, 3, 4, 0, 2, 6, 'Marble floors, walk-in glazing and a private balcony.',
    (id) => residence({ id, beds: 3, baths: 4, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F4F0E8', '#FFFFFF', '#B8892F'), parkingSpaces: 2, fence: 'ironbar', ground: 'paving', balcony: true, grand: 0.4 })),
  home(L('4-bedroom-luxury-apartment-lekki'), L('lekki'), '4 Bedroom Luxury Apartment', 'upperClass', 75_000_000, 4, 5, 0, 3, 7, 'Four ensuite bedrooms, boys quarters feel, estate security.',
    (id) => residence({ id, beds: 4, baths: 5, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'panoramic', palette: pal('#F5F1E9', '#FFFFFF', '#B8892F'), parkingSpaces: 3, fence: 'ironbar', ground: 'paving', balcony: true, grand: 0.6 })),
  home(L('4-bedroom-luxury-apartment-vi'), L('victoria-island'), '4 Bedroom Luxury Apartment', 'upperClass', 95_000_000, 4, 5, 0, 3, 7, 'High-rise style apartment on Victoria Island. Cityscape from every window.',
    (id) => residence({ id, beds: 4, baths: 5, floor: 'marble', bedFloor: 'wood', finish: 'marble', windowStyle: 'panoramic', palette: pal('#EEF1F2', '#FFFFFF', '#19C3A6'), parkingSpaces: 3, fence: 'ironbar', ground: 'paving', balcony: true, grand: 0.8, wallHeight: 3.1 })),
  home(L('terrace-duplex-lekki'), L('lekki'), 'Terrace Duplex', 'upperClass', 65_000_000, 4, 4, 0, 1, 6, 'Narrow, tall and stylish. Part of a gated terrace row.',
    (id) => residence({ id, beds: 4, baths: 4, floor: 'wood', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F2ECE0', '#FFFFFF', '#E4572E'), stairs: true, parkingSpaces: 1, fence: 'brick', ground: 'paving', balcony: true, wallHeight: 3.0 })),
  home(L('semi-detached-duplex-lekki'), L('lekki'), 'Semi-Detached Duplex', 'upperClass', 72_000_000, 4, 4, 1, 0, 7, 'Shared wall on one side, private garage and terrace.',
    (id) => residence({ id, beds: 4, baths: 4, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F4EFE5', '#FFFFFF', '#1F4E47'), stairs: true, garageBays: 1, terrace: true, pillars: true, garden: 2.6, fence: 'brick', ground: 'paving', trees: 2, wallHeight: 3.0 })),
  home(L('detached-duplex-lekki'), L('lekki'), '4 Bedroom Detached Duplex', 'upperClass', 85_000_000, 4, 4, 2, 0, 7, 'Luxury duplex in Lekki.',
    (id) => residence({ id, beds: 4, baths: 4, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F6F1E7', '#FFFFFF', '#B8892F'), stairs: true, garageBays: 2, terrace: true, pillars: true, garden: 3.4, fence: 'ironbar', ground: 'paving', trees: 3, wallHeight: 3.1, grand: 0.5 })),
  home(L('detached-duplex-ikoyi'), L('ikoyi'), 'Detached Duplex', 'upperClass', 140_000_000, 5, 5, 3, 0, 8, 'Old-money Ikoyi address with a walled garden and three-car garage.',
    (id) => residence({ id, beds: 5, baths: 5, floor: 'marble', bedFloor: 'wood', finish: 'render', windowStyle: 'glass', palette: pal('#F3EDE0', '#FFFFFF', '#7A5C2E'), stairs: true, garageBays: 3, terrace: true, pillars: true, garden: 3.8, fence: 'brick', ground: 'paving', trees: 4, wallHeight: 3.2, grand: 0.6 })),

  // ── Luxury ──
  home(L('luxury-duplex-ikoyi'), L('ikoyi'), 'Luxury 4 Bedroom Duplex', 'luxury', 180_000_000, 4, 5, 3, 0, 8, 'Designer finishes, double-height living room, three-car garage.',
    (id) => residence({ id, beds: 4, baths: 5, floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FAF7F0', '#D8C48A', '#B8892F'), stairs: true, garageBays: 3, terrace: true, pillars: true, garden: 4.0, fence: 'ironbar', ground: 'paving', trees: 4, wallHeight: 3.4, grand: 0.9 })),
  home(L('5-bedroom-duplex-banana-island'), L('banana-island'), '5 Bedroom Luxury Duplex', 'luxury', 320_000_000, 5, 6, 3, 0, 9, 'Banana Island address with a landscaped garden and security lodge.',
    (id) => residence({ id, beds: 5, baths: 6, floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FBF8F2', '#D8C48A', '#B8892F'), stairs: true, garageBays: 3, terrace: true, pillars: true, garden: 4.4, fence: 'ironbar', ground: 'paving', trees: 5, wallHeight: 3.5, grand: 1.1 })),
  home(L('luxury-mansion-banana-island'), L('banana-island'), 'Luxury Mansion', 'luxury', 500_000_000, 5, 6, 4, 0, 9, 'Premium waterfront-style luxury residence.',
    (id) => residence({ id, beds: 5, baths: 6, floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FFFFFF', '#D8C48A', '#B8892F'), stairs: true, garageBays: 4, terrace: true, pillars: true, garden: 5.0, fence: 'ironbar', ground: 'paving', trees: 6, wallHeight: 3.6, grand: 1.4, livingDepth: 4.4 })),
  home(L('waterfront-mansion-banana-island'), L('banana-island'), 'Waterfront Mansion', 'luxury', 800_000_000, 6, 7, 4, 0, 10, 'Private jetty on the lagoon, six suites, four-car garage.',
    (id) => residence({ id, beds: 6, baths: 7, floor: 'marble', bedFloor: 'marble', finish: 'marble', windowStyle: 'panoramic', palette: pal('#FFFFFF', '#D8C48A', '#19C3A6'), stairs: true, garageBays: 4, terrace: true, pillars: true, garden: 5.0, fence: 'ironbar', ground: 'paving', trees: 6, wallHeight: 3.7, grand: 1.6, livingDepth: 4.6, waterfront: true })),
];
