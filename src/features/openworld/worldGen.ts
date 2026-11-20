/**
 * The open-world city, generated from a seed (pure maths, no three.js, so it can be tested).
 * A grid of blocks separated by roads. Every landmark of the state gets its own block with a bigger building;
 * the rest of the blocks are filled with houses and towers. Rects are axis-aligned and double as collision boxes.
 */
import { LANDMARKS } from '@/content/lagos/landmarks';

export const BLOCK = 40, ROAD = 12, PITCH = BLOCK + ROAD, GRID = 15;
export const EXTENT = (GRID * PITCH) / 2; // half the city's width
export interface Rect { x: number; z: number; w: number; d: number }
export interface Building extends Rect { h: number; color: string; roof: string; landmark?: string }
export interface LandmarkSpot { id: string; name: string; tagline: string; icon: string; category: string; x: number; z: number; bi: number; bj: number; doorX: number; doorZ: number }
/** A street moment waiting on the pavement: walk up to the person and they stop you (an event from data/streetEvents.ts). */
export interface Moment { id: string; eventId: string; x: number; z: number; rot: number }
/** The street events that make sense outdoors. */
export const STREET_MOMENT_IDS = ['pure_water', 'suya_boy', 'puff_puff', 'agbero_levy', 'lost_phone', 'excess_change', 'thief', 'checkpoint', 'coconut', 'free_tasting'];
export interface City { moments: Moment[]; buildings: Building[]; landmarks: LandmarkSpot[]; trees: { x: number; z: number; s: number }[]; blockCentres: { x: number; z: number; landmark: boolean }[]; spawn: { x: number; z: number } }

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PAINTS = ['#E8DCC4', '#D9C7A3', '#C9B79C', '#E5B99B', '#B9C6A4', '#9DB8C7', '#D9D2C5', '#C8A08A', '#E9E4DA', '#A9B4B8'];
const ROOFS = ['#7A5C48', '#4F5B62', '#8A4B2A', '#5E6B5A'];
const CATEGORY_COLOURS: Record<string, string> = { culture: '#E9E4DA', business: '#6FA8DC', club: '#8A63D2', market: '#E4572E', park: '#3E9B5A', government: '#C9B79C', transport: '#9DB8C7', food: '#FFC21A', beach: '#F1C9A5', bank: '#2B4C7E', tech: '#19C3A6', shopping: '#FF4D6D', entertainment: '#C23B3B', recreation: '#7FE3B0' };

/** Block index (0..GRID-1) to the world position of the block's centre. */
export const blockCentre = (i: number) => (i - (GRID - 1) / 2) * PITCH;

