import type { Pt } from './navigation';

/**
 * Cinematic shot framing (pure maths, no React). One reusable set of shots for every scripted scene: the interaction system
 * (game/interact.ts) asks for a shot by kind and the camera rig (three/property/CameraRig.tsx) flies to it and back.
 * Positions are world metres; y is up. `fov` is in degrees (the scene camera is 38 by default).
 */
export interface Shot { kind: ShotKind; pos: [number, number, number]; look: [number, number, number]; fov: number }
export type ShotKind = 'establishing' | 'two' | 'group' | 'closeup' | 'wide';
export interface Bounds { x0: number; z0: number; x1: number; z1: number }

const EYE = 1.55, CHEST = 1.25;
/** The camera never goes further than this from the middle of a scene (keeps it inside clearings and rooms, away from trees and walls). */
const MAX_DIST = 8.5;
const mid = (pts: Pt[]): Pt => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, z: pts.reduce((s, p) => s + p.z, 0) / pts.length });
const radiusOf = (pts: Pt[], c: Pt) => Math.max(0.5, ...pts.map((p) => Math.hypot(p.x - c.x, p.z - c.z)));
/** Distance at which a circle of `radius` metres fits the vertical field of view with a margin (aspect makes portrait screens pull back). */
export const fitDistance = (radius: number, fov = 38, aspect = 1) => (radius * 1.25) / Math.tan((fov * Math.PI) / 360) / Math.min(1, aspect * 1.2);

/** Keeps a camera position inside the venue (plus a margin) so a shot never ends up behind a wall or in the street. */
export function clampToBounds(p: [number, number, number], b: Bounds, margin = 1.2): [number, number, number] {
  return [Math.min(b.x1 + margin, Math.max(b.x0 - margin, p[0])), p[1], Math.min(b.z1 + margin, Math.max(b.z0 - margin, p[2]))];
}

/** A wide, elevated look at the whole scene: the establishing shot that opens a scene. `from` is the side to view from (radians off +z). */
export function establishing(centre: Pt, span: number, from = 0.62, aspect = 1): Shot {
  const d = fitDistance(span / 2, 38, aspect) * 0.9, a = from;
  return { kind: 'establishing', pos: [centre.x + Math.sin(a) * d, 4.2 + span * 0.16, centre.z + Math.cos(a) * d], look: [centre.x, 0.9, centre.z], fov: 38 };
}

/** Two people talking: the camera stands a little behind and to the side of one of them, at about eye height, looking at the pair. */
export function twoShot(a: Pt, b: Pt, side: 1 | -1 = 1, aspect = 1, behind?: Pt): Shot {
  const c = mid([a, b]);
  if (behind) { // pick the side that keeps `behind` (a fire, a wall) in the background rather than in front of the lens
    const s1 = twoShot(a, b, 1, aspect), s2 = twoShot(a, b, -1, aspect), dd = (s: Shot) => Math.hypot(s.pos[0] - behind.x, s.pos[2] - behind.z);
    return dd(s1) >= dd(s2) ? s1 : s2;
  }
  const sep = Math.max(0.8, Math.hypot(a.x - b.x, a.z - b.z)), ang = Math.atan2(b.x - a.x, b.z - a.z);
  const perp = ang + (Math.PI / 2) * side, d = Math.min(MAX_DIST, Math.max(3.4, fitDistance(sep / 2 + 0.6, 34, aspect) * 0.9));
  return { kind: 'two', pos: [c.x + Math.sin(perp) * d, EYE + 0.45 + d * 0.22, c.z + Math.cos(perp) * d], look: [c.x, CHEST - 0.05, c.z], fov: 34 };
}

/** A group: frames everyone with a slightly elevated camera on the open side (`awayFrom` = a point the camera should be on the far side of, usually the venue wall). */
export function groupShot(pts: Pt[], awayFrom?: Pt, aspect = 1): Shot {
  const c = mid(pts), r = radiusOf(pts, c) + 0.5;
  let a = 0.62; if (awayFrom) a = Math.atan2(c.x - awayFrom.x, c.z - awayFrom.z);
  const d = Math.min(MAX_DIST + 1, Math.max(3.2, fitDistance(r, 38, aspect) * 0.95));
  return { kind: 'group', pos: [c.x + Math.sin(a) * d, 3.0 + r * 0.5 + d * 0.2, c.z + Math.cos(a) * d], look: [c.x, 0.95, c.z], fov: 38 };
}

/** Close framing on one person for important lines. `toward` is the direction the camera comes from (usually the listener). */
export function closeUp(p: Pt, toward: Pt, aspect = 1): Shot {
  const ang = Math.atan2(toward.x - p.x, toward.z - p.z), d = 1.55 / Math.min(1, aspect * 1.1);
  const off = 0.35; // slightly off-axis so it does not look like a passport photo
  return { kind: 'closeup', pos: [p.x + Math.sin(ang + off) * d, EYE + 0.05, p.z + Math.cos(ang + off) * d], look: [p.x, EYE - 0.06, p.z], fov: 30 };
}

/** The shot for a set of participants: one person = close-up, two = two-shot, more = group. */
export function shotFor(pts: Pt[], speaker?: Pt, listener?: Pt, aspect = 1): Shot {
  if (pts.length <= 1) return closeUp(pts[0] ?? { x: 0, z: 0 }, listener ?? { x: 0, z: 1 }, aspect);
  if (pts.length === 2) return twoShot(pts[0], pts[1], 1, aspect);
  void speaker; return groupShot(pts, listener, aspect);
}

/** Camera and subject must never be inside each other or too far: sanity check used by tests. */
export const shotDistance = (s: Shot) => Math.hypot(s.pos[0] - s.look[0], s.pos[1] - s.look[1], s.pos[2] - s.look[2]);
