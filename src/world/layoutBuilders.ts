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
  /** Parking bays on the pad beside the house (the pad only appears once the player owns a car). Homes 1-2: none; home 3: one bay; larger homes: two. */
  parkingBays: number;
}
export const HOUSE_TIERS: Record<TierId, HouseTier> = {
  1: { id: 1, label: 'Lapo Baby', size: 12, parkingBays: 0 },
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

type Door = 'front' | 'left' | 'right' | 'back';
/** Toilet and shower tucked away from the door so the doorway stays clear. */
function bathSet(b: Zone, door: Door, tub = false): FixtureSpec[] {
  const out: FixtureSpec[] =
    door === 'front' ? [{ defId: 'toilet', x: b.x0 + 0.55, z: b.z0 + 0.55, rotation: 0 }, { defId: 'shower', x: b.x1 - 0.6, z: b.z0 + 0.65, rotation: 0 }]
    : door === 'back' ? [{ defId: 'toilet', x: b.x0 + 0.55, z: b.z1 - 0.55, rotation: 2 }, { defId: 'shower', x: b.x1 - 0.6, z: b.z1 - 0.65, rotation: 0 }]
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
  const spec = HOMES[c.home], tier = HOUSE_TIERS[spec.tier], S = tier.size;
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
  } else {
    // Homes 3-6 share ONE floor-plan design (the reference screenshot), scaled to the footprint. The left half is a rear
    // room over one big pale room; the right half is split three ways (back / small middle room / front room) at different
    // heights, so the walls form T-junctions instead of rows of boxes:
    //
    //   +-----------+---------------+      xm = half width        zL = left split (0.30)
    //   | rear room |  right-back   |      right column splits at  zA (0.50) and zB (0.72)
    //   +--- door --+   (spacious)   |      the small middle room sits at the right edge
    //   |           |------+--------|      the front-right room is the second brown-floored room
    //   | big pale  |  small room   |
    //   |   room    |---------------|
    //   |           |  front-right  |
    //   +-----------+---------------+
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const bedFloor = 'wood' as FloorKind;                       // brown-floored bedrooms, as in the reference
    const extFloor: FloorKind = c.floor === 'tile' ? 'marble' : 'tile'; // beige floor for the spacious right-hand room
    const xm = r2(S * 0.5), zL = r2(S * 0.3), zA = r2(S * 0.5), zB = r2(S * 0.72);
    if (c.home === 3) {
      // living + kitchen + WC: the rear room is the kitchen, the small middle room is the WC; everything else is living.
      const wx = r2(xm + S * 0.32);
      const zones = [
        zone('livL', 'living', 'Living room', 0, zL, xm, S, c.floor),
        zone('livTR', 'living', 'Living room', xm, 0, S, zA, extFloor),
        zone('livMR', 'living', 'Living room', wx, zA, S, zB, extFloor),
        zone('livBR', 'living', 'Living room', xm, zB, S, S, extFloor),
        zone('kitchen', 'kitchen', 'Kitchen', 0, 0, xm, zL, kitchenFloor),
        zone('bath', 'bathroom', 'WC', xm, zA, wx, zB, bathFloor, true, false),
      ];
      p = {
        zones, entry: 'livL',
        connections: [O('livTR', 'livL'), O('livTR', 'livMR'), O('livBR', 'livL'), O('livBR', 'livMR'), D('kitchen', 'livL'), D('bath', 'livL')],
        windows: [win('back', xm / 2), win('back', xm + (S - xm) / 2, 1.8, 1.2, 0.9), win('left', (zL + S) / 2)],
        fixtures: [...bathSet(zones[5], 'left'), cooker(0.5, 0.6)],
      };
    } else if (c.home === 4) {
      // living + 2 bedrooms (rear-left and front-right) + WC; the spacious right-back room is a living extension.
      const wx = r2(xm + S * 0.3);
      const zones = [
        zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, xm, zL, bedFloor),
        zone('livL', 'living', 'Living room', 0, zL, xm, S, c.floor),
        zone('livTR', 'living', 'Living room', xm, 0, S, zA, extFloor),
        zone('livMR', 'living', 'Living room', wx, zA, S, zB, extFloor),
        zone('bed2', 'bedroom', 'Bedroom 2', xm, zB, S, S, bedFloor),
        zone('bath', 'bathroom', 'WC', xm, zA, wx, zB, bathFloor, true, false),
      ];
      p = {
        zones, entry: 'livL',
        connections: [O('livTR', 'livL'), O('livTR', 'livMR'), D('bed1', 'livL'), D('bed2', 'livL'), D('bath', 'livL')],
        windows: [win('back', xm / 2), win('back', xm + (S - xm) / 2, 1.8, 1.2, 0.9), win('left', zL / 2), win('left', (zL + S) / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[5], 'left'), cooker(0.45, zL + 0.6), cabinet(0.4, zL + 1.9)],
      };
    } else if (c.home === 5) {
      // living + 2 bedrooms + kitchen + WC: kitchen at the back right, living extension below it.
      const zK = r2(S * 0.25), wx = r2(xm + S * 0.3);
      const zones = [
        zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, xm, zL, bedFloor),
        zone('livL', 'living', 'Living room', 0, zL, xm, S, c.floor),
        zone('livTR', 'living', 'Living room', xm, zK, S, zA, extFloor),
        zone('livMR', 'living', 'Living room', wx, zA, S, zB, extFloor),
        zone('kitchen', 'kitchen', 'Kitchen and dining', xm, 0, S, zK, kitchenFloor),
        zone('bed2', 'bedroom', 'Bedroom 2', xm, zB, S, S, bedFloor),
        zone('bath', 'bathroom', 'WC', xm, zA, wx, zB, bathFloor, true, false),
      ];
      p = {
        zones, entry: 'livL',
        connections: [O('livTR', 'livL'), O('livTR', 'livMR'), D('bed1', 'livL'), D('bed2', 'livL'), D('bath', 'livL'), D('kitchen', 'livTR')],
        windows: [win('back', xm / 2), win('back', xm + (S - xm) / 2), win('left', zL / 2), win('left', (zL + S) / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[6], 'left'), cooker(xm + 0.5, 0.6), cabinet(S - 0.45, 2.0)],
      };
    } else {
      // largest home: 3 bedrooms (rear-left, right-back, front-right), kitchen in the front-left corner, 2 bathrooms in the
      // small middle room (one off the living room, one en suite to bedroom 3), living area in the big left room.
      const zA6 = r2(S * 0.4), zB6 = r2(zA6 + S * 0.225), zF = r2(S * 0.775), kx = r2(S * 0.3), bx = r2(xm + S * 0.25);
      const zones = [
        zone('bed1', 'bedroom', 'Master bedroom', 0, 0, xm, zL, bedFloor),
        zone('livL', 'living', 'Living room', 0, zL, xm, zF, c.floor),
        zone('livF', 'living', 'Living room', kx, zF, xm, S, c.floor),
        zone('kitchen', 'kitchen', 'Kitchen and dining', 0, zF, kx, S, kitchenFloor),
        zone('bed3', 'bedroom', 'Bedroom 3', xm, 0, S, zA6, bedFloor),
        zone('bathA', 'bathroom', 'Bathroom', xm, zA6, bx, zB6, bathFloor, true, false),
        zone('bathB', 'bathroom', 'Bathroom', bx, zA6, S, zB6, bathFloor, true, false),
        zone('bed2', 'bedroom', 'Bedroom 2', xm, zB6, S, S, bedFloor),
      ];
      p = {
        zones, entry: 'livL',
        connections: [O('livF', 'livL'), D('bed1', 'livL'), D('kitchen', 'livL'), D('bed3', 'livL'), D('bathA', 'livL'), D('bathB', 'bed3'), D('bed2', 'livF')],
        windows: [win('back', xm / 2), win('back', xm + (S - xm) / 2, 1.8, 1.2, 0.9), win('left', zL / 2), win('left', (zL + zF) / 2, 1.8, 1.2, 0.9), win('left', (zF + S) / 2)],
        fixtures: [...bathSet(zones[5], 'left'), ...bathSet(zones[6], 'back'), cooker(0.6, zF + 0.6), cabinet(kx - 0.45, zF + 2.0)],
      };
    }
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
