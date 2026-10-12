import type { Connection, FenceKind, FixtureSpec, FloorKind, Palette, PropertyLayout, WallFinish, WindowSpec, WindowStyle, Zone, ZoneKind } from '@/types/world';
import { BAY_LENGTH, BAY_WIDTH } from './garage';

/**
 * Generic house builder. Every house is a SQUARE footprint (size x size) tiled exactly by rectangular zones, so each
 * room is a real walled space. The only exterior extras are a shallow entrance forecourt and, if the tier has any,
 * open paved parking bays in a single row below it. No fences, gardens, trees or garage buildings.
 *
 * The five tiers below are the single source of truth for room count, bathrooms and parking: properties.ts reads
 * them for the listing, the builder reads them for the layout, and `npm run validate:content` checks they agree.
 */
export type TierId = 1 | 2 | 3 | 4 | 5;
export interface HouseTier {
  id: TierId; label: string;
  /** Main functional rooms (bedrooms, living, kitchen/dining). Bathrooms are not counted. */
  mainRooms: number; bedrooms: number; bathrooms: number;
  /** Open parking bays (one car each). */
  parkingBays: number;
  /** Default outer side length in metres. */
  size: number;
}
export const HOUSE_TIERS: Record<TierId, HouseTier> = {
  1: { id: 1, label: 'Lapo Baby', mainRooms: 1, bedrooms: 1, bathrooms: 1, parkingBays: 0, size: 5.4 },
  2: { id: 2, label: 'Starter Plus', mainRooms: 2, bedrooms: 1, bathrooms: 1, parkingBays: 1, size: 7.0 },
  3: { id: 3, label: 'Middle-tier', mainRooms: 3, bedrooms: 2, bathrooms: 1, parkingBays: 2, size: 8.4 },
  4: { id: 4, label: 'Premium', mainRooms: 4, bedrooms: 2, bathrooms: 2, parkingBays: 3, size: 10.2 },
  5: { id: 5, label: 'Luxury', mainRooms: 5, bedrooms: 3, bathrooms: 2, parkingBays: 3, size: 12.0 },
};

export const ENTRY_DEPTH = 1.4; // forecourt between the front wall and the bays
const MARGIN = 0.6;             // ground kept around the house and bays

const zone = (id: string, kind: ZoneKind, label: string, x0: number, z0: number, x1: number, z1: number, floor: FloorKind, indoor = true, furnishable = true): Zone =>
  ({ id, kind, label, x0, z0, x1, z1, floor, indoor, furnishable });

type Door = 'front' | 'left' | 'right';
/** Toilet and shower tucked away from the door so the doorway stays clear. */
function bathSet(b: Zone, door: Door, tub = false): FixtureSpec[] {
  const out: FixtureSpec[] =
    door === 'front' ? [{ defId: 'toilet', x: b.x0 + 0.55, z: b.z0 + 0.55, rotation: 0 }, { defId: 'shower', x: b.x1 - 0.6, z: b.z0 + 0.65, rotation: 0 }]
    : door === 'right' ? [{ defId: 'toilet', x: b.x0 + 0.4, z: b.z0 + 0.5, rotation: 0 }, { defId: 'shower', x: b.x0 + 0.6, z: b.z1 - 0.6, rotation: 0 }]
    : [{ defId: 'toilet', x: b.x1 - 0.4, z: b.z0 + 0.5, rotation: 0 }, { defId: 'shower', x: b.x1 - 0.6, z: b.z1 - 0.6, rotation: 0 }];
  if (tub) out.push({ defId: 'bathtub', x: b.x0 + 2.1, z: b.z1 - 0.5, rotation: 1 });
  return out;
}

interface Plan { zones: Zone[]; connections: Connection[]; windows: WindowSpec[]; fixtures: FixtureSpec[]; entry: string }

