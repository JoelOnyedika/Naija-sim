import type { InteriorKind } from '@/data/interiors';
import { useSettingsStore } from '@/stores/settingsStore';
import { setMusicLevel } from './music';
import { audio } from './sfx';

/**
 * The sound of each kind of venue, made live with WebAudio (no sound files): crowd murmur, wind, waves, a church pad, keyboard
 * clicks, an airport chime, a port horn, cheers at the football... plus how loud the background afrobeat loop should be
 * there. Quiet by design. Replace the bodies with recorded loops later; the call sites stay the same.
 */
type Layer = { stop: () => void };
interface Recipe { music: number; build: (c: AudioContext, out: GainNode, later: (fn: () => void, ms: () => number) => void) => void }

let out: GainNode | null = null, layers: Layer[] = [], timers: number[] = [], current: InteriorKind | null = null;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function noiseBuf(c: AudioContext, seconds = 3) {
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 8; } // brownish noise: soft and rumbly
  return b;
}
function loopNoise(c: AudioContext, to: AudioNode, type: BiquadFilterType, freq: number, q: number, gain: number, lfo?: { rate: number; depth: number }): Layer {
  const src = c.createBufferSource(); src.buffer = noiseBuf(c); src.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain; src.connect(f).connect(g).connect(to); src.start();
  let o: OscillatorNode | null = null;
  if (lfo) { o = c.createOscillator(); o.frequency.value = lfo.rate; const d = c.createGain(); d.gain.value = lfo.depth; o.connect(d).connect(g.gain); o.start(); }
  const layer = { stop: () => { try { src.stop(); o?.stop(); } catch { /* already stopped */ } } }; layers.push(layer); return layer;
}
function pad(c: AudioContext, to: AudioNode, freqs: number[], gain: number, type: OscillatorType = 'triangle', cutoff = 900): Layer {
  const g = c.createGain(); g.gain.value = gain; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.connect(g).connect(to);
  const os = freqs.map((fr, i) => { const o = c.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = (i - 1) * 6; const v = c.createOscillator(); v.frequency.value = 0.18 + i * 0.05; const vg = c.createGain(); vg.gain.value = 3; v.connect(vg).connect(o.detune); o.connect(f); o.start(); v.start(); return [o, v]; });
  const layer = { stop: () => os.flat().forEach((o) => { try { o.stop(); } catch { /* */ } }) }; layers.push(layer); return layer;
}
function tone(c: AudioContext, to: AudioNode, freq: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number, delay = 0) {
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(to); o.start(t); o.stop(t + dur + 0.05);
}
function burst(c: AudioContext, to: AudioNode, dur: number, vol: number, f0: number, f1: number, attack = 0.05) {
  const t = c.currentTime, src = c.createBufferSource(); src.buffer = noiseBuf(c, Math.ceil(dur) + 1);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(to); src.start(t); src.stop(t + dur + 0.1);
}
const chord = (root: number, kind: 'maj7' | 'min7') => (kind === 'maj7' ? [1, 1.25, 1.5, 1.875] : [1, 1.2, 1.5, 1.8]).map((r) => root * r);

const murmur = (c: AudioContext, o: GainNode, level = 0.07) => { loopNoise(c, o, 'bandpass', 700, 0.6, level, { rate: 0.13, depth: level * 0.5 }); loopNoise(c, o, 'bandpass', 1500, 0.8, level * 0.5, { rate: 0.21, depth: level * 0.3 }); };
const lounge = (c: AudioContext, o: GainNode, later: Parameters<Recipe['build']>[2], gain = 0.03) => {
  const seq: [number, 'maj7' | 'min7'][] = [[196, 'maj7'], [220, 'min7'], [174.6, 'maj7'], [196, 'min7']]; let k = 0;
  const play = () => { const [r, kind] = seq[k++ % seq.length]; chord(r, kind).forEach((fr, i) => tone(c, o, fr, 7.5, gain, 'triangle', undefined, i * 0.06)); };
  play(); later(play, () => 7000);
  later(() => { const n = [392, 440, 523, 587, 659][Math.floor(Math.random() * 5)]; tone(c, o, n, 1.6, 0.035, 'sine'); }, () => rnd(2500, 6000));
};

