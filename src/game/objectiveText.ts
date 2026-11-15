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

/** What tapping the important task does: talk to the person (when you are already there), look at the marker, or open the map at the place. */
export type ObjectiveRoute = { kind: 'talk'; castId: string } | { kind: 'marker' } | { kind: 'map'; landmarkId: string | null };
export function objectiveRoute(o: Objective, here: string | undefined): ObjectiveRoute {
  const t = o.target;
  if (here && (t.kind === 'npc' || t.kind === 'point') && t.venue === here) return t.kind === 'npc' ? { kind: 'talk', castId: t.castId } : { kind: 'marker' };
  return { kind: 'map', landmarkId: o.landmarkId ?? (t.kind === 'landmark' ? t.landmarkId : null) };
}
