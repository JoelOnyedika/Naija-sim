import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// Shared canvas textures for the travel scene (walls with windows, glass curtain walls, paving). Freed with disposeTextures().
let wallTex: Texture | null = null, glassTex: Texture | null = null, pavingTex: Texture | null = null;
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement) => { const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t; };
/** Concrete walls with rows of windows, a balcony line and some stains, so they do not look like cardboard. */
export function wallTexture(): Texture {
  if (wallTex) return wallTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, r = rng(3);
  g.fillStyle = '#F3EEE4'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? '#00000010' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 4 + r() * 20, 6 + r() * 24); }
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const X = 12 + x * 64, Y = 10 + y * 64; g.fillStyle = '#D8D2C6'; g.fillRect(X - 4, Y - 4, 40, 50); g.fillStyle = '#34495B'; g.fillRect(X, Y, 32, 42); g.fillStyle = '#7FA6C2'; g.fillRect(X, Y, 32, 14); g.fillStyle = '#26343F'; g.fillRect(X + 15, Y, 2, 42); g.fillStyle = '#9A9488'; g.fillRect(X - 6, Y + 44, 44, 5); }
  return (wallTex = tex(c));
}
/** Glass curtain wall: blue-green panes with a bright sky reflection running diagonally. */
export function glassTexture(): Texture {
  if (glassTex) return glassTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, '#6E9BB8'); gr.addColorStop(0.5, '#BFE0EE'); gr.addColorStop(1, '#4E7A96'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#1F3445'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return (glassTex = tex(c));
}
export function pavingTexture(): Texture {
  if (pavingTex) return pavingTex;
  const c = canvas(128, 128), g = c.getContext('2d')!, r = rng(9);
  g.fillStyle = '#BDB7AC'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#00000012' : '#FFFFFF14'; g.fillRect(r() * 128, r() * 128, 6 + r() * 14, 4 + r() * 10); }
  g.fillStyle = '#8A847A'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128); g.fillRect(0, 62, 128, 2); g.fillRect(62, 0, 2, 128);
  return (pavingTex = tex(c));
}


export function disposeTextures() { wallTex?.dispose(); wallTex = null; glassTex?.dispose(); glassTex = null; pavingTex?.dispose(); pavingTex = null; }
