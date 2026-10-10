import { sfx } from '@/audio/sfx';
import { useEconomyStore } from '@/stores/economyStore';
import { useStatsStore } from '@/stores/statsStore';
import { useTaskStore } from '@/stores/taskStore';
import { toast } from '@/stores/uiStore';

/** Fire a game event ("visit:art", "buy:furniture"). Completes matching tasks and pays their rewards. */
export function fireTask(event: string) {
  for (const t of useTaskStore.getState().fire(event)) {
    if (t.reward.money) useEconomyStore.getState().credit(t.reward.money, `Task: ${t.title}`, 'reward');
    useStatsStore.getState().apply({ charisma: t.reward.charisma, social: t.reward.social });
    toast(`Task done: ${t.title} (${t.rewardLabel})`, 'good');
    sfx.reward();
  }
}
