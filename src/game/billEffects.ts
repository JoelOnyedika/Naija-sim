import { notify } from './notify';
import { useBankStore } from '@/stores/bankStore';
import { usePowerStore } from '@/stores/powerStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';

/**
 * What an unpaid bill does to your life. An overdue ELECTRICITY bill means NEPA disconnects you: the house stays in an outage (so
 * only solar, a generator or an Ibeta keep it lit) until the bill is paid in the Bank app. An overdue DATA bill drags your mood
 * down a little every second until you pay. Nothing is ever taken beyond your balance (the rules in game/banking.ts).
 */
export const isOverdue = (defId: string): boolean => useBankStore.getState().bills.some((b) => b.defId === defId && b.status === 'overdue');

/** Mood lost per second while the data bundle is unpaid. Small on purpose. */
export const DATA_MOOD_DRAIN = 0.03;

const flags = { cut: false, noData: false };
export const resetBillEffects = () => { flags.cut = false; flags.noData = false; };

/** NEPA cut-off: returns true while the light is cut (the caller must then skip the normal outage schedule). */
export function stepDisconnect(hasPublicPower: boolean): boolean {
  const cut = hasPublicPower && isOverdue('electricity');
  const ps = usePowerStore.getState();
  if (cut) {
    if (!ps.outage) ps.force(true);
    if (!flags.cut) { flags.cut = true; notify({ title: 'NEPA don cut your light', body: 'Your electricity bill is overdue. Pay it in the Bank app, under Bills.', icon: '🔌', appId: 'bank' }); }
    return true;
  }
  if (flags.cut) { flags.cut = false; ps.force(false); toast('NEPA don restore your light. Thank you for paying.', 'good'); }
  return false;
}

/** Overdue data bundle: a slow mood drain with one warning per spell. */
export function stepNoData(dt: number): void {
  const out = isOverdue('data');
  if (out) {
    useStatsStore.getState().apply({ happiness: -DATA_MOOD_DRAIN * dt });
    if (!flags.noData) { flags.noData = true; notify({ title: 'Your data don finish', body: 'The data bundle is overdue and your mood is dropping. Pay it in the Bank app, under Bills.', icon: '📶', appId: 'bank' }); }
  } else if (flags.noData) { flags.noData = false; toast('Data is back. You are online again.', 'good'); }
}
