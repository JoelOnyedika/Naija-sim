import type { Effects } from '@/types/game';

/**
 * What the club sells. In-game naira only (never real money). Prices are BASE prices: the shared pricing function (game/pricing.ts)
 * turns them into what the player sees and pays. Everything here is configurable; a server must own it in multiplayer.
 */
export type ClubGroup = 'bottles' | 'food' | 'spray' | 'hype' | 'big';
export interface ClubOption {
  id: string; name: string; glyph: string; blurb: string; price: number; effects: Effects; /** Shouts the player's name on the mic whatever the total. */ shout?: boolean;
  group?: ClubGroup;
  /** Can be bought several at once (crates, trays, bundles). The player picks how many. */
  multi?: boolean;
  /** What the live feed says. `n` is how many, `amount` what the line cost, `who` the buyer. */
  say?: (who: string, n: number, amount: number) => string;
  /** Makes it rain money on screen. */
  rain?: boolean;
}
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const s2 = (n: number, one: string, many: string) => (n === 1 ? one : many);
export const CLUB_OPTIONS: ClubOption[] = [
  // the four originals keep their ids and prices (saved receipts and tests refer to them)
  { id: 'drink', name: 'Premium bottle', glyph: '🍾', blurb: 'Sparklers and all.', price: 40_000, effects: { happiness: 10, social: 4, thirst: 10 }, group: 'bottles', say: (w, n) => `${w} popped ${n === 1 ? 'a premium bottle' : `${n} premium bottles`} 🍾` },
  { id: 'hype', name: 'Hype man shout-out', glyph: '🎤', blurb: 'He calls your name over the music.', price: 25_000, effects: { happiness: 8, social: 6, charisma: 1 }, shout: true, group: 'hype', say: (w) => `${w} hyped the hype man! 🎤` },
  { id: 'vip', name: 'VIP table for the night', glyph: '👑', blurb: 'Best seats, bottle service, velvet rope.', price: 250_000, effects: { happiness: 18, social: 8 }, group: 'big', say: (w) => `${w} took the VIP table 👑` },
  { id: 'celebration', name: 'Fund a celebration', glyph: '🎆', blurb: 'Confetti, cake, the whole club sings.', price: 400_000, effects: { happiness: 25, social: 12 }, group: 'big', say: (w) => `${w} funded a celebration 🎆` },
  // bottles
  { id: 'crate', name: 'Crate of beer', glyph: '🍺', blurb: 'A full crate to the table. Share it or do not.', price: 120_000, effects: { happiness: 6, social: 5, thirst: 12 }, multi: true, group: 'bottles', say: (w, n) => `${w} bought ${n} ${s2(n, 'crate', 'crates')} of beer 🍺` },
  { id: 'champagne', name: 'Gold-label champagne', glyph: '🥂', blurb: 'The gold bottle. Everyone sees it come.', price: 350_000, effects: { happiness: 12, social: 7, thirst: 8 }, multi: true, group: 'bottles', say: (w, n) => `${w} ordered ${n} gold-label ${s2(n, 'champagne', 'champagnes')} 🥂` },
  { id: 'magnum', name: 'Magnum with sparklers', glyph: '🍾', blurb: 'Carried in by three waiters, lights off, sparklers on.', price: 1_500_000, effects: { happiness: 16, social: 10 }, multi: true, group: 'bottles', say: (w, n) => `${w} ${n === 1 ? 'had a magnum carried in' : `had ${n} magnums carried in`} with sparklers ✨` },
  // food
  { id: 'suya', name: 'Suya and pepper soup', glyph: '🍢', blurb: 'Hot suya, hot pepper soup, no shame.', price: 60_000, effects: { hunger: 22, happiness: 5, social: 2 }, multi: true, group: 'food', say: (w, n) => `${w} ordered ${n} ${s2(n, 'suya platter', 'suya platters')} for the table 🍢` },
  { id: 'jollof', name: 'Party jollof tray', glyph: '🍛', blurb: 'Smoky party jollof for the whole table.', price: 90_000, effects: { hunger: 28, happiness: 6, social: 3 }, multi: true, group: 'food', say: (w, n) => `${w} fed the table ${n} party ${s2(n, 'jollof tray', 'jollof trays')} 🍛` },
  // spraying
  { id: 'spray_s', name: 'Spray the floor', glyph: '💸', blurb: 'A bundle of fresh notes, thrown in the air.', price: 500_000, effects: { happiness: 10, social: 8 }, multi: true, group: 'spray', rain: true, say: (w, _n, a) => `${w} sprayed ${naira(a)} on the dance floor 💸` },
  { id: 'spray_m', name: 'Spray like a chairman', glyph: '💵', blurb: 'Bank-wrapped bundles. The floor goes quiet, then loud.', price: 5_000_000, effects: { happiness: 16, social: 12, charisma: 1 }, multi: true, group: 'spray', rain: true, shout: true, say: (w, _n, a) => `${w} sprayed ${naira(a)} like a chairman 💵` },
  { id: 'spray_l', name: 'Spray the whole club', glyph: '🤑', blurb: 'Boxes of notes. The DJ stops the song to watch.', price: 50_000_000, effects: { happiness: 22, social: 16, charisma: 2 }, multi: true, group: 'spray', rain: true, shout: true, say: (w, _n, a) => `${w} sprayed ${naira(a)}. The DJ stopped the song 🤑` },
  // hype
  { id: 'praise', name: 'Praise singing', glyph: '📣', blurb: 'The hype man sings your praise names, loud and long.', price: 150_000, effects: { happiness: 12, social: 8, charisma: 1 }, shout: true, group: 'hype', say: (w) => `${w} is being praised on the mic 📣` },
  { id: 'dj', name: 'DJ plays your song', glyph: '🎧', blurb: 'He drops the song you asked for and says your name first.', price: 80_000, effects: { happiness: 10, social: 5 }, shout: true, group: 'hype', say: (w) => `${w} made the DJ play their song 🎧` },
  // the big ones
  { id: 'cake', name: 'Birthday cake and sparklers', glyph: '🎂', blurb: 'The lights drop, the cake comes out, the club sings.', price: 600_000, effects: { happiness: 20, social: 12 }, group: 'big', say: (w) => `${w} brought out the cake 🎂` },
  { id: 'shutdown', name: 'Shut the club down', glyph: '🔥', blurb: 'The whole night is yours. The DJ plays only for you.', price: 1_000_000_000, effects: { happiness: 35, social: 20, charisma: 3 }, shout: true, rain: true, group: 'big', say: (w, _n, a) => `${w} SHUT THE CLUB DOWN for ${naira(a)} 🔥` },
];
export const CLUB_GROUPS: { id: ClubGroup; label: string }[] = [{ id: 'bottles', label: 'Bottles' }, { id: 'food', label: 'Food' }, { id: 'spray', label: 'Spray' }, { id: 'hype', label: 'Hype' }, { id: 'big', label: 'Big moves' }];
/** What the hype man calls you. */
export const PRAISE_NAMES = ['Chairman', 'Omo Baba Olowo', 'Oga at the top', 'Alaaye', 'Owner of the city', 'Big Man', 'The Don', 'Money no be problem'];
export const MAX_QTY = 99;
export const CLUB = {
  /** A purchase at or above this total gets a "big baller" announcement (if the cooldown allows). */
  announceThreshold: 100_000,
  /** A purchase at or above this gets the louder "mega" style. */
  megaThreshold: 400_000,
  /** At most one announcement per this many ms, so the club is not flooded. */
  announceCooldownMs: 60_000,
  maxReceipts: 120,
  /** The live feed keeps this many lines. */
  feedKeep: 30,
};
export const clubOption = (id: string) => CLUB_OPTIONS.find((o) => o.id === id);
