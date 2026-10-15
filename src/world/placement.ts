import { clamp } from '@/core/format';
import type { FurnitureDef } from '@/data/items';
import { getFurniture } from '@/data/items';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout, Zone } from '@/types/world';
import { doorClearances, tallWalls, windowsOnPiece, type WallPiece } from './layoutGeometry';

const STEP = 0.05;
const M = 0.1; // margin from walls
const EPS = 1e-4;
export const snap = (v: number) => Math.round(v / STEP) * STEP;

export type Pose = Pick<PlacedItem, 'x' | 'z' | 'rotation' | 'wall' | 'along' | 'wallC'>;

export const extents = (def: FurnitureDef, rotation: number) => {
  const odd = rotation % 2 === 1;
  return { hw: (odd ? def.footprint.d : def.footprint.w) / 2, hd: (odd ? def.footprint.w : def.footprint.d) / 2 };
};

const zoneOk = (def: FurnitureDef, z: Zone) => {
  if (!z.furnishable) return false;
  const where = def.place ?? 'indoor';
  return where === 'any' || (where === 'indoor' ? z.indoor : !z.indoor);
};

const wallCandidates = (def: FurnitureDef, layout: PropertyLayout) =>
  tallWalls(layout).filter((p) => !!p.hi && zoneOk(def, p.hi) && p.b - p.a >= def.footprint.w + 2 * M);

/** Turn a raw floor-pointer position into a legal, snapped pose (best effort; validatePlacement is the judge). */
export function resolvePlacement(def: FurnitureDef, layout: PropertyLayout, rawX: number, rawZ: number, rotation: number): Pose {
  if (def.placement.surface === 'wall') {
    const cands = wallCandidates(def, layout);
    if (!cands.length) return { x: 0, z: 0, rotation: 0, wall: 'back', along: 0, wallC: 0 };
    let best: WallPiece = cands[0], bestD = Infinity;
    for (const p of cands) {
      const [perp, along] = p.o === 'h' ? [rawZ, rawX] : [rawX, rawZ];
      const d = Math.abs(perp - p.c) + Math.max(0, p.a - along, along - p.b);
      if (d < bestD) { bestD = d; best = p; }
    }
    const raw = best.o === 'h' ? rawX : rawZ;
    const half = def.footprint.w / 2 + M;
    return {
      x: 0, z: 0, rotation: best.o === 'h' ? 0 : 1, wall: best.o === 'h' ? 'back' : 'left',
      along: clamp(snap(raw), best.a + half, best.b - half), wallC: best.c,
    };
  }
  const { hw, hd } = extents(def, rotation);
  const zones = layout.zones.filter((z) => zoneOk(def, z));
  if (!zones.length) return { x: rawX, z: rawZ, rotation };
  const dist = (z: Zone) => Math.hypot(Math.max(z.x0 - rawX, 0, rawX - z.x1), Math.max(z.z0 - rawZ, 0, rawZ - z.z1));
  const zone = zones.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  const lox = zone.x0 + M + hw, hix = zone.x1 - M - hw, loz = zone.z0 + M + hd, hiz = zone.z1 - M - hd;
  return {
    x: lox > hix ? (zone.x0 + zone.x1) / 2 : clamp(snap(rawX), lox, hix),
    z: loz > hiz ? (zone.z0 + zone.z1) / 2 : clamp(snap(rawZ), loz, hiz),
    rotation,
  };
}

export function getTransform(def: FurnitureDef, p: Pose): { position: [number, number, number]; rotationY: number } {
  if (def.placement.surface === 'wall') {
    const y = def.placement.mountHeight ?? 1.5;
    const a = p.along ?? 0, c = p.wallC ?? 0;
    return p.wall === 'left'
      ? { position: [c + def.footprint.d / 2, y, a], rotationY: Math.PI / 2 }
      : { position: [a, y, c + def.footprint.d / 2], rotationY: 0 };
  }
  return { position: [p.x, 0, p.z], rotationY: (p.rotation * Math.PI) / 2 };
}

const vRange = (def: FurnitureDef) => {
  const m = def.placement.mountHeight ?? 1.5;
  return [m - def.height / 2, m + def.height / 2] as const;
};

