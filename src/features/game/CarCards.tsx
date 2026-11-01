import { sfx } from '@/audio/sfx';
import { assetUrl } from '@/core/assets';
import { formatNaira } from '@/core/format';
import { VEHICLES, getVehicle, type VehicleDef } from '@/data/vehicles';
import { salePrice, sellVehicle, vehiclePrice } from '@/game/vehicles';
import { toast, useUiStore } from '@/stores/uiStore';
import { useVehicleStore } from '@/stores/vehicleStore';

/** The car's picture (made from its 3D model, see tools/make-car-thumbs.py). It costs nothing to draw, unlike a second 3D view. */
export function CarImage({ car, className = '' }: { car: Pick<VehicleDef, 'model' | 'name'>; className?: string }) {
  return <img src={assetUrl(`models/cars/thumbs/${car.model}.webp`)} alt={car.name} loading="lazy" draggable={false} className={`aspect-[8/5] w-full object-contain ${className}`} />;
}

/** Dealership "Buy cars" list: every car with its picture and price. Tapping one opens its sheet to buy. */
export function BuyCarCards({ onPick }: { onPick: () => void }) {
  const owned = useVehicleStore((s) => s.owned);
  return (
    <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
      {VEHICLES.map((v) => (
        <button key={v.id} onClick={() => { sfx.click(); useUiStore.getState().setShowroomVehicle(v.id); onPick(); }} className="flex w-[11.75rem] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-2 text-left active:bg-white/10">
          <CarImage car={v} className="rounded-xl bg-gradient-to-b from-white/10 to-transparent" />
          <span className="mt-1 truncate text-[13px] font-bold">{v.name}</span>
          <span className="text-[12px] font-semibold text-danfo">{formatNaira(vehiclePrice(v.id))}</span>
          {owned.includes(v.id) && <span className="text-[11px] font-semibold text-emerald-300">You own this</span>}
        </button>
      ))}
    </div>
  );
}

/** Dealership "Sell cars" list: the cars you own and what the trade-in desk pays (70% of what you paid). */
export function SellCarCards() {
  const owned = useVehicleStore((s) => s.owned);
  if (!owned.length) return <p className="mt-1.5 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[12px] text-white/70">You do not own any cars yet. Buy one first, then you can sell it here.</p>;
  return (
    <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
      {owned.map((id) => { const v = getVehicle(id); if (!v) return null; return (
        <div key={id} className="flex w-[11.75rem] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-2">
          <CarImage car={v} className="rounded-xl bg-gradient-to-b from-white/10 to-transparent" />
          <span className="mt-1 truncate text-[13px] font-bold">{v.name}</span>
          <span className="text-[11px] text-white/60">Trade-in pays 70% of what you paid</span>
          <button onClick={() => { const r = sellVehicle(id); if (r.ok) { sfx.purchase(); toast(r.message, 'good'); } else { sfx.error(); toast(r.message, 'bad'); } }} className="mt-1.5 h-9 rounded-xl bg-rose-500/90 text-[13px] font-extrabold">Sell for {formatNaira(salePrice(id))}</button>
        </div>
      ); })}
    </div>
  );
}