const R: Record<InteriorKind, Recipe> = {
  market: { music: 0.5, build: (c, o, later) => { murmur(c, o, 0.1); later(() => tone(c, o, rnd(500, 700), 0.35, 0.025, 'triangle', rnd(700, 950)), () => rnd(1500, 4000)); later(() => burst(c, o, 0.5, 0.025, 1200, 2400), () => rnd(3000, 7000)); } },
  church: { music: 0, build: (c, o, later) => { pad(c, o, [196, 247, 294, 392], 0.04, 'sine', 700); later(() => tone(c, o, 880, 4, 0.03, 'sine'), () => rnd(9000, 16000)); loopNoise(c, o, 'lowpass', 300, 0.5, 0.03); } },
  gallery: { music: 0.12, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 400, 0.5, 0.04); lounge(c, o, later, 0.018); } },
  stadium: { music: 0.25, build: (c, o, later) => { murmur(c, o, 0.1); later(() => burst(c, o, 2.2, 0.1, 500, 1800, 0.5), () => rnd(10000, 20000)); later(() => { tone(c, o, 2800, 0.5, 0.025, 'sine'); }, () => rnd(14000, 26000)); } },
  club: { music: 1, build: (c, o) => { loopNoise(c, o, 'lowpass', 220, 0.5, 0.05); } },
  showroom: { music: 0.3, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 350, 0.5, 0.03); lounge(c, o, later, 0.022); } },
  jail: { music: 0, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 160, 0.5, 0.07); later(() => tone(c, o, rnd(140, 210), 1.6, 0.03, 'square'), () => rnd(8000, 16000)); } },
  viewing: { music: 0.3, build: (c, o, later) => { murmur(c, o, 0.1); later(() => burst(c, o, 1.8, 0.11, 600, 2000, 0.3), () => rnd(8000, 18000)); later(() => burst(c, o, 1.2, 0.06, 900, 500, 0.15), () => rnd(15000, 30000)); } },
  eatery: { music: 0.4, build: (c, o, later) => { murmur(c, o, 0.08); later(() => burst(c, o, 0.6, 0.03, 6000, 4000, 0.02), () => rnd(1500, 3500)); later(() => tone(c, o, rnd(1800, 2600), 0.12, 0.02, 'triangle'), () => rnd(3000, 6000)); } },
  bank: { music: 0.12, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 300, 0.5, 0.045); later(() => { tone(c, o, 880, 0.9, 0.03); tone(c, o, 660, 1.1, 0.03, 'sine', undefined, 0.25); }, () => rnd(9000, 18000)); later(() => burst(c, o, 0.07, 0.04, 4000, 4000, 0.005), () => rnd(500, 1800)); } },
  mall: { music: 0.3, build: (c, o, later) => { murmur(c, o, 0.06); lounge(c, o, later, 0.025); } },
  cinema: { music: 0, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 120, 0.5, 0.08); later(() => burst(c, o, 3, 0.07, 120, 600, 1.2), () => rnd(9000, 16000)); } },
  concert: { music: 1, build: (c, o) => { murmur(c, o, 0.06); } },
  hotel: { music: 0.25, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 500, 0.5, 0.03); lounge(c, o, later, 0.025); later(() => burst(c, o, 0.5, 0.025, 800, 600, 0.1), () => rnd(5000, 9000)); } },
  techhub: { music: 0.3, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 260, 0.5, 0.04); later(() => { const n = Math.floor(rnd(3, 9)); for (let i = 0; i < n; i++) burst(c, o, 0.04, 0.05, 3500, 3500, 0.003); }, () => rnd(1500, 4500)); later(() => tone(c, o, rnd(900, 1300), 0.2, 0.02, 'sine'), () => rnd(8000, 16000)); } },
  park: { music: 0.25, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 600, 0.4, 0.05, { rate: 0.1, depth: 0.03 }); later(() => { const f = rnd(2800, 4200); tone(c, o, f, 0.12, 0.03, 'sine', f * 1.3); tone(c, o, f * 1.2, 0.1, 0.03, 'sine', f, 0.16); }, () => rnd(2000, 6000)); } },
  beach: { music: 0.25, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 500, 0.4, 0.09, { rate: 0.11, depth: 0.07 }); loopNoise(c, o, 'highpass', 2500, 0.4, 0.015, { rate: 0.11, depth: 0.012 }); later(() => { const f = rnd(2400, 3400); tone(c, o, f, 0.2, 0.025, 'sine', f * 0.8); }, () => rnd(7000, 16000)); } },
  recreation: { music: 0.2, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 400, 0.4, 0.035); lounge(c, o, later, 0.018); later(() => burst(c, o, 0.1, 0.05, 1800, 1800, 0.005), () => rnd(3000, 8000)); } },
  government: { music: 0.1, build: (c, o, later) => { murmur(c, o, 0.04); loopNoise(c, o, 'lowpass', 250, 0.5, 0.03); later(() => tone(c, o, 740, 0.7, 0.03), () => rnd(10000, 22000)); } },
  business: { music: 0.2, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 350, 0.5, 0.03); lounge(c, o, later, 0.02); later(() => tone(c, o, 1320, 0.25, 0.02), () => rnd(8000, 20000)); } },
  airport: { music: 0.1, build: (c, o, later) => { murmur(c, o, 0.07); later(() => { [784, 659, 523].forEach((f, i) => tone(c, o, f, 1.1, 0.035, 'sine', undefined, i * 0.45)); }, () => rnd(18000, 32000)); later(() => burst(c, o, 1.6, 0.04, 200, 900, 0.6), () => rnd(12000, 24000)); } },
  port: { music: 0.25, build: (c, o, later) => { loopNoise(c, o, 'lowpass', 140, 0.5, 0.09); loopNoise(c, o, 'lowpass', 700, 0.4, 0.03, { rate: 0.08, depth: 0.02 }); later(() => tone(c, o, 110, 1.8, 0.06, 'sawtooth'), () => rnd(30000, 55000)); later(() => burst(c, o, 0.25, 0.07, 1200, 600, 0.005), () => rnd(5000, 12000)); } },
};

