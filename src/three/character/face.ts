import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from 'three';

/**
 * The painted face. Instead of boxes for eyes and lips, the face is drawn once on a canvas (almond eyes with liner, lashes and a
 * shine, shaped brows, glossy lips, a little blush) and wrapped over the front of the faceted head. Everything is in head-radius
 * units: x in [-1, 1] across the face, y from -1.3 (below the chin) to 1.1 (forehead). Textures are cached by look, so a crowd of
 * people with the same skin, eyes and hair share one.
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
  const X = (x: number) => (x + 1) * S, Y = (y: number) => ((1.1 - y) / 2.4) * SIZE, L = (u: number) => u * S; // units -> pixels
  g.fillStyle = o.skin; g.fillRect(0, 0, SIZE, SIZE);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const soft = (x: number, y: number, rx: number, ry: number, color: string, a: number) => {
    g.save(); g.translate(X(x), Y(y)); g.scale(1, ry / rx); const r = L(rx), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, color.replace('A', String(a))); gr.addColorStop(1, color.replace('A', '0')); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
  };
  const dark = shade(o.skin, -0.55), dk = new Color(dark), rgb = (c: Color, a: string) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  // soft shaping: cheekbone shadow and, on a feminine face, blush
  for (const s of [-1, 1]) {
    soft(s * 0.62, -0.12, 0.3, 0.2, rgb(dk, 'A'), 0.16);
    if (o.fem) soft(s * 0.5, -0.2, 0.26, 0.17, 'rgba(214,84,100,A)', 0.2);
    soft(s * 0.13, -0.05, 0.07, 0.28, rgb(dk, 'A'), 0.16); // beside the nose
  }
  // eyes
  const eyeY = 0.1, eyeX = 0.38, hw = o.fem ? 0.195 : 0.175;
  for (const s of [-1, 1]) {
    const cx = eyeX * s, inner = cx - s * hw, outer = cx + s * hw, lift = o.fem ? 0.035 : 0.012;
    const top = (t: number) => ({ x: inner + (outer - inner) * t, y: eyeY + Math.sin(t * Math.PI) * 0.1 + (t > 0.5 ? (t - 0.5) * 2 * lift : 0) });
    const bot = (t: number) => ({ x: inner + (outer - inner) * t, y: eyeY - Math.sin(t * Math.PI) * 0.062 + (t > 0.5 ? (t - 0.5) * 2 * lift * 0.5 : 0) });
    if (o.fem) soft(cx, eyeY + 0.13, 0.24, 0.1, 'rgba(120,64,96,A)', 0.28); // eyeshadow
    const almond = () => { g.beginPath(); for (let i = 0; i <= 12; i++) { const p = top(i / 12); i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)); } for (let i = 12; i >= 0; i--) { const p = bot(i / 12); g.lineTo(X(p.x), Y(p.y)); } g.closePath(); };
    g.save(); almond(); g.fillStyle = '#F6F2EC'; g.fill(); g.clip();
    const ix = cx + s * 0.01, iy = eyeY + 0.012, ir = 0.092, gr = g.createRadialGradient(X(ix), Y(iy), L(0.01), X(ix), Y(iy), L(ir));
    gr.addColorStop(0, shade(o.eye, 0.3)); gr.addColorStop(0.65, o.eye); gr.addColorStop(1, shade(o.eye, -0.6));
    g.fillStyle = gr; g.beginPath(); g.arc(X(ix), Y(iy), L(ir), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0A0706'; g.beginPath(); g.arc(X(ix), Y(iy), L(0.042), 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(X(ix - 0.03), Y(iy + 0.035), L(0.018), 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(X(ix + 0.028), Y(iy - 0.025), L(0.008), 0, Math.PI * 2); g.fill();
    const lid = g.createLinearGradient(0, Y(eyeY + 0.09), 0, Y(eyeY)); lid.addColorStop(0, 'rgba(0,0,0,0.45)'); lid.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lid; g.fillRect(0, Y(eyeY + 0.1), SIZE, Y(eyeY) - Y(eyeY + 0.1));
    g.restore();
    // liner and lashes
    g.strokeStyle = '#150C0A'; g.lineWidth = L(o.fem ? 0.03 : 0.02); g.beginPath(); for (let i = 0; i <= 12; i++) { const p = top(i / 12); i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)); }
    if (o.fem) { const e = top(1); g.lineTo(X(e.x + s * 0.05), Y(e.y + 0.035)); } g.stroke();
    g.strokeStyle = 'rgba(40,20,16,0.55)'; g.lineWidth = L(0.012); g.beginPath(); for (let i = 1; i <= 11; i++) { const p = bot(i / 12); i > 1 ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)); } g.stroke();
    if (o.fem) { g.strokeStyle = '#150C0A'; g.lineWidth = L(0.011); for (let i = 2; i <= 11; i += 3) { const p = top(i / 12), a = 0.5 + (i / 12) * 0.9; g.beginPath(); g.moveTo(X(p.x), Y(p.y)); g.lineTo(X(p.x + s * Math.sin(a) * 0.05), Y(p.y + Math.cos(a) * 0.05 + 0.01)); g.stroke(); } }
    // lid crease
    g.strokeStyle = rgb(dk, '0.35'); g.lineWidth = L(0.012); g.beginPath(); for (let i = 1; i <= 11; i++) { const p = top(i / 12); i > 1 ? g.lineTo(X(p.x), Y(p.y + 0.055)) : g.moveTo(X(p.x), Y(p.y + 0.055)); } g.stroke();
    // brow
    const bx = (t: number) => cx - s * 0.16 + s * 0.4 * t, by = (t: number) => (o.fem ? 0.3 + Math.sin(t * Math.PI * 0.85) * 0.055 - t * 0.02 : 0.285 + Math.sin(t * Math.PI) * 0.018);
    const th = o.fem ? 0.04 : 0.058; g.fillStyle = o.brow; g.beginPath();
    for (let i = 0; i <= 10; i++) { const t = i / 10, w = th * (o.fem ? (t < 0.25 ? 0.7 + t * 1.2 : 1 - (t - 0.25) * 1.15) : (1 - t * 0.35)); i ? g.lineTo(X(bx(t)), Y(by(t) + w / 2)) : g.moveTo(X(bx(t)), Y(by(t) + w / 2)); }
    for (let i = 10; i >= 0; i--) { const t = i / 10, w = th * (o.fem ? (t < 0.25 ? 0.7 + t * 1.2 : 1 - (t - 0.25) * 1.15) : (1 - t * 0.35)); g.lineTo(X(bx(t)), Y(by(t) - w / 2)); }
    g.closePath(); g.fill();
  }
  // nostrils
  for (const s of [-1, 1]) { g.fillStyle = rgb(dk, '0.55'); g.beginPath(); g.ellipse(X(s * 0.088), Y(-0.245), L(0.03), L(0.016), s * 0.4, 0, Math.PI * 2); g.fill(); }
  // lips
  const lipC = o.lip ?? (o.fem ? mix(shade(o.skin, -0.25), '#B02A3C', 0.62) : shade(o.skin, -0.22)), lipD = shade(lipC, -0.35), my = -0.5, lw = o.fem ? 0.185 : 0.165;
  g.beginPath(); g.moveTo(X(-lw), Y(my)); g.bezierCurveTo(X(-lw * 0.55), Y(my + 0.05), X(-0.07), Y(my + 0.085), X(0), Y(my + 0.052)); g.bezierCurveTo(X(0.07), Y(my + 0.085), X(lw * 0.55), Y(my + 0.05), X(lw), Y(my)); g.bezierCurveTo(X(lw * 0.4), Y(my - 0.012), X(-lw * 0.4), Y(my - 0.012), X(-lw), Y(my)); g.closePath(); g.fillStyle = lipC; g.fill();
  g.beginPath(); g.moveTo(X(-lw), Y(my)); g.bezierCurveTo(X(-lw * 0.4), Y(my - 0.012), X(lw * 0.4), Y(my - 0.012), X(lw), Y(my)); g.bezierCurveTo(X(lw * 0.7), Y(my - (o.fem ? 0.105 : 0.085)), X(-lw * 0.7), Y(my - (o.fem ? 0.105 : 0.085)), X(-lw), Y(my)); g.closePath(); g.fillStyle = shade(lipC, 0.06); g.fill();
  g.strokeStyle = lipD; g.lineWidth = L(0.013); g.beginPath(); g.moveTo(X(-lw), Y(my)); g.bezierCurveTo(X(-lw * 0.4), Y(my - 0.014), X(lw * 0.4), Y(my - 0.014), X(lw), Y(my)); g.stroke();
  if (o.fem) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(X(-0.045), Y(my - 0.055), L(0.06), L(0.018), -0.1, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(X(0.05), Y(my + 0.035), L(0.04), L(0.01), 0.1, 0, Math.PI * 2); g.fill(); }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false; t.anisotropy = 4; t.needsUpdate = true;
  cache.set(key, t); return t;
}
