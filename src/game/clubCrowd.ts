import { PRAISE_NAMES } from '@/data/club';
import type { FeedItem } from '@/stores/clubStore';

/**
 * The other people at the club. They are SIMULATED (local simulation: the game has no real other players yet), so they never
 * touch the player's money. They exist to make the room feel alive: now and then one of them sprays, buys crates or hypes
 * the hype man, and it shows in the live feed. In multiplayer these lines would come from the server.
 */
const NAMES = ['Chief Obi', 'Tunde Baddest', 'Amaka Luxe', 'Big Seyi', 'Ngozi Gold', 'Baba Kudi', 'Lord Ify', 'Zainab Bliss', 'Kelechi Cash', 'Madam Tolu', 'Ebuka Drip', 'Sade Money', 'Papi Wale', 'Chioma Glow'];
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const pick = <T,>(a: T[], r: number) => a[Math.floor(r * a.length) % a.length];

/** One simulated moment. `r` gives random numbers in [0, 1) so a test can pin them. */
export function crowdMoment(now: number, r: () => number = Math.random, seq = 0): FeedItem {
  const who = pick(NAMES, r()), roll = r();
  let text: string, amount = 0, big = false;
  if (roll < 0.3) { const n = 1 + Math.floor(r() * 4); amount = n * 120_000; text = `${who} bought ${n} ${n === 1 ? 'crate' : 'crates'} of beer 🍺`; }
  else if (roll < 0.5) { amount = pick([500_000, 1_000_000, 2_000_000, 5_000_000], r()); big = amount >= 5_000_000; text = `${who} sprayed ${naira(amount)} on the dance floor 💸`; }
  else if (roll < 0.65) text = `${who} hyped the hype man! 🎤`;
  else if (roll < 0.78) { const n = 1 + Math.floor(r() * 2); amount = n * 350_000; text = `${who} ordered ${n} gold-label ${n === 1 ? 'champagne' : 'champagnes'} 🥂`; }
  else if (roll < 0.88) { amount = 1_500_000; text = `${who} had a magnum carried in with sparklers ✨`; big = true; }
  else if (roll < 0.95) text = `🎤 "${who}! ${pick(PRAISE_NAMES, r())}!" The hype man is on fire`;
  else { amount = pick([50_000_000, 150_000_000, 1_000_000_000], r()); big = true; text = `${who} spent ${naira(amount)} at the club in one night 🔥`; }
  return { id: `sim-${now}-${seq}`, who, text, amount, at: now, mine: false, big };
}
