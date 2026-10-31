import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGameSpan } from '@/core/gameTime';
import { cityName } from '@/data/land';
import { DESTINATIONS, METHODS, getDestination, type Destination } from '@/data/ride';
import { CITY_CATALOG } from '@/content/cities';
import { doActivity, goHome, travel, travelBlocker, type Result } from '@/game/ride';
import { currentStateId } from '@/stores/mapStore';
import { useRideStore } from '@/stores/rideStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { planTrip, type TripPlan, type TripPlace } from '@/features/travel/plan';
import { TravelScene } from '@/features/travel/TravelScene';
import { Btn, Card, Chip, EmptyState, Note, Row, SearchField } from '../../ui';

const say = (r: Result, ok: string) => { if (r.ok) { sfx.pop(); toast(ok, 'good'); } else { sfx.error(); toast(r.error, 'bad'); } };
/** What kind of building to show at the end of the trip for each Ride destination type. */
const RIDE_PLACE: Record<Destination['category'], TripPlace['category']> = { Market: 'market', Food: 'food', Work: 'business', Fitness: 'recreation', Nightlife: 'club', Outdoors: 'park', Shopping: 'shopping' };
const CATS = ['All', 'Food', 'Market', 'Work', 'Fitness', 'Nightlife', 'Outdoors', 'Shopping'] as const;

function Detail({ d, back }: { d: Destination; back: () => void }) {
  const at = useRideStore((s) => s.at), money = useEconomyStore((s) => s.money), here = at === d.id;
  const [trip, setTrip] = useState<{ plan: TripPlan; arrivedMsg: string } | null>(null);
  // The fare, time and stats are settled by travel() as before; the animation then plays on top and the toast shows when it ends.
  const go = (m: (typeof METHODS)[number]) => {
    const r = travel(d.id, m.id); if (!r.ok) return say(r, '');
    const place: TripPlace = { id: `ride.${d.id}`, name: d.name, icon: d.glyph, category: RIDE_PLACE[d.category] };
    setTrip({ plan: planTrip({ modeId: m.id === 'walk' ? 'trek' : m.id, seconds: 4, landmark: place }), arrivedMsg: `You arrived at ${d.name}` });
  };
  return (
    <div className="p-3">
      <button onClick={back} className="mb-2 text-sm font-bold text-accent">‹ Places</button>
      <Card><div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl">{d.glyph}</span><div><h2 className="font-display text-lg font-extrabold leading-tight">{d.name}</h2><p className="text-xs text-slate-500">{cityName(d.cityId)} · {d.category}</p></div></div>
        <p className="mt-2 text-[13.5px] text-slate-700">{d.blurb}</p>{here && <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[12.5px] font-bold text-emerald-700">You are here</p>}</Card>
      {here ? (<>
        <p className="mb-1 mt-4 px-1 text-sm font-bold">What you can do here</p>
        <div className="space-y-2">{d.activities.map((a) => <Card key={a.id}><Row glyph="✨" title={a.label} sub={`${fmtGameSpan(a.minutes)}${a.note ? ` · ${a.note}` : ''}`} right={<Btn onClick={() => say(doActivity(d.id, a), `${a.label}: done`)} disabled={a.cost > money}>{a.cost ? formatNaira(a.cost) : 'Free'}</Btn>} /></Card>)}</div>
        <Btn tone="light" className="mt-3 w-full" onClick={() => say(goHome(), 'You are back home')}>Head home</Btn>
      </>) : (<>
        <p className="mb-1 mt-4 px-1 text-sm font-bold">How do you want to go?</p>
        <div className="space-y-2">{METHODS.map((m) => { const why = travelBlocker(d.id, m.id); return (
          <Card key={m.id}><Row glyph={m.glyph} title={m.label} sub={`${m.minutes[d.distance]} game min · ${m.blurb}`} right={<Btn tone={why ? 'light' : 'dark'} disabled={!!why} onClick={() => go(m)}>{m.fare[d.distance] ? formatNaira(m.fare[d.distance]) : 'Free'}</Btn>} />{why && <p className="mt-1 text-[11.5px] text-slate-500">{why}</p>}</Card>); })}</div>
      </>)}
      {trip && <TravelScene key={trip.plan.key} plan={trip.plan} onDone={() => { sfx.pop(); toast(trip.arrivedMsg, 'good'); setTrip(null); }} />}
      <Note>Trips are simulated: you pay, time passes and your stats change, but your character stays put in the 3D world. Fares and times are game rules.</Note>
    </div>
  );
}

/** Ride: destinations in the city you are in, with simulated travel. Data in data/ride.ts, rules in game/ride.ts. */
export function RideApp() {
  const [city, setCity] = useState(currentStateId()), [cat, setCat] = useState<(typeof CATS)[number]>('All'), [q, setQ] = useState(''), [open, setOpen] = useState<string | null>(null);
  const at = useRideStore((s) => s.at), here = at ? getDestination(at) : null;
  const d = open ? getDestination(open) : null;
  if (d) return <Detail d={d} back={() => setOpen(null)} />;
  const n = q.trim().toLowerCase();
  const list = DESTINATIONS.filter((x) => x.cityId === city && (cat === 'All' || x.category === cat) && (!n || `${x.name} ${x.blurb}`.toLowerCase().includes(n)));
  return (
    <div className="p-3">
      <Card className={here ? 'bg-emerald-50' : ''}><p className="text-sm font-bold">{here ? `📍 At ${here.name}` : '🏠 You are at home'}</p>{here && <Btn tone="light" className="mt-2 w-full" onClick={() => say(goHome(), 'You are back home')}>Head home</Btn>}</Card>
      <div className="mt-3"><SearchField label="Search places" value={q} onChange={setQ} placeholder="Search places" /></div>
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="City">{CITY_CATALOG.map((c) => <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>{c.name}{c.id === currentStateId() ? ' 📍' : ''}</Chip>)}</div>
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Category">{CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      {city !== currentStateId() && <Note>You are on the {cityName(currentStateId())} map, so you cannot ride to {cityName(city)} yet.</Note>}
      <div className="mt-2 space-y-2">
        {list.length === 0 && <Card><EmptyState glyph="🗺️" title="No places match">Try another category or city.</EmptyState></Card>}
        {list.map((x) => <Card key={x.id}><button className="w-full text-left" onClick={() => { sfx.click(); setOpen(x.id); }} aria-label={`${x.name}, details`}><Row glyph={x.glyph} title={x.name} sub={`${x.category} · ${x.blurb}`} right={<span className="text-slate-400">›</span>} /></button></Card>)}
      </div>
    </div>
  );
}
