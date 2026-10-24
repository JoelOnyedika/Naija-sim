import { PETS } from '@/data/balance';
import { findPath, isFree, nearestFree, type NavGrid, type Pt } from './navigation';

/**
 * Pet behaviour: a small state machine with no React and no stores, so it runs in tests. It reuses the avatar's navigation grid
 * (walls, door gaps, solid furniture), so pets cannot walk through walls or furniture and use doors like the player does.
 * The brain only decides WHERE and WHEN; the scene (three/property/Pets.tsx) draws it.
 */
export type PetSpecies = 'cat' | 'dog' | 'lion';
/** Anything the brain can drive: the pets and the people (NPCs) in public interiors. */
export type BrainKind = PetSpecies | 'npc';
export type PetMode = 'idle' | 'walk' | 'play' | 'hop';

export interface SpeciesCfg {
  speed: number;       // m/s
  turnRate: number;    // rad/s
  playChance: number;  // chance to go for a ball when it picks a new activity
  wanderRadius: number;
  hopHeight: number;
  idleSeconds: [number, number];
  /** Chance to hop when choosing what to do next. */
  hopChance: number;
}
export const SPECIES: Record<BrainKind, SpeciesCfg> = {
  npc: { speed: 0.95, turnRate: 6, playChance: 0, wanderRadius: 5, hopHeight: 0, idleSeconds: [2, 7], hopChance: 0 },
  cat: { speed: 0.9, turnRate: 6, playChance: 0.55, wanderRadius: 3.5, hopHeight: 0.32, idleSeconds: [2, 6], hopChance: 0.15 },
  dog: { speed: 1.25, turnRate: 5, playChance: 0.8, wanderRadius: 4.5, hopHeight: 0.22, idleSeconds: [1.5, 4], hopChance: 0.15 },
  lion: { speed: 0.75, turnRate: 3, playChance: 0.4, wanderRadius: 4, hopHeight: 0.15, idleSeconds: [3, 8], hopChance: 0.15 },
};

export interface PetBrain {
  x: number; z: number; yaw: number; mode: PetMode;
  /** Seconds left in the current idle/play, or hop progress 0..1. */
  t: number;
  path: Pt[];
  goingToBall: boolean;
  /** Seconds until the pet may play with a ball again. */
  cooldown: number;
  /** Height above the floor this frame (hops). */
  y: number;
}

export const initBrain = (x: number, z: number, rnd: () => number = Math.random): PetBrain =>
  ({ x, z, yaw: rnd() * Math.PI * 2, mode: 'idle', t: 1 + rnd() * 2, path: [], goingToBall: false, cooldown: 0, y: 0 });

