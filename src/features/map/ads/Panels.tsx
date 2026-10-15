import { Anchor, MapPin, Megaphone } from 'lucide-react';
import { useMemo } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { billboardSlots, seaSlots, slotAvailability } from '@/game/ads/slots';
import { useAdsStore } from '@/stores/adsStore';
import { useAdsUiStore } from '@/stores/adsUiStore';
import { useMapStore } from '@/stores/mapStore';
import { propertiesOfState } from '@/world/registry';
import type { StateDefinition } from '@/types/world';
import { Button } from '@/ui/Button';
import { AdRow, Price, timeLeft, useNow } from './common';
import { Moderation } from './Moderation';
import { Rules } from './Rules';

/** Ads category: every physical billboard slot with its own identity, size, availability and price. */
export function BillboardPanel({ state }: { state: StateDefinition }) {
  const slots = useMemo(() => billboardSlots(state), [state]);
  const subs = useAdsStore((s) => s.submissions);
  const now = useNow(1000);
  const mine = subs.filter((s) => s.kind === 'billboard' && s.stateId === state.id);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm text-white/80"><Megaphone size={16} className="mt-0.5 shrink-0 text-danfo" /><p>Roadside billboards across {state.name}. Tap one to see it in the city and rent it. Each board is its own placement with its own price.</p></div>
      <div className="space-y-1.5">
        {slots.map((b) => {
          const a = slotAvailability(subs, 'billboard', b.id, now), until = a.by?.expiresAt;
          return (
            <button key={b.id} onClick={() => { sfx.pop(); useAdsUiStore.getState().openSheet({ type: 'billboard', slotId: b.id }); }} className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danfo/15 text-lg" aria-hidden>🪧</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{b.name}</span><span className="block truncate text-[11px] font-semibold text-danfo">📍 {b.location}</span><span className="block truncate text-[11px] text-white/55">{b.road ? `${b.road} · ` : ''}{b.sizeLabel}</span></span>
              <span className="shrink-0 text-right"><Price n={b.price} /><span className="block text-[10px] text-white/50">{Math.round(b.durationMs / 86_400_000)} days</span>
                <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${a.state === 'available' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{a.state === 'available' ? '✓ Available' : a.state === 'reserved' ? '⏳ Reserved' : `✕ Booked${until ? ` · ${timeLeft(until - now)}` : ''}`}</span></span>
            </button>
          );
        })}
      </div>
      <Button className="w-full" onClick={() => useAdsUiStore.getState().startWizard({ kind: 'billboard', slotId: null })}>Advertise your business</Button>
      {mine.length > 0 && <MyAds list={mine} now={now} />}
      <Rules cfg={state.ads!} /><Moderation />
    </div>
  );
}

/** Sea category: floating ads on the actual water. */
export function SeaPanel({ state }: { state: StateDefinition }) {
  const cfg = state.ads!;
  const slots = useMemo(() => seaSlots(state), [state]);
  const subs = useAdsStore((s) => s.submissions);
  const tick = useAdsStore((s) => s.tick);
  const now = useNow(1000);
  const taken = useMemo(() => slots.filter((s) => slotAvailability(subs, 'sea', s.id, Date.now()).state !== 'available').length, [slots, subs, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = subs.filter((s) => s.kind === 'sea' && s.stateId === state.id);
  const prices = cfg.seaTiers.map((t) => t.price);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm text-white/80"><Anchor size={16} className="mt-0.5 shrink-0 text-danfo" /><p>The water around {state.name} is one big advertising zone. Your image floats on the real sea for {cfg.seaDurationDays} days, in a position you choose.</p></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass rounded-2xl p-2"><div className="font-display text-lg font-extrabold">{slots.length - taken}</div><div className="text-[10px] text-white/60">free positions</div></div>
        <div className="glass rounded-2xl p-2"><div className="font-display text-lg font-extrabold">{taken}</div><div className="text-[10px] text-white/60">taken</div></div>
        <div className="glass rounded-2xl p-2"><div className="font-display text-sm font-extrabold text-danfo">{formatNaira(Math.min(...prices))}–{formatNaira(Math.max(...prices))}</div><div className="text-[10px] text-white/60">per {cfg.seaDurationDays} days</div></div>
      </div>
      <ul className="space-y-1 text-xs text-white/70">{cfg.seaTiers.map((t) => <li key={t.id} className="flex justify-between"><span>{t.label}</span><b>{formatNaira(t.price)}</b></li>)}</ul>
      <Button className="w-full" onClick={() => useAdsUiStore.getState().startWizard({ kind: 'sea', slotId: null })}>Create a Sea Ad</Button>
      {mine.length > 0 && <MyAds list={mine} now={now} />}
      <Rules cfg={cfg} /><Moderation />
    </div>
  );
}

function MyAds({ list, now }: { list: ReturnType<typeof useAdsStore.getState>['submissions']; now: number }) {
  return (
    <div className="space-y-1.5"><div className="text-xs font-extrabold uppercase tracking-wide text-white/50">My ads</div>
      {[...list].reverse().map((a) => (
        <AdRow key={a.id} ad={a} now={now} onClick={() => useAdsUiStore.getState().openSheet(a.kind === 'sea' ? { type: 'sea', submissionId: a.id } : { type: 'billboard', slotId: a.slotId })}
          extra={a.status === 'draft' ? <span className="text-[11px] font-bold text-white/60" onClick={(e) => { e.stopPropagation(); useAdsStore.getState().discard(a.id); }} role="button">Discard</span> : undefined} />
      ))}
    </div>
  );
}

/** Government category: the civic landmarks already in the state's data. It lists and focuses them, nothing more. */
export function GovernmentPanel({ state }: { state: StateDefinition }) {
  const list = state.mapData.landmarks.filter((l) => l.category === 'government');
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/80">Civic landmarks in {state.name}. Tap one to fly there and read about it. Other government features are not built yet.</p>
      {!list.length && <p className="rounded-2xl bg-white/[0.06] p-3 text-sm text-white/60">No government landmarks in this city yet.</p>}
      {list.map((l) => (
        <button key={l.id} onClick={() => { sfx.pop(); useMapStore.getState().selectLandmark(l.id); }} className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danfo/15 text-xl">{l.icon}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{l.name}</span><span className="block truncate text-[11px] text-white/60">{l.tagline}</span></span>
          <MapPin size={14} className="text-white/40" />
        </button>
      ))}
    </div>
  );
}

/** Neighbours: the state's named areas (neighbourhoods) with how many homes each has. Tapping flies there and opens the area card. */
export function NeighboursPanel({ state }: { state: StateDefinition }) {
  const props = propertiesOfState(state.id);
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/80">The neighbourhoods of {state.name}. Tap one to fly there and see the homes you can buy.</p>
      {state.areas.map((a) => {
        const homes = props.filter((p) => p.areaId === a.id);
        return (
          <button key={a.id} onClick={() => { sfx.pop(); useMapStore.getState().selectArea(a.id); }} className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left">
            <span className="h-10 w-2.5 shrink-0 rounded-full" style={{ background: a.mapData.color }} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{a.name}</span><span className="block truncate text-[11px] text-white/60">{a.tagline}</span></span>
            <span className="shrink-0 text-right text-[11px] font-bold text-white/70">{homes.length ? `${homes.length} home${homes.length > 1 ? 's' : ''}` : 'No homes yet'}</span>
          </button>
        );
      })}
    </div>
  );
}
