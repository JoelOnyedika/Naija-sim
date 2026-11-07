import { BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, SRGBColorSpace, TubeGeometry, Vector3 } from 'three';
import type { Livery } from '@/data/aircraft';

/**
 * Geometry and paint for the aircraft. No model files: bodies are lofted from cross-sections, wings from airfoil sections, and the
 * paint (colours, stripe, windows, the player's name) is drawn once on a canvas and wrapped round the body.
 * Model space: nose along +z, up is +y, the wheels or skids touch y = 0.
 */

/** One cross-section of a body: a rounded box (superellipse) of half-width hw and half-height hh, centred at height cy. n = 2 is an ellipse, higher is boxier. */
export interface Station { z: number; hw: number; hh: number; cy: number; n?: number }
const RING = 32;
const TAU = Math.PI * 2;
/** Angle round the body: 0 = right side (+x), PI/2 = top, PI = left side, -PI/2 = bottom (where the paint seam hides). */
export const phiOf = (j: number) => -Math.PI / 2 + (TAU * j) / RING;
const sp = (v: number, n: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);

/** A body lofted through its stations (listed nose to tail). UVs: u = round the body, v = along it, so the paint texture wraps exactly. */
export function loft(stations: Station[]): BufferGeometry {
  const zN = stations[0].z, zT = stations[stations.length - 1].z, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  stations.forEach((st) => {
    for (let j = 0; j <= RING; j++) {
      const f = phiOf(j), n = st.n ?? 2.4;
      pos.push(sp(Math.cos(f), n) * st.hw, st.cy + sp(Math.sin(f), n) * st.hh, st.z);
      uv.push(j / RING, (st.z - zT) / (zN - zT));
    }
  });
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < RING; j++) {
    const a = i * (RING + 1) + j, b = a + 1, c = a + RING + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx); g.computeVertexNormals();
  // make sure the faces point outwards whatever the winding came out as
  const nrm = g.getAttribute('normal'), p = g.getAttribute('position'), k = Math.floor(stations.length / 2) * (RING + 1) + Math.floor(RING / 4), st = stations[Math.floor(stations.length / 2)];
  if (nrm.getX(k) * p.getX(k) + nrm.getY(k) * (p.getY(k) - st.cy) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
/** Interpolated cross-section of a station list at z. */
export function sectionAt(stations: Station[], z: number): Station {
  for (let i = 0; i < stations.length - 1; i++) { const a = stations[i], b = stations[i + 1]; if (z <= a.z && z >= b.z) { const t = (a.z - z) / Math.max(1e-6, a.z - b.z); return { z, hw: a.hw + (b.hw - a.hw) * t, hh: a.hh + (b.hh - a.hh) * t, cy: a.cy + (b.cy - a.cy) * t, n: a.n }; } }
  return z > stations[0].z ? stations[0] : stations[stations.length - 1];
}

/** Half a wing (x from 0 outwards) with a real airfoil section that tapers, sweeps and rises. Mirror it with scale.x = -1. */
export function wing(o: { span: number; root: number; tip: number; thick?: number; sweep?: number; rise?: number; z?: number; round?: boolean }): BufferGeometry {
  const { span, root, tip, thick = 0.12, sweep = 0, rise = 0, z: z0 = 0 } = o, SEG = 6, NP = 11;
  // airfoil: upper and lower surface of a thin symmetric-ish section, leading edge at the front (+z), trailing edge behind
  const prof: [number, number][] = [];
  const th = (x: number) => 5 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4); // NACA 00xx thickness (per unit of the 0.2 base)
  for (let i = 0; i <= NP; i++) { const x = (1 - Math.cos((i / NP) * Math.PI)) / 2; prof.push([x, th(x)]); }
  const ring: [number, number][] = [...prof.map(([x, t]) => [x, t / 2] as [number, number]), ...prof.slice(1, -1).reverse().map(([x, t]) => [x, -t / 2] as [number, number])];
  const pos: number[] = [], idx: number[] = [], m = ring.length;
  for (let s = 0; s <= SEG; s++) {
    const t = s / SEG, x = span * t, chord = root + (tip - root) * t, le = z0 - sweep * t, y0 = rise * t * t * 0.6 + rise * t * 0.4;
    const tf = o.round && s === SEG ? 0.35 : 1; // a rounded tip: the last section is thinner
    for (const [px, py] of ring) pos.push(x, y0 + py * chord * (thick / 0.1) * tf * 0.2, le - px * chord);
  }
  for (let s = 0; s < SEG; s++) for (let i = 0; i < m; i++) { const a = s * m + i, b = s * m + ((i + 1) % m), c = a + m, d = b + m; idx.push(a, c, b, b, c, d); }
  // root and tip caps
  const cap = (base: number, flip: boolean) => { const cx = pos.length / 3; let sx = 0, sy = 0, sz = 0; for (let i = 0; i < m; i++) { sx += pos[(base + i) * 3]; sy += pos[(base + i) * 3 + 1]; sz += pos[(base + i) * 3 + 2]; } pos.push(sx / m, sy / m, sz / m); for (let i = 0; i < m; i++) { const a = base + i, b = base + ((i + 1) % m); idx.push(...(flip ? [cx, b, a] : [cx, a, b])); } };
  cap(0, false); cap(SEG * m, true);
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  // outward check on the upper surface: normals there should point up
  const n = g.getAttribute('normal'); if (n.getY(1) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

/** A thin curved tube through points (skids and the like). */
export function tube(points: [number, number, number][], r: number, segs = 24): BufferGeometry {
  return new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), segs, r, 8, false);
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/* Paint                                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------------ */

export interface Win { z0: number; z1: number; a0: number; a1: number; side?: boolean; top?: boolean; r?: number }
export interface PaintSpec {
  stations: Station[];
  /** Everything from z >= engineFrom is painted in the engine colour (a propeller plane's cowling). */
  engineFrom?: number;
  /** A patch painted in the engine colour (a helicopter's engine deck): z range and the range of angles round the body (top = PI/2). */
  enginePatch?: { z0: number; z1: number; a0: number; a1: number };
  windows: Win[];
  /** Pillars and door lines drawn on top of the glass or the body: z positions for door seams, and angle range they span. */
  seams?: { z: number; a0: number; a1: number }[];
  /** Where the name goes: centre z, length available (m), centre angle (0 = widest point of the side), letter height (m). */
  name: { zc: number; len: number; phi: number; h: number };
  /** Stripe: centre angle on the side and half thickness (radians). */
  stripe: { phi: number; half: number; rise?: number };
}
const W = 1024, H = 1280;
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };

/** Draws the whole paint job for a body onto a canvas and returns it as a texture. */
export function paintTexture(spec: PaintSpec, lv: Livery): CanvasTexture {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const zN = spec.stations[0].z, zT = spec.stations[spec.stations.length - 1].z;
  const X = (phi: number) => ((phi + Math.PI / 2) / TAU) * W, Y = (z: number) => ((zN - z) / (zN - zT)) * H;
  const mirror = (phi: number) => Math.PI - phi;
  // body
  g.fillStyle = lv.body; g.fillRect(0, 0, W, H);
  // a soft shade towards the belly so the paint reads as round even before the lights do
  const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(0,0,0,0.18)'); lg.addColorStop(0.12, 'rgba(0,0,0,0)'); lg.addColorStop(0.88, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  // engine colour
  if (spec.engineFrom !== undefined) { const y = Y(spec.engineFrom); g.fillStyle = lv.engine; g.fillRect(0, 0, W, y); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y - 2, W, 4); }
  if (spec.enginePatch) { const e = spec.enginePatch; g.fillStyle = lv.engine; g.beginPath(); g.roundRect(X(e.a0), Y(e.z0), X(e.a1) - X(e.a0), Y(e.z1) - Y(e.z0), 14); g.fill(); }
  // stripe
  const st = spec.stripe, sides = (f: (mx: boolean) => void) => { f(false); f(true); };
  g.fillStyle = lv.stripe;
  const band = (phi: number, half: number, rise: number, yFrom: number, yTo: number, taper = 0) => sides((mx) => {
    const P = (p: number) => X(mx ? mirror(p) : p); g.beginPath();
    const steps = 24, top: [number, number][] = [], bot: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const t = i / steps, y = yFrom + (yTo - yFrom) * t, ph = phi + rise * t, hf = half * (1 + taper * t); top.push([P(ph + hf), y]); bot.push([P(ph - hf), y]); }
    g.moveTo(top[0][0], top[0][1]); top.forEach(([x, y]) => g.lineTo(x, y)); bot.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
  });
  const y0 = Y(zN - (zN - zT) * 0.04), y1 = Y(zT + (zN - zT) * 0.03);
  if (lv.style === 'single') band(st.phi, st.half, 0, y0, y1);
  else if (lv.style === 'double') { band(st.phi + st.half * 0.9, st.half * 0.55, 0, y0, y1); band(st.phi - st.half * 0.55, st.half * 0.22, 0, y0, y1); }
  else if (lv.style === 'swoosh') band(st.phi - 0.35, st.half * 0.5, (st.rise ?? 0.7), y0, y1, 3.6);
  else if (lv.style === 'belly') sides((mx) => {
    g.beginPath(); const P = (p: number) => X(mx ? mirror(p) : p); const steps = 40, edge: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const t = i / steps; edge.push([P(st.phi - st.half * 1.2 + Math.sin(t * Math.PI * 2.2) * 0.07 + t * 0.12), y0 + (y1 - y0) * t]); }
    g.moveTo(P(-Math.PI / 2), y0); edge.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(P(-Math.PI / 2), y1); g.closePath(); g.fill();
  });
  // glass
  const glass = (w: Win) => {
    const draw = (a0: number, a1: number) => {
      const x0 = X(Math.min(a0, a1)), x1 = X(Math.max(a0, a1)), y = Y(w.z0), h = Y(w.z1) - Y(w.z0);
      const gr = g.createLinearGradient(x0, y, x1, y + h); gr.addColorStop(0, '#16222E'); gr.addColorStop(0.5, '#2B4660'); gr.addColorStop(1, '#101A24');
      g.fillStyle = gr; g.beginPath(); g.roundRect(x0, y, x1 - x0, h, w.r ?? 16); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.1, y + h * 0.04); g.lineTo(x0 + (x1 - x0) * 0.5, y + h * 0.04); g.lineTo(x0 + (x1 - x0) * 0.2, y + h * 0.96); g.lineTo(x0 + (x1 - x0) * 0.04, y + h * 0.96); g.closePath(); g.fill();
    };
    if (w.top) draw(w.a0, w.a1); else { draw(w.a0, w.a1); draw(mirror(w.a1), mirror(w.a0)); }
  };
  spec.windows.forEach(glass);
  g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 3;
  (spec.seams ?? []).forEach((s) => sides((mx) => { const x0 = X(mx ? mirror(s.a1) : s.a0), x1 = X(mx ? mirror(s.a0) : s.a1); g.beginPath(); g.moveTo((x0 + x1) / 2, Y(s.z)); g.lineTo((x0 + x1) / 2, Y(s.z)); g.moveTo(x0, Y(s.z)); g.lineTo(x1, Y(s.z)); g.stroke(); }));
  // the name, on both sides, reading nose to tail on one side and tail to nose on the other, never mirrored
  const nm = lv.name.trim();
  if (nm) {
    const n = spec.name, sec = sectionAt(spec.stations, n.zc), pxAlong = H / (zN - zT), pxAcross = W / TAU / Math.max(0.2, sec.hh); // pixels per metre along the body and round it
    g.font = 'italic 800 100px "Instrument Sans", "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const wide = g.measureText(nm).width / 100; // width of one em of this text, in ems
    const fm = Math.min(n.h / 0.72, n.len / Math.max(0.5, wide)); // font size in metres so it fits both the height and the length available
    for (const right of [true, false]) {
      g.save(); g.translate(X(right ? n.phi : mirror(n.phi)), Y(n.zc)); g.rotate(right ? Math.PI / 2 : -Math.PI / 2); g.scale((fm * pxAlong) / 100, (fm * pxAcross) / 100);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillText(nm, 1.5, 3); g.fillStyle = lv.text; g.fillText(nm, 0, 0); g.restore();
    }
  }
  g.fillStyle = shade(lv.body, 0.9); // keep the shade helper used for a faint underside tint
  g.globalAlpha = 0.18; g.fillRect(0, 0, W * 0.04, H); g.fillRect(W * 0.96, 0, W * 0.04, H); g.globalAlpha = 1;
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
}