const between = ([lo, hi]: [number, number], rnd: () => number) => lo + (hi - lo) * rnd();
const angleDiff = (a: number, b: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

function turnToward(b: PetBrain, yaw: number, rate: number, dt: number): number {
  const d = angleDiff(b.yaw, yaw), step = Math.min(Math.abs(d), rate * dt) * Math.sign(d);
  b.yaw += step;
  return Math.abs(d - step);
}

export interface StepCtx { grid: NavGrid; ball: Pt | null; rnd?: () => number; /** Reject wander targets (keep people from crowding each other or the player). */ avoid?: (p: Pt) => boolean }
export interface StepResult { kickBallTo?: Pt }

/** Advance one pet by dt seconds. Returns a ball position when the pet just batted the ball somewhere. */
export function stepPet(b: PetBrain, species: BrainKind, dt: number, ctx: StepCtx): StepResult {
  const cfg = SPECIES[species], rnd = ctx.rnd ?? Math.random;
  dt = Math.min(dt, 0.1);
  b.cooldown = Math.max(0, b.cooldown - dt);
  // Furniture placed on top of the pet: step out to the nearest free spot instead of standing inside it.
  if (!isFree(ctx.grid, b)) { const p = nearestFree(ctx.grid, b); if (p) { b.x = p.x; b.z = p.z; b.path = []; b.mode = 'idle'; b.t = 0.5; } }
  b.y = 0;

  if (b.mode === 'hop') {
    b.t += dt / 0.55;
    b.y = Math.sin(Math.min(1, b.t) * Math.PI) * cfg.hopHeight;
    if (b.t >= 1) { b.mode = 'idle'; b.t = between(cfg.idleSeconds, rnd); b.y = 0; }
    return {};
  }

  if (b.mode === 'idle') {
    b.t -= dt;
    if (b.t > 0) return {};
    // choose the next thing to do
    if (ctx.ball && b.cooldown <= 0 && rnd() < cfg.playChance) {
      const spot = nearestFree(ctx.grid, ctx.ball, 4);
      const path = spot ? findPath(ctx.grid, b, spot) : null;
      if (path && path.length) { b.path = path; b.mode = 'walk'; b.goingToBall = true; return {}; }
    }
    const r = rnd();
    if (r < cfg.hopChance) { b.mode = 'hop'; b.t = 0; return {}; }
    if (r < 0.8) {
      for (let i = 0; i < 6; i++) {
        const a = rnd() * Math.PI * 2, d = 0.8 + rnd() * cfg.wanderRadius;
        const to = { x: b.x + Math.cos(a) * d, z: b.z + Math.sin(a) * d };
        if (!isFree(ctx.grid, to) || ctx.avoid?.(to)) continue;
        const path = findPath(ctx.grid, b, to);
        if (path && path.length) { b.path = path; b.mode = 'walk'; b.goingToBall = false; return {}; }
      }
    }
    b.t = between(cfg.idleSeconds, rnd);
    return {};
  }

  if (b.mode === 'walk') {
    const next = b.path[0];
    if (!next) { arrive(b, cfg, ctx, rnd); return {}; }
    const dx = next.x - b.x, dz = next.z - b.z, dist = Math.hypot(dx, dz);
    // turn first, then walk: pets pivot on the spot instead of sliding sideways
    const left = turnToward(b, Math.atan2(dx, dz), cfg.turnRate, dt);
    if (left < 0.5) {
      const step = cfg.speed * dt;
      // Land exactly on each waypoint (never a little short of it): the path was cleared as straight lines between its
      // points, so cutting off a bit before a corner can clip the neighbouring blocked cell.
      if (dist <= step) { b.x = next.x; b.z = next.z; b.path.shift(); }
      else {
        const nx = b.x + (dx / dist) * step, nz = b.z + (dz / dist) * step;
        // The path's straight lines are checked every half cell, so one can still graze the corner of a blocked cell.
        // Never step into one: slide along it, or give up this walk and pick something else.
        if (isFree(ctx.grid, { x: nx, z: nz })) { b.x = nx; b.z = nz; }
        else if (isFree(ctx.grid, { x: nx, z: b.z })) b.x = nx;
        else if (isFree(ctx.grid, { x: b.x, z: nz })) b.z = nz;
        else { b.path = []; b.goingToBall = false; b.mode = 'idle'; b.t = 0.3; }
      }
    }
    return {};
  }

  // play: face the ball, hop a few times, then bat it a short way off
  b.t -= dt;
  if (ctx.ball) turnToward(b, Math.atan2(ctx.ball.x - b.x, ctx.ball.z - b.z), cfg.turnRate, dt);
  b.y = Math.abs(Math.sin(b.t * 6)) * cfg.hopHeight * 0.7;
  if (b.t > 0) return {};
  b.mode = 'idle'; b.t = between(cfg.idleSeconds, rnd); b.y = 0; b.cooldown = PETS.playCooldown;
  if (!ctx.ball) return {};
  for (let i = 0; i < 8; i++) {
    const a = rnd() * Math.PI * 2, d = 0.6 + rnd() * 0.9;
    const to = { x: ctx.ball.x + Math.cos(a) * d, z: ctx.ball.z + Math.sin(a) * d };
    if (isFree(ctx.grid, to)) return { kickBallTo: to };
  }
  return {};
}

function arrive(b: PetBrain, cfg: SpeciesCfg, ctx: StepCtx, rnd: () => number) {
  if (b.goingToBall && ctx.ball && Math.hypot(ctx.ball.x - b.x, ctx.ball.z - b.z) < 0.9) { b.mode = 'play'; b.t = 2.4; }
  else { b.mode = 'idle'; b.t = between(cfg.idleSeconds, rnd); }
  b.goingToBall = false;
}
