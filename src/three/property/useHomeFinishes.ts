import { getFinish, type FloorFinish, type WallFinishDef } from '@/data/finishes';
import { effectiveFinishes, useFinishStore } from '@/stores/finishStore';

/** The floor and wall finish to draw for a home (the live preview wins over what is saved). */
export function useHomeFinishes(propertyId: string): { floor?: FloorFinish; wall?: WallFinishDef } {
  const applied = useFinishStore((s) => s.byProperty[propertyId]);
  const preview = useFinishStore((s) => s.preview);
  const eff = effectiveFinishes(applied, preview);
  const floor = eff.floor ? getFinish(eff.floor) : undefined;
  const wall = eff.wall ? getFinish(eff.wall) : undefined;
  return { floor: floor?.kind === 'floor' ? floor : undefined, wall: wall?.kind === 'wall' ? wall : undefined };
}

/** Only the player's own rooms are finished: not yards, verandas or the neighbours' rooms. */
export const isFinishable = (z?: { indoor: boolean; kind: string }) => !!z && z.indoor && z.kind !== 'neighbour';
