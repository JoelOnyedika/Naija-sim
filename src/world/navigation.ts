import { getFurniture } from '@/data/items';
import type { PlacedItem } from '@/types/game';
import type { PropertyLayout } from '@/types/world';
import { WALL_T, houseBounds, wallPieces } from './layoutGeometry';
import { extents, getTransform } from './placement';

/**
 * Walking rules for the avatar. A coarse grid over the house (plus open ground in front of and right of it, because the
 * cutaway has no walls there) is marked blocked by walls (door gaps stay open), floor furniture and the area beyond the
 * back/left walls. A* with corner-cutting protection finds a path; a line-of-sight pass straightens it. Nothing here
 * touches React or stores, so it runs in tests (scripts/smoke.ts) as well as in the scene.
 */
export const CELL = 0.25;
export const AVATAR_R = 0.2;
export const DOOR_HALF = 0.5; // matches the visible door gap (wall pieces cut a 1 m opening around each door centre)
const OUTSIDE = 3; // metres of open ground walkable in front of / right of the house

export interface Pt { x: number; z: number }
export interface NavGrid { x0: number; z0: number; cols: number; rows: number; blocked: Uint8Array }

const idx = (g: NavGrid, c: number, r: number) => r * g.cols + c;
export const cellOf = (g: NavGrid, p: Pt) => ({ c: Math.floor((p.x - g.x0) / CELL), r: Math.floor((p.z - g.z0) / CELL) });
export const centreOf = (g: NavGrid, c: number, r: number): Pt => ({ x: g.x0 + (c + 0.5) * CELL, z: g.z0 + (r + 0.5) * CELL });
const inside = (g: NavGrid, c: number, r: number) => c >= 0 && r >= 0 && c < g.cols && r < g.rows;

function fillRect(g: NavGrid, x0: number, z0: number, x1: number, z1: number) {
  const c0 = Math.max(0, Math.floor((x0 - g.x0) / CELL)), c1 = Math.min(g.cols - 1, Math.floor((x1 - g.x0) / CELL));
  const r0 = Math.max(0, Math.floor((z0 - g.z0) / CELL)), r1 = Math.min(g.rows - 1, Math.floor((z1 - g.z0) / CELL));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const p = centreOf(g, c, r);
    if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) g.blocked[idx(g, c, r)] = 1;
  }
}

/** Furniture that blocks walking: floor items that collide (rugs do not). The `ignoreUid` item is left walkable. */
export const blocksWalking = (item: PlacedItem) => {
  const def = getFurniture(item.defId);
  return !!def && def.placement.surface === 'floor' && def.placement.collides;
};

const cache = new Map<string, NavGrid>();
export function buildNavGrid(layout: PropertyLayout, items: PlacedItem[], ignoreUid?: string): NavGrid {
  const key = `${layout.id}|${ignoreUid ?? ''}|` + items.map((i) => `${i.uid}:${i.x}:${i.z}:${i.rotation}`).join(',');
  const hit = cache.get(key); if (hit) return hit;
  const hb = houseBounds(layout);
  const x0 = hb.x0, z0 = hb.z0, x1 = hb.x1 + OUTSIDE, z1 = hb.z1 + OUTSIDE;
  const g: NavGrid = { x0, z0, cols: Math.ceil((x1 - x0) / CELL), rows: Math.ceil((z1 - z0) / CELL), blocked: new Uint8Array(0) };
  g.blocked = new Uint8Array(g.cols * g.rows);
  // keep clear of the outer back / left walls
  fillRect(g, x0 - 1, z0 - 1, x1 + 1, z0 + AVATAR_R); fillRect(g, x0 - 1, z0 - 1, x0 + AVATAR_R, z1 + 1);
  const t = WALL_T / 2 + AVATAR_R;
  for (const p of wallPieces(layout)) {
    // the wall minus its door gap(s)
    const spans: [number, number][] = [];
    let from = p.a;
    for (const d of [...p.doors].sort((u, v) => u - v)) { spans.push([from, d - DOOR_HALF]); from = d + DOOR_HALF; }
    spans.push([from, p.b]);
    for (const [a, b] of spans) {
      if (b <= a) continue;
      if (p.o === 'h') fillRect(g, a - AVATAR_R * 0.5, p.c - t, b + AVATAR_R * 0.5, p.c + t);
      else fillRect(g, p.c - t, a - AVATAR_R * 0.5, p.c + t, b + AVATAR_R * 0.5);
    }
  }
  for (const it of items) {
    if (it.uid === ignoreUid || !blocksWalking(it)) continue;
    const def = getFurniture(it.defId)!;
    const { hw, hd } = extents(def, it.rotation);
    fillRect(g, it.x - hw - AVATAR_R, it.z - hd - AVATAR_R, it.x + hw + AVATAR_R, it.z + hd + AVATAR_R);
  }
  if (cache.size > 24) cache.clear();
  cache.set(key, g);
  return g;
}

