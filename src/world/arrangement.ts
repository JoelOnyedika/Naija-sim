import type { Pt } from './navigation';

/**
 * Natural group arrangements (pure): where the player and the people they are talking to stand or sit. Nobody stands in a
 * row: people sit on benches when there are any, the rest form a loose arc with different distances and slightly different
 * facings, the player takes the open side nearest to where they came from, and nobody ends up closer than `minGap` to anyone else.
 */
export interface Seat { id: string; x: number; z: number; yaw: number }
export interface Slot { x: number; z: number; yaw: number; pose: 'stand' | 'sit'; seatId?: string }
export interface ArrangeOpts {
  centre: Pt; count: number; seed?: number; seats?: Seat[]; /** where the player comes from, so they get the nearest open side */ from?: Pt;
  /** returns true when the spot is free to stand on (walls, furniture); the arrangement nudges people off blocked ground */ isFree?: (p: Pt) => boolean;
  radius?: number; minGap?: number;
}
const rngOf = (seed: number) => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Returns `count` slots: index 0 is the PLAYER, the rest are the NPCs in the order given. Everyone faces the middle of the group (the player
 * faces the person who speaks first, slot 1). Seats are used first (the NPCs nearest to a seat sit there), never the player.
 */
export function arrangeGroup(o: ArrangeOpts): Slot[] {
  const r = rngOf(o.seed ?? 7), gap = o.minGap ?? 0.85, base = o.radius ?? 1.55, free = o.isFree ?? (() => true);
  const n = o.count, out: Slot[] = [];
  // the player's side: the direction from the centre toward where they came from
  const fromAng = o.from ? Math.atan2(o.from.x - o.centre.x, o.from.z - o.centre.z) : 0.6;
  const seats = [...(o.seats ?? [])].filter((s) => free(s) || true).sort((a, b) => Math.hypot(a.x - o.centre.x, a.z - o.centre.z) - Math.hypot(b.x - o.centre.x, b.z - o.centre.z));
  const npcs = n - 1, sitting = Math.min(seats.length, Math.max(0, npcs - 1), Math.floor(npcs / 2) || (npcs > 1 ? 1 : 0));
  // player first
  const pAng = fromAng, pr = base * 1.05;
  out.push({ x: o.centre.x + Math.sin(pAng) * pr, z: o.centre.z + Math.cos(pAng) * pr, yaw: wrap(pAng + Math.PI), pose: 'stand' });
  // the others spread over the remaining arc (not the player's 70 degrees), seated ones first
  const arcStart = pAng + 0.6, arcLen = Math.PI * 2 - 1.2;
  for (let i = 0; i < npcs; i++) {
    const standing = npcs - sitting;
    if (i >= standing) { const s = seats[i - standing]; out.push({ x: s.x, z: s.z, yaw: s.yaw, pose: 'sit', seatId: s.id }); continue; }
    const k = i, m = standing, t = m === 1 ? 0.5 : (k + 0.5) / m;
    const ang = arcStart + arcLen * t + (r() - 0.5) * 0.3, rad = base * (0.9 + r() * 0.55);
    let x = o.centre.x + Math.sin(ang) * rad, z = o.centre.z + Math.cos(ang) * rad;
    for (let tries = 0; tries < 8 && !free({ x, z }); tries++) { const a2 = ang + (tries + 1) * 0.35 * (tries % 2 ? 1 : -1); x = o.centre.x + Math.sin(a2) * (rad + 0.15 * tries); z = o.centre.z + Math.cos(a2) * (rad + 0.15 * tries); }
    out.push({ x, z, yaw: wrap(Math.atan2(o.centre.x - x, o.centre.z - z) + (r() - 0.5) * 0.45), pose: 'stand' });
  }
  // nobody may stand on blocked ground (furniture, walls): move them to the nearest free spot around where they were meant to be
  const nudge = (s: Slot) => {
    if (s.pose === 'sit' || free(s)) return;
    for (let ring = 1; ring <= 10; ring++) for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, x = s.x + Math.sin(a) * ring * 0.2, z = s.z + Math.cos(a) * ring * 0.2; if (free({ x, z })) { s.x = x; s.z = z; return; } }
  };
  out.forEach(nudge);
  // relax: push apart anyone closer than the gap (seated people stay put)
  for (let it = 0; it < 12; it++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j], d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d >= gap || d === 0) continue;
      const push = (gap - d) / 2, ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
      const mv = (s: Slot, sx: number, sz: number) => { if (s.pose === 'sit' || (s === out[0] && false)) return; const nx = s.x + sx, nz = s.z + sz; if (free({ x: nx, z: nz })) { s.x = nx; s.z = nz; moved = true; } };
      if (a.pose === 'sit' && b.pose === 'sit') continue;
      mv(a, -ux * push * (b.pose === 'sit' ? 2 : 1), -uz * push * (b.pose === 'sit' ? 2 : 1)); mv(b, ux * push * (a.pose === 'sit' ? 2 : 1), uz * push * (a.pose === 'sit' ? 2 : 1));
    }
    if (!moved) break;
  }
  // the player faces the first speaker; everyone else faces the middle (already set), the first speaker faces the player
  if (out.length > 1) { out[0].yaw = Math.atan2(out[1].x - out[0].x, out[1].z - out[0].z); if (out[1].pose === 'stand') out[1].yaw = Math.atan2(out[0].x - out[1].x, out[0].z - out[1].z); }
  return out;
}

/** The smallest distance between any two slots (tests use this to prove nobody overlaps). */
export function minSeparation(slots: Slot[]): number {
  let m = Infinity; for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) m = Math.min(m, Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z)); return m;
}
/** True when no more than two people stand on one straight line (the "not a row" rule). */
export function isRow(slots: Slot[]): boolean {
  const s = slots.filter((x) => x.pose === 'stand'); if (s.length < 3) return false;
  const a = s[0], b = s[s.length - 1]; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return s.every((p) => Math.abs((b.x - a.x) * (a.z - p.z) - (a.x - p.x) * (b.z - a.z)) / L < 0.18);
}

/** A standoff point for approaching one person: `dist` metres from them on the side the player is coming from. */
export function standoff(target: Pt, from: Pt, dist = 1.35): Pt {
  const dx = from.x - target.x, dz = from.z - target.z, d = Math.hypot(dx, dz) || 1;
  return { x: target.x + (dx / d) * dist, z: target.z + (dz / d) * dist };
}
