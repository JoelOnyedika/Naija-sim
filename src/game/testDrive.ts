import type { VehicleDef } from '@/data/vehicles';

/**
 * The Polanco Motors test drive: a short arcade run down a test track. Steer between three lanes, avoid what is on the road, then brake
 * to a stop inside the marked zone at the end. Pure maths (no React) so it can be tested; features/game/TestDrive.tsx draws it.
 * Nothing here costs or pays naira. Speeds are in metres per second; the screen shows km/h scaled to the car's real top speed.
 */
export interface CarSpec { topKmh: number; /** seconds to reach full test-track speed from a standstill */ launch: number; /** steering quickness */ grip: number; /** braking strength */ brakes: number }
const SPECS: Record<string, CarSpec> = {
  audi: { topKmh: 320, launch: 6.5, grip: 1.0, brakes: 1.0 }, dodge: { topKmh: 280, launch: 7.2, grip: 0.9, brakes: 0.95 }, tesla: { topKmh: 400, launch: 4.8, grip: 1.05, brakes: 1.0 },
  gtr: { topKmh: 315, launch: 5.6, grip: 1.1, brakes: 1.1 }, supercar: { topKmh: 325, launch: 5.2, grip: 1.15, brakes: 1.1 }, agera: { topKmh: 410, launch: 4.4, grip: 1.2, brakes: 1.2 },
};
export const specFor = (v: Pick<VehicleDef, 'id' | 'type'>): CarSpec => SPECS[v.id] ?? { topKmh: v.type === 'keke' ? 55 : 200, launch: 8, grip: 0.9, brakes: 0.9 };
/** Test-track top speed in m/s: faster cars are faster, but the track stays playable. */
export const trackTop = (s: CarSpec): number => Math.max(34, Math.min(80, 55 + ((s.topKmh - 280) / 130) * 25));
export const kmh = (v: number, s: CarSpec): number => Math.round((v / trackTop(s)) * s.topKmh);

export const TRACK = { roadHalf: 4.5, laneX: [-3, 0, 3], finish: 1100, zoneEnd: 1190, length: 1190 };
export type ObstacleKind = 'cone' | 'danfo' | 'goat' | 'pothole' | 'drum';
export interface Obstacle { z: number; x: number; w: number; len: number; kind: ObstacleKind; /** a pothole only jolts you; the rest are crashes */ soft: boolean }
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/** The obstacles on the road: one to two at a time, never blocking all three lanes. Same seed, same road. */
export function makeCourse(seed = 1): Obstacle[] {
  const r = rng(seed * 7919 + 13), out: Obstacle[] = [], kinds: ObstacleKind[] = ['cone', 'danfo', 'goat', 'pothole', 'drum'];
  for (let z = 130; z < TRACK.finish - 60; z += 85 + r() * 45) {
    const n = r() < 0.4 ? 2 : 1, lanes = [0, 1, 2].sort(() => r() - 0.5).slice(0, n);
    for (const l of lanes) {
      const kind = kinds[Math.floor(r() * kinds.length)];
      out.push({ z: z + r() * 6, x: TRACK.laneX[l] + (r() - 0.5) * 0.8, w: kind === 'danfo' ? 2.6 : kind === 'pothole' ? 1.8 : 1.3, len: kind === 'danfo' ? 7 : 1.6, kind, soft: kind === 'pothole' });
    }
  }
  return out;
}

export interface DriveState { z: number; x: number; v: number; t: number; hits: number; jolts: number; inv: number; topV: number; phase: 'run' | 'done'; stopped: boolean; crashedBarrier: boolean; braking: boolean }
export const freshDrive = (): DriveState => ({ z: 0, x: 0, v: 0, t: 0, hits: 0, jolts: 0, inv: 0, topV: 0, phase: 'run', stopped: false, crashedBarrier: false, braking: false });
export interface DriveInput { steer: number; gas: number; brake: number }
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Advance the run by `dt` seconds. Mutates and returns `s`. */
export function stepDrive(s: DriveState, inp: DriveInput, dt: number, spec: CarSpec, course: Obstacle[]): DriveState {
  if (s.phase === 'done') return s;
  const top = trackTop(spec), gas = clamp(inp.gas, 0, 1), brake = clamp(inp.brake, 0, 1), steer = clamp(inp.steer, -1, 1);
  const off = Math.abs(s.x) > TRACK.roadHalf - 0.3;
  let a = gas * (top / spec.launch) * (1 - Math.pow(s.v / top, 2)) - brake * 34 * spec.brakes - 0.3 - 0.0002 * s.v * s.v - (off ? 9 : 0);
  if (s.v <= 0 && a < 0) a = 0;
  s.v = clamp(s.v + a * dt, 0, top); s.braking = brake > 0.2 && s.v > 0.5;
  s.x = clamp(s.x + steer * (3.2 + Math.min(s.v, 40) * 0.12) * spec.grip * dt, -TRACK.roadHalf, TRACK.roadHalf);
  s.z += s.v * dt; s.t += dt; s.topV = Math.max(s.topV, s.v); s.inv = Math.max(0, s.inv - dt);
  if (s.inv <= 0) for (const o of course) {
    if (Math.abs(s.z - o.z) < o.len / 2 + 1.2 && Math.abs(s.x - o.x) < o.w / 2 + 0.85) {
      if (o.soft) { s.jolts++; s.v *= 0.8; s.inv = 0.6; } else { s.hits++; s.v *= 0.4; s.inv = 1.2; }
      break;
    }
  }
  if (s.z >= TRACK.length) { s.z = TRACK.length; if (s.v > 6) { s.hits++; s.crashedBarrier = true; } s.v = 0; }
  if (s.z >= TRACK.finish && s.v < 0.3) { s.v = 0; s.stopped = !s.crashedBarrier; s.phase = 'done'; }
  if (s.crashedBarrier) s.phase = 'done';
  return s;
}

export interface DriveResult { grade: 'S' | 'A' | 'B' | 'C'; hits: number; jolts: number; seconds: number; topKmh: number; stoppedInZone: boolean; brakeMetres: number; line: string }
export function gradeDrive(s: DriveState, spec: CarSpec): DriveResult {
  const top = trackTop(spec), avg = s.z / Math.max(1, s.t), fast = avg >= top * 0.55, stopped = s.stopped;
  const grade = s.hits === 0 && stopped && fast ? 'S' : s.hits <= 1 && stopped ? 'A' : s.hits <= 3 ? 'B' : 'C';
  const line = { S: 'Clean, fast and a perfect stop. The salesman is sweating.', A: 'Smooth. You could buy this car today.', B: 'A few scratches, but the car forgave you.', C: 'The salesman asks if you have a licence.' }[grade];
  return { grade, hits: s.hits, jolts: s.jolts, seconds: Math.round(s.t * 10) / 10, topKmh: kmh(s.topV, spec), stoppedInZone: stopped, brakeMetres: Math.max(0, Math.round(s.z - TRACK.finish)), line };
}
