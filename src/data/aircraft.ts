import type { PropertyCategory } from '@/types/world';

/**
 * Helicopters and planes. Bought on the phone (Aviation app) but only by someone who owns one of the big houses: an upper-class or
 * luxury house has the open ground to park them on. A duplex has two pads, a luxury duplex three. Prices are balance values in
 * in-game naira, set against the houses (₦85M and ₦180M) and the fastest car (₦1.5B). A server must own purchases (game/authority.ts).
 */
export type AircraftKind = 'helicopter' | 'plane' | 'jet';
export interface AircraftDef { id: string; name: string; kind: AircraftKind; price: number; color: string; accent: string; blurb: string; seats: number; cruiseKmh: number }
export const AIRCRAFT: AircraftDef[] = [
  { id: 'r44', name: 'Robinson R44 helicopter', kind: 'helicopter', price: 750_000_000, color: '#C9CED1', accent: '#1D4ED8', blurb: 'Four seats, a bubble cockpit and a Lagos traffic jam far below you.', seats: 4, cruiseKmh: 190 },
  { id: 'skyhawk', name: 'Cessna Skyhawk', kind: 'plane', price: 650_000_000, color: '#F4F1EA', accent: '#B91C1C', blurb: 'The plane everybody learns on. Slow, honest and very hard to look down on.', seats: 4, cruiseKmh: 230 },
  { id: 'h125', name: 'Airbus H125 helicopter', kind: 'helicopter', price: 5_000_000_000, color: '#111827', accent: '#F5C518', blurb: 'Black and gold. The helicopter that lands on rooftops and on your lawn.', seats: 6, cruiseKmh: 250 },
  { id: 'phenom', name: 'Embraer Phenom private jet', kind: 'jet', price: 12_000_000_000, color: '#FFFFFF', accent: '#0B8F4D', blurb: 'Lagos to anywhere before the jollof is cold.', seats: 8, cruiseKmh: 830 },
];
export const getAircraft = (id: string) => AIRCRAFT.find((a) => a.id === id);

/** Which house categories have the ground for aircraft, and how many pads each has. */
export const AIRCRAFT_PADS: Partial<Record<PropertyCategory, number>> = { upperClass: 2, luxury: 3 };
export const SELL_RATE = 0.7;
