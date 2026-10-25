import type { FloorKind, Palette } from '@/types/world';

/**
 * Public interiors. ONE template per kind of venue, reused by every landmark of that kind (three markets share `market`; the name
 * and the entry fee come from the landmark). A template is data: room size, floor, palette, furniture, capacity and how many NPCs
 * keep it lively. The 3D room is built by world/interiors/build.ts and rendered by the same scene as a home, so walking,
 * furniture collisions, the action menu, activities and the pay-once activity runner all apply unchanged.
 */
export type InteriorKind = 'market' | 'church' | 'gallery' | 'stadium' | 'club' | 'showroom' | 'jail'
  | 'viewing' | 'eatery' | 'bank' | 'mall' | 'cinema' | 'concert' | 'hotel' | 'techhub' | 'park' | 'beach' | 'recreation' | 'government' | 'business' | 'airport' | 'port';
/** What surrounds the venue: a city street (default), a park, a beach with the sea behind it, or a container port. */
export type VenueTheme = 'street' | 'park' | 'beach' | 'port';
export interface VenueItem { defId: string; x: number; z: number; rotation: number }
export interface InteriorDef {
  id: InteriorKind; kind: InteriorKind; label: string; tagline: string;
  w: number; d: number; floor: FloorKind; wallHeight: number; palette: Palette;
  /** Real players + NPCs together never exceed this. Enforced by the server in a real multiplayer game (game/instances.ts). */
  capacity: number;
  /** NPCs present when there are no real players. Real players replace NPCs one for one. */
  npcTarget: number;
  /** Can the player try to pickpocket NPCs here? (game/crime.ts) */
  crowd: boolean;
  items: VenueItem[];
  /** Visitors can chat (local chat is per instance). Jail has none. */
  chat: boolean;
  /** Dark, party-lit room: the disco lights run all the time. */
  nightlife?: boolean;
  /** Floor colour and shine overrides (a dark club floor, sand). */
  floorTint?: string; floorRough?: number;
  /** Surroundings. Defaults to a city street. */
  theme?: VenueTheme;
  /** Emoji for the chat header. */
  glyph: string;
}
const row = (defId: string, xs: number[], z: number, rotation = 0): VenueItem[] => xs.map((x) => ({ defId, x, z, rotation }));

