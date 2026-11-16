import type { WeaponId } from '@/data/weapons';
import type { Clip, V3 } from './shooting';

/** A person in the street who can be shot at. Written by the pedestrian, hurt by the player, read by both. */
export interface Crowd { id: string; x: number; z: number; hp: number; downed: boolean; hitAt: number; scaredAt: number }
/** Everything the shooting system shares between the 3D scene (which runs it) and the screen (which shows it). A plain object, not React state. */
export interface Combat {
  weapon: WeaponId | null; drawn: boolean; clip: Clip;
  nextShot: number; reloadingUntil: number; reloadReq: boolean; fireTap: boolean; firing: boolean; aimUntil: number;
  crowd: Map<string, Crowd>;
  tracers: { a: V3; b: V3; born: number }[]; puffs: { p: V3; born: number; hit: boolean }[]; muzzleAt: number; muzzle: V3;
  lastCrime: number; harmedUntil: number; stars: number; arrested: boolean; hitMarkerAt: number;
  msg: { text: string; until: number } | null; shots: number; hits: number; downs: number; sentence: number;
}
export const makeCombat = (): Combat => ({
  weapon: null, drawn: false, clip: { loaded: 0, reserve: 0 }, nextShot: 0, reloadingUntil: 0, reloadReq: false, fireTap: false, firing: false, aimUntil: 0,
  crowd: new Map(), tracers: [], puffs: [], muzzleAt: 0, muzzle: [0, 0, 0], lastCrime: 0, harmedUntil: 0, stars: 0, arrested: false, hitMarkerAt: 0, msg: null, shots: 0, hits: 0, downs: 0, sentence: 0,
});
export const say = (c: Combat, text: string, ms = 2600) => { c.msg = { text, until: performance.now() + ms }; };
