import { sfx } from '@/audio/sfx';
import { getJob } from '@/data/jobs';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';

export function jobBlocked(jobId: string): string | null {
  const job = getJob(jobId); const { stats, activity } = useStatsStore.getState();
  if (!job) return 'Job not found';
  if (activity) return 'Finish what you are doing first';
  if (stats.charisma < job.minCharisma) return `Needs ${job.minCharisma} Charisma`;
  if (stats.energy < job.energyCost) return 'Too tired';
  if (stats.hunger < 10) return 'Too hungry';
  return null;
}

export function startShift(jobId: string): boolean {
  const reason = jobBlocked(jobId);
  const job = getJob(jobId);
  if (reason || !job) { sfx.error(); toast(reason ?? 'Job not found', 'bad'); return false; }
  sfx.click();
  return useStatsStore.getState().start({
    label: job.title, seconds: job.seconds, pose: 'stand', kind: 'job', payout: job.salary, event: 'job:shift',
    effects: { energy: -job.energyCost, hunger: -job.hungerCost, charisma: job.charismaGain, hygiene: -4, thirst: -6 },
  });
}
