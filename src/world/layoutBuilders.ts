import type { Connection, FenceKind, FixtureSpec, FloorKind, Palette, PropertyLayout, WallFinish, WindowSpec, WindowStyle, Zone, ZoneKind } from '@/types/world';
import { BAY_LENGTH, BAY_WIDTH } from './garage';

/**
 * Generic house builder. Every house is a SQUARE footprint (size x size) tiled exactly by rectangular zones, so each
 * room is a real walled space. The camera-facing sides (front z = S, right x = S) have NO walls: the house is a cutaway.
 * Every home has bay positions for a compact parking pad attached to the right side of the house (1 bay for homes 1-3,
 * 2 for the rest, side by side, facing the front); the pad itself is only drawn when the player owns a car. No fences, gardens, trees, garage buildings or driveways.
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
  /** Parking bays on the pad beside the house (the pad only appears once the player owns a car). Homes 1-3: one bay; larger homes: two. */
  parkingBays: number;
}
export const HOUSE_TIERS: Record<TierId, HouseTier> = {
  1: { id: 1, label: 'Lapo Baby', size: 12, parkingBays: 1 },
  2: { id: 2, label: 'Starter Plus', size: 14, parkingBays: 1 },
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
  const kitchenFloor: FloorKind = 'ceramic'; // same white ceramic in every kitchen
  const bathFloor: FloorKind = 'diamond';  // pale glossy diamond tile in every bathroom/WC
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
      zone('bath', 'bathroom', 'WC', S - b, 0, S, b, bathFloor, true, false),
    ];
    p = {
      zones, entry: 'studio', connections: [O('nook', 'studio'), D('bath', 'studio')],
      windows: [win('back', (S - b) / 2, 0.9, 0.9, 1.1)],
      fixtures: [...bathSet(zones[2], 'front'), ...(c.kitchenette ? [cooker(0.5, 0.5)] : [])],
    };
  } else if (c.home === 3) {
    // Living area (L-shaped, wrapping round) with a defined kitchen top-right and a WC in the front-left corner.
    const kx = 7.5, kd = 6.5, wx = 3.6, wy = 9.8;
    const zones = [
      zone('livA', 'living', 'Living room', 0, 0, kx, wy, c.floor),
      zone('livB', 'living', 'Living room', kx, kd, S, S, c.floor),
      zone('livC', 'living', 'Living room', wx, wy, kx, S, c.floor),
      zone('kitchen', 'kitchen', 'Kitchen', kx, 0, S, kd, kitchenFloor),
      zone('bath', 'bathroom', 'WC', 0, wy, wx, S, bathFloor, true, false),
    ];
    p = {
      zones, entry: 'livB',
      connections: [O('livA', 'livB'), O('livA', 'livC'), O('livB', 'livC'), D('kitchen', 'livA'), D('bath', 'livC')],
      windows: [win('back', kx / 2), win('back', kx + (S - kx) / 2), win('left', wy / 2)],
      fixtures: [...bathSet(zones[4], 'right'), cooker(kx + 0.5, 0.6)],
    };
  } else if (c.home === 4) {
    // Two bedrooms at opposite corners (top-left, bottom-right) round an L-shaped living area, WC in the middle of the back.
    const b1w = 7, b1d = 6.5, ww = 3, wd = 3.4, rx = 10, bz = 9.5;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, b1w, b1d, bedFloor),
      zone('bath', 'bathroom', 'WC', b1w, 0, rx, wd, bathFloor, true, false),
      zone('livMid', 'living', 'Living room', b1w, wd, rx, b1d, c.floor),
      zone('livTR', 'living', 'Living room', rx, 0, S, bz, c.floor),
      zone('bed2', 'bedroom', 'Bedroom 2', rx, bz, S, S, bedFloor),
      zone('livL', 'living', 'Living room', 0, b1d, rx, S, c.floor),
    ];
    void ww;
    p = {
      zones, entry: 'livL',
      connections: [O('livMid', 'livL'), O('livMid', 'livTR'), O('livTR', 'livL'), D('bed1', 'livL'), D('bed2', 'livL'), D('bath', 'livMid')],
      windows: [win('back', b1w / 2), win('back', rx + (S - rx) / 2), win('left', b1d / 2), win('left', (b1d + S) / 2)],
      fixtures: [...bathSet(zones[1], 'front'), cooker(0.45, b1d + 0.6), cabinet(0.4, b1d + 1.9)],
    };
  } else if (c.home === 5) {
    // Bedroom top-left, kitchen top-right, WC between them, a big living room below and a second bedroom bottom-right.
    const d = 7, b1w = 6.5, wx = 11, wd = 3.8, lw = 12, ry = 11.8;
    const zones = [
      zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, b1w, d, bedFloor),
      zone('bath', 'bathroom', 'WC', b1w, 0, wx, wd, bathFloor, true, false),
      zone('livMid', 'living', 'Living room', b1w, wd, wx, d, c.floor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', wx, 0, S, d, kitchenFloor),
      zone('livMain', 'living', 'Living room', 0, d, lw, S, c.floor),
      zone('livR', 'living', 'Living room', lw, d, S, ry, c.floor),
      zone('bed2', 'bedroom', 'Bedroom 2', lw, ry, S, S, bedFloor),
    ];
    p = {
      zones, entry: 'livMain',
      connections: [O('livMid', 'livMain'), O('livR', 'livMain'), D('bed1', 'livMain'), D('bath', 'livMid'), D('kitchen', 'livMid'), D('bed2', 'livR')],
      windows: [win('back', b1w / 2), win('back', wx + (S - wx) / 2), win('left', d / 2), win('left', (d + S) / 2, 1.8, 1.2, 0.9)],
      fixtures: [...bathSet(zones[1], 'front'), cooker(wx + 0.5, 0.6), cabinet(S - 0.45, 2.0)],
    };
  } else {
    // Largest home: master and second bedroom on the left either side of the living area, kitchen and two bathrooms at the
    // back, third bedroom on the right; living space wraps round the middle.
    const lx = 7, d1 = 7, d2 = 13, kx = 13.5, kd = 6.5, bwA = 16.5, bth = 3.5, ry = 9, ry2 = 16;
    const zones = [
      zone('bed1', 'bedroom', 'Master bedroom', 0, 0, lx, d1, bedFloor),
      zone('livL', 'living', 'Living room', 0, d1, lx, d2, c.floor),
      zone('bed2', 'bedroom', 'Bedroom 2', 0, d2, lx, S, bedFloor),
      zone('kitchen', 'kitchen', 'Kitchen and dining', lx, 0, kx, kd, kitchenFloor),
      zone('livMain', 'living', 'Living room', lx, kd, kx, S, c.floor),
      zone('bathA', 'bathroom', 'Bathroom', kx, 0, bwA, bth, bathFloor, true, false),
      zone('bathB', 'bathroom', 'Bathroom', bwA, 0, S, bth, bathFloor, true, false),
      zone('livR', 'living', 'Living room', kx, bth, S, ry, c.floor),
      zone('bed3', 'bedroom', 'Bedroom 3', kx, ry, S, ry2, bedFloor),
      zone('livBR', 'living', 'Living room', kx, ry2, S, S, c.floor),
    ];
    p = {
      zones, entry: 'livMain',
      connections: [O('livL', 'livMain'), O('livR', 'livMain'), O('livBR', 'livMain'), D('bed1', 'livL'), D('bed2', 'livL'), D('kitchen', 'livMain'), D('bathA', 'livR'), D('bathB', 'livR'), D('bed3', 'livR')],
      windows: [win('back', lx / 2), win('back', lx + (kx - lx) / 2, 1.8, 1.2, 0.9), win('left', d1 / 2), win('left', (d1 + d2) / 2, 1.8, 1.2, 0.9), win('left', (d2 + S) / 2)],
      fixtures: [...bathSet(zones[5], 'front'), ...bathSet(zones[6], 'front'), cooker(lx + 0.5, 0.6), cabinet(kx - 0.45, 2.0)],
    };
  }

  // Open front: a shallow paved walkway along the front edge; the two-car carport is attached to the RIGHT side of the
  // house, flush against it and aligned with the front edge, so the bays sit side by side and face the front (+z).
  const n = tier.parkingBays, ext = n * BAY_WIDTH;
  const zones = [...p.zones, zone('entry', 'compound', 'Entrance', 0, S, S, S + ENTRY_DEPTH, 'grass', false, false)];
  const connections = [...p.connections, { a: p.entry, b: 'entry' }];
  for (let i = 0; i < n; i++) zones.push(zone(`bay${i + 1}`, 'parking', `Parking ${i + 1}`, S + i * BAY_WIDTH, S - BAY_LENGTH, S + (i + 1) * BAY_WIDTH, S, 'paving', false, false));
  const plot = { x0: -MARGIN, z0: -MARGIN, x1: S + ext + MARGIN, z1: S + ENTRY_DEPTH + MARGIN, ground: c.ground ?? 'grass', fence: c.fence ?? ('none' as FenceKind) };
  return {
    id: c.id, plot, zones, connections, windows: p.windows, fixtures: p.fixtures, decor: [],
    palette: c.palette, finish: c.finish, wallHeight: c.wallHeight ?? 2.8, publicPower: c.publicPower ?? true,
  };
}