export function generateCity(seed = 2026): City {
  const rand = rng(seed);
  const taken = new Set<string>();
  const key = (i: number, j: number) => `${i},${j}`;
  const landmarks: LandmarkSpot[] = [];
  const SCALE = 7;
  for (const l of LANDMARKS) {
    let bi = Math.min(GRID - 1, Math.max(0, Math.round(l.position[0] * SCALE / PITCH + (GRID - 1) / 2)));
    let bj = Math.min(GRID - 1, Math.max(0, Math.round(l.position[1] * SCALE / PITCH + (GRID - 1) / 2)));
    // a block can hold one landmark: spiral outwards to the nearest free block
    for (let r = 0; taken.has(key(bi, bj)) && r < GRID; r++) {
      let found = false;
      for (let di = -r; di <= r && !found; di++) for (let dj = -r; dj <= r && !found; dj++) {
        const ni = bi + di, nj = bj + dj;
        if (Math.max(Math.abs(di), Math.abs(dj)) === r && ni >= 0 && nj >= 0 && ni < GRID && nj < GRID && !taken.has(key(ni, nj))) { bi = ni; bj = nj; found = true; }
      }
      if (found) break;
    }
    if (taken.has(key(bi, bj))) continue; // more landmarks than blocks (not the case today)
    taken.add(key(bi, bj));
    landmarks.push({ id: l.id, name: l.name, tagline: l.tagline, icon: l.icon, category: l.category, x: blockCentre(bi), z: blockCentre(bj), bi, bj, doorX: blockCentre(bi), doorZ: blockCentre(bj) });
  }
  const buildings: Building[] = [], trees: City['trees'] = [], blockCentres: City['blockCentres'] = [];
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const cx = blockCentre(i), cz = blockCentre(j), lm = landmarks.find((l) => l.bi === i && l.bj === j);
    blockCentres.push({ x: cx, z: cz, landmark: !!lm });
    if (lm) {
      const big = lm.category === 'park' || lm.category === 'beach';
      const bd = big ? 14 : 24; lm.doorZ = cz + bd / 2 + 2.2; // the door is on the south face, the doorstep two metres out
      buildings.push({ x: cx, z: cz, w: big ? 14 : 26, d: bd, h: big ? 5 : 16 + rand() * 18, color: CATEGORY_COLOURS[lm.category] ?? '#E8DCC4', roof: '#2B2F36', landmark: lm.id });
      for (let t = 0; t < 10; t++) { const a = rand() * Math.PI * 2, r = 15 + rand() * 4; trees.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, s: 0.9 + rand() * 0.6 }); }
      continue;
    }
    const centre = 1 - Math.hypot(i - (GRID - 1) / 2, j - (GRID - 1) / 2) / (GRID * 0.7); // taller towards the middle
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      if (rand() < 0.12) { trees.push({ x: cx + ox * 9.5, z: cz + oz * 9.5, s: 1 + rand() * 0.7 }); continue; } // an empty lot with a tree
      const w = 11 + rand() * 6, d = 11 + rand() * 6, tall = rand() < 0.15 + centre * 0.4;
      buildings.push({ x: cx + ox * 9.5 + (rand() - 0.5) * 1.5, z: cz + oz * 9.5 + (rand() - 0.5) * 1.5, w, d, h: tall ? 14 + rand() * 24 * (0.4 + centre) : 4 + rand() * 6, color: PAINTS[Math.floor(rand() * PAINTS.length)], roof: ROOFS[Math.floor(rand() * ROOFS.length)] });
    }
  }
  // street trees along the pavements
  for (let n = 0; n < 700; n++) { const i = Math.floor(rand() * GRID), j = Math.floor(rand() * GRID), side = rand() < 0.5; const edge = (rand() < 0.5 ? -1 : 1) * (BLOCK / 2 + 0.8); trees.push({ x: blockCentre(i) + (side ? edge : (rand() - 0.5) * BLOCK), z: blockCentre(j) + (side ? (rand() - 0.5) * BLOCK : edge), s: 0.8 + rand() * 0.6 }); }
  // street moments: people on the pavements of ordinary blocks, spread over the whole city
  const moments: Moment[] = [], free = blockCentres.filter((b) => !b.landmark);
  for (let n = 0; n < 30; n++) { const b = free[Math.floor(rand() * free.length)], edge = Math.floor(rand() * 4), along = (rand() - 0.5) * 24, off = BLOCK / 2 - 1.2; const [mx, mz, rot] = edge === 0 ? [b.x + along, b.z - off, Math.PI] : edge === 1 ? [b.x + off, b.z + along, Math.PI / 2] : edge === 2 ? [b.x + along, b.z + off, 0] : [b.x - off, b.z + along, -Math.PI / 2]; moments.push({ id: `m${n}`, eventId: STREET_MOMENT_IDS[n % STREET_MOMENT_IDS.length], x: mx, z: mz, rot }); }
  return { moments, buildings, landmarks, trees, blockCentres, spawn: { x: PITCH / 2, z: PITCH / 2 } };
}

/**
 * Where the player steps out. From inside a venue: on that venue's doorstep, facing away from the door (the doors are on the south face, so the player
 * faces south and the camera yaw is behind them). Otherwise (at home, or a venue with no spot in this city) the city's default spawn.
 * `heading` is the way the body faces (0 = +z); `yaw` is the camera yaw that puts the camera behind the body (yaw = heading + PI).
 */
export function spawnFor(city: City, landmarkId?: string | null): { x: number; z: number; heading: number; yaw: number } {
  const l = landmarkId ? city.landmarks.find((x) => x.id === landmarkId) : undefined;
  if (l) return { x: l.doorX, z: l.doorZ + 1.5, heading: 0, yaw: Math.PI };
  return { x: city.spawn.x, z: city.spawn.z, heading: Math.PI, yaw: 0 };
}

