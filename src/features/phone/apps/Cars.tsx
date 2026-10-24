import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { VEHICLES } from '@/data/vehicles';
import { homeParking, vehiclePrice } from '@/game/vehicles';
import { travelToVenue } from '@/game/interiors';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { Btn, Card, Row } from '../ui';

const POLANCO = 'lagos.polanco';

/**
 * Browse cars on the phone, but BUY them at Polanco Motors: picking one asks whether to go to the showroom, and if you say yes the
 * phone closes and you arrive there with that car selected. The phone itself cannot complete a purchase.
 */
export function CarsApp() {
  const owned = useVehicleStore((s) => s.owned);
  const [pick, setPick] = useState<string | null>(null);
  const { spaces } = homeParking();
  const car = VEHICLES.find((v) => v.id === pick);
  const go = () => {
    if (!car) return;
    const r = travelToVenue(POLANCO, car.id);
    if (!r.ok) { sfx.error(); toast(r.reason, 'bad'); setPick(null); return; }
    setPick(null); usePhoneStore.getState().closePhone();
  };
  return (
    <div className="p-3">
      <Card className="mb-3 bg-sky-50 text-sm"><b>Your home:</b> {spaces} parking space{spaces === 1 ? '' : 's'} · {owned.length} car{owned.length === 1 ? '' : 's'}. Cars are bought in person at Polanco Motors.</Card>
      <div className="space-y-2">{VEHICLES.map((v) => (
        <Card key={v.id}><Row glyph={v.type === 'keke' ? '🛺' : v.type === 'truck' ? '🛻' : v.type === 'sport' ? '🏎️' : '🚙'} title={v.name} sub={`${v.blurb} ${formatNaira(vehiclePrice(v.id))}`} right={owned.includes(v.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Owned</span> : <Btn onClick={() => setPick(v.id)}>View</Btn>} /></Card>
      ))}</div>
      {car && (
        <div role="dialog" aria-label="Visit Polanco Motors" className="absolute inset-0 z-20 flex items-end bg-black/40 p-3" onClick={() => setPick(null)}>
          <Card className="w-full" >
            <div onClick={(e) => e.stopPropagation()}>
              <p className="font-display text-base font-extrabold">Visit Polanco Motors?</p>
              <p className="mt-1 text-sm text-slate-600">The {car.name} costs {formatNaira(vehiclePrice(car.id))}. You buy it at the showroom, where you can see it first.</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><Btn tone="light" onClick={() => setPick(null)}>Not now</Btn><Btn onClick={go}>Go there</Btn></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
