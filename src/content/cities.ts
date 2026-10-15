/**
 * Every city the map selector lists. `status` here is only the catalogue entry: a city is PLAYABLE if and only if a state
 * with the same id is registered (content/index.ts), so a "coming soon" city cannot be opened by accident. To add a city:
 * add a content pack (content/<city>/), register it, and its chip becomes available automatically.
 */
export interface CityEntry { id: string; name: string; blurb: string }
export const CITY_CATALOG: CityEntry[] = [
  { id: 'lagos', name: 'Lagos', blurb: 'Islands, markets and the busiest airport in Nigeria.' },
  { id: 'abuja', name: 'Abuja', blurb: 'The capital: wide roads, ministries and Aso Rock.' },
  { id: 'port-harcourt', name: 'Port Harcourt', blurb: 'The Garden City and the oil coast.' },
  { id: 'edo', name: 'Edo State', blurb: 'Benin City, bronzes and royal history.' },
];