/** Is this pose legal? Drives the green/red ghost and re-validates items after loading/moving house. */
export function validatePlacement(def: FurnitureDef, layout: PropertyLayout, pose: Pose, others: PlacedItem[]): boolean {
  if (def.placement.surface === 'wall') {
    const a = pose.along ?? 0, half = def.footprint.w / 2;
    const piece = wallCandidates(def, layout).find((p) => {
      const wall = p.o === 'h' ? 'back' : 'left';
      return wall === pose.wall && Math.abs(p.c - (pose.wallC ?? 0)) < 0.01 && a - half >= p.a + M - EPS && a + half <= p.b - M + EPS;
    });
    if (!piece) return false;
    const [bot, top] = vRange(def);
    for (const w of windowsOnPiece(layout, piece)) {
      if (Math.abs(a - w.along) < half + w.width / 2 && bot < w.sill + w.height && top > w.sill) return false;
    }
    for (const d of piece.doors) if (Math.abs(a - d) < half + 0.5 && bot < 2.1) return false;
    for (const o of others) {
      const od = getFurniture(o.defId);
      if (!od || od.placement.surface !== 'wall' || o.wall !== pose.wall || Math.abs((o.wallC ?? 0) - (pose.wallC ?? 0)) > 0.01) continue;
      const [ob, ot] = vRange(od);
      if (Math.abs(a - (o.along ?? 0)) < half + od.footprint.w / 2 - EPS && bot < ot && top > ob) return false;
    }
    return true;
  }
  const { hw, hd } = extents(def, pose.rotation);
  const inside = layout.zones.some(
    (z) => zoneOk(def, z) && pose.x - hw >= z.x0 + M - EPS && pose.x + hw <= z.x1 - M + EPS && pose.z - hd >= z.z0 + M - EPS && pose.z + hd <= z.z1 - M + EPS,
  );
  if (!inside) return false;
  const solid = (d: FurnitureDef) => d.placement.collides || !!d.exclusive;
  if (!solid(def)) return true;
  for (const r of doorClearances(layout)) if (pose.x + hw > r.x0 && pose.x - hw < r.x1 && pose.z + hd > r.z0 && pose.z - hd < r.z1) return false;
  for (const o of others) {
    const od = getFurniture(o.defId);
    if (!od || od.placement.surface !== 'floor' || !solid(od)) continue;
    const e = extents(od, o.rotation);
    if (Math.abs(pose.x - o.x) < hw + e.hw - EPS && Math.abs(pose.z - o.z) < hd + e.hd - EPS) return false;
  }
  return true;
}

/** Built-in fixtures (toilet, cooker) as PlacedItems so they collide and can be used like furniture. */
export const fixturesOf = (layout: PropertyLayout): PlacedItem[] =>
  layout.fixtures.map((f, i) => ({ uid: `fixed:${layout.id}:${i}`, defId: f.defId, x: f.x, z: f.z, rotation: f.rotation, fixed: true }));

/** Search for the free spot nearest `near` (default: centre of the first furnishable zone). */
export function findFreeSpot(def: FurnitureDef, layout: PropertyLayout, placed: PlacedItem[], near?: [number, number]): Pose | null {
  const others = [...fixturesOf(layout), ...placed];
  const cands: Pose[] = [];
  if (def.placement.surface === 'wall') {
    for (const p of wallCandidates(def, layout)) {
      for (let a = p.a + def.footprint.w / 2 + M; a <= p.b - def.footprint.w / 2 - M; a += 0.25) {
        cands.push({ x: 0, z: 0, rotation: p.o === 'h' ? 0 : 1, wall: p.o === 'h' ? 'back' : 'left', along: snap(a), wallC: p.c });
      }
    }
    return cands.find((c) => validatePlacement(def, layout, c, others)) ?? null;
  }
  const origin = near ?? (() => { const z = layout.zones.find((q) => zoneOk(def, q)); return z ? ([(z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2] as [number, number]) : ([0, 0] as [number, number]); })();
  for (const z of layout.zones.filter((q) => zoneOk(def, q))) {
    for (let x = z.x0; x <= z.x1; x += 0.25)
      for (let zz = z.z0; zz <= z.z1; zz += 0.25) cands.push(resolvePlacement(def, layout, x, zz, 0));
  }
  cands.sort((a, b) => Math.hypot(a.x - origin[0], a.z - origin[1]) - Math.hypot(b.x - origin[0], b.z - origin[1]));
  return cands.find((c) => validatePlacement(def, layout, c, others)) ?? null;
}
