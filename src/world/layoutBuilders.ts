import type { Connection, Decor, FenceKind, FixtureSpec, FloorKind, Palette, PropertyLayout, WallFinish, WindowSpec, WindowStyle, Zone, ZoneKind } from '@/types/world';

/**
 * Generic layout builders. They turn a few parameters into a full PropertyLayout (zones, doors,
 * windows, fixtures, decor). They know nothing about any particular state: a new state can use them
 * as-is or write its layouts by hand.
 */

const zone = (id: string, kind: ZoneKind, label: string, x0: number, z0: number, x1: number, z1: number, floor: FloorKind, indoor = true, furnishable = true): Zone =>
  ({ id, kind, label, x0, z0, x1, z1, floor, indoor, furnishable });

const overlapX = (a: Zone, b: Zone) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
const cx = (z: Zone) => (z.x0 + z.x1) / 2;
const cz = (z: Zone) => (z.z0 + z.z1) / 2;

function plotAround(zones: Zone[], margin: number, ground: FloorKind, fence: FenceKind) {
  return {
    x0: Math.min(...zones.map((z) => z.x0)) - margin, z0: Math.min(...zones.map((z) => z.z0)) - margin,
    x1: Math.max(...zones.map((z) => z.x1)) + margin, z1: Math.max(...zones.map((z) => z.z1)) + margin,
    ground, fence,
  };
}

const bathFixtures = (b: Zone, shower = true): FixtureSpec[] => {
  const out: FixtureSpec[] = [{ defId: 'toilet', x: b.x0 + 0.55, z: b.z0 + 0.55, rotation: 0 }];
  if (shower) out.push({ defId: 'shower', x: b.x1 - 0.6, z: b.z0 + 0.65, rotation: 0 });
  return out;
};

// ───────────────────────── starter: compound housing ─────────────────────────

export interface CompoundCfg { id: string; palette: Palette; fence?: FenceKind }

/** A row of rooms along a veranda, facing a shared yard. The player's room is first; the others belong to neighbours. */
export function faceMeIFaceYou(c: CompoundCfg & { roomSize?: number; neighbours?: number }): PropertyLayout {
  // Worn and humble, but with a room you can actually furnish: ~4.8 x 4.4 m, one neighbour's room, a shared bathroom,
  // a covered veranda and a compound deep enough for the drums, line and generator. The plot stays close to square.
  const sw = c.roomSize ?? 4.8, sd = 4.4, nw = 4.0, bw = 2.4, vd = 1.8, yd = 5.6, n = c.neighbours ?? 1;
  const zones: Zone[] = [zone('room', 'bedroom', 'Your room', 0, 0, sw, sd, 'cement')];
  for (let i = 0; i < n; i++) zones.push(zone(`n${i}`, 'neighbour', "Neighbour's room", sw + i * nw, 0, sw + (i + 1) * nw, sd, 'cement', true, false));
  const bx = sw + n * nw;
  zones.push(zone('bath', 'bathroom', 'Shared bathroom', bx, 0, bx + bw, sd, 'cement', true, false));
  const W = bx + bw;
  zones.push(zone('veranda', 'corridor', 'Veranda', 0, sd, W, sd + vd, 'concrete', false, false));
  zones.push(zone('yard', 'compound', 'Shared compound', 0, sd + vd, W, sd + vd + yd, 'concrete', false, true));
  const windows: WindowSpec[] = [
    { wall: 'back', along: sw / 2, width: 0.9, height: 0.9, sill: 1.3, style: 'burglar' },
    { wall: 'left', along: sd / 2, width: 0.8, height: 0.8, sill: 1.4, style: 'louvre' },
    ...Array.from({ length: n }, (_, i) => ({ wall: 'back' as const, along: sw + i * nw + nw / 2, width: 0.8, height: 0.8, sill: 1.3, style: 'louvre' as WindowStyle })),
  ];
  const yz = sd + vd;
  const decor: Decor[] = [
    { kind: 'awning', x: W / 2, z: sd + vd / 2, w: W, d: vd + 0.2 },
    { kind: 'tree', x: W - 1.5, z: yz + yd - 1.4, scale: 1.1 },
    { kind: 'drum', x: 1.0, z: yz + 1.0 },
    { kind: 'drum', x: 1.6, z: yz + 1.25, scale: 0.9 },
    { kind: 'clothesline', x: W / 2, z: yz + yd - 1.0, w: Math.min(6, W - 2) },
    { kind: 'generatorHouse', x: W - 1.0, z: yz + 1.2 },
  ];
  const plot = plotAround(zones, 0.9, 'dirt', c.fence ?? 'zinc');
  decor.push({ kind: 'gate', x: W / 2, z: plot.z1 });
  return {
    id: c.id, plot, zones, wallHeight: 2.6, windows, palette: c.palette, finish: 'rough', decor, publicPower: false,
    connections: [{ a: 'room', b: 'veranda' }, { a: 'bath', b: 'veranda' }],
    fixtures: [...bathFixtures(zones.find((z) => z.id === 'bath')!, false), { defId: 'bucket', x: bx + bw - 0.55, z: sd - 0.6, rotation: 0 }],
  };
}

