import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { FloorKind, WallFinish } from '@/types/world';

/** Procedural canvas textures: no image files to ship. Cached by key. */
const cache = new Map<string, CanvasTexture>();

function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, n: number) => void, repeat = true) {
  const hit = cache.get(key); if (hit) return hit;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** One tile covers 2m x 2m. Clone before setting repeat. */
export function floorTexture(kind: FloorKind): CanvasTexture {
  return make(`floor:${kind}`, 512, (ctx, n) => {
    const r = rng(kind.length * 9973 + kind.charCodeAt(0));
    const speckle = (base: string, count: number, alpha: number) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < count; i++) { const g = 90 + r() * 120; ctx.fillStyle = `rgba(${g},${g},${g - 8},${alpha * (0.4 + r())})`; ctx.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3); }
    };
    if (kind === 'cement' || kind === 'concrete') {
      speckle(kind === 'cement' ? '#9C9A92' : '#A8A8A2', 5000, 0.35);
      ctx.strokeStyle = 'rgba(60,58,52,0.5)'; ctx.lineWidth = 1.4;
      for (let c = 0; c < (kind === 'cement' ? 4 : 2); c++) { let x = r() * n, y = r() * n; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 12; s++) { x += (r() - 0.5) * 50; y += (r() - 0.2) * 40; ctx.lineTo(x, y); } ctx.stroke(); }
      if (kind === 'concrete') { ctx.strokeStyle = 'rgba(40,40,40,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, n, n); }
    } else if (kind === 'dirt') {
      speckle('#8A7A60', 7000, 0.5);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(70,55,40,${0.1 + r() * 0.15})`; ctx.beginPath(); ctx.ellipse(r() * n, r() * n, 10 + r() * 30, 6 + r() * 14, r() * 3, 0, 7); ctx.fill(); }
    } else if (kind === 'tile') {
      const t = n / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = `hsl(36, 22%, ${84 + ((i + j) % 2 ? 4 : 0) + r() * 3}%)`; ctx.fillRect(i * t, j * t, t, t); }
      ctx.strokeStyle = '#B8AD97'; ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(n, i * t); ctx.stroke(); }
    } else if (kind === 'wood') {
      const h = n / 8;
      for (let p = 0; p < 8; p++) {
        ctx.fillStyle = `hsl(28, 46%, ${36 + r() * 10}%)`; ctx.fillRect(0, p * h, n, h);
        for (let g = 0; g < 40; g++) { ctx.strokeStyle = `rgba(60,30,12,${0.05 + r() * 0.12})`; ctx.lineWidth = 1; const y = p * h + r() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(n, y + (r() - 0.5) * 6); ctx.stroke(); }
        ctx.fillStyle = 'rgba(30,14,6,0.55)'; ctx.fillRect(r() * n, p * h, 2, h); ctx.fillRect(0, p * h, n, 1.5);
      }
    } else if (kind === 'marble') {
      ctx.fillStyle = '#F2EFE9'; ctx.fillRect(0, 0, n, n);
      for (let v = 0; v < 14; v++) { ctx.strokeStyle = `rgba(110,112,120,${0.07 + r() * 0.16})`; ctx.lineWidth = 0.6 + r() * 1.8; ctx.beginPath(); let x = r() * n, y = -10; ctx.moveTo(x, y); while (y < n + 10) { x += (r() - 0.5) * 70; y += 20 + r() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(165,150,115,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, n, n);
      ctx.beginPath(); ctx.moveTo(n / 2, 0); ctx.lineTo(n / 2, n); ctx.moveTo(0, n / 2); ctx.lineTo(n, n / 2); ctx.stroke();
    } else if (kind === 'ceramic') {
      // consistent white ceramic tiles (kitchens)
      const t = n / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = `hsl(210, 8%, ${95 + r() * 2}%)`; ctx.fillRect(i * t, j * t, t, t); }
      ctx.strokeStyle = '#CDD2D6'; ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(n, i * t); ctx.stroke(); }
    } else if (kind === 'diamond') {
      // pale glossy diamond-patterned tile (bathrooms)
      ctx.fillStyle = '#D9E8EE'; ctx.fillRect(0, 0, n, n);
      const t = n / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const cx = i * t + t / 2, cy = j * t + t / 2;
        ctx.fillStyle = (i + j) % 2 ? '#C4DCE6' : '#E9F3F6';
        ctx.beginPath(); ctx.moveTo(cx, cy - t / 2); ctx.lineTo(cx + t / 2, cy); ctx.lineTo(cx, cy + t / 2); ctx.lineTo(cx - t / 2, cy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#A9C3CF'; ctx.lineWidth = 2; ctx.stroke();
      }
    } else if (kind === 'terrazzo') {
      ctx.fillStyle = '#D8D2C4'; ctx.fillRect(0, 0, n, n);
      const cols = ['#B8862F', '#6F8F7A', '#A24A3A', '#F2EEE6', '#3B3F44'];
      for (let i = 0; i < 900; i++) { ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.beginPath(); ctx.ellipse(r() * n, r() * n, 1.5 + r() * 4, 1 + r() * 3, r() * 3, 0, 7); ctx.fill(); }
    } else if (kind === 'paving') {
      ctx.fillStyle = '#6E6A66'; ctx.fillRect(0, 0, n, n);
      const bw = n / 8, bh = n / 16;
      for (let y = 0; y < 16; y++) for (let x = -1; x < 8; x++) { const o = (y % 2) * bw / 2; const g = 150 + r() * 40; ctx.fillStyle = `rgb(${g + 10},${g - 25},${g - 50})`; ctx.fillRect(x * bw + o + 1.5, y * bh + 1.5, bw - 3, bh - 3); }
    } else if (kind === 'grass') {
      ctx.fillStyle = '#5E9A52'; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < 9000; i++) { ctx.fillStyle = `hsla(${95 + r() * 30}, ${45 + r() * 20}%, ${28 + r() * 22}%, 0.55)`; ctx.fillRect(r() * n, r() * n, 1.5, 4 + r() * 5); }
    } else { ctx.fillStyle = '#1B8FA6'; ctx.fillRect(0, 0, n, n); }
  });
}

export function wallTexture(color: string, finish: WallFinish): CanvasTexture {
  return make(`wall:${color}:${finish}`, 256, (ctx, n) => {
    const r = rng(color.charCodeAt(1) * 31 + finish.length);
    ctx.fillStyle = color; ctx.fillRect(0, 0, n, n);
    const dots = finish === 'render' ? 4200 : 2200;
    for (let i = 0; i < dots; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; ctx.fillRect(r() * n, r() * n, 1 + r() * (finish === 'render' ? 2 : 4), 1 + r() * 3); }
    if (finish === 'rough') {
      const g = ctx.createLinearGradient(0, n * 0.6, 0, n); g.addColorStop(0, 'rgba(60,70,40,0)'); g.addColorStop(1, 'rgba(60,70,40,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(70,50,30,${0.04 + r() * 0.08})`; ctx.beginPath(); ctx.ellipse(r() * n, r() * n, 6 + r() * 26, 10 + r() * 40, 0, 0, 7); ctx.fill(); }
    } else if (finish === 'marble') {
      for (let v = 0; v < 8; v++) { ctx.strokeStyle = `rgba(120,120,130,${0.05 + r() * 0.1})`; ctx.lineWidth = 0.6 + r(); ctx.beginPath(); let x = r() * n, y = 0; ctx.moveTo(x, y); while (y < n) { x += (r() - 0.5) * 40; y += 20 + r() * 20; ctx.lineTo(x, y); } ctx.stroke(); }
    }
  });
}

