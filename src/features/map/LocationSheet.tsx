import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { copy } from '@/data/copy';
import { INTERIORS, interiorKindForLandmark } from '@/data/interiors';
import { usesOf } from '@/data/activities';
import { getFurniture } from '@/data/items';
import { makeNpcs } from '@/data/npcs';
import { VEHICLES, getVehicle } from '@/data/vehicles';
import { CarImage } from '@/features/game/CarCards';
import { formatNaira } from '@/core/format';
import { isJailed } from '@/game/crime';
import { travelToVenue } from '@/game/interiors';
import { useEconomyStore } from '@/stores/economyStore';
import { useStatsStore } from '@/stores/statsStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { toast } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { getArea } from '@/world/registry';
import type { LandmarkDefinition } from '@/types/world';

/** The ways to get there. Prices are in-game naira. Your own cars are free (and the driving animation comes later). */
export interface Mode { id: string; glyph: string; label: string; cost: number; seconds: number; vehicleId?: string }
export const TRAVEL_MODES: Mode[] = [
  { id: 'trek', glyph: '🚶', label: 'Trek', cost: 0, seconds: 5 },
  { id: 'keke', glyph: '🛺', label: 'Keke', cost: 150, seconds: 4.5 },
  { id: 'danfo', glyph: '🚌', label: 'Danfo', cost: 150, seconds: 4.5 },
  { id: 'okada', glyph: '🏍️', label: 'Okada', cost: 250, seconds: 4 },
  { id: 'cab', glyph: '🚕', label: 'Cab', cost: 500, seconds: 4 },
];
const BODY_GLYPH: Record<string, string> = { sedan: '🚗', truck: '🛻', keke: '🛺', suv: '🚙', sports: '🏎️', bus: '🚐' };

/**
 * What you see when you tap a place on the map: its name and area, what it is, what you can do there, who is in, and how you
 * want to get there. Going costs the fare (and the entry fee, if any); a loading scene plays while you travel.
 */