export function selfContain(c: CompoundCfg): PropertyLayout {
  const zones = [
    zone('main', 'bedroom', 'Bedroom and living area', 0, 0, 4.4, 3.6, 'cement'),
    zone('bath', 'bathroom', 'Bathroom', 4.4, 0, 6.0, 2.0, 'tile', true, false),
    zone('kitchen', 'kitchen', 'Kitchenette', 4.4, 2.0, 6.0, 3.6, 'tile', true, true),
    zone('porch', 'compound', 'Front yard', 0, 3.6, 6.0, 6.8, 'concrete', false, true),
  ];
  return {
    id: c.id, plot: plotAround(zones, 0.9, 'paving', c.fence ?? 'brick'), zones, wallHeight: 2.7, finish: 'painted', palette: c.palette, publicPower: true,
    windows: [
      { wall: 'back', along: 2.0, width: 1.0, height: 1.0, sill: 1.1, style: 'sash' },
      { wall: 'left', along: 1.8, width: 0.9, height: 1.0, sill: 1.1, style: 'burglar' },
    ],
    connections: [{ a: 'main', b: 'bath' }, { a: 'main', b: 'kitchen' }, { a: 'main', b: 'porch' }],
    decor: [
      { kind: 'awning', x: 2.2, z: 4.2, w: 4.4, d: 1.2 }, { kind: 'tree', x: 5.2, z: 5.8 }, { kind: 'drum', x: 0.8, z: 5.6 },
      { kind: 'gate', x: 3.0, z: 7.7 },
    ],
    fixtures: [{ defId: 'toilet', x: 4.95, z: 0.5, rotation: 0 }, { defId: 'shower', x: 5.25, z: 1.5, rotation: 0 }, { defId: 'cooker', x: 4.95, z: 2.55, rotation: 0 }],
  };
}

