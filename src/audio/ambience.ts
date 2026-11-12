import type { InteriorKind } from '@/data/interiors';
import { setMusicLevel } from './music';

/**
 * Venue sound. The synthesised atmospheres (crowd murmur, wind, waves, hums) were removed: they came out as static noise and no
 * good recorded loops were available. What is left is how loud the background afrobeat loop is in each kind of venue: full in
 * clubs and concerts, off in church, jail and the cinema. To bring atmospheres back, play real recorded loops from here.
 */
const MUSIC: Record<InteriorKind, number> = {
  market: 0.5, church: 0, gallery: 0.12, stadium: 0.25, club: 1, showroom: 0.3, jail: 0, viewing: 0.3, eatery: 0.4, bank: 0.12, mall: 0.3, cinema: 0,
  concert: 1, hotel: 0.25, techhub: 0.3, park: 0.25, beach: 0.25, recreation: 0.2, government: 0.1, business: 0.2, airport: 0.1, port: 0.25, university: 0.2, initiation: 0,
};

/** Called when you enter a venue (or leave it, with null): sets the background music level. No other sound is played. */
export function setAmbience(kind: InteriorKind | null) { setMusicLevel(kind ? MUSIC[kind] : 1); }