export const isFree = (g: NavGrid, p: Pt) => { const { c, r } = cellOf(g, p); return inside(g, c, r) && !g.blocked[idx(g, c, r)]; };

/** Nearest walkable cell centre to `p` (expanding rings), or null. */
export function nearestFree(g: NavGrid, p: Pt, maxRing = 14): Pt | null {
  const { c: c0, r: r0 } = cellOf(g, p);
  for (let ring = 0; ring <= maxRing; ring++) {
    let best: Pt | null = null, bd = Infinity;
    for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
      const c = c0 + dc, r = r0 + dr;
      if (!inside(g, c, r) || g.blocked[idx(g, c, r)]) continue;
      const q = centreOf(g, c, r), d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd) { bd = d; best = q; }
    }
    if (best) return best;
  }
  return null;
}

/** Straight segment free of blocked cells? (sampled at half-cell steps) */
function clearLine(g: NavGrid, a: Pt, b: Pt) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL * 0.5)));
  for (let i = 0; i <= n; i++) if (!isFree(g, { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n })) return false;
  return true;
}

const N8: [number, number, number][] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/** A* path from `from` to `to` as a smoothed list of points (excluding `from`), or null when unreachable. */
export function findPath(g: NavGrid, from: Pt, to: Pt): Pt[] | null {
  const s = isFree(g, from) ? from : nearestFree(g, from, 6);
  const e = isFree(g, to) ? to : nearestFree(g, to, 6);
  if (!s || !e) return null;
  const a = cellOf(g, s), b = cellOf(g, e);
  const N = g.cols * g.rows, gs = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open: number[] = [idx(g, a.c, a.r)]; gs[open[0]] = 0;
  const h = (c: number, r: number) => { const dx = Math.abs(c - b.c), dz = Math.abs(r - b.r); return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz); };
  const goal = idx(g, b.c, b.r);
  while (open.length) {
    let bi = 0, bf = Infinity;
    for (let i = 0; i < open.length; i++) { const k = open[i], f = gs[k] + h(k % g.cols, Math.floor(k / g.cols)); if (f < bf) { bf = f; bi = i; } }
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const c = cur % g.cols, r = Math.floor(cur / g.cols);
    for (const [dc, dr, w] of N8) {
      const nc = c + dc, nr = r + dr;
      if (!inside(g, nc, nr)) continue;
      const k = idx(g, nc, nr);
      if (g.blocked[k] || closed[k]) continue;
      if (dc && dr && (g.blocked[idx(g, c + dc, r)] || g.blocked[idx(g, c, r + dr)])) continue; // no cutting corners
      const ng = gs[cur] + w;
      if (ng < gs[k]) { gs[k] = ng; prev[k] = cur; if (!open.includes(k)) open.push(k); }
    }
  }
  if (prev[goal] === -1 && goal !== idx(g, a.c, a.r)) return null;
  const cells: Pt[] = [];
  for (let k = goal; k !== -1; k = prev[k]) cells.push(centreOf(g, k % g.cols, Math.floor(k / g.cols)));
  cells.reverse();
  cells[0] = s; cells[cells.length - 1] = e; // start and end exactly on the requested points
  // string-pull: skip waypoints whenever the straight line stays clear
  const out: Pt[] = [];
  let anchor = cells[0], i = 1;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(g, anchor, cells[j])) j--;
    out.push(cells[j]); anchor = cells[j]; i = j + 1;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ interaction spots

export type Action = 'idle' | 'eat' | 'cook' | 'type' | 'dance' | 'shower' | 'pushup' | 'tv' | 'read' | 'piano' | 'drink' | 'wash';
export type SpotPose = 'stand' | 'sit' | 'sleep';

/** Where the avatar goes to use an object and how it ends up. `approach` is always walkable; `final` may be on the furniture itself (seat, bed, tub). */
export interface Spot { approach: Pt; final: Pt; yaw: number; pose: SpotPose; y: number; action: Action; bathing: boolean; seatUid?: string }

