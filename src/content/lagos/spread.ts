import type { AreaDefinition, BillboardDefinition, LandmarkDefinition, MapLayout } from '@/types/world';

/**
 * How far apart the map is stretched. The map was drawn tight, so places and billboards looked jammed together. Every position,
 * land slab and road node is multiplied by this; buildings and models keep their size, so there is more street between them.
 * Slab building density is divided by SPREAD² (the area grows by that much) so the city is not drawn with twice as many
 * buildings. The airport and the port scenery are drawn at the old coordinates inside a group scaled by SPREAD in x and z.
 */
export const SPREAD = 1.4;
type XZ = [number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;
export const sp = ([x, z]: XZ): XZ => [r2(x * SPREAD), r2(z * SPREAD)];

export const spreadLayout = (l: MapLayout): MapLayout => ({
  ...l,
  sea: { x0: r2(l.sea.x0 * SPREAD), x1: r2(l.sea.x1 * SPREAD), z0: r2(l.sea.z0 * SPREAD), z1: r2(l.sea.z1 * SPREAD) },
  slabs: l.slabs.map((s) => ({ ...s, cx: r2(s.cx * SPREAD), cz: r2(s.cz * SPREAD), w: r2(s.w * SPREAD), d: r2(s.d * SPREAD), density: r2((s.density / (SPREAD * SPREAD)) * 1.3) })),
  nodes: l.nodes.map((n) => ({ ...n, x: r2(n.x * SPREAD), z: r2(n.z * SPREAD) })),
});
export const spreadAreas = <T extends Pick<AreaDefinition, 'mapData'>>(a: T): T => ({ ...a, mapData: { ...a.mapData, position: sp(a.mapData.position), radius: r2(a.mapData.radius * SPREAD) } });
export const spreadLandmark = <T extends Pick<LandmarkDefinition, 'position'>>(l: T): T => ({ ...l, position: sp(l.position) });
export const spreadBillboard = <T extends Pick<BillboardDefinition, 'position'>>(b: T): T => ({ ...b, position: sp(b.position) });
