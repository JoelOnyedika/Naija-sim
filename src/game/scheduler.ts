import { DAY_MINUTES, WEEK_MINUTES } from '@/data/economy';
import { useClockStore } from '@/stores/clockStore';
import { useSchedulerStore } from '@/stores/schedulerStore';
import { settleCompanies } from './companies';
import { runGrocery } from './grocery';
import { runLegal } from './legal';
import { growLand } from './land';
import { runHustle, refreshMarket } from './hustle';
import { simulateContactAttempt } from './social';
import { chargeIncomeTax, chargeWeeklyBills, creditInterest, matureBonds } from './banking';

/**
 * The one scheduler for time-based money events. Each event runs once per game period, driven by the game clock
 * (not by screens or timers), so closing an app, switching maps or reloading cannot repeat or skip a payment.
 *
 *  - The period index is floor(clockMinutes / periodLength). The last period an event ran for is persisted.
 *  - The event's period is recorded BEFORE it runs, so even a crash inside it cannot cause a second run.
 *  - The first time an event is seen it only records the current period (nothing is back-charged).
 *  - If the game was not running, the clock did not advance, so nothing accrues "offline". After a long background
 *    pause the loop applies only part of the elapsed time (see game/loop.ts), and at most MAX_CATCHUP missed
 *    periods are run; older ones are skipped.
 */
interface PeriodicEvent { id: string; length: number; run: (period: number) => void }
const MAX_CATCHUP = 4;

export const PERIODIC_EVENTS: PeriodicEvent[] = [
  { id: 'savings-interest', length: WEEK_MINUTES, run: creditInterest },
  { id: 'weekly-bills', length: WEEK_MINUTES, run: chargeWeeklyBills },
  { id: 'income-tax', length: WEEK_MINUTES, run: chargeIncomeTax },
  // Simulated social activity (see game/social.ts): a player you have not approved tries to contact you.
  { id: 'company-day', length: DAY_MINUTES, run: settleCompanies },
  { id: 'land-growth', length: WEEK_MINUTES, run: growLand },
  { id: 'hustle-market', length: DAY_MINUTES, run: refreshMarket },
  { id: 'sim-contact', length: 2 * DAY_MINUTES, run: simulateContactAttempt },
];

export function runDueEvents() {
  const minutes = useClockStore.getState().minutes;
  const sched = useSchedulerStore.getState();
  for (const ev of PERIODIC_EVENTS) {
    const current = Math.floor(minutes / ev.length);
    const last = useSchedulerStore.getState().last[ev.id];
    if (last === undefined) { sched.mark(ev.id, current); continue; }
    if (current <= last) continue;
    sched.mark(ev.id, current);
    for (let p = Math.max(last + 1, current - MAX_CATCHUP + 1); p <= current; p++) {
      try { ev.run(p); } catch (e) { console.error(`[scheduler] ${ev.id} failed for period ${p}`, e); }
    }
  }
  try { runGrocery(minutes); } catch (e) { console.error('[scheduler] grocery failed', e); }
  try { runLegal(minutes); } catch (e) { console.error('[scheduler] legal failed', e); }
  try { runHustle(minutes); } catch (e) { console.error('[scheduler] hustle failed', e); }
  try { matureBonds(minutes); } catch (e) { console.error('[scheduler] bond maturity failed', e); }
}
