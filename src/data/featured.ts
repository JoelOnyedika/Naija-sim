/** Mock "featured players" for the landing carousel. Replace with live data once there is a backend. */
export interface FeaturedPlayer { kind: 'Governor' | 'DC' | 'Pilot'; name: string; blurb: string; glyph: string; from: string; to: string }
export const FEATURED_PLAYERS: FeaturedPlayer[] = [
  { kind: 'Governor', name: 'Gov. Tunde Alabi', blurb: 'Elected by 41,000 players. Promises better roads.', glyph: '🏛️', from: '#0B8F4D', to: '#07603A' },
  { kind: 'DC', name: 'DC Ngozi Eze', blurb: 'Runs the busiest club on the Island. Ask about her guest list.', glyph: '🎧', from: '#8A63D2', to: '#4C2A9C' },
  { kind: 'Pilot', name: 'Capt. Emeka Obi', blurb: 'Flies the Lagos to Abuja route. Owns the sky.', glyph: '✈️', from: '#2B8FD2', to: '#1B4F8C' },
];
