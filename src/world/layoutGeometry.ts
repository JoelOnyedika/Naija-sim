import type { PropertyLayout, WindowSpec, Zone } from '@/types/world';

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
  const connected = (a?: Zone, b?: Zone) =>
    !!a && !!b && layout.connections.some((c) => (c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id));

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
      let height: number, tall = false;
      if (hiIn && !loIn) { height = layout.wallHeight; tall = true; }
      else if (loIn && !hiIn) height = CURB_WALL;
      else height = LOW_WALL;
      const doors = connected(hi, lo) && b - a >= 1.1 ? [m] : [];
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

export interface CarSlot { x: number; z: number; rotation: number; zoneId: string; covered: boolean }

/** Parking positions: garage bays first, then open parking. */
export function carSlots(layout: PropertyLayout): CarSlot[] {
  const out: CarSlot[] = [];
  for (const kind of ['garage', 'parking'] as const) {
    for (const z of layout.zones.filter((q) => q.kind === kind)) {
      const w = z.x1 - z.x0;
      const n = Math.max(1, Math.floor(w / 3));
      for (let i = 0; i < n; i++) out.push({ x: z.x0 + ((i + 0.5) * w) / n, z: (z.z0 + z.z1) / 2, rotation: 0, zoneId: z.id, covered: kind === 'garage' });
    }
  }
  return out;
}

/** Total furnishable floor area in square metres. */
export const furnishableArea = (layout: PropertyLayout) =>
  Math.round(layout.zones.filter((z) => z.furnishable).reduce((s, z) => s + (z.x1 - z.x0) * (z.z1 - z.z0), 0));
