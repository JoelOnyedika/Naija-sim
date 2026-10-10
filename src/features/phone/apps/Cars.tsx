import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { copy } from '@/data/copy';
import { VEHICLES } from '@/data/vehicles';
import { useActiveHome } from '@/game/active';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { carSlots } from '@/world/layoutGeometry';
import { Btn, Card, Row } from '../ui';

export function CarsApp() {
  const owned = useVehicleStore((s) => s.owned);
  const home = useActiveHome();
  const slots = home ? carSlots(home.layout).length : 0;
  const buy = (id: string) => {
    const v = VEHICLES.find((x) => x.id === id)!;
    if (!useEconomyStore.getState().debit(v.price, v.name, 'purchase')) { sfx.error(); return toast(copy.broke(), 'bad'); }
    useVehicleStore.getState().add(id); sfx.purchase();
    toast(slots > owned.length ? `${v.name} is parked at home.` : `${v.name} bought. You have no free parking, so it will not show at home.`, 'good');
  };
  return (
    <div className="p-3">
      <Card className="mb-3 bg-sky-50 text-sm"><b>Your home:</b> {slots} parking space{slots === 1 ? '' : 's'} · {owned.length} car{owned.length === 1 ? '' : 's'}. Cars you own are parked where you can see them.</Card>
      <div className="space-y-2">{VEHICLES.map((v) => (
        <Card key={v.id}><Row glyph={v.type === 'keke' ? '🛺' : v.type === 'truck' ? '🛻' : v.type === 'sport' ? '🏎️' : '🚙'} title={v.name} sub={v.blurb} right={owned.includes(v.id) ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Owned</span> : <Btn onClick={() => buy(v.id)}>{formatNaira(v.price)}</Btn>} /></Card>
      ))}</div>
    </div>
  );
}
