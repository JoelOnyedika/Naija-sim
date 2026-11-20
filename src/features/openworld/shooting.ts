/**
 * Shooting rules for the open world (pure maths, no three.js, so they can be tested).
 * Uses the weapon stats in data/weapons.ts and the hit rule `fire()` in game/weapons.ts.
 * Ray tests: a person is two spheres (body and head, a headshot does double damage); buildings stop bullets.
 */
import { CRIME } from '@/data/balance';
import { WEAPONS, type WeaponId } from '@/data/weapons';
import { fire } from '@/game/weapons';
import type { Rect } from './worldGen';

export type V3 = [number, number, number];
export interface Target { id: string; x: number; z: number; hp: number; downed?: boolean }
export interface Wall extends Rect { h: number }
export interface Clip { loaded: number; reserve: number }
export interface RayResult { kind: 'target' | 'wall' | 'none'; distance: number; point: V3; id?: string; head?: boolean }

const BODY = { y: 1.05, r: 0.5 }, HEAD = { y: 1.62, r: 0.24 }, GROUND_Y = 0.3;

/** Distance along the ray to a sphere, or null. `d` must be a unit vector. */
function raySphere(o: V3, d: V3, c: V3, r: number): number | null {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2], k = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - k;
  if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : (-b + Math.sqrt(disc) >= 0 ? 0 : null);
}
/** Distance along the ray into an axis-aligned box (slab method), or null. */
function rayBox(o: V3, d: V3, lo: V3, hi: V3): number | null {
  let tmin = 0, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return null; continue; }
    let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i]; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  return tmin;
}
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** The first thing a bullet meets within `range`: a standing person, a building, or nothing. */
export function castRay(origin: V3, dir: V3, range: number, targets: Target[], walls: Wall[]): RayResult {
  const d = norm(dir); let best: RayResult = { kind: 'none', distance: range, point: [origin[0] + d[0] * range, origin[1] + d[1] * range, origin[2] + d[2] * range] };
  const at = (t: number): V3 => [origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t];
  for (const w of walls) {
    if (Math.hypot(w.x - origin[0], w.z - origin[2]) > range + w.w + w.d) continue;
    const t = rayBox(origin, d, [w.x - w.w / 2, GROUND_Y, w.z - w.d / 2], [w.x + w.w / 2, GROUND_Y + w.h, w.z + w.d / 2]);
    if (t !== null && t < best.distance) best = { kind: 'wall', distance: t, point: at(t) };
  }
  for (const tg of targets) {
    if (tg.downed || tg.hp <= 0) continue;
    const th = raySphere(origin, d, [tg.x, GROUND_Y + HEAD.y, tg.z], HEAD.r), tb = raySphere(origin, d, [tg.x, GROUND_Y + BODY.y, tg.z], BODY.r);
    const t = th !== null && (tb === null || th <= tb + 0.3) ? th : tb; if (t === null || t >= best.distance) continue;
    best = { kind: 'target', distance: t, point: at(t), id: tg.id, head: th !== null && t === th };
  }
  return best;
}

/** Aim assist: nudges the aim direction towards a target that is nearly on the ray (within `cone` radians), so thumbs on a phone can hit. */
export function assistAim(origin: V3, dir: V3, targets: Target[], range: number, cone = 0.07): V3 {
  const d = norm(dir); let best: V3 | null = null, bestAng = cone;
  for (const t of targets) {
    if (t.downed || t.hp <= 0) continue;
    const c: V3 = [t.x - origin[0], GROUND_Y + 1.2 - origin[1], t.z - origin[2]], dist = Math.hypot(...c); if (dist > range || dist < 0.5) continue;
    const u = norm(c), ang = Math.acos(Math.min(1, Math.max(-1, u[0] * d[0] + u[1] * d[1] + u[2] * d[2])));
    if (ang < bestAng) { bestAng = ang; best = u; }
  }
  return best ?? d;
}

export interface ShotOutcome { ray: RayResult; hit: boolean; damage: number; killed: boolean; noise: number; cooldownMs: number }
/** One trigger pull: casts the ray, then applies the weapon's hit chance (it falls with distance) and damage (headshots double). */
export function shoot(weapon: WeaponId, origin: V3, dir: V3, targets: Target[], walls: Wall[], rnd: () => number = Math.random): ShotOutcome {
  const w = WEAPONS[weapon], ray = castRay(origin, dir, w.range, targets, walls);
  const ev = fire(weapon, ray.kind === 'target' ? ray.distance : w.range + 1, rnd, 1);
  if (ev.type !== 'shot') return { ray, hit: false, damage: 0, killed: false, noise: w.noise, cooldownMs: w.cooldownMs };
  const hit = ray.kind === 'target' && ev.hit, damage = hit ? Math.round(ev.damage * (ray.head ? 2 : 1)) : 0;
  const tg = hit ? targets.find((t) => t.id === ray.id) : undefined;
  return { ray, hit, damage, killed: !!tg && tg.hp - damage <= 0, noise: ev.noise, cooldownMs: ev.cooldownMs };
}

// ---- ammo
export const newClip = (weapon: WeaponId, spareClips = 2): Clip => ({ loaded: WEAPONS[weapon].ammoPerClip, reserve: WEAPONS[weapon].ammoPerClip * spareClips });
export const canFire = (c: Clip) => c.loaded > 0;
export function reload(weapon: WeaponId, c: Clip): Clip { const need = WEAPONS[weapon].ammoPerClip - c.loaded, take = Math.min(need, c.reserve); return take <= 0 ? c : { loaded: c.loaded + take, reserve: c.reserve - take }; }
export const spend = (c: Clip): Clip => ({ ...c, loaded: Math.max(0, c.loaded - 1) });

// ---- law
/** 0 to 3 stars from the weapon heat plus how recently a civilian was hurt. */
export function stars(heat: number, civilianHarmed: boolean): 0 | 1 | 2 | 3 {
  const s = heat >= 70 ? 3 : heat >= 40 ? 2 : heat >= 15 ? 1 : 0;
  return Math.min(3, Math.max(s, civilianHarmed ? 2 : 0)) as 0 | 1 | 2 | 3;
}
/** How many officers chase at a given number of stars. */
export const officersFor = (s: number) => (s <= 0 ? 0 : s === 1 ? 1 : s === 2 ? 2 : 4);
/** Sentence in minutes for being caught after shooting in public, harsher with more stars. */
/** Every arrest is the same short sentence (5 minutes); a sleep on the bunk cuts it. */
export const sentenceFor = (_stars: number) => CRIME.sentenceBaseMinutes;