export interface HomeCfg {
  id: string; tier: TierId; palette: Palette; finish: WallFinish; wallHeight?: number;
  floor: FloorKind; bedFloor?: FloorKind; windowStyle: WindowStyle;
  /** Override the tier's default side length (a cheaper tier-1 home can be a little smaller). */
  size?: number;
  /** Add a cooker fixture to a tier-1 studio. */
  kitchenette?: boolean;
  ground?: FloorKind; publicPower?: boolean; fence?: FenceKind;
}

export function house(c: HomeCfg): PropertyLayout {
  const tier = HOUSE_TIERS[c.tier], S = c.size ?? tier.size, bedFloor = c.bedFloor ?? c.floor;
  const win = (wall: 'back' | 'left', along: number, width = 1.2, height = 1.1, sill = 0.95, style: WindowStyle = c.windowStyle): WindowSpec => ({ wall, along, width, height, sill, style });
  const louvre = (along: number) => win('back', along, 0.5, 0.5, 1.6, 'louvre');
  const cooker = (x: number, z: number): FixtureSpec => ({ defId: 'cooker', x, z, rotation: 0 });
  const cabinet = (x: number, z: number): FixtureSpec => ({ defId: 'cabinet', x, z, rotation: 1 });
  let p: Plan;

  if (c.tier === 1) {
    // One studio. A small bathroom corner (back right) with the rest of the square open-plan around it.
    const bw = 1.9, bd = 1.8;
    const zones = [
      zone('nook', 'living', 'Studio', 0, 0, S - bw, bd, c.floor),
      zone('studio', 'living', 'Studio', 0, bd, S, S, c.floor),
      zone('bath', 'bathroom', 'Bathroom', S - bw, 0, S, bd, 'tile', true, false),
    ];
    p = {
      zones, entry: 'studio',
      connections: [{ a: 'nook', b: 'studio', open: true }, { a: 'bath', b: 'studio' }],
      windows: [win('back', (S - bw) / 2, 0.9, 0.9, 1.1, c.windowStyle), win('left', (bd + S) / 2, 0.9, 1.0, 1.1)],
      fixtures: [...bathSet(zones[2], 'front'), ...(c.kitchenette ? [cooker(0.5, 0.5)] : [])],
    };
  } else if (c.tier === 2) {
    const d = 3.2, bw = 2.0;
    const zones = [
      zone('bed', 'bedroom', 'Bedroom', 0, 0, S - bw, d, bedFloor),
      zone('bath', 'bathroom', 'Bathroom', S - bw, 0, S, d, 'tile', true, false),
      zone('living', 'living', 'Living room', 0, d, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [{ a: 'bed', b: 'living' }, { a: 'bath', b: 'living' }],
      windows: [win('back', (S - bw) / 2), louvre(S - bw / 2), win('left', d / 2, 1.0), win('left', (d + S) / 2, 1.2)],
      fixtures: [...bathSet(zones[1], 'front'), cooker(0.45, d + 0.6)],
    };
  } else if (c.tier === 3) {
    const d = 3.6, w1 = 3.6, w2 = 2.8, bw = S - w1 - w2;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, w1, d, bedFloor),
      zone('bed2', 'bedroom', 'Bedroom 2', w1, 0, w1 + w2, d, bedFloor),
      zone('bath', 'bathroom', 'Bathroom', w1 + w2, 0, S, d, 'tile', true, false),
      zone('living', 'living', 'Living room', 0, d, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [{ a: 'bed1', b: 'living' }, { a: 'bed2', b: 'living' }, { a: 'bath', b: 'living' }],
      windows: [win('back', w1 / 2), win('back', w1 + w2 / 2), louvre(S - bw / 2), win('left', d / 2), win('left', (d + S) / 2, 1.4, 1.2, 0.9)],
      fixtures: [...bathSet(zones[2], 'front'), cooker(0.45, d + 0.6), cabinet(0.4, d + 1.9)],
    };
  } else if (c.tier === 4) {
    const d = 4.2, w1 = 3.9, w2 = 3.3, lw = 6.6, bh = 2.1;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, w1, d, bedFloor),
      zone('bed2', 'bedroom', 'Bedroom 2', w1, 0, w1 + w2, d, bedFloor),
      zone('ensuite', 'bathroom', 'Ensuite bathroom', w1 + w2, 0, S, bh, 'tile', true, false),
      zone('guest', 'bathroom', 'Guest bathroom', w1 + w2, bh, S, d, 'tile', true, false),
      zone('living', 'living', 'Living room', 0, d, lw, S, c.floor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', lw, d, S, S, 'tile'),
    ];
    p = {
      zones, entry: 'living',
      connections: [{ a: 'bed1', b: 'living' }, { a: 'bed2', b: 'living' }, { a: 'bed2', b: 'ensuite' }, { a: 'guest', b: 'kitchen' }, { a: 'living', b: 'kitchen' }],
      windows: [win('back', w1 / 2), win('back', w1 + w2 / 2), louvre(w1 + w2 + (S - w1 - w2) / 2), win('left', d / 2), win('left', (d + S) / 2, 1.6, 1.2, 0.9)],
      fixtures: [...bathSet(zones[2], 'left'), ...bathSet(zones[3], 'front'), cooker(lw + 0.5, d + 0.5), cabinet(S - 0.45, d + 1.9)],
    };
  } else {
    const lw = 3.8, cw = 4.6, d1 = 4.4, d2 = 8.0, d3 = 10.0;
    const rx = lw + cw;
    const zones = [
      zone('bed1', 'bedroom', 'Master bedroom', 0, 0, lw, d1, bedFloor),
      zone('bed3', 'bedroom', 'Bedroom 3', 0, d1, lw, d2, bedFloor),
      zone('bathA', 'bathroom', 'Bathroom', 0, d2, lw, d3, 'marble', true, false),
      zone('bathB', 'bathroom', 'Bathroom', 0, d3, lw, S, 'marble', true, false),
      zone('living', 'living', 'Living room', lw, 0, rx, S, c.floor),
      zone('bed2', 'bedroom', 'Bedroom 2', rx, 0, S, d1, bedFloor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', rx, d1, S, S, 'marble'),
    ];
    p = {
      zones, entry: 'living',
      connections: ['bed1', 'bed3', 'bathA', 'bathB', 'bed2', 'kitchen'].map((a) => ({ a, b: 'living' })),
      windows: [win('back', lw / 2), win('back', lw + cw / 2, 1.8, 1.2, 0.9), win('back', rx + (S - rx) / 2), win('left', d1 / 2), win('left', (d1 + d2) / 2), win('left', (d2 + d3) / 2, 0.5, 0.5, 1.6, 'louvre'), win('left', (d3 + S) / 2, 0.5, 0.5, 1.6, 'louvre')],
      fixtures: [...bathSet(zones[2], 'right'), ...bathSet(zones[3], 'right', true), cooker(rx + 0.5, d1 + 0.6), cabinet(S - 0.45, d1 + 2.0)],
    };
  }

  // entrance forecourt (full width, shallow) and the open bays below it
  const zones = [...p.zones, zone('entry', 'compound', 'Entrance', 0, S, S, S + ENTRY_DEPTH, 'concrete', false, false)];
  const connections = [...p.connections, { a: p.entry, b: 'entry' }];
  const n = tier.parkingBays, bx = (S - n * BAY_WIDTH) / 2, bz = S + ENTRY_DEPTH;
  for (let i = 0; i < n; i++) zones.push(zone(`bay${i + 1}`, 'parking', `Parking ${i + 1}`, bx + i * BAY_WIDTH, bz, bx + (i + 1) * BAY_WIDTH, bz + BAY_LENGTH, 'paving', false, false));
  const plot = { x0: -MARGIN, z0: -MARGIN, x1: S + MARGIN, z1: (n ? bz + BAY_LENGTH : bz) + MARGIN, ground: c.ground ?? 'paving', fence: c.fence ?? ('none' as FenceKind) };
  return {
    id: c.id, plot, zones, connections, windows: p.windows, fixtures: p.fixtures, decor: [],
    palette: c.palette, finish: c.finish, wallHeight: c.wallHeight ?? 2.8, publicPower: c.publicPower ?? true,
  };
}
