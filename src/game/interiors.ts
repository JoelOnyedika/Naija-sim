import { sfx } from '@/audio/sfx';
import { INTERIORS, interiorKindForLandmark, type InteriorKind } from '@/data/interiors';
import { useActorStore } from '@/stores/actorStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { useCameraStore } from '@/stores/cameraStore';
import { getDirectory } from './instances';
import { copy } from '@/data/copy';
import { useEconomyStore } from '@/stores/economyStore';
import { useMapStore } from '@/stores/mapStore';
import { isJailed, resetCrimeVisit } from './crime';
import { fireTask } from './tasks';
import { getLandmark } from '@/world/registry';

const PLAYER_ID = 'me';

export type EnterResult = { ok: true } | { ok: false; reason: string };

/** Walk into a public interior (a landmark's venue, or the jail). Returns why not if the player is busy. */
export function enterInterior(kind: InteriorKind, opts: { landmarkId?: string; name?: string; vehicleId?: string; force?: boolean } = {}): EnterResult {
  const def = INTERIORS[kind];
  if (!opts.force && isJailed() && kind !== 'jail') return { ok: false, reason: 'You are serving time.' };
  if (useStatsStore.getState().activity && !opts.force) return { ok: false, reason: 'Finish what you are doing first' };
  const cur = useInteriorStore.getState().current;
  if (cur) getDirectory().leave(cur.kind, PLAYER_ID);
  const j = getDirectory().join(kind, PLAYER_ID);
  const name = opts.name ?? (opts.landmarkId ? getLandmark(opts.landmarkId)?.name : undefined) ?? def.label;
  resetCrimeVisit();
  useActorStore.getState().clearOrder();
  useCameraStore.getState().clearFocus();
  useInteriorStore.getState().set({ kind, name, landmarkId: opts.landmarkId, instance: j.instance, npcCount: j.npcCount, seed: (j.instance * 7919 + kind.length * 104729) >>> 0, vehicleId: opts.vehicleId });
  const ui = useUiStore.getState(); ui.setMode('home'); ui.setSceneLoading(true);
  sfx.open();
  fireTask(`interior:${kind}`);
  return { ok: true };
}

/** Enter the venue behind a landmark, if it has one. */
export function enterLandmark(landmarkId: string, vehicleId?: string): EnterResult {
  const kind = interiorKindForLandmark(landmarkId);
  return kind ? enterInterior(kind, { landmarkId, vehicleId }) : { ok: false, reason: 'This place has no inside yet' };
}

/** Go back to your own home. */
export function leaveInterior(): void {
  const cur = useInteriorStore.getState().current; if (!cur) return;
  if (isJailed()) { toast('You are serving time. No leaving early.', 'bad'); return; }
  if (useStatsStore.getState().activity) { toast('Finish what you are doing first', 'bad'); return; }
  getDirectory().leave(cur.kind, PLAYER_ID);
  useActorStore.getState().clearOrder();
  useInteriorStore.getState().set(null);
  useUiStore.getState().setSceneLoading(true);
  sfx.pop();
}

/** Go to a landmark's venue from anywhere (the phone uses this). Same rules as the map: busy, jail, entry fee. */
export function travelToVenue(landmarkId: string, vehicleId?: string): EnterResult {
  const lm = getLandmark(landmarkId); const kind = interiorKindForLandmark(landmarkId);
  if (!lm || !kind) return { ok: false, reason: 'This place has no inside yet' };
  if (isJailed()) return { ok: false, reason: 'You are serving time.' };
  if (useStatsStore.getState().activity) return { ok: false, reason: 'Finish what you are doing first' };
  const fee = lm.visit.cost;
  if (fee > 0 && !useEconomyStore.getState().debit(fee, `Entry: ${lm.name}`, 'visit')) return { ok: false, reason: copy.broke() };
  useMapStore.getState().recordVisit(landmarkId);
  return enterLandmark(landmarkId, vehicleId);
}