export const INTERIORS: Record<InteriorKind, InteriorDef> = {
  market: {
    id: 'market', kind: 'market', glyph: '🛍️', label: 'Market', tagline: 'Fabric, noise and bargains.', w: 16, d: 12, floor: 'concrete', wallHeight: 3.4,
    palette: { wall: '#D8C7A0', trim: '#8A5A2E', accent: '#D9462F' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [...row('v_stall', [2.6, 5.8, 9.0, 12.2], 1.8), ...row('v_stall', [3.6, 7.2, 10.8], 5.3), { defId: 'v_sacks', x: 1.2, z: 10.4, rotation: 0 }, { defId: 'v_sacks', x: 14.6, z: 4.2, rotation: 0 }, { defId: 'v_kiosk', x: 14.2, z: 9.8, rotation: 0 },
      { defId: 'v_fruit_stand', x: 14.8, z: 7.0, rotation: 3 }, { defId: 'v_fabric_rack', x: 1.4, z: 4.2, rotation: 1 }, { defId: 'v_fabric_rack', x: 1.4, z: 7.2, rotation: 1 }, { defId: 'v_fruit_stand', x: 6.2, z: 9.6, rotation: 0 }, { defId: 'v_fabric_rack', x: 10.4, z: 9.8, rotation: 0 }, { defId: 'v_flower_stand', x: 14.8, z: 1.4, rotation: 0 }],
  },
  church: {
    id: 'church', kind: 'church', glyph: '⛪', label: 'Church', tagline: 'Quiet, bright and welcoming.', w: 16, d: 14, floor: 'terrazzo', wallHeight: 4.2,
    palette: { wall: '#F1EBDD', trim: '#B89A5A', accent: '#7A4A26' }, capacity: 10, npcTarget: 7, crowd: false, chat: true,
    items: [{ defId: 'v_altar', x: 8, z: 1.6, rotation: 0 }, ...[4.6, 6.6, 8.6, 10.6].flatMap((z) => [...row('v_pew', [4.2, 11.8], z, 2)]),
      { defId: 'v_candle_rack', x: 4.8, z: 1.6, rotation: 0 }, { defId: 'v_candle_rack', x: 11.2, z: 1.6, rotation: 0 }, { defId: 'v_flower_stand', x: 6.2, z: 1.2, rotation: 0 }, { defId: 'v_flower_stand', x: 9.8, z: 1.2, rotation: 0 }, { defId: 'v_choir', x: 13.8, z: 1.7, rotation: 0 }, { defId: 'plant', x: 1.2, z: 12.6, rotation: 0 }, { defId: 'plant', x: 14.8, z: 12.6, rotation: 0 }],
  },
  gallery: {
    id: 'gallery', kind: 'gallery', glyph: '🖼️', label: 'Gallery', tagline: 'Art, music and quiet conversation.', w: 14, d: 12, floor: 'marble', wallHeight: 3.6,
    palette: { wall: '#F4F1EA', trim: '#2B2F32', accent: '#C4552D' }, capacity: 10, npcTarget: 5, crowd: false, chat: true,
    items: [...row('v_plinth', [3, 7, 11], 2.6), ...row('v_plinth', [2.6, 11.4], 7.8), { defId: 'v_plinth', x: 7, z: 10.6, rotation: 0 },
      { defId: 'v_sculpture', x: 7, z: 6.2, rotation: 0 }, { defId: 'v_gallery_bench', x: 4.4, z: 5.4, rotation: 0 }, { defId: 'v_gallery_bench', x: 9.6, z: 5.4, rotation: 0 }, { defId: 'plant', x: 1.2, z: 1.2, rotation: 0 }, { defId: 'plant', x: 12.8, z: 1.2, rotation: 0 }, { defId: 'plant', x: 12.8, z: 10.8, rotation: 0 }],
  },
  stadium: {
    id: 'stadium', kind: 'stadium', glyph: '⚽', label: 'Stadium', tagline: 'Where the whole of Lagos shouts together.', w: 20, d: 16, floor: 'grass', wallHeight: 3.4,
    palette: { wall: '#E6E8EA', trim: '#1F6F4D', accent: '#1F6F4D' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [...row('v_bleachers', [4.5, 10, 15.5], 3.2), { defId: 'v_kiosk', x: 2.2, z: 13.4, rotation: 0 }, { defId: 'v_kiosk', x: 17.8, z: 13.4, rotation: 0 },
      { defId: 'v_goal', x: 10, z: 8.2, rotation: 2 }, { defId: 'v_goal', x: 10, z: 14.6, rotation: 0 }, { defId: 'v_palm', x: 1.2, z: 8.6, rotation: 0 }, { defId: 'v_palm', x: 18.8, z: 8.6, rotation: 0 }],
  },
  club: {
    id: 'club', kind: 'club', glyph: '🍾', label: 'Club', tagline: 'Premium. Loud. Lagos.', w: 18, d: 14, floor: 'diamond', floorTint: '#3A3350', floorRough: 0.18, wallHeight: 3.6,
    palette: { wall: '#1B1B26', trim: '#FF3FA4', accent: '#3FD5FF' }, capacity: 10, npcTarget: 9, crowd: true, chat: true, nightlife: true,
    items: [{ defId: 'v_club_bar', x: 4.6, z: 1.3, rotation: 0 }, { defId: 'v_dj_booth', x: 11, z: 1.4, rotation: 0 }, { defId: 'v_speaker_stack', x: 8.7, z: 1.0, rotation: 0 }, { defId: 'v_speaker_stack', x: 13.3, z: 1.0, rotation: 0 }, { defId: 'sofa', x: 1.6, z: 8.6, rotation: 1 }, { defId: 'sofa', x: 1.6, z: 11.4, rotation: 1 }, { defId: 'disco_light', x: 4.4, z: 5, rotation: 0 }, { defId: 'disco_light', x: 13.6, z: 5, rotation: 0 }, { defId: 'disco_light', x: 16.4, z: 9.5, rotation: 0 }],
  },
  showroom: {
    id: 'showroom', kind: 'showroom', glyph: '🚗', label: 'Showroom', tagline: 'Polished floors, polished cars.', w: 24, d: 14, floor: 'marble', floorTint: '#D9DCE4', floorRough: 0.12, wallHeight: 4.0,
    palette: { wall: '#ECEEF0', trim: '#B8892F', accent: '#1F3D6B' }, capacity: 10, npcTarget: 4, crowd: false, chat: true,
    items: [...row('v_podium', [3.6, 9.2, 14.8, 20.4], 3.8), ...row('v_podium', [3.6, 9.2, 14.8, 20.4], 10.2),
      { defId: 'v_reception', x: 12, z: 1.3, rotation: 0 }, { defId: 'v_spec_board', x: 1.0, z: 3.8, rotation: 1 }, { defId: 'v_spec_board', x: 1.0, z: 10.2, rotation: 1 }, { defId: 'sofa', x: 1.8, z: 7.0, rotation: 1 }, { defId: 'v_coffee_bar', x: 22.8, z: 7.0, rotation: 3 }, { defId: 'plant', x: 22.8, z: 1.3, rotation: 0 }, { defId: 'plant', x: 22.8, z: 12.7, rotation: 0 }, { defId: 'plant', x: 1.2, z: 12.7, rotation: 0 }],
  },
  jail: {
    id: 'jail', kind: 'jail', glyph: '🚔', label: 'Jail', tagline: 'Serve your time.', w: 12, d: 10, floor: 'concrete', wallHeight: 3.0,
    palette: { wall: '#9AA0A4', trim: '#3A3F44', accent: '#E9B949' }, capacity: 10, npcTarget: 3, crowd: false, chat: false,
    items: [...row('v_cell_bed', [1.6, 4.4, 7.2, 10.2], 2.3), ...row('v_bars', [2.0, 5.0, 8.0, 10.6], 0.5)],
  },
  viewing: {
    id: 'viewing', kind: 'viewing', glyph: '📺', label: 'Viewing centre', tagline: 'Football, gist and small noise.', w: 16, d: 12, floor: 'ceramic', wallHeight: 3.6,
    palette: { wall: '#2F6B4A', trim: '#E9B949', accent: '#E4572E' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [{ defId: 'v_big_screen', x: 8, z: 1.1, rotation: 0 }, ...[3.6, 8, 12.4].flatMap((x) => [{ defId: 'v_view_bench', x, z: 4.4, rotation: 2 }, { defId: 'v_view_bench', x, z: 6.4, rotation: 2 }]), { defId: 'v_drinks_bar', x: 13.2, z: 1.2, rotation: 0 }, { defId: 'v_pool_table', x: 3.4, z: 9.8, rotation: 0 }, { defId: 'v_kiosk', x: 14.2, z: 9.6, rotation: 0 }, { defId: 'v_palm', x: 1.0, z: 1.0, rotation: 0 }, { defId: 'v_palm', x: 15, z: 5.5, rotation: 0 }],
  },
  eatery: {
    id: 'eatery', kind: 'eatery', glyph: '🍛', label: 'Eatery', tagline: 'Hot food and loud gist.', w: 14, d: 11, floor: 'cement', wallHeight: 3.2,
    palette: { wall: '#E9C46A', trim: '#9C4A1A', accent: '#2F6B4A' }, capacity: 10, npcTarget: 7, crowd: true, chat: true,
    items: [{ defId: 'v_food_counter', x: 4.6, z: 1.3, rotation: 0 }, { defId: 'v_grill', x: 10, z: 1.1, rotation: 0 }, { defId: 'v_drinks_fridge', x: 12.6, z: 1.1, rotation: 0 }, { defId: 'v_buka_table', x: 4, z: 5.4, rotation: 0 }, { defId: 'v_buka_table', x: 9.5, z: 5.4, rotation: 0 }, { defId: 'v_buka_table', x: 4, z: 8.7, rotation: 0 }, { defId: 'v_buka_table', x: 9.5, z: 8.7, rotation: 0 }, { defId: 'v_palm', x: 12.8, z: 9.2, rotation: 0 }, { defId: 'plant', x: 1.0, z: 3.2, rotation: 0 }],
  },
  bank: {
    id: 'bank', kind: 'bank', glyph: '🏦', label: 'Bank', tagline: 'Queue, sign, repeat.', w: 16, d: 12, floor: 'marble', wallHeight: 3.8,
    palette: { wall: '#EEF1F4', trim: '#1F3D6B', accent: '#B8892F' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [{ defId: 'v_teller', x: 8, z: 1.3, rotation: 0 }, { defId: 'v_pillar', x: 3, z: 3.6, rotation: 0 }, { defId: 'v_pillar', x: 13, z: 3.6, rotation: 0 }, ...[4.2, 8, 11.8].flatMap((x) => [{ defId: 'v_wait_chairs', x, z: 6.8, rotation: 2 }, { defId: 'v_wait_chairs', x, z: 9.2, rotation: 2 }]), { defId: 'plant', x: 1.0, z: 10.6, rotation: 0 }, { defId: 'plant', x: 15, z: 10.6, rotation: 0 }],
  },
  mall: {
    id: 'mall', kind: 'mall', glyph: '🛍️', label: 'Mall', tagline: 'Air-conditioned and tempting.', w: 20, d: 14, floor: 'marble', wallHeight: 4.2,
    palette: { wall: '#F7F5F0', trim: '#C4552D', accent: '#2E86C1' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [{ defId: 'v_fountain', x: 10, z: 7, rotation: 0 }, ...[3, 6.8, 13.2, 17].map((x) => ({ defId: 'v_shop_rack', x, z: 1.1, rotation: 0 })), { defId: 'v_shop_rack', x: 1.0, z: 5, rotation: 1 }, { defId: 'v_shop_rack', x: 1.0, z: 9, rotation: 1 }, { defId: 'v_arcade', x: 18.4, z: 6.2, rotation: 3 }, { defId: 'v_kiosk', x: 17.8, z: 12.2, rotation: 0 }, { defId: 'v_bench', x: 6.2, z: 7, rotation: 1 }, { defId: 'v_bench', x: 13.8, z: 7, rotation: 3 }, { defId: 'v_palm', x: 3, z: 12, rotation: 0 }, { defId: 'v_palm', x: 10, z: 12.6, rotation: 0 }],
  },
  cinema: {
    id: 'cinema', kind: 'cinema', glyph: '🎬', label: 'Cinema', tagline: 'Big screen, bigger snacks.', w: 16, d: 13, floor: 'tile', floorTint: '#4A2230', floorRough: 0.55, wallHeight: 4.0,
    palette: { wall: '#2A1520', trim: '#9B1C2E', accent: '#E9B949' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [{ defId: 'v_cinema_screen', x: 8, z: 0.9, rotation: 0 }, ...[4.2, 8, 11.8].flatMap((x) => [4.6, 6.6, 8.6].map((z) => ({ defId: 'v_cinema_seats', x, z, rotation: 2 }))), { defId: 'v_popcorn', x: 2.0, z: 11.4, rotation: 0 }, { defId: 'v_popcorn', x: 14.2, z: 11.4, rotation: 0 }, { defId: 'v_arcade', x: 8, z: 11.8, rotation: 0 }],
  },
  concert: {
    id: 'concert', kind: 'concert', glyph: '🥁', label: 'Live music venue', tagline: 'Afrobeat till late.', w: 18, d: 14, floor: 'wood', wallHeight: 3.8, nightlife: true,
    palette: { wall: '#3A1A12', trim: '#C4552D', accent: '#E9B949' }, capacity: 10, npcTarget: 9, crowd: true, chat: true,
    items: [{ defId: 'v_stage', x: 9, z: 2.0, rotation: 0 }, { defId: 'v_speaker_stack', x: 4, z: 1.0, rotation: 0 }, { defId: 'v_speaker_stack', x: 14, z: 1.0, rotation: 0 }, { defId: 'v_drinks_bar', x: 1.0, z: 7, rotation: 1 }, { defId: 'sofa', x: 16.6, z: 9, rotation: 3 }, { defId: 'sofa', x: 16.6, z: 12, rotation: 3 }, { defId: 'disco_light', x: 5, z: 7, rotation: 0 }, { defId: 'disco_light', x: 13, z: 7, rotation: 0 }, { defId: 'v_palm', x: 1.2, z: 12.4, rotation: 0 }, { defId: 'v_palm', x: 16.6, z: 4.6, rotation: 0 }],
  },
  hotel: {
    id: 'hotel', kind: 'hotel', glyph: '🏨', label: 'Hotel', tagline: 'Lobby, pool and polite smiles.', w: 22, d: 16, floor: 'marble', wallHeight: 4.2,
    palette: { wall: '#F1EBDD', trim: '#B8892F', accent: '#1F5F8B' }, capacity: 10, npcTarget: 7, crowd: true, chat: true,
    items: [{ defId: 'v_reception', x: 6, z: 1.3, rotation: 0 }, { defId: 'piano', x: 16.5, z: 1.5, rotation: 0 }, { defId: 'sofa', x: 3, z: 8, rotation: 1 }, { defId: 'armchair', x: 6.2, z: 7.4, rotation: 1 }, { defId: 'v_pool', x: 15.6, z: 10.2, rotation: 0 }, ...[12.8, 15.4, 18].map((x) => ({ defId: 'v_lounger', x, z: 6.2, rotation: 0 })), { defId: 'v_lounger', x: 13.4, z: 14, rotation: 2 }, { defId: 'v_lounger', x: 17.8, z: 14, rotation: 2 }, { defId: 'v_palm', x: 1.2, z: 1.2, rotation: 0 }, { defId: 'v_palm', x: 9.6, z: 10.4, rotation: 0 }, { defId: 'v_palm', x: 20.4, z: 14.6, rotation: 0 }, { defId: 'plant', x: 9.6, z: 1.0, rotation: 0 }],
  },
  techhub: {
    id: 'techhub', kind: 'techhub', glyph: '💻', label: 'Tech hub', tagline: 'Gadgets, repairs and hustle.', w: 18, d: 12, floor: 'tile', wallHeight: 3.6,
    palette: { wall: '#DDE6EE', trim: '#2E86C1', accent: '#3BE3A0' }, capacity: 10, npcTarget: 7, crowd: true, chat: true,
    items: [...[3.2, 6.6, 10, 13.4].map((x) => ({ defId: 'v_gadget_stall', x, z: 1.4, rotation: 0 })), { defId: 'v_pc_desk', x: 4, z: 6, rotation: 0 }, { defId: 'v_pc_desk', x: 9.6, z: 6, rotation: 0 }, { defId: 'v_pc_desk', x: 4, z: 9.4, rotation: 0 }, { defId: 'v_pc_desk', x: 9.6, z: 9.4, rotation: 0 }, { defId: 'v_server_rack', x: 16.8, z: 4.4, rotation: 3 }, { defId: 'v_server_rack', x: 16.8, z: 6.4, rotation: 3 }, { defId: 'plant', x: 15.8, z: 10.4, rotation: 0 }],
  },
  park: {
    id: 'park', kind: 'park', glyph: '🌳', label: 'Park', tagline: 'Green space in a loud city.', w: 20, d: 16, floor: 'grass', wallHeight: 0.5, theme: 'park',
    palette: { wall: '#8FBF7F', trim: '#6B8E5A', accent: '#E9B949' }, capacity: 10, npcTarget: 7, crowd: true, chat: true,
    items: [{ defId: 'v_tree', x: 3, z: 3, rotation: 0 }, { defId: 'v_tree', x: 17, z: 3, rotation: 0 }, { defId: 'v_tree', x: 3, z: 12.8, rotation: 0 }, { defId: 'v_tree', x: 17, z: 12.8, rotation: 0 }, { defId: 'v_fountain', x: 10, z: 6.4, rotation: 0 }, { defId: 'v_bench', x: 6.2, z: 6.4, rotation: 1 }, { defId: 'v_bench', x: 13.8, z: 6.4, rotation: 3 }, { defId: 'v_bench', x: 10, z: 3, rotation: 0 }, { defId: 'v_plinth', x: 6, z: 2.4, rotation: 0 }, { defId: 'v_plinth', x: 14, z: 2.4, rotation: 0 }, ...[6, 10, 14].map((x) => ({ defId: 'v_jog_path', x, z: 13.6, rotation: 0 })), { defId: 'v_picnic', x: 4, z: 8.8, rotation: 0 }, { defId: 'v_picnic', x: 16, z: 8.8, rotation: 0 }, { defId: 'v_palm', x: 10, z: 10, rotation: 0 }],
  },
  beach: {
    id: 'beach', kind: 'beach', glyph: '🏖️', label: 'Beach', tagline: 'Sand, sea and suya smoke.', w: 22, d: 16, floor: 'dirt', floorTint: '#E8D3A0', floorRough: 0.95, wallHeight: 0.5, theme: 'beach',
    palette: { wall: '#E8D3A0', trim: '#C9B27A', accent: '#3FA3D6' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [{ defId: 'v_umbrella', x: 4, z: 10, rotation: 0 }, { defId: 'v_umbrella', x: 8.4, z: 12.4, rotation: 0 }, { defId: 'v_umbrella', x: 14, z: 12.4, rotation: 0 }, { defId: 'v_umbrella', x: 18.4, z: 10, rotation: 0 }, { defId: 'v_boat', x: 4, z: 3.6, rotation: 0 }, { defId: 'v_boat', x: 15.4, z: 3.2, rotation: 0 }, { defId: 'v_lifeguard', x: 20.4, z: 10.6, rotation: 0 }, { defId: 'v_volleyball', x: 10, z: 7.6, rotation: 0 }, { defId: 'v_drinks_bar', x: 19.4, z: 6.8, rotation: 3 }, { defId: 'v_palm', x: 1.2, z: 7, rotation: 0 }, { defId: 'v_palm', x: 6.8, z: 6.6, rotation: 0 }, { defId: 'v_palm', x: 20.6, z: 14.6, rotation: 0 }, { defId: 'v_palm', x: 1.4, z: 14.4, rotation: 0 }],
  },
  recreation: {
    id: 'recreation', kind: 'recreation', glyph: '🎾', label: 'Club house', tagline: 'Pool, courts and old money.', w: 20, d: 14, floor: 'marble', wallHeight: 3.8,
    palette: { wall: '#F4EFE2', trim: '#1F6F4D', accent: '#B8892F' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [{ defId: 'v_pool', x: 5.4, z: 4.2, rotation: 0 }, ...[2.6, 5.4, 8.2].map((x) => ({ defId: 'v_lounger', x, z: 7.8, rotation: 0 })), { defId: 'v_tennis', x: 15, z: 8.4, rotation: 0 }, { defId: 'v_drinks_bar', x: 15.6, z: 1.3, rotation: 0 }, { defId: 'sofa', x: 18.6, z: 4.4, rotation: 3 }, { defId: 'armchair', x: 11.2, z: 3.4, rotation: 0 }, { defId: 'v_palm', x: 1.2, z: 12.4, rotation: 0 }, { defId: 'v_palm', x: 11, z: 12.2, rotation: 0 }, { defId: 'plant', x: 1.0, z: 1.0, rotation: 0 }],
  },
  government: {
    id: 'government', kind: 'government', glyph: '🏛️', label: 'Government office', tagline: 'Please come back tomorrow.', w: 16, d: 12, floor: 'tile', wallHeight: 3.6,
    palette: { wall: '#E8E4D8', trim: '#1F8A4D', accent: '#2F6B4A' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [{ defId: 'v_gov_desk', x: 5, z: 1.3, rotation: 0 }, { defId: 'v_gov_desk', x: 11.4, z: 1.3, rotation: 0 }, { defId: 'v_flag', x: 1.4, z: 1.4, rotation: 0 }, { defId: 'v_flag', x: 14.8, z: 1.4, rotation: 0 }, ...[4.6, 8, 11.4].flatMap((x) => [{ defId: 'v_wait_chairs', x, z: 6.2, rotation: 2 }, { defId: 'v_wait_chairs', x, z: 8.8, rotation: 2 }]), { defId: 'bookshelf', x: 1.0, z: 5.6, rotation: 1 }, { defId: 'plant', x: 14.8, z: 10.4, rotation: 0 }],
  },
  business: {
    id: 'business', kind: 'business', glyph: '🏙️', label: 'Business tower', tagline: 'Glass, coffee and deals.', w: 18, d: 13, floor: 'marble', wallHeight: 4.2,
    palette: { wall: '#DCE3EA', trim: '#1F3D6B', accent: '#3BE3A0' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [...[4.6, 9, 13.4].map((x) => ({ defId: 'v_city_window', x, z: 0.9, rotation: 0 })), { defId: 'v_exec_desk', x: 4.6, z: 5.6, rotation: 0 }, { defId: 'v_exec_desk', x: 11, z: 5.6, rotation: 0 }, { defId: 'v_coffee_bar', x: 16.8, z: 5, rotation: 3 }, { defId: 'sofa', x: 3.4, z: 10.2, rotation: 0 }, { defId: 'sofa', x: 9.4, z: 10.2, rotation: 0 }, { defId: 'armchair', x: 14.4, z: 10.6, rotation: 0 }, { defId: 'plant', x: 1.0, z: 8, rotation: 0 }, { defId: 'plant', x: 16.8, z: 11.6, rotation: 0 }],
  },
  airport: {
    id: 'airport', kind: 'airport', glyph: '✈️', label: 'Airport', tagline: 'Departures, delays and goodbyes.', w: 24, d: 14, floor: 'terrazzo', wallHeight: 4.4,
    palette: { wall: '#EDF0F3', trim: '#1F5F8B', accent: '#E9B949' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [...[5, 12, 19].map((x) => ({ defId: 'v_checkin', x, z: 1.4, rotation: 0 })), { defId: 'v_board', x: 1.2, z: 7, rotation: 1 }, { defId: 'v_board', x: 22.8, z: 7, rotation: 3 }, ...[6, 9.6, 14.4, 18].map((x) => ({ defId: 'v_wait_chairs', x, z: 7.6, rotation: 2 })), ...[6, 14.4].map((x) => ({ defId: 'v_wait_chairs', x, z: 10.4, rotation: 2 })), { defId: 'v_luggage', x: 9, z: 4.4, rotation: 0 }, { defId: 'v_luggage', x: 16, z: 4.6, rotation: 1 }, { defId: 'v_palm', x: 1.4, z: 12.4, rotation: 0 }, { defId: 'v_palm', x: 22.4, z: 12.4, rotation: 0 }, { defId: 'v_kiosk', x: 20, z: 11.6, rotation: 0 }],
  },
  port: {
    id: 'port', kind: 'port', glyph: '🚢', label: 'Port', tagline: 'Where the whole country arrives.', w: 22, d: 16, floor: 'concrete', wallHeight: 0.5, theme: 'port',
    palette: { wall: '#9AA0A4', trim: '#E9B949', accent: '#1F5F8B' }, capacity: 10, npcTarget: 6, crowd: true, chat: true,
    items: [...[3, 6, 9, 12].map((x) => ({ defId: 'v_container', x, z: 1.5, rotation: 0 })), { defId: 'v_container', x: 1.6, z: 5, rotation: 1 }, { defId: 'v_container', x: 1.6, z: 8.5, rotation: 1 }, { defId: 'v_pallet', x: 9, z: 6.4, rotation: 0 }, { defId: 'v_pallet', x: 13.4, z: 6.4, rotation: 0 }, { defId: 'v_pallet', x: 9, z: 9.8, rotation: 0 }, { defId: 'v_crane', x: 18.6, z: 3, rotation: 0 }, { defId: 'v_crane', x: 18.6, z: 12.6, rotation: 0 }, { defId: 'v_kiosk', x: 13.4, z: 12.6, rotation: 0 }],
  },
};
export const INTERIOR_LIST = Object.values(INTERIORS);

/** Which landmark opens which template. The jail has no landmark: you are sent there. */
export const LANDMARK_INTERIORS: Record<string, InteriorKind> = {
  'lagos.balogun': 'market', 'lagos.tejuosho': 'market', 'lagos.mushin-market': 'market',
  'lagos.cathedral': 'church',
  'lagos.terra-kulture': 'gallery', 'lagos.national-theatre': 'gallery', 'lagos.lekki-arts-market': 'gallery',
  'lagos.tafawa-balewa-square': 'stadium',
  'lagos.quilox': 'club', 'lagos.polanco': 'showroom',
  'lagos.oga-sunday-viewing': 'viewing',
  'lagos.mama-put': 'eatery', 'lagos.suya-obalende': 'eatery', 'lagos.agege-bakery': 'eatery',
  'lagos.eko-trust-bank': 'bank', 'lagos.naija-first-bank': 'bank',
  'lagos.ikeja-city-mall': 'mall', 'lagos.landmark-centre': 'mall',
  'lagos.genesis-cinema': 'cinema', 'lagos.new-afrika-shrine': 'concert', 'lagos.eko-hotel': 'hotel',
  'lagos.computer-village': 'techhub', 'lagos.yaba-tech-hub': 'techhub',
  'lagos.freedom-park': 'park', 'lagos.lekki-conservation': 'park', 'lagos.lekki-beach': 'beach', 'lagos.banana-marina': 'beach',
  'lagos.ikoyi-club': 'recreation',
  'lagos.alausa-secretariat': 'government', 'lagos.lagos-house': 'government', 'lagos.federal-secretariat': 'government',
  'lagos.eko-atlantic': 'business', 'lagos.mmia': 'airport', 'lagos.apapa-port': 'port',
};
export const interiorKindForLandmark = (landmarkId: string): InteriorKind | undefined => LANDMARK_INTERIORS[landmarkId];