interface Spec { pose: SpotPose; action: Action; mode: 'front' | 'on' | 'inside' | 'watch' | 'work' | 'mat'; top?: number; bathing?: boolean }
/** One row per usable furniture id. `top` = height of the surface the avatar rests on (mattress top, seat top, water line). */
export const SPECS: Record<string, Spec> = {
  foam_mattress: { pose: 'sleep', action: 'idle', mode: 'on', top: 0.2 },
  bed: { pose: 'sleep', action: 'idle', mode: 'on', top: 0.67 },
  king_bed: { pose: 'sleep', action: 'idle', mode: 'on', top: 0.74 },
  sofa: { pose: 'sit', action: 'idle', mode: 'on', top: 0.45 },
  chair: { pose: 'sit', action: 'idle', mode: 'on', top: 0.45 },
  toilet: { pose: 'sit', action: 'idle', mode: 'on', top: 0.4 },
  tv: { pose: 'sit', action: 'tv', mode: 'watch' },
  gaming_setup: { pose: 'sit', action: 'type', mode: 'work' },
  desk: { pose: 'sit', action: 'type', mode: 'work' },
  cooker: { pose: 'stand', action: 'cook', mode: 'front' },
  fridge: { pose: 'stand', action: 'eat', mode: 'front' },
  dispenser: { pose: 'stand', action: 'drink', mode: 'front' },
  bookshelf: { pose: 'stand', action: 'read', mode: 'front' },
  piano: { pose: 'stand', action: 'piano', mode: 'front' },
  washbasin: { pose: 'stand', action: 'wash', mode: 'front' },
  speaker: { pose: 'stand', action: 'dance', mode: 'front' },
  disco_light: { pose: 'stand', action: 'dance', mode: 'front' },
  pet_cat: { pose: 'stand', action: 'idle', mode: 'front' },
  pet_dog: { pose: 'stand', action: 'idle', mode: 'front' },
  pet_lion: { pose: 'stand', action: 'idle', mode: 'front' },
  armchair: { pose: 'sit', action: 'idle', mode: 'on', top: 0.45 },
  dining_chair: { pose: 'sit', action: 'idle', mode: 'on', top: 0.46 },
  office_chair: { pose: 'sit', action: 'idle', mode: 'on', top: 0.5 },
  stool: { pose: 'sit', action: 'idle', mode: 'on', top: 0.66 },
  ring_light: { pose: 'stand', action: 'idle', mode: 'front' },
  camera_tripod: { pose: 'stand', action: 'idle', mode: 'front' },
  dj_deck: { pose: 'stand', action: 'piano', mode: 'front' },
  gym_rug: { pose: 'stand', action: 'pushup', mode: 'mat', top: 0.045 },
  bucket: { pose: 'stand', action: 'shower', mode: 'front', bathing: true },
  shower: { pose: 'stand', action: 'shower', mode: 'inside', bathing: true },
  bathtub: { pose: 'sit', action: 'wash', mode: 'inside', top: 0.34, bathing: true },
  jacuzzi: { pose: 'sit', action: 'wash', mode: 'inside', top: 0.34, bathing: true },
};
export const SEAT_IDS = ['sofa', 'chair'];
const LIE_BACK = 0.585, LIE_SHIFT = 0.8, SIT_OFFSET = 0.47;

export const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);
const fwd = (ry: number): Pt => ({ x: Math.sin(ry), z: Math.cos(ry) });

/** Nearest seat (sofa or chair) to `to` within `maxDist`, preferring ones that can be reached. */
function seatNear(g: NavGrid, items: PlacedItem[], to: Pt, maxDist: number) {
  return items
    .filter((i) => SEAT_IDS.includes(i.defId))
    .map((i) => ({ i, d: Math.hypot(i.x - to.x, i.z - to.z) }))
    .filter((s) => s.d <= maxDist)
    .sort((a, b) => a.d - b.d)
    .find((s) => !!seatSpot(g, s.i));
}

/** Free standing point in front of (preferred) or beside / behind an item, `gap` metres from its edge. */
function standingPoint(g: NavGrid, item: PlacedItem, gap: number): Pt | null {
  const def = getFurniture(item.defId)!, ry = (item.rotation * Math.PI) / 2, f = fwd(ry), r = { x: f.z, z: -f.x };
  const cand: Pt[] = [
    { x: item.x + f.x * (def.footprint.d / 2 + gap), z: item.z + f.z * (def.footprint.d / 2 + gap) },
    { x: item.x + r.x * (def.footprint.w / 2 + gap), z: item.z + r.z * (def.footprint.w / 2 + gap) },
    { x: item.x - r.x * (def.footprint.w / 2 + gap), z: item.z - r.z * (def.footprint.w / 2 + gap) },
    { x: item.x - f.x * (def.footprint.d / 2 + gap), z: item.z - f.z * (def.footprint.d / 2 + gap) },
  ];
  for (const c of cand) if (isFree(g, c)) return c;
  return nearestFree(g, cand[0], 6);
}

