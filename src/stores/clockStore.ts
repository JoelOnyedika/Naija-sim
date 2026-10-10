import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG } from '@/data/config';

interface ClockState {
  /** In-game minutes since the start of day 0 at 08:00. */
  minutes: number;
  /** Anchor date for day 0. */
  anchor: string;
  advance: (realSeconds: number) => void;
  reset: () => void;
}
export const useClockStore = create<ClockState>()(persist((set) => ({
  minutes: CONFIG.startHour * 60, anchor: new Date().toISOString(),
  advance: (s) => set((c) => ({ minutes: c.minutes + s * CONFIG.gameMinutesPerSecond })),
  reset: () => set({ minutes: CONFIG.startHour * 60, anchor: new Date().toISOString() }),
}), { name: 'nigerialife.clock', version: 1 }));

export function clockParts(minutes: number, anchor: string) {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(d.getMinutes() + Math.floor(minutes));
  return {
    date: d,
    weekday: d.toLocaleDateString('en-GB', { weekday: 'long' }),
    dateLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    hour: d.getHours(),
  };
}
