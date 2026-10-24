import type { FloorKind, Palette } from '@/types/world';

/**
 * Public interiors. ONE template per kind of venue, reused by every landmark of that kind (three markets share `market`; the name
 * and the entry fee come from the landmark). A template is data: room size, floor, palette, furniture, capacity and how many NPCs
 * keep it lively. The 3D room is built by world/interiors/build.ts and rendered by the same scene as a home, so walking,
 * furniture collisions, the action menu, activities and the pay-once activity runner all apply unchanged.
 */
export type InteriorKind = 'market' | 'church' | 'gallery' | 'stadium' | 'club' | 'showroom' | 'jail';
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
}
const row = (defId: string, xs: number[], z: number, rotation = 0): VenueItem[] => xs.map((x) => ({ defId, x, z, rotation }));

export const INTERIORS: Record<InteriorKind, InteriorDef> = {
  market: {
    id: 'market', kind: 'market', label: 'Market', tagline: 'Fabric, noise and bargains.', w: 16, d: 12, floor: 'concrete', wallHeight: 3.4,
    palette: { wall: '#D8C7A0', trim: '#8A5A2E', accent: '#D9462F' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [...row('v_stall', [2.6, 5.8, 9.0, 12.2], 1.8), ...row('v_stall', [3.6, 7.2, 10.8], 5.3), { defId: 'v_sacks', x: 1.2, z: 10.4, rotation: 0 }, { defId: 'v_sacks', x: 14.6, z: 4.2, rotation: 0 }, { defId: 'v_kiosk', x: 14.2, z: 9.8, rotation: 0 }],
  },
  church: {
    id: 'church', kind: 'church', label: 'Church', tagline: 'Quiet, bright and welcoming.', w: 16, d: 14, floor: 'terrazzo', wallHeight: 4.2,
    palette: { wall: '#F1EBDD', trim: '#B89A5A', accent: '#7A4A26' }, capacity: 10, npcTarget: 7, crowd: false, chat: true,
    items: [{ defId: 'v_altar', x: 8, z: 1.6, rotation: 0 }, ...[4.6, 6.6, 8.6, 10.6].flatMap((z) => [...row('v_pew', [4.2, 11.8], z, 2)])],
  },
  gallery: {
    id: 'gallery', kind: 'gallery', label: 'Gallery', tagline: 'Art, music and quiet conversation.', w: 14, d: 12, floor: 'marble', wallHeight: 3.6,
    palette: { wall: '#F4F1EA', trim: '#2B2F32', accent: '#C4552D' }, capacity: 10, npcTarget: 5, crowd: false, chat: true,
    items: [...row('v_plinth', [3, 7, 11], 2.6), ...row('v_plinth', [2.6, 11.4], 7.8), { defId: 'v_plinth', x: 7, z: 10.6, rotation: 0 }],
  },
  stadium: {
    id: 'stadium', kind: 'stadium', label: 'Stadium', tagline: 'Where the whole of Lagos shouts together.', w: 20, d: 16, floor: 'grass', wallHeight: 3.4,
    palette: { wall: '#E6E8EA', trim: '#1F6F4D', accent: '#1F6F4D' }, capacity: 10, npcTarget: 8, crowd: true, chat: true,
    items: [...row('v_bleachers', [4.5, 10, 15.5], 3.2), { defId: 'v_kiosk', x: 2.2, z: 13.4, rotation: 0 }, { defId: 'v_kiosk', x: 17.8, z: 13.4, rotation: 0 }],
  },
  club: {
    id: 'club', kind: 'club', label: 'Club', tagline: 'Premium. Loud. Lagos.', w: 18, d: 14, floor: 'diamond', wallHeight: 3.6,
    palette: { wall: '#1B1B26', trim: '#FF3FA4', accent: '#3FD5FF' }, capacity: 10, npcTarget: 9, crowd: true, chat: true, nightlife: true,
    items: [{ defId: 'v_club_bar', x: 4.6, z: 1.3, rotation: 0 }, { defId: 'v_dj_booth', x: 11, z: 1.4, rotation: 0 }, { defId: 'v_speaker_stack', x: 8.7, z: 1.0, rotation: 0 }, { defId: 'v_speaker_stack', x: 13.3, z: 1.0, rotation: 0 }, { defId: 'sofa', x: 1.6, z: 8.6, rotation: 1 }, { defId: 'sofa', x: 1.6, z: 11.4, rotation: 1 }, { defId: 'disco_light', x: 4.4, z: 5, rotation: 0 }, { defId: 'disco_light', x: 13.6, z: 5, rotation: 0 }, { defId: 'disco_light', x: 16.4, z: 9.5, rotation: 0 }],
  },
  showroom: {
    id: 'showroom', kind: 'showroom', label: 'Showroom', tagline: 'Polished floors, polished cars.', w: 24, d: 14, floor: 'marble', wallHeight: 4.0,
    palette: { wall: '#ECEEF0', trim: '#B8892F', accent: '#1F3D6B' }, capacity: 10, npcTarget: 4, crowd: false, chat: true,
    items: [...row('v_podium', [3.6, 9.2, 14.8, 20.4], 3.8), ...row('v_podium', [3.6, 9.2, 14.8, 20.4], 10.2)],
  },
  jail: {
    id: 'jail', kind: 'jail', label: 'Jail', tagline: 'Serve your time.', w: 12, d: 10, floor: 'concrete', wallHeight: 3.0,
    palette: { wall: '#9AA0A4', trim: '#3A3F44', accent: '#E9B949' }, capacity: 10, npcTarget: 3, crowd: false, chat: false,
    items: [...row('v_cell_bed', [1.6, 4.4, 7.2, 10.2], 2.3), ...row('v_bars', [2.0, 5.0, 8.0, 10.6], 0.5)],
  },
};
export const INTERIOR_LIST = Object.values(INTERIORS);

/** Which landmark opens which template. The jail has no landmark: you are sent there. */
export const LANDMARK_INTERIORS: Record<string, InteriorKind> = {
  'lagos.balogun': 'market', 'lagos.tejuosho': 'market', 'lagos.mushin-market': 'market',
  'lagos.cathedral': 'church',
  'lagos.terra-kulture': 'gallery', 'lagos.national-theatre': 'gallery', 'lagos.lekki-arts-market': 'gallery',
  'lagos.tafawa-balewa-square': 'stadium',
  'lagos.quilox': 'club',
  'lagos.polanco': 'showroom',
};
export const interiorKindForLandmark = (landmarkId: string): InteriorKind | undefined => LANDMARK_INTERIORS[landmarkId];
