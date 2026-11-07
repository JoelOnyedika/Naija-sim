import type { PropertyCategory } from '@/types/world';

/**
 * Helicopters and planes. Bought on the phone (Aviation app) but only by someone who owns one of the big houses: an upper-class or
 * luxury house has the open ground to park them on. A duplex has two pads, a luxury duplex three. Prices are balance values in
 * in-game naira, set against the houses (₦85M and ₦180M) and the fastest car (₦1.5B). A server must own purchases (game/authority.ts).
 */
export type AircraftKind = 'helicopter' | 'plane' | 'jet';
export interface AircraftDef { id: string; name: string; kind: AircraftKind; price: number; color: string; accent: string; blurb: string; seats: number; cruiseKmh: number;
  /** Which airframe to draw. Two helicopters share a builder but not a shape. */
  shape: 'r44' | 'h125' | 'skyhawk' | 'phenom' }
export const AIRCRAFT: AircraftDef[] = [
  { id: 'r44', shape: 'r44', name: 'Robinson R44 helicopter', kind: 'helicopter', price: 750_000_000, color: '#C9CED1', accent: '#1D4ED8', blurb: 'Four seats, a bubble cockpit and a Lagos traffic jam far below you.', seats: 4, cruiseKmh: 190 },
  { id: 'skyhawk', shape: 'skyhawk', name: 'Cessna Skyhawk', kind: 'plane', price: 650_000_000, color: '#F4F1EA', accent: '#B91C1C', blurb: 'The plane everybody learns on. Slow, honest and very hard to look down on.', seats: 4, cruiseKmh: 230 },
  { id: 'h125', shape: 'h125', name: 'Airbus H125 helicopter', kind: 'helicopter', price: 5_000_000_000, color: '#111827', accent: '#F5C518', blurb: 'Black and gold. The helicopter that lands on rooftops and on your lawn.', seats: 6, cruiseKmh: 250 },
  { id: 'phenom', shape: 'phenom', name: 'Embraer Phenom private jet', kind: 'jet', price: 12_000_000_000, color: '#FFFFFF', accent: '#0B8F4D', blurb: 'Lagos to anywhere before the jollof is cold.', seats: 8, cruiseKmh: 830 },
];
export const getAircraft = (id: string) => AIRCRAFT.find((a) => a.id === id);

/** Which house categories have the ground for aircraft, and how many pads each has. */
export const AIRCRAFT_PADS: Partial<Record<PropertyCategory, number>> = { upperClass: 2, luxury: 3 };
export const SELL_RATE = 0.7;

/**
 * How a player's aircraft is painted. Chosen in the paint shop when they buy it (and changeable later), drawn on the 3D model.
 * Colours are #RRGGBB. The name is written on both sides of the body. It starts as the player's own name.
 */
export type StripeStyle = 'none' | 'single' | 'double' | 'swoosh' | 'belly';
export interface Livery { name: string; body: string; wings: string; engine: string; stripe: string; text: string; style: StripeStyle }
export const STRIPE_STYLES: { id: StripeStyle; label: string }[] = [{ id: 'none', label: 'Plain' }, { id: 'single', label: 'Stripe' }, { id: 'double', label: 'Double' }, { id: 'swoosh', label: 'Swoosh' }, { id: 'belly', label: 'Belly' }];
/** Which part a colour is for. Wings also means the tail; engine means rotors on a helicopter. */
export type LiveryPart = 'body' | 'wings' | 'engine' | 'stripe' | 'text';
export const LIVERY_PARTS: { id: LiveryPart; label: string; engineLabel?: Partial<Record<AircraftKind, string>> }[] = [
  { id: 'body', label: 'Body' }, { id: 'wings', label: 'Wings & tail' }, { id: 'engine', label: 'Engine', engineLabel: { helicopter: 'Rotors', plane: 'Cowling & prop', jet: 'Engines' } }, { id: 'stripe', label: 'Stripe' }, { id: 'text', label: 'Name' },
];
export const LIVERY_COLORS = ['#FFFFFF', '#F4F1EA', '#C9CED1', '#6B7280', '#111827', '#B91C1C', '#EF4444', '#F97316', '#F5C518', '#16A34A', '#0B8F4D', '#14B8A6', '#1D4ED8', '#38BDF8', '#7C3AED', '#EC4899', '#8B5E34', '#D4AF37'];
export const NAME_MAX = 14;
const HEX = /^#[0-9a-fA-F]{6}$/;
const darkEnough = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b < 150; };

/** The paint a new aircraft starts with: the factory colours from its definition, the player's name on the side. */
export function defaultLivery(def: AircraftDef, playerName: string): Livery {
  const wings = def.color;
  return { name: cleanName(playerName) || 'NIGERIA LIFE'.slice(0, NAME_MAX), body: def.color, wings, engine: def.kind === 'helicopter' ? '#1F2937' : def.kind === 'jet' ? '#9CA3AF' : def.accent, stripe: def.accent, text: darkEnough(def.color) ? '#FFFFFF' : def.accent, style: 'single' };
}
export const cleanName = (n: string) => n.replace(/[^\p{L}\p{N} .\-'&]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
/** Whatever arrives (a save from an older version, a hand-made value) becomes a safe, complete paint job. */
export function sanitizeLivery(raw: Partial<Livery> | undefined, def: AircraftDef, playerName: string): Livery {
  const d = defaultLivery(def, playerName), r = raw ?? {}, pick = (v: unknown, f: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : f);
  return { name: typeof r.name === 'string' ? cleanName(r.name) : d.name, body: pick(r.body, d.body), wings: pick(r.wings, d.wings), engine: pick(r.engine, d.engine), stripe: pick(r.stripe, d.stripe), text: pick(r.text, d.text), style: STRIPE_STYLES.some((x) => x.id === r.style) ? (r.style as StripeStyle) : d.style };
}
