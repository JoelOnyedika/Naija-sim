import { AIRCRAFT_PADS, SELL_RATE, defaultLivery, getAircraft, sanitizeLivery, type Livery } from '@/data/aircraft';
import { useCharacterStore } from '@/stores/characterStore';
import { useAircraftStore } from '@/stores/aircraftStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import type { PropertyLayout } from '@/types/world';
import { getProperty } from '@/world/registry';
import { houseBounds } from '@/world/layoutGeometry';

export type AirResult = { ok: true; message: string } | { ok: false; message: string };
const A = () => useAircraftStore.getState();

/** Pads at a house: 0 unless it is a big house. */
export const padsAt = (propertyId: string | null | undefined): number => { const p = propertyId ? getProperty(propertyId) : undefined; return (p && AIRCRAFT_PADS[p.category]) || 0; };
/** The big house the player owns with the most pads, preferring the one they live in. */
export function hangarHouse(): { id: string; pads: number } | null {
  const ps = usePropertyStore.getState(), ids = ps.ownedIds.filter((id) => padsAt(id) > 0);
  if (!ids.length) return null;
  const best = ids.includes(ps.activeId ?? '') ? ps.activeId! : ids.sort((a, b) => padsAt(b) - padsAt(a))[0];
  return { id: best, pads: padsAt(best) };
}

/** Why the player cannot buy this aircraft right now, or null if they can. */
export function whyNotAircraft(id: string): string | null {
  const a = getAircraft(id); if (!a) return 'That aircraft is not for sale.';
  if (A().owned.includes(id)) return `You already own the ${a.name}.`;
  const h = hangarHouse();
  if (!h) return 'You need a big house with open ground to park it: the 4 Bedroom Detached Duplex or the Luxury Duplex.';
  if (A().owned.length >= h.pads) return `Your house has ${h.pads} landing pad${h.pads === 1 ? '' : 's'} and they are full. Sell one first.`;
  return null;
}
/** The paint an aircraft has now: what the player chose, or the factory colours with their name on it. */
export function liveryOf(id: string): Livery | null {
  const def = getAircraft(id); if (!def) return null;
  return sanitizeLivery(A().liveries[id], def, useCharacterStore.getState().name);
}
/** The paint a new purchase starts from in the paint shop. */
export function startingLivery(id: string): Livery | null { const def = getAircraft(id); return def ? defaultLivery(def, useCharacterStore.getState().name) : null; }
/** Repaint an aircraft the player owns. */
export function repaintAircraft(id: string, livery: Partial<Livery>): AirResult {
  const def = getAircraft(id); if (!def || !A().owned.includes(id)) return { ok: false, message: 'You do not own that.' };
  A().setLivery(id, sanitizeLivery(livery, def, useCharacterStore.getState().name));
  return { ok: true, message: `The ${def.name} has a new paint job.` };
}
export function buyAircraft(id: string, livery?: Partial<Livery>): AirResult {
  const why = whyNotAircraft(id); if (why) return { ok: false, message: why };
  const a = getAircraft(id)!;
  const paid = useEconomyStore.getState().post({ direction: 'expense', amount: a.price, label: a.name, kind: 'purchase', meta: { opKey: `aircraft:${id}:${A().owned.length}:${Date.now()}`, ref: { type: 'aircraft', id } } });
  if (!paid.ok) return { ok: false, message: 'You do not have enough money for that.' };
  A().add(id, a.price, sanitizeLivery(livery, a, useCharacterStore.getState().name));
  return { ok: true, message: `${a.name} is yours. It is parked on your lawn.` };
}
export const aircraftSalePrice = (id: string): number => Math.round((A().paid[id] ?? getAircraft(id)?.price ?? 0) * SELL_RATE);
export function sellAircraft(id: string): AirResult {
  if (!A().owned.includes(id)) return { ok: false, message: 'You do not own that.' };
  const amt = aircraftSalePrice(id), a = getAircraft(id)!;
  useEconomyStore.getState().post({ direction: 'income', amount: amt, label: `Sold ${a.name}`, kind: 'refund', meta: { opKey: `aircraft-sale:${id}:${Date.now()}` } });
  A().remove(id);
  return { ok: true, message: `Sold for ${amt.toLocaleString('en-NG')}.` };
}

/** Where aircraft stand on the lawn in front of the house: apron centres, staggered so wings do not overlap. Local plot coordinates. */
export interface Pad { x: number; z: number; yaw: number }
export function aircraftPads(layout: PropertyLayout, count: number): Pad[] {
  const b = houseBounds(layout), n = Math.max(1, Math.min(3, count)), z = b.z1 + 4.4;
  if (n === 1) return [{ x: b.cx, z, yaw: 0 }];
  if (n === 2) return [{ x: b.x0 + b.w * 0.27, z, yaw: 0.12 }, { x: b.x0 + b.w * 0.73, z: z + 0.6, yaw: -0.12 }];
  return [{ x: b.x0 + b.w * 0.18, z: z - 0.4, yaw: 0.28 }, { x: b.cx, z: z + 1.6, yaw: 0 }, { x: b.x0 + b.w * 0.82, z: z - 0.4, yaw: -0.28 }];
}