/**
 * Patterned wallpaper library. One 256px tile covers 2m x 2m of wall; clone before setting repeat.
 * Every pattern is drawn with `wrap`, which repeats each shape one tile left/right/up/down, so tiles join with no seam.
 * Patterns are original geometry drawn with canvas paths: no image files, one small canvas per (colour, pattern).
 */
export type WallPattern = 'stripes' | 'dots' | 'diamond' | 'pinstripe' | 'wide_stripes' | 'chevron' | 'herringbone' | 'trellis' | 'checks' | 'grid' | 'waves' | 'scallop' | 'deco_fan' | 'damask' | 'panels' | 'arches' | 'brick' | 'bamboo' | 'ankara' | 'linen' | 'speckle' | 'plaster';
export const WALL_PATTERNS: WallPattern[] = ['stripes', 'dots', 'diamond', 'pinstripe', 'wide_stripes', 'chevron', 'herringbone', 'trellis', 'checks', 'grid', 'waves', 'scallop', 'deco_fan', 'damask', 'panels', 'arches', 'brick', 'bamboo', 'ankara', 'linen', 'speckle', 'plaster'];

function drawPattern(ctx: CanvasRenderingContext2D, n: number, base: string, accent: string, pattern: WallPattern) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
  ctx.fillStyle = accent; ctx.strokeStyle = accent; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  const wrap = (draw: () => void) => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { ctx.save(); ctx.translate(dx, dy); draw(); ctx.restore(); } };
  const R = rng(pattern.length * 7919 + base.length);
  switch (pattern) {
    case 'stripes': for (let x = 0; x < n; x += n / 8) ctx.fillRect(x, 0, n / 16, n); break;
    case 'pinstripe': for (let x = 0; x < n; x += 16) ctx.fillRect(x, 0, 3, n); break;
    case 'wide_stripes': for (let x = 0; x < n; x += 128) ctx.fillRect(x, 0, 64, n); break;
    case 'dots': for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.beginPath(); ctx.arc(x * 32 + (y % 2) * 16 + 16, y * 32 + 16, 5, 0, 7); ctx.fill(); } break;
    case 'diamond': ctx.lineWidth = 2; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + 32, cy = y * 64 + 32; ctx.beginPath(); ctx.moveTo(cx, cy - 26); ctx.lineTo(cx + 26, cy); ctx.lineTo(cx, cy + 26); ctx.lineTo(cx - 26, cy); ctx.closePath(); ctx.stroke(); } break;
    case 'chevron': case 'herringbone': {
      const period = pattern === 'chevron' ? 64 : 32; ctx.lineWidth = pattern === 'chevron' ? 14 : 4;
      for (let y = 0; y < n; y += period) { ctx.beginPath(); for (let x = 0; x <= n; x += period) { ctx.lineTo(x, y + (x / period % 2 ? 0 : period / 2)); } ctx.stroke(); }
      break;
    }
    case 'trellis': ctx.lineWidth = 3; wrap(() => { for (let k = -n; k <= n * 2; k += 64) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + n, n); ctx.moveTo(k, n); ctx.lineTo(k + n, 0); ctx.stroke(); } }); break;
    case 'checks': for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) ctx.fillRect(x * 32, y * 32, 32, 32); break;
    case 'grid': for (let k = 0; k < n; k += 64) { ctx.fillRect(k, 0, 3, n); ctx.fillRect(0, k, n, 3); } break;
    case 'waves': ctx.lineWidth = 4; for (let y = 16; y < n + 32; y += 32) { ctx.beginPath(); for (let x = 0; x <= n; x += 4) ctx.lineTo(x, y + Math.sin((x / 128) * Math.PI * 2) * 7); ctx.stroke(); } break;
    case 'scallop': ctx.lineWidth = 3; wrap(() => { for (let r = 0; r <= 8; r++) for (let c = 0; c <= 4; c++) { ctx.beginPath(); ctx.arc(c * 64 + (r % 2) * 32, r * 32, 32, 0, Math.PI); ctx.stroke(); } }); break;
    case 'deco_fan': ctx.lineWidth = 3; wrap(() => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const cx = 64 + i * 128 + (j % 2) * 0, cy = 128 + j * 128; for (const r of [16, 32, 48]) { ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.stroke(); } for (let a = 0; a <= 4; a++) { const ang = Math.PI + (a / 4) * Math.PI; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 48, cy + Math.sin(ang) * 48); ctx.stroke(); } } }); break;
    case 'damask': wrap(() => { for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { const cx = 64 + i * 128 + (j % 2) * 64, cy = 32 + j * 64; ctx.beginPath(); ctx.ellipse(cx, cy, 11, 24, 0, 0, 7); ctx.fill(); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sx * 22, cy, 8, 4.5, sx * 0.5, 0, 7); ctx.fill(); } ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx + 15, cy); ctx.lineTo(cx, cy + 30); ctx.lineTo(cx - 15, cy); ctx.closePath(); ctx.stroke(); } }); break;
    case 'panels': ctx.lineWidth = 4; for (let i = 0; i < 2; i++) { ctx.strokeRect(i * 128 + 14, 14, 100, 228); ctx.lineWidth = 1.5; ctx.strokeRect(i * 128 + 26, 26, 76, 204); ctx.lineWidth = 4; } break;
    case 'arches': ctx.lineWidth = 3; wrap(() => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const cx = 64 + i * 128 + (j % 2) * 64, top = 8 + j * 128, w = 44; for (const k of [0, 12]) { ctx.beginPath(); ctx.moveTo(cx - w + k, top + 120); ctx.lineTo(cx - w + k, top + 44); ctx.arc(cx, top + 44, w - k, Math.PI, 0); ctx.lineTo(cx + w - k, top + 120); ctx.stroke(); } } }); break;
    case 'brick': ctx.lineWidth = 3; for (let r = 0; r < 8; r++) { ctx.beginPath(); ctx.moveTo(0, r * 32); ctx.lineTo(n, r * 32); ctx.stroke(); for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2) * 32; ctx.beginPath(); ctx.moveTo(x, r * 32); ctx.lineTo(x, r * 32 + 32); ctx.stroke(); } } break;
    case 'bamboo': for (let i = 0; i < 8; i++) { const x = i * 32 + 9; ctx.globalAlpha = 0.9; ctx.fillRect(x, 0, 14, n); ctx.globalAlpha = 1; ctx.fillStyle = base; for (let y = (i % 3) * 21; y < n; y += 64) ctx.fillRect(x - 1, y, 16, 3); ctx.fillStyle = accent; } break;
    case 'ankara': wrap(() => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const cx = 64 + i * 128, cy = 64 + j * 128; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 36, 0, 7); ctx.fill(); ctx.fillStyle = base; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.fill(); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill(); } for (let k = 0; k < 2; k++) for (let m = 0; m < 2; m++) { const x = k * 128, y = m * 128; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 14, y); ctx.closePath(); ctx.fill(); } }); break;
    case 'linen': ctx.globalAlpha = 0.09; wrap(() => { for (let i = 0; i < 420; i++) { const x = R() * n, y = R() * n, l = 6 + R() * 22; if (R() > 0.5) ctx.fillRect(x, y, l, 1); else ctx.fillRect(x, y, 1, l); } }); ctx.globalAlpha = 1; break;
    case 'speckle': ctx.globalAlpha = 0.4; wrap(() => { for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(R() * n, R() * n, 0.7 + R() * 1.4, 0, 7); ctx.fill(); } }); ctx.globalAlpha = 1; break;
    case 'plaster': wrap(() => { for (let i = 0; i < 70; i++) { const x = R() * n, y = R() * n, r = 12 + R() * 26, g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, accent + '1c'); g.addColorStop(1, accent + '00'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); } ctx.fillStyle = accent; ctx.globalAlpha = 0.18; for (let i = 0; i < 80; i++) ctx.fillRect(R() * n, R() * n, 1.5, 1.5); ctx.globalAlpha = 1; }); break;
  }
}

