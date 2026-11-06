import type { Appearance } from '@/types/game';

/**
 * The bodyguard: hired in the Staff app. He stops Agbero roadblocks on the road and (later, when other players exist) stops
 * pickpockets, who are then arrested. His weekly wage is billed in the Bank like electricity; if it goes unpaid he stands down.
 * In-game naira only. A server must own hiring, wages and who gets arrested (game/authority.ts).
 */
export const BODYGUARD = {
  id: 'bodyguard', name: 'Bodyguard', glyph: '🕶️', hireFee: 60_000, weekly: 35_000,
  blurb: 'Black suit, dark glasses, no jokes. Stands by your door at home and stops Agbero roadblocks on the road.',
  /** What he says (a bubble over his head) while he stands by the door. Strong, on purpose. */
  emojis: ['💪', '😤', '🕶️', '👊', '🦾', '🛡️', '🔥', '😎', '🤨', '👀'],
  /** Seconds between bubbles and how long each stays. */
  bubbleEvery: [6, 12] as [number, number], bubbleFor: 2.4,
} as const;

/** Black suit, black trousers, boots and dark glasses. */
export const BODYGUARD_LOOK: Appearance = {
  skin: '#4A2C1B', hairStyle: 'bald', hairColor: '#0B0B0F', top: 'jacket', topColor: '#0B0B10', bottom: 'trousers', bottomColor: '#0B0B10',
  shoes: 'boots', shoeColor: '#050505', accessory: 'glasses', body: 'masc', eye: '#111', beard: 'stubble',
};