function teardown() {
  timers.forEach((t) => { window.clearTimeout(t); window.clearInterval(t); }); timers = [];
  layers.forEach((l) => l.stop()); layers = [];
  const c = audio(); const o = out;
  if (c && o) { o.gain.setTargetAtTime(0.0001, c.currentTime, 0.25); window.setTimeout(() => { try { o.disconnect(); } catch { /* */ } }, 1200); }
  out = null; current = null;
}

/** Starts the atmosphere for a venue (or stops it with null). Honours the speaker button: when it is off, venues are silent. */
export function setAmbience(kind: InteriorKind | null) {
  if (kind === current && (kind === null || out)) return;
  teardown();
  if (!kind) { setMusicLevel(1); return; }
  const on = useSettingsStore.getState().music, c = audio();
  const rec = R[kind];
  setMusicLevel(rec.music);
  if (!on || !c) return;
  out = c.createGain(); out.gain.value = 0.0001; out.connect(c.destination); out.gain.setTargetAtTime(1, c.currentTime, 0.8);
  const later = (fn: () => void, ms: () => number) => { const tick = () => { fn(); timers.push(window.setTimeout(tick, ms()) as unknown as number); }; timers.push(window.setTimeout(tick, ms()) as unknown as number); };
  rec.build(c, out, later);
  current = kind;
}

/** Test helper: the loudness (RMS, 0 to 1) of the current atmosphere over `ms`, so a silent or runaway soundscape is caught without ears. */
export async function measureAmbience(ms = 600): Promise<number> {
  const c = audio(); if (!c || !out) return 0;
  const a = c.createAnalyser(); a.fftSize = 2048; out.connect(a);
  const buf = new Float32Array(a.fftSize); let peak = 0;
  const until = performance.now() + ms;
  while (performance.now() < until) { a.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; peak = Math.max(peak, Math.sqrt(s / buf.length)); await new Promise((r) => setTimeout(r, 50)); }
  try { out.disconnect(a); } catch { /* */ } return peak;
}
