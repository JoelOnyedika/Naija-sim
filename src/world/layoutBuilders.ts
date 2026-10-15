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
  6: { tier: 5, mainRooms: 5, bedrooms: 3, bathrooms: 1 },
};

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
      zone('bath', 'bathroom', 'WC', S - b, 0, S, b, bathFloor, true, true),
    ];
    p = {
      zones, entry: 'studio', connections: [O('nook', 'studio'), D('bath', 'studio')],
      windows: [win('back', (S - b) / 2, 0.9, 0.9, 1.1)],
      fixtures: [...bathSet(zones[2], 'front'), ...(c.kitchenette ? [cooker(0.5, 0.5)] : [])],
    };
  } else {
    // Homes 3-6 share one design language: every room is a plain rectangle, the rectangles tile the square exactly (so all
    // walls meet), the living room is a single hub that most rooms open onto by a door, and the WC always sits on the
    // front or right outer wall (the sides facing the camera), never buried with space behind it. Rooms also open onto
    // neighbouring rooms where they touch. No pockets, no corridors, no open-plan L shapes.
    //
    //   3: living | kitchen over WC          4: bed 1 over living | bed 2 over WC
    //   5: bed 1 over living | kitchen / bed 2 / WC     6: bed 1, living, [WC|kitchen] | bed 3 over bed 2
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const bedFloor = 'wood' as FloorKind;  // brown-floored bedrooms, as in the reference
    const wc = (id: string, x0: number, z0: number, x1: number, z1: number) => zone(id, 'bathroom', 'WC', x0, z0, x1, z1, bathFloor, true, true); // players can put anything in the WC
    if (c.home === 3) {
      const xl = r2(S * 0.6), zK = r2(S * 0.55);
      const zones = [
        zone('living', 'living', 'Living room', 0, 0, xl, S, c.floor),
        zone('kitchen', 'kitchen', 'Kitchen', xl, 0, S, zK, kitchenFloor),
        wc('bath', xl, zK, S, S),
      ];
      p = {
        zones, entry: 'living', connections: [D('kitchen', 'living'), D('bath', 'living')],
        windows: [win('back', xl / 2), win('back', xl + (S - xl) / 2), win('left', S / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[2], 'left'), cooker(xl + 0.5, 0.6), cabinet(S - 0.45, 2.0)],
      };
    } else if (c.home === 4) {
      const xl = r2(S * 0.625), zL = r2(S * 0.375), zB = r2(S * 0.625);
      const zones = [
        zone('living', 'living', 'Living room', 0, zL, xl, S, c.floor),
        zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, xl, zL, bedFloor),
        zone('bed2', 'bedroom', 'Bedroom 2', xl, 0, S, zB, bedFloor),
        wc('bath', xl, zB, S, S),
      ];
      p = {
        zones, entry: 'living', connections: [D('bed1', 'living'), D('bed2', 'living'), D('bath', 'living'), D('bed1', 'bed2')],
        windows: [win('back', xl / 2), win('back', xl + (S - xl) / 2), win('left', zL / 2), win('left', (zL + S) / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[3], 'left'), cooker(0.45, zL + 0.6), cabinet(0.4, zL + 1.9)],
      };
    } else if (c.home === 5) {
      const xl = r2(S * 0.61), zL = r2(S * 0.305), zK = r2(S * 0.39), zB = r2(S * 0.72);
      const zones = [
        zone('living', 'living', 'Living room', 0, zL, xl, S, c.floor),
        zone('bed1', 'bedroom', 'Bedroom 1', 0, 0, xl, zL, bedFloor),
        zone('kitchen', 'kitchen', 'Kitchen and dining', xl, 0, S, zK, kitchenFloor),
        zone('bed2', 'bedroom', 'Bedroom 2', xl, zK, S, zB, bedFloor),
        wc('bath', xl, zB, S, S),
      ];
      p = {
        zones, entry: 'living', connections: [D('bed1', 'living'), D('kitchen', 'living'), D('bed2', 'living'), D('bath', 'living'), D('bed1', 'kitchen')],
        windows: [win('back', xl / 2), win('back', xl + (S - xl) / 2), win('left', zL / 2), win('left', (zL + S) / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[4], 'left'), cooker(xl + 0.5, 0.6), cabinet(S - 0.45, 2.0)],
      };
    } else {
      const xl = r2(S * 0.65), zL = r2(S * 0.325), zF = r2(S * 0.775), wx = 4.5, zR = r2(S * 0.45);
      const zones = [
        zone('living', 'living', 'Living room', 0, zL, xl, zF, c.floor),
        zone('bed1', 'bedroom', 'Master bedroom', 0, 0, xl, zL, bedFloor),
        zone('kitchen', 'kitchen', 'Kitchen and dining', wx, zF, xl, S, kitchenFloor),
        wc('bath', 0, zF, wx, S),
        zone('bed3', 'bedroom', 'Bedroom 3', xl, 0, S, zR, bedFloor),
        zone('bed2', 'bedroom', 'Bedroom 2', xl, zR, S, S, bedFloor),
      ];
      p = {
        zones, entry: 'living',
        connections: [D('bed1', 'living'), D('kitchen', 'living'), D('bath', 'living'), D('bed3', 'living'), D('bed2', 'living'), D('bed1', 'bed3'), D('kitchen', 'bed2')],
        windows: [win('back', xl / 2), win('back', xl + (S - xl) / 2), win('left', zL / 2), win('left', (zL + zF) / 2, 1.8, 1.2, 0.9)],
        fixtures: [...bathSet(zones[3], 'back'), cooker(wx + 0.6, zF + 0.6), cabinet(wx + 0.4, zF + 2.4)],
      };
    }
  }

  // Open front: nothing is built in front of the house (the old green "Entrance" strip was removed; the round ground disc
  // is the only ground). Parking bays attach to the RIGHT side of the house, flush with the front edge, facing +z.
  const n = tier.parkingBays, ext = n * BAY_WIDTH;
  const zones = [...p.zones];
  const connections = [...p.connections];
  for (let i = 0; i < n; i++) zones.push(zone(`bay${i + 1}`, 'parking', `Parking ${i + 1}`, S + i * BAY_WIDTH, S - BAY_LENGTH, S + (i + 1) * BAY_WIDTH, S, 'paving', false, false));
  const plot = { x0: -MARGIN, z0: -MARGIN, x1: S + ext + MARGIN, z1: S + MARGIN, ground: c.ground ?? 'grass', fence: c.fence ?? ('none' as FenceKind) };
  return {
    id: c.id, plot, zones, connections, windows: p.windows, fixtures: p.fixtures, decor: [],
    palette: c.palette, finish: c.finish, wallHeight: c.wallHeight ?? 2.8, publicPower: c.publicPower ?? true,
  };
}
