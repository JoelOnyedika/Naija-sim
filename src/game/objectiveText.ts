import { fmtGame } from '@/core/gameTime';
import type { Objective } from '@/stores/objectiveStore';

const fmtSpan = (m: number) => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h ? `${h}h ${r}m` : `${r}m`; };
/** Status line for a timed objective: a countdown before it opens, "open now" inside the window, "missed" after. */
export function timeStatus(o: Objective, now: number): string | null {
  if (o.at === undefined) return null;
  if (now < o.at) return `Starts in ${fmtSpan(o.at - now)} (${fmtGame(o.at).split(', ')[1] ?? ''})`;
  if (o.until !== undefined && now <= o.until) return `Open now. Closes in ${fmtSpan(o.until - now)}`;
  return 'Missed';
}
