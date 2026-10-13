import { useMemo } from 'react';
import { getFinish, type FloorFinish, type WallFinishDef } from '@/data/finishes';
import { effectiveWall, floorIdForZone, useFinishStore } from '@/stores/finishStore';
import type { PropertyLayout, Zone } from '@/types/world';
import { roomIdByZone } from '@/world/layoutGeometry';

/** The wall finish to draw for a home (the live preview wins over what is saved). */
export function useHomeFinishes(propertyId: string): { wall?: WallFinishDef } {
  const applied = useFinishStore((s) => s.byProperty[propertyId]);
  const preview = useFinishStore((s) => s.preview);
  const wall = getFinish(effectiveWall(applied, preview) ?? '');
  return { wall: wall?.kind === 'wall' ? wall : undefined };
}

/** The floor finish for one zone. Each room resolves on its own, so changing one room never touches another. */
export function useZoneFloor(layout: PropertyLayout, zone: Zone): FloorFinish | undefined {
  const applied = useFinishStore((s) => s.byProperty[layout.id]);
  const preview = useFinishStore((s) => s.preview);
  const rooms = useMemo(() => roomIdByZone(layout), [layout]);
  const f = getFinish(floorIdForZone(applied, preview, rooms.get(zone.id), zone.kind) ?? '');
  return f?.kind === 'floor' ? f : undefined;
}

/** Only the player's own rooms are finished: not yards, verandas or the neighbours' rooms. */
export const isFinishable = (z?: { indoor: boolean; kind: string }) => !!z && z.indoor && z.kind !== 'neighbour';
