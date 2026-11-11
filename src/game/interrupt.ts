import { sfx } from '@/audio/sfx';
import { useActorStore } from '@/stores/actorStore';
import { useQueueStore } from '@/stores/queueStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';

/**
 * Going somewhere else stops whatever you are doing. Call this where a trip, a venue change or leaving a venue starts, instead of
 * refusing with "finish what you are doing first". What the activity already gave (needs bars move a little every second) is kept;
 * a payout that comes only at the end is not paid, and queued next-activities are dropped. Returns true when something was stopped.
 */
export function interruptActivity(): boolean {
  const s = useStatsStore.getState(), a = s.activity; if (!a) return false;
  s.stop();
  useQueueStore.getState().clear();
  useActorStore.getState().clearOrder();
  toast(`Stopped: ${a.label}`, 'info'); sfx.pop();
  return true;
}
