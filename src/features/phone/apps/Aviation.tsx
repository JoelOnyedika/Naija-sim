import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { AIRCRAFT, getAircraft } from '@/data/aircraft';
import { aircraftSalePrice, buyAircraft, hangarHouse, liveryOf, repaintAircraft, sellAircraft, startingLivery, whyNotAircraft } from '@/game/aircraft';
import { useAircraftStore } from '@/stores/aircraftStore';
import { toast } from '@/stores/uiStore';
import { useState } from 'react';
import { Btn, Card, Row } from '../ui';
import { AircraftPaintShop } from './AircraftPaintShop';

const GLYPH = { helicopter: '🚁', plane: '🛩️', jet: '✈️' } as const;

/** Buy helicopters and planes straight from the phone. You need one of the big houses (it has the lawn to park them on). */
export function AviationApp() {
  const owned = useAircraftStore((s) => s.owned), hangar = hangarHouse();
  // Buy opens the paint shop first (name, colours, stripes); the money is only taken when the player confirms there.
  const [shop, setShop] = useState<{ id: string; mode: 'buy' | 'repaint' } | null>(null);
  const openBuy = (id: string) => { const why = whyNotAircraft(id); if (why) { sfx.error(); toast(why, 'bad'); return; } sfx.open(); setShop({ id, mode: 'buy' }); };
  const shopDef = shop ? getAircraft(shop.id) : undefined, shopStart = shop ? (shop.mode === 'repaint' ? liveryOf(shop.id) : startingLivery(shop.id)) : null;
  return (
    <div className="p-3">
      <Card className="mb-3 bg-sky-50 text-sm">
        {hangar ? <><b>Your hangar:</b> {hangar.pads} landing pad{hangar.pads === 1 ? '' : 's'} on your lawn · {owned.length} aircraft parked.</> : <><b>Aircraft need a big house.</b> Only the 4 Bedroom Detached Duplex and the Luxury Duplex have the open ground to park them. Buy one first in the Houses app.</>}
      </Card>
      {owned.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 px-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">Your aircraft (selling pays 70% of what you paid)</p>
          <div className="space-y-2">{owned.map((id) => { const a = getAircraft(id); if (!a) return null; return (
            <Card key={id}><Row glyph={GLYPH[a.kind]} title={a.name} sub={`Sells for ${formatNaira(aircraftSalePrice(id))}`} right={<div className="flex gap-1.5"><Btn tone="light" onClick={() => { sfx.open(); setShop({ id, mode: 'repaint' }); }}>Repaint</Btn><Btn tone="light" onClick={() => { const r = sellAircraft(id); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); } else toast(r.message, 'bad'); }}>Sell</Btn></div>} /></Card>
          ); })}</div>
        </div>
      )}
      <div className="space-y-2">{AIRCRAFT.map((a) => { const why = owned.includes(a.id) ? null : whyNotAircraft(a.id); return (
        <Card key={a.id}>
          <Row glyph={GLYPH[a.kind]} title={a.name} sub={`${a.blurb} ${a.seats} seats · ${a.cruiseKmh} km/h · ${formatNaira(a.price)}`}
            right={owned.includes(a.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Owned</span> : <Btn onClick={() => openBuy(a.id)}>Buy</Btn>} />
          {why && !owned.includes(a.id) && <div className="px-3 pb-2 text-[11.5px] font-semibold text-rose-600">{why}</div>}
        </Card>
      ); })}</div>
      {shop && shopDef && shopStart && (
        <AircraftPaintShop def={shopDef} initial={shopStart} price={shop.mode === 'buy' ? shopDef.price : undefined} confirmLabel={shop.mode === 'buy' ? 'Buy and park it' : 'Save paint job'} onClose={() => setShop(null)}
          onConfirm={(lv) => { const r = shop.mode === 'buy' ? buyAircraft(shop.id, lv) : repaintAircraft(shop.id, lv); if (r.ok) { toast(r.message, 'good'); setShop(null); } else { sfx.error(); toast(r.message, 'bad'); } }} />
      )}
    </div>
  );
}
