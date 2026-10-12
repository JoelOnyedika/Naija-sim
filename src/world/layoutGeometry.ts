import type { PropertyLayout, WindowSpec, Zone } from '@/types/world';
import { BAY_LENGTH, BAY_WIDTH } from './garage';

const EPS = 1e-3;
export const WALL_T = 0.14;
export const LOW_WALL = 0.95; // interior partitions are "cutaway" so you can see every room
export const CURB_WALL = 0.45; // front/right exterior walls

export interface WallPiece {
  /** 'h' runs along x at z = c. 'v' runs along z at x = c. */
  o: 'h' | 'v';
  c: number;
  a: number;
  b: number;
  height: number;
  tall: boolean;
  /** Door gap centres along the wall. */
  doors: number[];
  hi?: Zone; // zone on the larger-coordinate side
  lo?: Zone;
}

interface Edge { o: 'h' | 'v'; c: number; a: number; b: number; zone: Zone; side: 1 | -1 }

export function plotCenter(layout: PropertyLayout) {
  const p = layout.plot;
  return { x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2, w: p.x1 - p.x0, d: p.z1 - p.z0 };
}

const cover = (e: Edge, m: number) => e.a - EPS <= m && m <= e.b + EPS;

/** Split every zone edge into wall pieces: tall back/left walls, low partitions and curbs. */
export function wallPieces(layout: PropertyLayout): WallPiece[] {
  const edges: Edge[] = [];
  for (const z of layout.zones) {
    edges.push({ o: 'h', c: z.z0, a: z.x0, b: z.x1, zone: z, side: 1 });
    edges.push({ o: 'h', c: z.z1, a: z.x0, b: z.x1, zone: z, side: -1 });
    edges.push({ o: 'v', c: z.x0, a: z.z0, b: z.z1, zone: z, side: 1 });
    edges.push({ o: 'v', c: z.x1, a: z.z0, b: z.z1, zone: z, side: -1 });
  }
  const groups = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = `${e.o}:${e.c.toFixed(3)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
  }
  const link = (a?: Zone, b?: Zone) =>
    a && b ? layout.connections.find((c) => (c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id)) : undefined;

  const pieces: WallPiece[] = [];
  for (const group of groups.values()) {
    const pts = [...new Set(group.flatMap((e) => [e.a, e.b].map((v) => +v.toFixed(3))))].sort((x, y) => x - y);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (b - a < EPS) continue;
      const m = (a + b) / 2;
      const hi = group.find((e) => e.side === 1 && cover(e, m))?.zone;
      const lo = group.find((e) => e.side === -1 && cover(e, m))?.zone;
      const hiIn = !!hi?.indoor, loIn = !!lo?.indoor;
      if (!hiIn && !loIn) continue;
      const conn = link(hi, lo);
      if (hiIn && loIn && conn?.open) continue; // open-plan: one room, no wall
      let height: number, tall = false;
      if (hiIn && !loIn) { height = layout.wallHeight; tall = true; }
      else if (loIn && !hiIn) height = CURB_WALL;
      else height = LOW_WALL;
      const doors = conn && !conn.open && b - a >= 1.1 ? [m] : [];
      pieces.push({ o: group[0].o, c: group[0].c, a, b, height, tall, doors, hi, lo });
    }
  }
  return pieces;
}

/** Tall pieces that belong to a furnishable indoor room: where wall-mounted items and windows can go. */
export const tallWalls = (layout: PropertyLayout) => wallPieces(layout).filter((p) => p.tall);

export function windowsOnPiece(layout: PropertyLayout, p: WallPiece): WindowSpec[] {
  const wall = p.o === 'h' ? 'back' : 'left';
  return layout.windows.filter((w) => w.wall === wall && w.along - w.width / 2 >= p.a - EPS && w.along + w.width / 2 <= p.b + EPS);
}

/**
 * One open parking bay. `x`/`z` is the bay CENTRE on the ground plane (y = 0, world metres: x east, z south).
 * `rotation` is the yaw (radians about +y) the car's NOSE should point along: 0 = +z (south, towards the camera).
 * `width` is across the car, `length` along it. Use garage.ts `fitModelToBay` to place a GLB in a slot.
 */
export interface CarSlot { id: string; x: number; z: number; rotation: number; width: number; length: number; zoneId: string; covered: false }

/** Parking positions: one slot per open bay zone, in the order the layout lists them (left to right). */
export function carSlots(layout: PropertyLayout): CarSlot[] {
  return layout.zones
    .filter((z) => z.kind === 'parking')
    .map((z) => ({ id: z.id, x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2, rotation: 0, width: Math.min(BAY_WIDTH, z.x1 - z.x0), length: Math.min(BAY_LENGTH, z.z1 - z.z0), zoneId: z.id, covered: false as const }));
}

export interface DoorRect { x0: number; z0: number; x1: number; z1: number }
const doorCache = new WeakMap<PropertyLayout, DoorRect[]>();
/** Floor areas that must stay clear so a doorway is never blocked: the door width plus 0.55 m each side of the wall. */
export function doorClearances(layout: PropertyLayout): DoorRect[] {
  let out = doorCache.get(layout);
  if (!out) {
    out = wallPieces(layout).flatMap((p) => p.doors.map((d) => (p.o === 'h'
      ? { x0: d - 0.6, x1: d + 0.6, z0: p.c - 0.55, z1: p.c + 0.55 }
      : { x0: p.c - 0.55, x1: p.c + 0.55, z0: d - 0.6, z1: d + 0.6 })));
    doorCache.set(layout, out);
  }
  return out;
}

/** Main functional rooms: bedrooms, living, parlour and kitchen zones, with open-plan zones counted once. */
export function mainRoomCount(layout: PropertyLayout): number {
  const main = layout.zones.filter((z) => ['bedroom', 'living', 'parlour', 'kitchen'].includes(z.kind));
  const parent = new Map(main.map((z) => [z.id, z.id]));
  const find = (id: string): string => { const p = parent.get(id)!; return p === id ? id : (parent.set(id, find(p)), parent.get(id)!); };
  for (const c of layout.connections) if (c.open && parent.has(c.a) && parent.has(c.b)) parent.set(find(c.a), find(c.b));
  return new Set(main.map((z) => find(z.id))).size;
}

/** Total furnishable floor area in square metres. */
export const furnishableArea = (layout: PropertyLayout) =>
  Math.round(layout.zones.filter((z) => z.furnishable).reduce((s, z) => s + (z.x1 - z.x0) * (z.z1 - z.z0), 0));
