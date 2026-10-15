import type { LandSlab, MapLayout, RoadClass, RoadEdge } from '@/types/world';

/** Geometry helpers over a state's MapLayout. Pure functions, shared by the 3D scene, Sea Ads slots and the content validator. */
export const ROAD_WIDTH: Record<RoadClass, number> = { major: 0.7, secondary: 0.45, local: 0.26 };

export interface Seg { a: [number, number]; b: [number, number]; edge: RoadEdge }
export function roadSegments(layout: MapLayout): Seg[] {
  const n = new Map(layout.nodes.map((q) => [q.id, q]));
  const out: Seg[] = [];
  for (const e of layout.edges) {
    const a = n.get(e.a), b = n.get(e.b);
    if (a && b) out.push({ a: [a.x, a.z], b: [b.x, b.z], edge: e });
  }
  return out;
}

export function distToSegment(px: number, pz: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0;
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}
/** Distance from a point to the nearest road (any class), and which edge. */
export function nearestRoad(layout: MapLayout, x: number, z: number) {
  let best = { d: Infinity, edge: null as RoadEdge | null };
  for (const s of roadSegments(layout)) { const d = distToSegment(x, z, s.a, s.b); if (d < best.d) best = { d, edge: s.edge }; }
  return best;
}

export const slabContains = (s: LandSlab, x: number, z: number, margin = 0) =>
  Math.abs(x - s.cx) <= s.w / 2 + margin && Math.abs(z - s.cz) <= s.d / 2 + margin;
export const isOnLand = (layout: MapLayout, x: number, z: number, margin = 0) => layout.slabs.some((s) => slabContains(s, x, z, margin));
/** Distance from a point to the nearest land rectangle (0 when inside). */
export function distToLand(layout: MapLayout, x: number, z: number) {
  let best = Infinity;
  for (const s of layout.slabs) best = Math.min(best, Math.hypot(Math.max(Math.abs(x - s.cx) - s.w / 2, 0), Math.max(Math.abs(z - s.cz) - s.d / 2, 0)));
  return best;
}

/** True if every road node can be reached from the first one through the road edges. */
export function roadsConnected(layout: MapLayout): { connected: boolean; unreachable: string[]; dangling: string[] } {
  const adj = new Map<string, string[]>(layout.nodes.map((n) => [n.id, []]));
  for (const e of layout.edges) { adj.get(e.a)?.push(e.b); adj.get(e.b)?.push(e.a); }
  const seen = new Set<string>(), q = [layout.nodes[0].id];
  while (q.length) { const k = q.pop()!; if (seen.has(k)) continue; seen.add(k); for (const m of adj.get(k) ?? []) q.push(m); }
  const unreachable = layout.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
  const dangling = layout.nodes.filter((n) => (adj.get(n.id)?.length ?? 0) < 1).map((n) => n.id);
  return { connected: !unreachable.length, unreachable, dangling };
}

/** Local street grid inside slabs that ask for one (LandSlab.streets): inset lines along x and z, as road segments. */
export function streetSegments(layout: MapLayout): Seg[] {
  const out: Seg[] = [];
  const edge = { a: '', b: '', cls: 'local' as RoadClass };
  for (const s of layout.slabs) {
    if (!s.streets) continue;
    const x0 = s.cx - s.w / 2, x1 = s.cx + s.w / 2, z0 = s.cz - s.d / 2, z1 = s.cz + s.d / 2, ins = 0.6;
    for (let z = z0 + s.streets / 2; z < z1 - 0.5; z += s.streets) out.push({ a: [x0 + ins, z], b: [x1 - ins, z], edge });
    for (let x = x0 + s.streets / 2; x < x1 - 0.5; x += s.streets) out.push({ a: [x, z0 + ins], b: [x, z1 - ins], edge });
  }
  return out;
}
/** True if (x, z) lies on or right beside a road or local street: buildings and props keep out of these. */
export function nearAnyRoad(segs: Seg[], x: number, z: number, pad: number) {
  for (const s of segs) if (distToSegment(x, z, s.a, s.b) < ROAD_WIDTH[s.edge.cls] / 2 + pad) return true;
  return false;
}
