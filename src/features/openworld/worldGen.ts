/**
 * The open-world city, generated from a seed (pure maths, no three.js, so it can be tested).
 * A grid of blocks separated by roads. Every landmark of the state gets its own block with a bigger building;
 * the rest of the blocks are filled with houses and towers. Rects are axis-aligned and double as collision boxes.
 */
import { LANDMARKS } from '@/content/lagos/landmarks';

export const BLOCK = 40, ROAD = 12, PITCH = BLOCK + ROAD, GRID = 9;
export const EXTENT = (GRID * PITCH) / 2; // half the city's width
export interface Rect { x: number; z: number; w: number; d: number }
export interface Building extends Rect { h: number; color: string; roof: string; landmark?: string }
export interface LandmarkSpot { id: string; name: string; tagline: string; icon: string; category: string; x: number; z: number; bi: number; bj: number }
export interface City { buildings: Building[]; landmarks: LandmarkSpot[]; trees: { x: number; z: number; s: number }[]; blockCentres: { x: number; z: number; landmark: boolean }[]; spawn: { x: number; z: number } }

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
    landmarks.push({ id: l.id, name: l.name, tagline: l.tagline, icon: l.icon, category: l.category, x: blockCentre(bi), z: blockCentre(bj), bi, bj });
  }
  const buildings: Building[] = [], trees: City['trees'] = [], blockCentres: City['blockCentres'] = [];
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const cx = blockCentre(i), cz = blockCentre(j), lm = landmarks.find((l) => l.bi === i && l.bj === j);
    blockCentres.push({ x: cx, z: cz, landmark: !!lm });
    if (lm) {
      const big = lm.category === 'park' || lm.category === 'beach';
      buildings.push({ x: cx, z: cz, w: big ? 14 : 26, d: big ? 14 : 24, h: big ? 5 : 16 + rand() * 18, color: CATEGORY_COLOURS[lm.category] ?? '#E8DCC4', roof: '#2B2F36', landmark: lm.id });
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
  for (let n = 0; n < 160; n++) { const i = Math.floor(rand() * GRID), j = Math.floor(rand() * GRID), side = rand() < 0.5; const edge = (rand() < 0.5 ? -1 : 1) * (BLOCK / 2 + 0.8); trees.push({ x: blockCentre(i) + (side ? edge : (rand() - 0.5) * BLOCK), z: blockCentre(j) + (side ? (rand() - 0.5) * BLOCK : edge), s: 0.8 + rand() * 0.6 }); }
  return { buildings, landmarks, trees, blockCentres, spawn: { x: PITCH / 2, z: PITCH / 2 } };
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
