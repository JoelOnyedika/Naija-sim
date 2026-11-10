/**
 * Loan apps. Three lenders on the phone, all fictional look-alikes of Nigerian loan apps, each with its own look, price and temper.
 * Time is GAME time (the game clock): 1 game day = 1,440 game minutes = 24 real minutes. Everything here is data; the rules are in game/loans.ts.
 */
export type LenderId = 'ofay' | 'falmfay' | 'kwikkash';
export interface Lender {
  id: LenderId; name: string; tagline: string; glyph: string;
  /** Flat interest taken on top of what you borrow, as a share (0.2 = 20%). Paid back with the loan. */
  interest: number;
  /** How long you have to pay, in game days. */
  termDays: number;
  /** What a brand-new customer may borrow, and the most this app ever lends. */
  startLimit: number; maxLimit: number;
  /** Each loan repaid ON TIME multiplies your limit by this (rounded to ₦1,000, never above maxLimit). */
  growth: number;
  /** Once late, this share of the amount borrowed is added for every started day, up to `lateCap` of it. */
  lateFeePerDay: number; lateCap: number;
  /** The people it sends after you: name, how tough they are (0 to 2, like the Agbero), how many (1 to 3, up to this). */
  collectors: { crew: string; power: 0 | 1 | 2; maxMen: 1 | 2 | 3; knock: string };
  /** App colours. */
  theme: { from: string; to: string; accent: string; ink: string; soft: string; dark: boolean };
  steps: string[];
}
export const LENDERS: Record<LenderId, Lender> = {
  ofay: {
    id: 'ofay', name: 'OFAY', tagline: 'Money moves, smiles follow', glyph: '🟢', interest: 0.2, termDays: 3, startLimit: 20_000, maxLimit: 1_000_000, growth: 1.6,
    lateFeePerDay: 0.03, lateCap: 0.45,
    collectors: { crew: 'OFAY Recovery Team', power: 1, maxMen: 2, knock: 'Good afternoon. OFAY Recovery. Your account is overdue. Please open the door.' },
    theme: { from: '#00C26B', to: '#007A4A', accent: '#00B35F', ink: '#073B26', soft: '#E6F8EF', dark: false },
    steps: ['Pick an amount', 'Get the money at once', 'Repay in 3 days with 20% interest', 'Pay on time and your limit grows'],
  },
  falmfay: {
    id: 'falmfay', name: 'FALMFAY', tagline: 'Fast cash, falm trees', glyph: '🌴', interest: 0.25, termDays: 2, startLimit: 50_000, maxLimit: 3_000_000, growth: 1.7,
    lateFeePerDay: 0.04, lateCap: 0.6,
    collectors: { crew: 'FALMFAY Field Agents', power: 1, maxMen: 3, knock: 'FALMFAY Field Agents. We have your address, your number and your mother\'s number. Open up.' },
    theme: { from: '#7C3AED', to: '#4C1D95', accent: '#8B5CF6', ink: '#2E1065', soft: '#F1EAFE', dark: false },
    steps: ['Choose how much', 'Cash lands in seconds', 'Repay in 2 days with 25% interest', 'Repay early and borrow bigger'],
  },
  kwikkash: {
    id: 'kwikkash', name: 'KWIKKASH', tagline: 'No wahala. No papers. No mercy.', glyph: '⚡', interest: 0.3, termDays: 1, startLimit: 10_000, maxLimit: 300_000, growth: 1.35,
    lateFeePerDay: 0.06, lateCap: 0.9,
    collectors: { crew: 'The Kwik Boys', power: 2, maxMen: 3, knock: 'KWIK BOYS! Oga, we know you are inside. Open this door now!' },
    theme: { from: '#FACC15', to: '#B45309', accent: '#FACC15', ink: '#111111', soft: '#1C1917', dark: true },
    steps: ['Tap an amount', 'Money in 5 seconds, no checks', 'Repay in 1 day with 30% interest', 'Late? The Kwik Boys come early'],
  },
};
export const LENDER_IDS = Object.keys(LENDERS) as LenderId[];
export const getLender = (id: LenderId): Lender => LENDERS[id];

export const LOAN_RULES = {
  dayMinutes: 1440,
  /** Overdue this long (game minutes) and the lender sends people (half a game day = 12 real minutes). */
  huntAfterMinutes: 720,
  /** One loan at a time per app. Every borrowing needs at least this much. */
  minLoan: 1_000,
  /** The loan amount chips shown in an app, as shares of the limit. */
  chips: [0.25, 0.5, 0.75, 1] as const,
  /** Real seconds between two visits, and the chance a visit happens when the roll comes (every `rollSeconds`). */
  rollSeconds: 90, cooldownSeconds: 150, chance: 0.3,
  /** Of the visits, this share come with police. */
  policeShare: 0.3,
  jailMinutes: 10,
} as const;
