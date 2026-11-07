import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from 'three';

/**
 * The calm backdrop behind a home: a smooth sky gradient that follows the in-game clock (blue day, peach dusk, deep navy night
 * with a few quiet stars) and a soft glow behind the house. No pictures, no skyline: nothing to look noisy or random.
 * Textures are cached per rounded time of day, so the clock moving does not make a new one every frame.
 */
const cache = new Map<string, CanvasTexture>();
const mix = (a: string, b: string, t: number) => new Color(a).lerp(new Color(b), Math.max(0, Math.min(1, t)));

export function homeBackdrop(day: number, dusk: number): CanvasTexture {
  const d = Math.round(day * 16) / 16, k = Math.round(Math.max(0, dusk) * 8) / 8, key = `${d}|${k}`;
  const hit = cache.get(key); if (hit) return hit;
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const top = mix('#0A1424', '#6FA8DC', d).lerp(new Color('#5B4B7A'), k * 0.55);
  const mid = mix('#14233B', '#A9D0EC', d).lerp(new Color('#E9967A'), k * 0.6);
  const low = mix('#1E2F4A', '#E6F0F3', d).lerp(new Color('#F6C28B'), k * 0.7);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `#${top.getHexString()}`); grad.addColorStop(0.55, `#${mid.getHexString()}`); grad.addColorStop(1, `#${low.getHexString()}`);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // a soft pool of light behind the house so it reads as the centre of the scene
  const glow = g.createRadialGradient(W / 2, H * 0.52, 8, W / 2, H * 0.52, W * 0.8);
  glow.addColorStop(0, `rgba(255,255,255,${0.1 + d * 0.16})`); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // a few quiet stars once the sun is down (fixed positions, so they never jump)
  if (d < 0.55) {
    let s = 91; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(255,255,255,${(0.25 + r() * 0.5) * (1 - d / 0.55)})`; const x = r() * W, y = r() * H * 0.6, z = r() < 0.15 ? 1.6 : 1; g.fillRect(x, y, z, z); }
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false;
  cache.set(key, t); return t;
}

let shadowTex: CanvasTexture | null = null;
/** Soft round shadow under the ground disc, so the house floats on the backdrop instead of being cut out of it. */
export function islandShadow(): CanvasTexture {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 34, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.42)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  shadowTex = new CanvasTexture(c); shadowTex.colorSpace = SRGBColorSpace; return shadowTex;
}
