import { create } from 'zustand';
import { initialTimers, tickPower, type PowerEvent } from '@/game/power';

/**
 * Live NEPA state. Transient on purpose (not persisted): an outage never survives a reload, so nobody can get stuck in one,
 * and there is nothing here to exploit. Which backup is installed is NOT stored: it is read from the placed furniture.
 */
interface PowerState {
  /** Seconds of play since the game screen mounted (the schedule's clock). */
  now: number;
  outage: boolean;
  nextAt: number;
  endsAt: number;
  /** The Ibeta was switched on during this outage. Cleared when NEPA returns. */
  ibetaOn: boolean;
  /** Advance by dt seconds. Returns the event that just happened, if any. */
  step: (dt: number, reliable: boolean, rnd?: () => number) => PowerEvent;
  switchIbetaOn: () => boolean;
  /** Dev/test hook: force an outage now or end it. */
  force: (outage: boolean) => void;
  reset: () => void;
}

const fresh = () => { const t = initialTimers(0, true); return { now: 0, outage: false, nextAt: t.nextAt, endsAt: 0, ibetaOn: false }; };

export const usePowerStore = create<PowerState>((set, get) => ({
  ...fresh(),
  step: (dt, reliable, rnd) => {
    const s = get();
    const now = s.now + Math.max(0, Math.min(dt, 600));
    const { timers, event } = tickPower({ outage: s.outage, nextAt: s.nextAt, endsAt: s.endsAt }, now, reliable, rnd);
    set({ now, outage: timers.outage, nextAt: timers.nextAt, endsAt: timers.endsAt, ibetaOn: event === 'outage-end' || event === 'outage-start' ? false : s.ibetaOn });
    return event;
  },
  // Only meaningful during an outage; a second tap does nothing, so it can never be double-counted.
  switchIbetaOn: () => { const s = get(); if (!s.outage || s.ibetaOn) return false; set({ ibetaOn: true }); return true; },
  force: (outage) => set((s) => (outage ? { outage: true, endsAt: s.now + 120, ibetaOn: false } : { outage: false, nextAt: s.now + 600, endsAt: 0, ibetaOn: false })),
  reset: () => set(fresh()),
}));
