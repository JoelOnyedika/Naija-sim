import { useSettingsStore } from '@/stores/settingsStore';

/** Synthesised placeholder sounds (WebAudio). Swap the bodies for <audio> samples later; call sites stay the same. */
let ctx: AudioContext | null = null;
export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
export const masterGain = () => { const c = audio(); if (!c) return null; return c.destination; };

const enabled = () => useSettingsStore.getState().sfx;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.14, delay = 0, slideTo?: number) {
  if (!enabled()) return;
  const c = audio(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.1, from = 800, to = 3000, delay = 0) {
  if (!enabled()) return;
  const c = audio(); if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

const arp = (notes: number[], step = 0.08, type: OscillatorType = 'triangle', vol = 0.13) => notes.forEach((n, i) => tone(n, 0.22, type, vol, i * step));

export const sfx = {
  click: () => tone(720, 0.05, 'triangle', 0.1),
  pop: () => tone(480, 0.09, 'sine', 0.16, 0, 900),
  open: () => tone(380, 0.14, 'sine', 0.13, 0, 760),
  close: () => tone(700, 0.14, 'sine', 0.12, 0, 340),
  notify: () => { tone(988, 0.12, 'sine', 0.14); tone(1319, 0.2, 'sine', 0.14, 0.11); },
  purchase: () => { tone(1175, 0.06, 'square', 0.06); arp([523, 659, 784, 1047], 0.07); },
  error: () => { tone(180, 0.18, 'sawtooth', 0.12, 0, 120); tone(150, 0.2, 'sawtooth', 0.1, 0.12, 100); },
  tick: (pitch = 1) => tone(900 * pitch, 0.03, 'square', 0.07),
  reward: () => arp([659, 784, 988, 1319], 0.08, 'triangle', 0.14),
  phoneOpen: () => { noise(0.28, 0.08, 400, 2400); tone(300, 0.2, 'sine', 0.1, 0.02, 720); },
  phoneClose: () => { noise(0.22, 0.06, 2200, 400); tone(720, 0.18, 'sine', 0.1, 0, 300); },
  spinStart: () => { noise(0.5, 0.09, 200, 1800); tone(220, 0.5, 'sawtooth', 0.05, 0, 660); },
  win: () => { arp([523, 659, 784, 1047, 1319, 1568], 0.09, 'triangle', 0.15); tone(262, 1.2, 'sawtooth', 0.05, 0.1); noise(0.8, 0.06, 3000, 6000, 0.45); },
  lose: () => { arp([392, 349, 311, 262], 0.16, 'sine', 0.12); },
  coin: () => { tone(1568, 0.07, 'square', 0.07); tone(2093, 0.15, 'square', 0.07, 0.06); },
};
export type Sfx = typeof sfx;
