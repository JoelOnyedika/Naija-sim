import { copy } from '@/data/copy';
import { getVehicle } from '@/data/vehicles';
import { usePropertyStore } from '@/stores/propertyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInteriorStore } from '@/stores/interiorStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { carSlots } from '@/world/layoutGeometry';
import { getLayout, getProperty } from '@/world/registry';
import { priceOf } from './pricing';

export const vehiclePrice = (id: string): number => { const v = getVehicle(id); return v ? priceOf(v.price) : 0; };

/** Free parking spaces at the player's OWN home (not the venue they are standing in). */
export function homeParking(): { spaces: number; owned: number } {
  const id = usePropertyStore.getState().activeId, prop = id ? getProperty(id) : undefined, layout = prop ? getLayout(prop.layoutId) : undefined;
  return { spaces: layout ? carSlots(layout).length : 0, owned: useVehicleStore.getState().owned.length };
}

export type BuyVehicleResult = { ok: true; message: string } | { ok: false; message: string };
/** Buying a car happens at Polanco Motors only: the phone app sends you there, it cannot buy by itself. */
export function buyVehicle(id: string): BuyVehicleResult {
  const here = useInteriorStore.getState().current;
  if (!here || here.kind !== 'showroom') return { ok: false, message: 'Cars are bought at Polanco Motors. Visit the showroom.' };
  const v = getVehicle(id); if (!v) return { ok: false, message: 'That car is not for sale.' };
  if (useVehicleStore.getState().owned.includes(id)) return { ok: false, message: `You already own the ${v.name}.` };
  const paid = useEconomyStore.getState().post({ direction: 'expense', amount: vehiclePrice(id), label: v.name, kind: 'purchase', meta: { opKey: `vehicle:${id}` } });
  if (!paid.ok) return { ok: false, message: paid.reason === 'duplicate' ? 'That sale was already completed.' : copy.broke() };
  const before = homeParking();
  useVehicleStore.getState().add(id);
  return { ok: true, message: before.spaces > before.owned ? `${v.name} is yours, parked at home.` : `${v.name} is yours. You have no free parking, so it will not show at home.` };
}