export function roomAndParlour(c: CompoundCfg & { floor?: FloorKind }): PropertyLayout {
  const f = c.floor ?? 'tile';
  const zones = [
    zone('bed', 'bedroom', 'Bedroom', 0, 0, 3.6, 3.6, f),
    zone('parlour', 'parlour', 'Parlour', 3.6, 0, 8.0, 3.6, f),
    zone('kitchen', 'kitchen', 'Kitchen', 8.0, 0, 10.0, 1.8, 'tile'),
    zone('bath', 'bathroom', 'Bathroom', 8.0, 1.8, 10.0, 3.6, 'tile', true, false),
    zone('yard', 'compound', 'Compound', 0, 3.6, 10.0, 7.6, 'concrete', false, true),
  ];
  return {
    id: c.id, plot: plotAround(zones, 0.9, 'paving', c.fence ?? 'brick'), zones, wallHeight: 2.7, finish: 'painted', palette: c.palette, publicPower: true,
    windows: [
      { wall: 'back', along: 1.8, width: 1.0, height: 1.0, sill: 1.1, style: 'burglar' },
      { wall: 'back', along: 5.8, width: 1.4, height: 1.0, sill: 1.1, style: 'sash' },
      { wall: 'left', along: 1.8, width: 1.0, height: 1.0, sill: 1.1, style: 'burglar' },
    ],
    connections: [{ a: 'bed', b: 'parlour' }, { a: 'parlour', b: 'kitchen' }, { a: 'parlour', b: 'bath' }, { a: 'parlour', b: 'yard' }],
    decor: [
      { kind: 'awning', x: 5.8, z: 4.3, w: 4.4, d: 1.4 }, { kind: 'tree', x: 8.6, z: 6.2, scale: 1.1 }, { kind: 'drum', x: 0.9, z: 5.0 },
      { kind: 'planter', x: 2.4, z: 6.4 }, { kind: 'gate', x: 5.0, z: 8.5 },
    ],
    fixtures: [...bathFixtures(zones[3]), { defId: 'cooker', x: 8.5, z: 0.55, rotation: 0 }],
  };
}

// ───────────────────────── mid → luxury: residences ─────────────────────────

export interface ResidenceCfg {
  id: string; beds: number; baths: number;
  floor: FloorKind; bedFloor?: FloorKind; finish: WallFinish; palette: Palette; windowStyle: WindowStyle;
  bedW?: number; rowDepth?: number; livingDepth?: number; wallHeight?: number;
  balcony?: boolean; terrace?: boolean; garden?: number; stairs?: boolean;
  parkingSpaces?: number; garageBays?: number;
  fence?: FenceKind; ground?: FloorKind; trees?: number; pillars?: boolean; waterfront?: boolean;
  /** Extra width for the master bedroom / living space (luxury). */
  grand?: number;
}

const bathPlan = (beds: number, baths: number) => {
  if (baths <= 1) return { ensuites: 0, common: baths === 1, guest: false };
  if (baths === 2) return { ensuites: 1, common: true, guest: false };
  if (baths === 3) return { ensuites: 1, common: true, guest: true };
  return { ensuites: Math.min(beds, baths - 2), common: true, guest: true };
};

