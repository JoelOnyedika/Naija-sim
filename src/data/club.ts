import type { Effects } from '@/types/game';

/**
 * What the club sells. In-game naira only (never real money). Prices are BASE prices: the shared pricing function (game/pricing.ts)
 * turns them into what the player sees and pays. Everything here is configurable; a server must own it in multiplayer.
 */
export interface ClubOption { id: string; name: string; glyph: string; blurb: string; price: number; effects: Effects; /** Shouts the player's name on the mic whatever the total. */ shout?: boolean }
export const CLUB_OPTIONS: ClubOption[] = [
  { id: 'drink', name: 'Premium bottle', glyph: '🍾', blurb: 'Sparklers and all.', price: 40_000, effects: { happiness: 10, social: 4, thirst: 10 } },
  { id: 'hype', name: 'Hype man shout-out', glyph: '🎤', blurb: 'He calls your name over the music.', price: 25_000, effects: { happiness: 8, social: 6, charisma: 1 }, shout: true },
  { id: 'vip', name: 'VIP table for the night', glyph: '👑', blurb: 'Best seats, bottle service, velvet rope.', price: 250_000, effects: { happiness: 18, social: 8 } },
  { id: 'celebration', name: 'Fund a celebration', glyph: '🎆', blurb: 'Confetti, cake, the whole club sings.', price: 400_000, effects: { happiness: 25, social: 12 } },
];
export const CLUB = {
  /** A purchase at or above this total gets a "big baller" announcement (if the cooldown allows). */
  announceThreshold: 100_000,
  /** A purchase at or above this gets the louder "mega" style. */
  megaThreshold: 400_000,
  /** At most one announcement per this many ms, so the club is not flooded. */
  announceCooldownMs: 60_000,
  maxReceipts: 40,
};
export const clubOption = (id: string) => CLUB_OPTIONS.find((o) => o.id === id);
