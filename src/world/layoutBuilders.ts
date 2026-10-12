import type { Connection, FenceKind, FixtureSpec, FloorKind, Palette, PropertyLayout, WallFinish, WindowSpec, WindowStyle, Zone, ZoneKind } from '@/types/world';
import { BAY_LENGTH, BAY_WIDTH } from './garage';

/**
 * Generic house builder. Every house is a SQUARE footprint (size x size) tiled exactly by rectangular zones, so each
 * room is a real walled space. The camera-facing sides (front z = S, right x = S) have NO walls: the house is a cutaway.
 * Every home gets ONE compact two-car carport attached to the right side, flush against the house, with its two bays
 * side by side and facing the front. No fences, gardens, trees, garage buildings or driveways.
 *
 * Six homes share five footprint sizes. HOMES is the single source of truth for room count, bathrooms and the footprint
 * tier: properties.ts reads it for the listing, the builder for the layout, and `npm run validate:content` checks they agree.
 */
export type TierId = 1 | 2 | 3 | 4 | 5;
export type HomeNo = 1 | 2 | 3 | 4 | 5 | 6;
export interface HouseTier {
  id: TierId; label: string;
  /** Outer side length (width = depth) of the square main building, in world units (1 unit = 1 m). */
  size: number;
  /** Parking bays in the attached carport. */
  parkingBays: number;
}
export const HOUSE_TIERS: Record<TierId, HouseTier> = {
  1: { id: 1, label: 'Lapo Baby', size: 12, parkingBays: 2 },
  2: { id: 2, label: 'Starter Plus', size: 14, parkingBays: 2 },
  3: { id: 3, label: 'Middle-tier', size: 16, parkingBays: 2 },
  4: { id: 4, label: 'Premium', size: 18, parkingBays: 2 },
  5: { id: 5, label: 'Luxury', size: 20, parkingBays: 2 },
};
export interface HomeSpec {
  tier: TierId;
  /** Main functional rooms (bedrooms, living, kitchen). Bathrooms and WCs are not counted. */
  mainRooms: number; bedrooms: number; bathrooms: number;
}
/** The six-house progression. 1: one room · 2: one room + WC · 3: living + kitchen + WC · 4: living + 2 bedrooms + WC · 5: living, 2 bedrooms, kitchen, WC · 6: largest. */
export const HOMES: Record<HomeNo, HomeSpec> = {
  1: { tier: 1, mainRooms: 1, bedrooms: 0, bathrooms: 0 },
  2: { tier: 1, mainRooms: 1, bedrooms: 0, bathrooms: 1 },
  3: { tier: 2, mainRooms: 2, bedrooms: 0, bathrooms: 1 },
  4: { tier: 3, mainRooms: 3, bedrooms: 2, bathrooms: 1 },
  5: { tier: 4, mainRooms: 4, bedrooms: 2, bathrooms: 1 },
  6: { tier: 5, mainRooms: 5, bedrooms: 3, bathrooms: 2 },
};

export const ENTRY_DEPTH = 1.4; // shallow paved walkway along the open front
const MARGIN = 0.6;             // ground kept around the house and carport

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
  id: string; home: HomeNo; palette: Palette; finish: WallFinish; wallHeight?: number;
  floor: FloorKind; bedFloor?: FloorKind; windowStyle: WindowStyle;
  /** Add a cooker fixture to the WC studio (home 2). */
  kitchenette?: boolean;
  ground?: FloorKind; publicPower?: boolean; fence?: FenceKind;
}