function seatSpot(g: NavGrid, item: PlacedItem): Spot | null {
  const spec = SPECS[item.defId]; if (!spec) return null;
  const ry = (item.rotation * Math.PI) / 2;
  const approach = standingPoint(g, item, 0.55); if (!approach) return null;
  return { approach, final: { x: item.x, z: item.z }, yaw: ry, pose: 'sit', y: (spec.top ?? 0.45) - SIT_OFFSET, action: 'idle', bathing: false, seatUid: item.uid };
}

/** Where to stand/sit/lie to use `item`. Null when no reachable spot exists (the caller then uses the clipping fallback). */
/** Where each live pet is right now (written by the pet layer every frame). Pets roam, so their placed position is only a starting point. */
export const livePetPos = new Map<string, { x: number; z: number; yaw: number }>();

export function interactionSpot(layout: PropertyLayout, items: PlacedItem[], item: PlacedItem): Spot | null {
  const def = getFurniture(item.defId), spec = SPECS[item.defId];
  if (!def || !spec) return null;
  void layout;
  const g = buildNavGrid(layout, items);
  if (def.pet) {
    // stand a little in front of the pet's face, looking at it
    const lp = livePetPos.get(item.uid) ?? { x: item.x, z: item.z, yaw: 0 };
    const d = def.pet === 'lion' ? 1.15 : 0.75;
    const want = { x: lp.x + Math.sin(lp.yaw) * d, z: lp.z + Math.cos(lp.yaw) * d };
    const approach = nearestFree(g, want, 8); if (!approach) return null;
    return { pose: spec.pose, action: spec.action, bathing: false, y: 0, approach, final: approach, yaw: yawOf(lp.x - approach.x, lp.z - approach.z) };
  }
  const ry = getTransform(def, item).rotationY, f = fwd(ry);
  const faceItem = (p: Pt) => yawOf(item.x - p.x, item.z - p.z);
  const base = { pose: spec.pose, action: spec.action, bathing: !!spec.bathing, y: 0 };

  if (spec.mode === 'on') {
    const approach = standingPoint(g, item, 0.55); if (!approach) return null;
    if (spec.pose === 'sleep') {
      // body lies along the bed's length, head to the headboard (-z of the model), centred on the mattress
      const len = def.footprint.d, shift = Math.min(LIE_SHIFT, len / 2 - 0.1);
      return { ...base, approach, final: { x: item.x + f.x * shift, z: item.z + f.z * shift }, yaw: ry, y: (spec.top ?? 0.6) - LIE_BACK };
    }
    return { ...base, approach, final: { x: item.x - (item.defId === 'toilet' ? f.x * 0.08 : 0), z: item.z - (item.defId === 'toilet' ? f.z * 0.08 : 0) }, yaw: ry, y: (spec.top ?? 0.45) - SIT_OFFSET };
  }
  if (spec.mode === 'mat') {
    // the mat does not block walking, so the avatar walks straight onto it; push-ups run along the mat with hands toward its
    // front, the body (about 1.5 long) centred on it, resting on the mat's surface
    const p = { x: item.x - f.x * 0.75, z: item.z - f.z * 0.75 };
    return { ...base, approach: { x: item.x, z: item.z }, final: p, yaw: ry, y: spec.top ?? 0.045 };
  }
  if (spec.mode === 'inside') {
    const approach = standingPoint(g, item, 0.5); if (!approach) return null;
    return { ...base, approach, final: { x: item.x, z: item.z }, yaw: ry + Math.PI, y: spec.pose === 'sit' ? (spec.top ?? 0.34) - SIT_OFFSET : 0 };
  }
  if (spec.mode === 'watch' || spec.mode === 'work') {
    // sit on a nearby sofa/chair facing the object; without a seat, stand in front of it
    const seat = seatNear(g, items, item, spec.mode === 'watch' ? 4.5 : 2.2);
    if (seat) {
      const s = seatSpot(g, seat.i)!;
      return { ...s, yaw: yawOf(item.x - seat.i.x, item.z - seat.i.z), action: spec.action, bathing: false, seatUid: seat.i.uid };
    }
    const p = standingPoint(g, item, spec.mode === 'watch' ? 1.4 : 0.55); if (!p) return null;
    return { ...base, pose: 'stand', approach: p, final: p, yaw: faceItem(p) };
  }
  const gap = item.defId === 'speaker' ? 1.0 : 0.5;
  const p = standingPoint(g, item, gap); if (!p) return null;
  return { ...base, approach: p, final: p, yaw: faceItem(p) };
}

/** A walkable resting place for an avatar that finishes an activity on top of furniture (seat, bed, tub). */
export function exitPoint(layout: PropertyLayout, items: PlacedItem[], at: Pt): Pt | null {
  const g = buildNavGrid(layout, items);
  return nearestFree(g, at, 10);
}
