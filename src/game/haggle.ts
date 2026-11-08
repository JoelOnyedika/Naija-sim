import { useEconomyStore } from '@/stores/economyStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';

/**
 * Haggling at a market stall. The seller has an asking price and a hidden fair price (50 to 70 percent of it) and a mood of
 * three hearts. Offers are judged against the fair price:
 *   under 60%      an insult: he loses two hearts
 *   60% to 85%     too low: he loses a heart and comes down part of the way
 *   85% to 115%    "agree small": a deal at YOUR offer
 *   over 115%      he hails you ("Oga na big man!"): a deal at your offer, but you overpaid
 * An offer at or above his current price is simply a deal at his price. No hearts left, or five rounds without a deal, and he walks.
 * Randomness is only the hidden fair price, and it is passed in so a server (or a test) can decide it.
 */
export interface HaggleState {
  ask: number; fair: number; price: number; mood: number; round: number; line: string;
  result: null | { kind: 'deal'; paid: number; saved: number; grade: 'sharp' | 'fair' | 'hailed' } | { kind: 'walked' };
}
export const HAGGLE = { hearts: 3, maxRounds: 5, insult: 0.6, low: 0.85, hail: 1.15 };
const round50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);

export function newHaggle(ask: number, r: () => number = Math.random): HaggleState {
  return { ask, fair: round50(ask * (0.5 + r() * 0.2)), price: ask, mood: HAGGLE.hearts, round: 0, line: '"Oga, welcome! Na correct price I give you."', result: null };
}
const deal = (s: HaggleState, paid: number, line: string): HaggleState => {
  const ratio = paid / s.fair, grade = ratio <= 1.0 ? 'sharp' : ratio <= HAGGLE.hail ? 'fair' : 'hailed';
  return { ...s, line, result: { kind: 'deal', paid, saved: s.ask - paid, grade } };
};
export function makeOffer(s: HaggleState, offer: number): HaggleState {
  if (s.result) return s;
  const o = Math.max(0, Math.round(offer)), r = o / s.fair, round = s.round + 1;
  if (o >= s.price) return deal(s, s.price, '"Ehen! Take am, na your own."');
  if (r > HAGGLE.hail) return deal({ ...s, round }, o, '"Oga! Na big man you be! God bless you!"');
  if (r >= HAGGLE.low) return deal({ ...s, round }, o, '"Hmm. Okay, I go agree small. Na you win."');
  const mood = s.mood - (r < HAGGLE.insult ? 2 : 1);
  if (mood <= 0 || round >= HAGGLE.maxRounds) return { ...s, round, mood: Math.max(0, mood), line: r < HAGGLE.insult ? '"You dey craze?! Comot for my shop!"' : '"We no go agree. Go and meet another person."', result: { kind: 'walked' } };
  if (r < HAGGLE.insult) return { ...s, round, mood, line: '"Oga, that one na insult o! Respect my goods!"' };
  const price = Math.max(round50(s.fair * 1.08), round50(s.price - (s.price - s.fair) * 0.4));
  return { ...s, round, mood, price, line: `"Ah, a little small. Last last, ₦${price.toLocaleString('en-NG')}."` };
}
/** The player takes his current price. */
export const acceptPrice = (s: HaggleState): HaggleState => (s.result ? s : deal(s, s.price, '"Thank you, Oga. Come again!"'));

export type HaggleSettle = { ok: true; paid: number; message: string } | { ok: false; message: string };
/** Take the money and apply the rewards for a finished haggle. Walking away costs nothing but a little pride. */
export function settleHaggle(s: HaggleState, item: string, who: string): HaggleSettle {
  const res = s.result; if (!res) return { ok: false, message: 'Still haggling.' };
  const stats = useStatsStore.getState();
  if (res.kind === 'walked') { stats.apply({ happiness: -3, social: -1 }); return { ok: true, paid: 0, message: `${who} would not sell. You walk away.` }; }
  if (!useEconomyStore.getState().debit(res.paid, `${item} from ${who}`, 'purchase', who)) return { ok: false, message: 'You do not have that much cash.' };
  const fx = res.grade === 'sharp' ? { happiness: 9, charisma: 1 } : res.grade === 'fair' ? { happiness: 6 } : { happiness: 2 };
  stats.apply(fx); useSkillStore.getState().add('communication', res.grade === 'sharp' ? 4 : res.grade === 'fair' ? 2 : 1);
  const save = res.saved > 0 ? ` You saved ₦${res.saved.toLocaleString('en-NG')}.` : '';
  return { ok: true, paid: res.paid, message: res.grade === 'hailed' ? `You paid ₦${res.paid.toLocaleString('en-NG')} and he hailed you all the way home.` : `Bought ${item} for ₦${res.paid.toLocaleString('en-NG')}.${save}` };
}
