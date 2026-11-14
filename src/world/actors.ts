import type { ActionKind } from '@/three/avatar/Avatar';
import type { NavGrid, Pt } from './navigation';

/**
 * The control layer for scripted people. Anything that wants a character to do something (walk, stand and face someone, sit, play a
 * pose) writes a Directive here by id; the actor component (three/property/StoryActors.tsx) reads it every frame, and the player's walker
 * reads `playerDirective`. Nothing here depends on React, so the rules can be tested. Directives are cleared when a scene ends.
 */
export interface Directive {
  /** Walk here (the actor plans a route on the venue's navigation grid). */
  goal?: Pt | null; speed?: number;
  /** When idle: face this yaw, or keep facing this point. */
  yaw?: number | null; face?: Pt | null;
  pose?: 'stand' | 'sit'; /** height offset while sitting (bench seat minus the sit offset) */ seatY?: number;
  action?: ActionKind;
  /** Jump straight to `goal` (used when a scene would otherwise wait forever for someone stuck). */
  snap?: boolean;
}
export interface ActorRuntime { x: number; z: number; yaw: number; moving: boolean; arrived: boolean; pose: 'stand' | 'sit' }

export const directives = new Map<string, Directive>();
/** Written by the actor components every frame: where each person really is and whether they have arrived. */
export const runtime = new Map<string, ActorRuntime>();
export const direct = (id: string, d: Directive) => { directives.set(id, { ...(directives.get(id) ?? {}), ...d }); };
export const release = (id: string) => { directives.delete(id); };
export const releaseAll = () => { directives.clear(); };

/** What the player's avatar should do while a scene holds it (it still walks by its own planner; this only adds facing, pose and hands). */
export interface PlayerDirective { face: Pt | null; yaw: number | null; action?: ActionKind; /** true while a scene owns the player's idle pose */ hold: boolean; /** a pose chosen by the player (a test in the initiation) stays until the scene ends */ lock: boolean }
export const playerDirective: PlayerDirective = { face: null, yaw: null, action: undefined, hold: false, lock: false };
export const clearPlayerDirective = () => { playerDirective.face = null; playerDirective.yaw = null; playerDirective.action = undefined; playerDirective.hold = false; playerDirective.lock = false; };

/** Yaw (radians, as used by the avatars) that looks from `a` toward `b`. */
export const yawTo = (a: Pt, b: Pt) => Math.atan2(b.x - a.x, b.z - a.z);
/** One step of straight-line walking (used by tests and as the fallback when no route exists). Returns the new point. */
export function stepToward(p: Pt, t: Pt, speed: number, dt: number): { p: Pt; arrived: boolean } {
  const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.04) return { p: { x: t.x, z: t.z }, arrived: true };
  const s = Math.min(d, speed * dt); return { p: { x: p.x + (dx / d) * s, z: p.z + (dz / d) * s }, arrived: s >= d };
}

/** The current venue's navigation grid, published by the scene so scripts (arrangements, spawns) can ask "is this spot free?". */
export const nav: { grid: NavGrid | null } = { grid: null };
