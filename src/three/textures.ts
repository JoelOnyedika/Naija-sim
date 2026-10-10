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
