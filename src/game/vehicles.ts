import { copy } from '@/data/copy';
import { formatNaira } from '@/core/format';
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
  const paid = useEconomyStore.getState().post({ direction: 'expense', amount: vehiclePrice(id), label: v.name, kind: 'purchase', meta: { opKey: `vehicle:${id}:${useVehicleStore.getState().buys[id] ?? 0}` } });
  if (!paid.ok) return { ok: false, message: paid.reason === 'duplicate' ? 'That sale was already completed.' : copy.broke() };
  const before = homeParking();
  useVehicleStore.getState().add(id, vehiclePrice(id));
  return { ok: true, message: before.spaces > before.owned ? `${v.name} is yours, parked at home.` : `${v.name} is yours. You have no free parking, so it will not show at home.` };
}

/** Selling gives back this share of what you paid (the dealer's cut and the depreciation are the 30% you lose). */
export const SELL_RATE = 0.7;
export const salePrice = (id: string): number => { const paid = useVehicleStore.getState().paid[id] ?? vehiclePrice(id); return Math.round(paid * SELL_RATE); };
/** Sell one of your cars to Polanco Motors' trade-in desk for 70% of what you paid. Works from the showroom and from the phone. */
export function sellVehicle(id: string): BuyVehicleResult {
  const v = getVehicle(id); if (!v) return { ok: false, message: 'That car is not in the game any more.' };
  const vs = useVehicleStore.getState(); if (!vs.owned.includes(id)) return { ok: false, message: `You do not own the ${v.name}.` };
  const amount = salePrice(id);
  const r = useEconomyStore.getState().post({ direction: 'income', amount, label: `Sold the ${v.name}`, kind: 'income', counterparty: 'Polanco Motors', meta: { opKey: `vehicle-sale:${id}:${vs.buys[id] ?? 0}` } });
  if (!r.ok) return { ok: false, message: r.reason === 'duplicate' ? 'That sale was already completed.' : 'The sale did not go through.' };
  vs.remove(id);
  return { ok: true, message: `You sold the ${v.name} for ${formatNaira(amount)}.` };
}