export function residence(c: ResidenceCfg): PropertyLayout {
  const zones: Zone[] = [], connections: Connection[] = [], windows: WindowSpec[] = [], fixtures: FixtureSpec[] = [], decor: Decor[] = [];
  const D1 = c.rowDepth ?? 4.0, D2 = c.livingDepth ?? 3.8;
  const bedW = c.bedW ?? 3.4, bathW = 2.0, kitchenW = 3.2, hallW = c.stairs ? 2.4 : 0;
  const plan = bathPlan(c.beds, c.baths);
  const guestW = plan.guest ? 1.8 : 0;
  const grand = c.grand ?? 0;

  // width bookkeeping so both rows line up
  const masterBase = bedW + 0.6 + grand;
  const row1 = masterBase + (c.beds - 1) * (bedW + grand * 0.3) + (plan.ensuites + (plan.common ? 1 : 0)) * bathW;
  const row2Min = 3.2 + hallW + kitchenW + guestW;
  const extra = Math.max(0, row2Min - row1);
  const masterW = masterBase + extra;
  const rowW = row1 + extra;
  const livingW = rowW - hallW - kitchenW - guestW;
  const bedFloor = c.bedFloor ?? c.floor;

  // row 1: bedrooms with ensuites, then the common bathroom
  const beds: Zone[] = [];
  let x = 0;
  for (let i = 0; i < c.beds; i++) {
    const w = i === 0 ? masterW : bedW + grand * 0.3;
    const b = zone(`bed${i + 1}`, 'bedroom', i === 0 ? 'Master bedroom' : `Bedroom ${i + 1}`, x, 0, x + w, D1, bedFloor);
    zones.push(b); beds.push(b); x += w;
    windows.push({ wall: 'back', along: x - w / 2, width: c.windowStyle === 'panoramic' ? w * 0.6 : 1.2, height: c.windowStyle === 'panoramic' ? 1.7 : 1.1, sill: c.windowStyle === 'panoramic' ? 0.6 : 0.95, style: c.windowStyle });
    if (i < plan.ensuites) {
      const e = zone(`ensuite${i + 1}`, 'bathroom', 'Ensuite bathroom', x, 0, x + bathW, D1, 'tile', true, false);
      zones.push(e); connections.push({ a: b.id, b: e.id }); fixtures.push(...bathFixtures(e));
      windows.push({ wall: 'back', along: x + bathW / 2, width: 0.5, height: 0.5, sill: 1.6, style: 'louvre' });
      x += bathW;
    }
  }
  let common: Zone | undefined;
  if (plan.common) {
    common = zone('bath', 'bathroom', 'Bathroom', x, 0, x + bathW, D1, 'tile', true, false);
    zones.push(common); fixtures.push(...bathFixtures(common));
    windows.push({ wall: 'back', along: x + bathW / 2, width: 0.5, height: 0.5, sill: 1.6, style: 'louvre' });
    x += bathW;
  }

  // row 2: living, stair hall, kitchen, guest toilet
  const row2: Zone[] = [];
  let x2 = 0;
  const living = zone('living', 'living', 'Living room', x2, D1, x2 + livingW, D1 + D2, c.floor); zones.push(living); row2.push(living); x2 += livingW;
  let hall: Zone | undefined;
  if (hallW) { hall = zone('hall', 'corridor', 'Stair hall', x2, D1, x2 + hallW, D1 + D2, c.floor, true, true); zones.push(hall); row2.push(hall); x2 += hallW; decor.push({ kind: 'stairs', x: cx(hall), z: cz(hall) }); }
  const kitchen = zone('kitchen', 'kitchen', 'Kitchen', x2, D1, x2 + kitchenW, D1 + D2, 'tile'); zones.push(kitchen); row2.push(kitchen); x2 += kitchenW;
  fixtures.push({ defId: 'cooker', x: kitchen.x0 + 0.55, z: kitchen.z0 + 0.5, rotation: 0 }, { defId: 'cabinet', x: kitchen.x0 + 2.1, z: kitchen.z0 + 0.45, rotation: 0 });
  let guest: Zone | undefined;
  if (plan.guest) { guest = zone('guest', 'bathroom', 'Guest toilet', x2, D1, x2 + guestW, D1 + D2, 'tile', true, false); zones.push(guest); row2.push(guest); fixtures.push({ defId: 'toilet', x: guest.x0 + 0.55, z: guest.z0 + 0.55, rotation: 0 }); }

  // doors
  const best = (z: Zone) => row2.reduce((a, b) => (overlapX(z, b) > overlapX(z, a) ? b : a));
  for (const b of beds) connections.push({ a: b.id, b: best(b).id });
  if (common) connections.push({ a: common.id, b: best(common).id });
  if (hall) connections.push({ a: 'living', b: 'hall' }, { a: 'hall', b: 'kitchen' }); else connections.push({ a: 'living', b: 'kitchen' });
  if (guest) connections.push({ a: 'guest', b: 'kitchen' });

  // left-wall windows for the master bedroom and living room
  const big = c.windowStyle === 'panoramic';
  windows.push(
    { wall: 'left', along: D1 / 2, width: big ? 2.2 : 1.2, height: big ? 1.7 : 1.1, sill: big ? 0.6 : 0.95, style: c.windowStyle },
    { wall: 'left', along: D1 + D2 / 2, width: big ? 2.4 : 1.4, height: big ? 1.9 : 1.2, sill: big ? 0.5 : 0.9, style: c.windowStyle },
  );

  // front: balcony / terrace / garden
  let frontZ = D1 + D2;
  if (c.balcony) {
    const b = zone('balcony', 'balcony', 'Balcony', 0, frontZ, Math.min(livingW, 6.0), frontZ + 1.6, 'tile', false, true);
    zones.push(b); connections.push({ a: 'living', b: 'balcony' });
    decor.push({ kind: 'rail', x: cx(b), z: b.z1, w: b.x1 - b.x0 }, { kind: 'rail', x: b.x1, z: cz(b), w: b.z1 - b.z0, rotation: Math.PI / 2 });
    frontZ = b.z1;
  }
  if (c.terrace) {
    const t = zone('terrace', 'terrace', 'Front terrace', 0, frontZ, Math.max(livingW, rowW * 0.6), frontZ + 2.4, c.floor === 'marble' ? 'marble' : 'tile', false, true);
    zones.push(t); connections.push({ a: 'living', b: 'terrace' });
    if (c.pillars) for (let px = t.x0 + 0.6; px < t.x1; px += 2.6) decor.push({ kind: 'pillar', x: px, z: t.z1 - 0.2 });
    frontZ = t.z1;
  }
  let totalW = rowW;
  // parking / garage to the right of the building
  const bays = c.garageBays ?? 0, spaces = c.parkingSpaces ?? 0;
  if (bays > 0 || spaces > 0) {
    const n = bays > 0 ? bays : spaces;
    const g = zone(bays > 0 ? 'garage' : 'parking', bays > 0 ? 'garage' : 'parking', bays > 0 ? 'Garage' : 'Parking', rowW + 0.6, 0.4, rowW + 0.6 + n * 3.2, 5.6, bays > 0 ? 'concrete' : 'paving', false, false);
    zones.push(g); totalW = g.x1;
    if (bays > 0) [g.x0, g.x1].forEach((px) => { decor.push({ kind: 'pillar', x: px, z: g.z1 - 0.1, scale: 0.8 }); });
  }
  if (c.garden) {
    const gd = zone('garden', 'garden', 'Garden', 0, frontZ + 0.2, totalW, frontZ + 0.2 + c.garden, 'grass', false, true);
    zones.push(gd);
    if (!c.terrace && !c.balcony) connections.push({ a: 'living', b: 'garden' });
    const nt = c.trees ?? 2;
    for (let i = 0; i < nt; i++) decor.push({ kind: i % 2 ? 'palm' : 'tree', x: 1.2 + ((totalW - 2.4) * (i + 0.5)) / nt, z: gd.z1 - 1.0, scale: 1 + (i % 3) * 0.1 });
    decor.push({ kind: 'hedge', x: totalW / 2, z: gd.z1 - 0.2, w: totalW - 1 }, { kind: 'planter', x: 1.0, z: gd.z0 + 0.6 });
  }
  if (c.waterfront) {
    const wz1 = Math.max(frontZ + 0.2 + (c.garden ?? 0), 6);
    const w = zone('water', 'waterfront', 'Lagoon waterfront', totalW + 0.8, -1.0, totalW + 7.5, wz1, 'water', false, false);
    zones.push(w);
    decor.push({ kind: 'jetty', x: w.x0 + 0.2, z: wz1 / 2 - 0.5, w: 3.4, d: 1.1 }, { kind: 'boat', x: w.x0 + 2.2, z: wz1 / 2 + 1.6 });
    totalW = w.x1;
  }

  const fence = c.fence ?? 'none';
  const plot = plotAround(zones, 1.3, c.ground ?? 'paving', fence);
  if (fence !== 'none') decor.push({ kind: 'gate', x: (plot.x0 + plot.x1) / 2 - 1, z: plot.z1 });
  decor.push({ kind: 'lamppost', x: plot.x0 + 0.6, z: plot.z1 - 0.8 });
  return {
    id: c.id, plot, zones, connections, windows, fixtures, decor, palette: c.palette, finish: c.finish,
    wallHeight: c.wallHeight ?? 2.9, publicPower: true,
  };
}
