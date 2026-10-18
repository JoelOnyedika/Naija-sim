import { CONFIG } from '@/data/config';
import { clockParts, useClockStore } from '@/stores/clockStore';
import { formatDuration } from './format';

/** Game-time helpers. Game time is the clock in clockStore: minutes since the start of day 0 at 08:00. */
export const nowMinutes = () => useClockStore.getState().minutes;

/** "14 Oct, 9:30 AM" for an in-game minute value. */
export function fmtGame(minutes: number): string {
  const p = clockParts(minutes, useClockStore.getState().anchor);
  return `${p.dateLabel}, ${p.time}`;
}

/** A span of game minutes as "2d 4h", "3h 10m" or "under a minute". */
export function fmtGameSpan(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return m > 0 ? `${m}m` : 'under a minute';
}

/** How long a span of game minutes takes to play at the current clock speed ("about 2h 48m of play"). */
export const fmtPlayTime = (gameMinutes: number) => formatDuration((gameMinutes / CONFIG.gameMinutesPerSecond));