/** Pushes a circle out of a box. Returns the corrected position. */
export function pushOut(px: number, pz: number, r: number, b: Rect): [number, number] {
  const hx = b.w / 2, hz = b.d / 2, dx = px - b.x, dz = pz - b.z;
  const cx = Math.max(-hx, Math.min(hx, dx)), cz = Math.max(-hz, Math.min(hz, dz));
  const ox = dx - cx, oz = dz - cz, d2 = ox * ox + oz * oz;
  if (d2 >= r * r) return [px, pz];
  if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; return [px + ox * k, pz + oz * k]; }
  // centre is inside the box: leave by the nearest face
  const gx = hx - Math.abs(dx), gz = hz - Math.abs(dz);
  return gx < gz ? [b.x + Math.sign(dx || 1) * (hx + r), pz] : [px, b.z + Math.sign(dz || 1) * (hz + r)];
}

/** Keeps the player in the city and out of the buildings. */
export function resolveMove(city: City, x: number, z: number, r = 0.5): [number, number] {
  let nx = Math.max(-EXTENT + 2, Math.min(EXTENT - 2, x)), nz = Math.max(-EXTENT + 2, Math.min(EXTENT - 2, z));
  for (const b of city.buildings) { if (Math.abs(nx - b.x) > b.w / 2 + r + 1 || Math.abs(nz - b.z) > b.d / 2 + r + 1) continue; [nx, nz] = pushOut(nx, nz, r, b); }
  return [nx, nz];
}

/** The nearest landmark within `range` metres, if any. */
export function nearestLandmark(city: City, x: number, z: number, range = 26): LandmarkSpot | null {
  let best: LandmarkSpot | null = null, bd = range;
  for (const l of city.landmarks) { const d = Math.hypot(l.x - x, l.z - z); if (d < bd) { bd = d; best = l; } }
  return best;
}

/** Height of the ground under (x, z): blocks (pavement and buildings) are raised 0.3, the roads between them are at 0. */
export const SLAB = 0.3;
export function groundY(x: number, z: number): number {
  const fx = ((x / PITCH + GRID / 2) % 1 + 1) % 1, fz = ((z / PITCH + GRID / 2) % 1 + 1) % 1, m = (BLOCK / 2) / PITCH, lo = 0.5 - m, hi = 0.5 + m;
  return Math.abs(x) < EXTENT && Math.abs(z) < EXTENT && fx > lo && fx < hi && fz > lo && fz < hi ? SLAB : 0;
}

/**
 * Where the player's own cars are parked: in a row along the kerb of the road next to the home spawn, clear of the junction.
 * `n` cars (at most 6), each with its position, the way it faces (heading, 0 = +z) and the slot index.
 */
export function ownedSpots(city: City, n: number): { x: number; z: number; heading: number }[] {
  const out: { x: number; z: number; heading: number }[] = [], z = city.spawn.z + 4.6;
  for (let k = 0; k < Math.min(6, n); k++) out.push({ x: city.spawn.x + 11 + k * 6.4, z, heading: Math.PI / 2 });
  return out;
}

/** Advances a driven car one step (arcade): throttle -1..1 (negative = reverse), steer -1..1 (positive = right), boost for the faster top speed. Pure, so it can be tested. */
export function driveStep(c: { x: number; z: number; heading: number; speed: number }, throttle: number, steer: number, boost: boolean, dt: number) {
  const top = boost ? 30 : 21, target = throttle > 0.05 ? throttle * top : throttle < -0.05 ? throttle * 7 : 0;
  c.speed += (target - c.speed) * (1 - Math.exp(-dt * (target === 0 ? 1.4 : 1.7)));
  const grip = Math.min(1, Math.abs(c.speed) / 5); // no turning on the spot
  c.heading -= steer * 1.7 * grip * Math.sign(c.speed || 1) * dt * (1 - Math.min(0.45, Math.abs(c.speed) / 70));
  c.x += Math.sin(c.heading) * c.speed * dt; c.z += Math.cos(c.heading) * c.speed * dt;
  return c;
}
