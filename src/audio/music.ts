import { useSettingsStore } from '@/stores/settingsStore';
import { audio } from './sfx';

/** Tiny generative afrobeat-ish loop (placeholder). Replace with a streamed track when you have one. */
const BPM = 104;
const STEP = 60 / BPM / 4;
const BASS = [55, 0, 0, 55, 0, 65.4, 0, 0, 73.4, 0, 0, 73.4, 0, 65.4, 0, 49];
const CHORD = [220, 261.6, 329.6];
let timer: number | undefined;
let nextTime = 0;
let step = 0;
let master: GainNode | null = null;

function note(c: AudioContext, f: number, t: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!); o.start(t); o.stop(t + dur + 0.02);
}

function schedule() {
  const c = audio(); if (!c || !master) return;
  while (nextTime < c.currentTime + 0.2) {
    const s = step % 16;
    if (s % 4 === 0) note(c, 110, nextTime, 0.18, 'sine', 0.5);
    if (s % 2 === 1) note(c, 6000, nextTime, 0.03, 'square', 0.035);
    if (BASS[s]) note(c, BASS[s], nextTime, STEP * 1.6, 'triangle', 0.4);
    if (s === 6 || s === 14) CHORD.forEach((f) => note(c, f, nextTime, STEP * 1.5, 'sawtooth', 0.04));
    nextTime += STEP; step++;
  }
}

export function startMusic() {
  const c = audio(); if (!c || timer) return;
  master = c.createGain(); master.gain.value = 0.0001; master.connect(c.destination);
  master.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 1.5);
  nextTime = c.currentTime + 0.05; step = 0;
  timer = window.setInterval(schedule, 40);
}

export function stopMusic() {
  const c = audio();
  if (timer) { window.clearInterval(timer); timer = undefined; }
  if (c && master) { const m = master; m.gain.setTargetAtTime(0.0001, c.currentTime, 0.2); setTimeout(() => m.disconnect(), 800); master = null; }
}

/** Starts/stops the loop to match the setting. Browsers need a tap first, so we wait for one. */
export function syncMusic() {
  const on = useSettingsStore.getState().music;
  if (on) startMusic(); else stopMusic();
}