export function wallpaperTexture(base: string, accent: string, pattern: WallPattern): CanvasTexture {
  return make(`wallpaper:${base}:${accent}:${pattern}`, 256, (ctx, n) => drawPattern(ctx, n, base, accent, pattern));
}

/** A small picture of a wall finish for the shop swatch: the real pattern, not a flat colour. Cached; browser only. */
const thumbs = new Map<string, string>();
export function wallThumb(base: string, accent: string, pattern: WallPattern): string {
  const key = `${base}:${accent}:${pattern}`; const hit = thumbs.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const src = document.createElement('canvas'); src.width = src.height = 256;
  drawPattern(src.getContext('2d')!, 256, base, accent, pattern);
  c.getContext('2d')!.drawImage(src, 0, 0, 128, 128);
  const url = c.toDataURL('image/png'); thumbs.set(key, url); return url;
}

export const zincTexture = () => make('zinc', 128, (ctx, n) => {
  ctx.fillStyle = '#A9AEB0'; ctx.fillRect(0, 0, n, n);
  for (let x = 0; x < n; x += 16) { const g = ctx.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, '#8E9496'); g.addColorStop(0.5, '#D8DCDD'); g.addColorStop(1, '#8E9496'); ctx.fillStyle = g; ctx.fillRect(x, 0, 16, n); }
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(120,70,40,${Math.random() * 0.18})`; ctx.fillRect(Math.random() * n, Math.random() * n, 2, 6); }
});

export const brickTexture = () => make('brick', 256, (ctx, n) => {
  ctx.fillStyle = '#B9B2A2'; ctx.fillRect(0, 0, n, n);
  const bw = n / 4, bh = n / 12;
  for (let y = 0; y < 12; y++) for (let x = -1; x < 4; x++) { const o = (y % 2) * bw / 2; const g = 120 + Math.random() * 40; ctx.fillStyle = `rgb(${g + 50},${g - 10},${g - 40})`; ctx.fillRect(x * bw + o + 2, y * bh + 2, bw - 4, bh - 4); }
});

/** Generic dusk skyline for the view through windows. */
export const skylineTexture = () => make('skyline', 1024, (ctx, n) => {
  const r = rng(77);
  const sky = ctx.createLinearGradient(0, 0, 0, n); sky.addColorStop(0, '#6FB1D9'); sky.addColorStop(0.55, '#CFE6EE'); sky.addColorStop(0.8, '#F7DDA8'); sky.addColorStop(1, '#F2B97A');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, n, n);
  for (const [layer, color, minH, maxH] of [[0, '#9FB8C4', 120, 300], [1, '#6F8C99', 80, 220], [2, '#3E5A66', 60, 150]] as const) {
    let x = -20;
    while (x < n) {
      const w = 40 + r() * 70, h = minH + r() * (maxH - minH);
      ctx.fillStyle = color; ctx.fillRect(x, n - h - layer * 8, w, h + layer * 8);
      if (layer === 2) for (let wy = n - h + 8; wy < n - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 14) { ctx.fillStyle = r() > 0.55 ? 'rgba(255,224,150,0.9)' : 'rgba(20,35,40,0.5)'; ctx.fillRect(wx, wy, 6, 8); }
      x += w + r() * 6;
    }
  }
}, false);