export function LocationSheet({ landmark, onClose, onTravel }: { landmark: LandmarkDefinition; onClose: () => void; onTravel: (m: Mode, go: () => void) => void }) {
  const kind = interiorKindForLandmark(landmark.id), def = kind ? INTERIORS[kind] : null;
  const owned = useVehicleStore((s) => s.owned);
  const money = useEconomyStore((s) => s.money);
  const modes = useMemo<Mode[]>(() => {
    const own: Mode[] = [];
    for (const id of owned) { const v = VEHICLES.find((x) => x.id === id); if (v) own.push({ id: `own:${id}`, glyph: BODY_GLYPH[v.type] ?? '🚘', label: v.name.replace(/ \(.*\)/, ''), cost: 0, seconds: 5, vehicleId: id }); }
    return [...TRAVEL_MODES, ...own];
  }, [owned]);
  const [pick, setPick] = useState('trek'), [carsOpen, setCarsOpen] = useState(false), [more, setMore] = useState(false);
  const mode = modes.find((m) => m.id === pick) ?? modes[0];
  const area = landmark.areaId ? getArea(landmark.areaId) : undefined;
  const fee = landmark.visit.cost;
  const spots = useMemo(() => {
    if (!def) return [];
    const seen = new Set<string>(), out: { glyph: string; name: string }[] = [];
    for (const it of def.items) { const f = getFurniture(it.defId); if (!f || seen.has(f.id) || !usesOf(f).length) continue; seen.add(f.id); out.push({ glyph: f.glyph, name: f.name }); }
    return out;
  }, [def]);
  const people = useMemo(() => (def ? makeNpcs(def.kind, 1, Math.min(4, def.npcTarget)) : []), [def]);
  const go = () => {
    if (isJailed()) { sfx.error(); return toast('You are serving time.', 'bad'); }
    if (useStatsStore.getState().activity) { sfx.error(); return toast('Finish what you are doing first', 'bad'); }
    if (money < mode.cost + fee) { sfx.error(); return toast(copy.broke(), 'bad'); }
    if (mode.cost > 0) useEconomyStore.getState().debit(mode.cost, `${mode.label} to ${landmark.name}`, 'visit');
    sfx.open();
    onTravel(mode, () => { const r = travelToVenue(landmark.id, mode.vehicleId); if (!r.ok) { if (mode.cost > 0) useEconomyStore.getState().credit(mode.cost, 'Fare refunded', 'refund'); sfx.error(); toast(r.reason, 'bad'); } });
  };
  const standard = modes.filter((m) => !m.vehicleId), mine = modes.filter((m) => m.vehicleId), pickedCar = mode.vehicleId ? getVehicle(mode.vehicleId) : undefined;
  const goLabel = `Go \u00b7 ${mode.cost ? formatNaira(mode.cost) : 'Free'}${fee ? ` + ${formatNaira(fee)} entry` : ''}`;
  // A bottom sheet that never takes over the screen: a fixed header and Go button, and only the middle scrolls.
  return (
    <div className="flex max-h-[52vh] flex-col">
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-danfo/20 text-2xl">{landmark.icon}</span>
        <div className="min-w-0 flex-1"><div className="truncate font-display text-lg font-bold leading-tight">{landmark.name}</div><div className="truncate text-[13px] font-semibold text-white/55">{area?.name ?? ''}</div></div>
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 active:bg-white/20">{'\u2715'}</button>
      </div>
      <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
        <p className={`text-[13.5px] leading-snug text-white/80 ${more ? '' : 'line-clamp-2'}`}>{landmark.description}</p>
        {(spots.length > 0 || people.length > 0) && (
          <button onClick={() => setMore(!more)} className="mt-1 text-[12.5px] font-bold text-sky-300">{more ? 'Show less' : `What is here (${spots.length + people.length})`}</button>
        )}
        {more && (
          <div className="mt-1.5">
            {spots.length > 0 && <div className="flex flex-wrap gap-1.5">{spots.slice(0, 9).map((sp) => <span key={sp.name} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold">{sp.glyph} {sp.name}</span>)}</div>}
            {people.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{people.map((pp) => <span key={pp.id} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-[12.5px] font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: pp.appearance.topColor }}>{pp.name[0]}</span>{pp.name}</span>)}</div>}
          </div>
        )}
        <div className="mt-3 text-[12px] font-bold text-white/60">How do you want to go?</div>
        <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto pb-1">
          {standard.map((m) => (
            <button key={m.id} aria-pressed={pick === m.id} onClick={() => { sfx.click(); setPick(m.id); setCarsOpen(false); }} className={`flex w-[4.4rem] shrink-0 flex-col items-center rounded-2xl border-2 px-1.5 py-2 ${pick === m.id ? 'border-sky-400 bg-sky-400/15' : 'border-transparent bg-white/10'}`}>
              <span className="text-2xl">{m.glyph}</span><span className="mt-0.5 text-center text-[12px] font-bold leading-tight">{m.label}</span><span className="text-[11px] text-white/55">{m.cost ? formatNaira(m.cost) : 'Free'}</span>
            </button>
          ))}
          {mine.length > 0 && (
            <button aria-expanded={carsOpen} onClick={() => { sfx.click(); setCarsOpen(!carsOpen); if (!mode.vehicleId) setPick(mine[0].id); }} className={`flex w-[5.6rem] shrink-0 flex-col items-center rounded-2xl border-2 px-1.5 py-2 ${mode.vehicleId ? 'border-sky-400 bg-sky-400/15' : 'border-transparent bg-white/10'}`}>
              <span className="text-2xl">{'\u{1F698}'}</span><span className="mt-0.5 line-clamp-2 text-center text-[12px] font-bold leading-tight">{pickedCar ? pickedCar.name : `My cars (${mine.length})`}</span><span className="text-[11px] text-white/55">Free {carsOpen ? '\u25B4' : '\u25BE'}</span>
            </button>
          )}
        </div>
        {carsOpen && mine.length > 0 && (
          <div className="no-scrollbar mt-1.5 max-h-52 space-y-1.5 overflow-y-auto overscroll-contain rounded-2xl bg-black/25 p-1.5">
            {mine.map((m) => { const v = getVehicle(m.vehicleId!); if (!v) return null; const on = pick === m.id; return (
              <button key={m.id} onClick={() => { sfx.click(); setPick(m.id); setCarsOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-xl border-2 p-1.5 text-left ${on ? 'border-sky-400 bg-sky-400/15' : 'border-transparent bg-white/[0.07]'}`}>
                <div className="w-20 shrink-0"><CarImage car={v} /></div><div className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{v.name}</div>{on && <span className="pr-1 text-sky-300">{'\u2713'}</span>}
              </button>
            ); })}
          </div>
        )}
      </div>
      <Button className="mt-2 w-full shrink-0" onClick={go}>{goLabel}</Button>
    </div>
  );
}