export function house(c: HomeCfg): PropertyLayout {
  const spec = HOMES[c.home], tier = HOUSE_TIERS[spec.tier], S = tier.size, bedFloor = c.bedFloor ?? c.floor;
  const win = (wall: 'back' | 'left', along: number, width = 1.4, height = 1.2, sill = 0.95, style: WindowStyle = c.windowStyle): WindowSpec => ({ wall, along, width, height, sill, style });
  const cooker = (x: number, z: number): FixtureSpec => ({ defId: 'cooker', x, z, rotation: 0 });
  const cabinet = (x: number, z: number): FixtureSpec => ({ defId: 'cabinet', x, z, rotation: 1 });
  const O = (a: string, b: string): Connection => ({ a, b, open: true });
  const D = (a: string, b: string): Connection => ({ a, b });
  const kitchenFloor: FloorKind = c.floor === 'marble' ? 'marble' : 'tile';
  let p: Plan;

  if (c.home === 1) {
    // One simple main room.
    p = {
      zones: [zone('studio', 'living', 'Room', 0, 0, S, S, c.floor)], entry: 'studio', connections: [],
      windows: [win('back', S / 2, 0.9, 0.9, 1.1)], fixtures: [],
    };
  } else if (c.home === 2) {
    // One dominant room with a small separate WC in the back corner.
    const b = 3;
    const zones = [
      zone('nook', 'living', 'Room', 0, 0, S - b, b, c.floor),
      zone('studio', 'living', 'Room', 0, b, S, S, c.floor),
      zone('bath', 'bathroom', 'WC', S - b, 0, S, b, 'tile', true, false),
    ];
    p = {
      zones, entry: 'studio', connections: [O('nook', 'studio'), D('bath', 'studio')],
      windows: [win('back', (S - b) / 2, 0.9, 0.9, 1.1)],
      fixtures: [...bathSet(zones[2], 'front'), ...(c.kitchenette ? [cooker(0.5, 0.5)] : [])],
    };
  } else if (c.home === 3) {
    // Living area with a defined kitchen (own walls and door) and a WC.
    const d = 4.5, kw = 5.5, bw = 3.2;
    const zones = [
      zone('kitchen', 'kitchen', 'Kitchen', 0, 0, kw, d, kitchenFloor),
      zone('nook', 'living', 'Living room', kw, 0, S - bw, d, c.floor),
      zone('bath', 'bathroom', 'WC', S - bw, 0, S, bw, 'tile', true, false),
      zone('nook2', 'living', 'Living room', S - bw, bw, S, d, c.floor),
      zone('living', 'living', 'Living room', 0, d, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [D('kitchen', 'living'), O('nook', 'living'), O('nook2', 'living'), O('nook', 'nook2'), D('bath', 'nook2')],
      windows: [win('back', kw / 2), win('back', (kw + S - bw) / 2)],
      fixtures: [...bathSet(zones[2], 'front'), cooker(0.5, 0.55)],
    };
  } else if (c.home === 4) {
    // Living area with two bedrooms and a WC.
    const d = 6.2, w1 = 7.4, w2 = 5.4, bd = 3.4;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, w1, d, bedFloor),
      zone('bed2', 'bedroom', 'Bedroom 2', w1, 0, w1 + w2, d, bedFloor),
      zone('bath', 'bathroom', 'WC', w1 + w2, 0, S, bd, 'tile', true, false),
      zone('nook', 'living', 'Living room', w1 + w2, bd, S, d, c.floor),
      zone('living', 'living', 'Living room', 0, d, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [D('bed1', 'living'), D('bed2', 'living'), O('nook', 'living'), D('bath', 'nook')],
      windows: [win('back', w1 / 2), win('back', w1 + w2 / 2), win('left', d / 2)],
      fixtures: [...bathSet(zones[2], 'front'), cooker(0.45, d + 0.6), cabinet(0.4, d + 1.9)],
    };
  } else if (c.home === 5) {
    // Spacious living room, two bedrooms, a kitchen and a WC.
    const d = 6.5, w1 = 6, w2 = 6, lw = 14.5, wd = 3.5;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, w1, d, bedFloor),
      zone('bed2', 'bedroom', 'Bedroom 2', w1, 0, w1 + w2, d, bedFloor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', w1 + w2, 0, S, d, kitchenFloor),
      zone('living', 'living', 'Living room', 0, d, lw, S, c.floor),
      zone('bath', 'bathroom', 'WC', lw, d, S, d + wd, 'tile', true, false),
      zone('nook', 'living', 'Living room', lw, d + wd, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [D('bed1', 'living'), D('bed2', 'living'), D('kitchen', 'living'), D('bath', 'living'), O('nook', 'living')],
      windows: [win('back', w1 / 2), win('back', w1 + w2 / 2), win('back', w1 + w2 + (S - w1 - w2) / 2), win('left', d / 2), win('left', (d + S) / 2, 1.8, 1.2, 0.9)],
      fixtures: [...bathSet(zones[4], 'left'), cooker(w1 + w2 + 0.5, 0.6), cabinet(S - 0.45, 2.0)],
    };
  } else {
    // Largest home: three bedrooms along the back, a grand living room, kitchen and dining, two bathrooms.
    const d = 7, w1 = 6.5, w2 = 6.5, lw = 13, kd = 14, bd = 17;
    const zones = [
      zone('bed1', 'bedroom', 'Master bedroom', 0, 0, w1, d, bedFloor),
      zone('bed2', 'bedroom', 'Bedroom 2', w1, 0, w1 + w2, d, bedFloor),
      zone('bed3', 'bedroom', 'Bedroom 3', lw, 0, S, d, bedFloor),
      zone('living', 'living', 'Living room', 0, d, lw, S, c.floor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', lw, d, S, kd, kitchenFloor),
      zone('bathA', 'bathroom', 'Bathroom', lw, kd, lw + 3.5, bd, 'marble', true, false),
      zone('bathB', 'bathroom', 'Bathroom', lw + 3.5, kd, S, bd, 'marble', true, false),
      zone('nook', 'living', 'Living room', lw, bd, S, S, c.floor),
    ];
    p = {
      zones, entry: 'living',
      connections: [D('bed1', 'living'), D('bed2', 'living'), D('bed3', 'kitchen'), D('kitchen', 'living'), O('nook', 'living'), D('bathA', 'nook'), D('bathB', 'nook')],
      windows: [win('back', w1 / 2), win('back', w1 + w2 / 2, 1.8, 1.2, 0.9), win('back', lw + (S - lw) / 2), win('left', d / 2), win('left', (d + S) / 2, 1.8, 1.2, 0.9)],
      fixtures: [...bathSet(zones[5], 'front'), ...bathSet(zones[6], 'front'), cooker(lw + 0.5, d + 0.6), cabinet(S - 0.45, d + 2.0)],
    };
  }

  // Open front: a shallow paved walkway along the front edge; the two-car carport is attached to the RIGHT side of the
  // house, flush against it and aligned with the front edge, so the bays sit side by side and face the front (+z).
  const n = tier.parkingBays, ext = n * BAY_WIDTH;
  const zones = [...p.zones, zone('entry', 'compound', 'Entrance', 0, S, S, S + ENTRY_DEPTH, 'concrete', false, false)];
  const connections = [...p.connections, { a: p.entry, b: 'entry' }];
  for (let i = 0; i < n; i++) zones.push(zone(`bay${i + 1}`, 'parking', `Parking ${i + 1}`, S + i * BAY_WIDTH, S - BAY_LENGTH, S + (i + 1) * BAY_WIDTH, S, 'paving', false, false));
  const plot = { x0: -MARGIN, z0: -MARGIN, x1: S + ext + MARGIN, z1: S + ENTRY_DEPTH + MARGIN, ground: c.ground ?? 'paving', fence: c.fence ?? ('none' as FenceKind) };
  return {
    id: c.id, plot, zones, connections, windows: p.windows, fixtures: p.fixtures, decor: [],
    palette: c.palette, finish: c.finish, wallHeight: c.wallHeight ?? 2.8, publicPower: c.publicPower ?? true,
  };
}
