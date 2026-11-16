import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from 'three';

/**
 * The painted face. The face is drawn once on a canvas (almond eyes with liner, lashes and a shine, shaped brows, lips, a little
 * blush) and wrapped over the front of the faceted head. Everything is in head-radius units: x in [-1, 1] across the face, y from
 * -1.3 (below the chin) to 1.1 (forehead). Textures are cached by look, so a crowd with the same skin, eyes and hair shares one.
 */
const SIZE = 512, cache = new Map<string, CanvasTexture>();
const hex = (c: Color) => `#${c.getHexString()}`;
const shade = (h: string, a: number) => { const c = new Color(h); const t = a < 0 ? 0 : 1, k = Math.abs(a); c.r += (t - c.r) * k; c.g += (t - c.g) * k; c.b += (t - c.b) * k; return hex(c); };
const mix = (a: string, b: string, t: number) => hex(new Color(a).lerp(new Color(b), t));

/** Where a point of the head surface (x, y in head radii) lands on the texture. */
export const faceUV = (x: number, y: number): [number, number] => [Math.max(0, Math.min(1, (x + 1) / 2)), Math.max(0, Math.min(1, (y + 1.3) / 2.4))];

export function faceTexture(o: { skin: string; eye: string; fem: boolean; brow: string; lip?: string }): CanvasTexture {
  const key = [o.skin, o.eye, o.fem, o.brow, o.lip].join('|');
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const g = c.getContext('2d')!, S = SIZE / 2;
  const X = (x: number) => (x + 1) * S, Y = (y: number) => ((1.1 - y) / 2.4) * SIZE; // units -> pixels
  g.fillStyle = o.skin; g.fillRect(0, 0, SIZE, SIZE);
  g.lineJoin = 'miter';
  const poly = (pts: [number, number][], fill: string) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fillStyle = fill; g.fill(); };
  const ink = '#0C0807';
  // hard-edged planes instead of airbrushing: a darker temple and cheek plane on each side, like the faceted reference
  for (const s of [-1, 1]) {
    poly([[s * 0.78, 0.2], [s * 0.98, 0.1], [s * 0.9, -0.5], [s * 0.62, -0.3]], shade(o.skin, -0.1));
    poly([[s * 0.1, 0.05], [s * 0.2, -0.2], [s * 0.04, -0.3], [s * 0.02, 0.05]], shade(o.skin, -0.08)); // nose side plane
  }
  for (const s of [-1, 1]) {
    const cx = 0.36 * s, w = o.fem ? 0.2 : 0.19;
    // narrow, hooded eye: a dark slit with a sliver of white, the upper lid drawn straight and heavy
    poly([[cx - s * w, 0.1], [cx + s * w, 0.125], [cx + s * w * 0.9, 0.065], [cx - s * w * 0.6, 0.04]], '#EDE8E0');
    poly([[cx - s * w * 0.35, 0.105], [cx + s * w * 0.5, 0.118], [cx + s * w * 0.45, 0.062], [cx - s * w * 0.25, 0.048]], o.eye === '#2A1A10' ? '#1A100B' : o.eye);
    poly([[cx - s * w * 0.2, 0.1], [cx + s * w * 0.3, 0.11], [cx + s * w * 0.28, 0.07], [cx - s * w * 0.15, 0.06]], ink);
    poly([[cx - s * (w + 0.03), 0.13], [cx + s * (w + 0.04), 0.15], [cx + s * (w + 0.02), 0.115], [cx - s * (w - 0.02), 0.105]], ink); // heavy upper lid line
    // brow: a thick slab that slants down toward the nose (angry), flat-cut ends
    const bx0 = s * 0.08, bx1 = s * 0.62, th = o.fem ? 0.05 : 0.085;
    poly([[bx0, 0.215], [bx1, 0.335], [bx1, 0.335 + th], [bx0, 0.215 + th * 0.9]], o.fem ? mix(o.brow, '#000000', 0.2) : o.brow === '#000000' ? ink : mix(o.brow, '#000000', 0.55));
  }
  // nose tip shadow and nostrils: two dark facets
  for (const s of [-1, 1]) poly([[s * 0.1, -0.24], [s * 0.2, -0.27], [s * 0.15, -0.31], [s * 0.07, -0.29]], shade(o.skin, -0.5));
  // mouth: a flat thin line (a full lip for femme faces)
  const lipC = o.lip ?? (o.fem ? mix(shade(o.skin, -0.25), '#B02A3C', 0.62) : shade(o.skin, -0.45));
  if (o.fem) poly([[-0.17, -0.5], [0, -0.47], [0.17, -0.5], [0.12, -0.56], [-0.12, -0.56]], lipC);
  else poly([[-0.2, -0.5], [0.2, -0.5], [0.18, -0.525], [-0.18, -0.525]], lipC);
  poly([[-0.14, -0.76], [0.14, -0.76], [0.1, -0.8], [-0.1, -0.8]], shade(o.skin, -0.07)); // chin plane
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = false; t.anisotropy = 4; t.needsUpdate = true;
  cache.set(key, t); return t;
}
