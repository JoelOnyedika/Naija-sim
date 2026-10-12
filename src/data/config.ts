/** Tunable game numbers in one place. */
export const CONFIG = {
  /** Chance that the Life Roulette lands on Nepo Baby. */
  nepoChance: 1,
  /** In-game minutes that pass per real second. */
  gameMinutesPerSecond: 1,
  /** Stat loss per real minute. */
  decayPerMin: { hunger: 1.6, thirst: 2.2, bladder: 1.8, happiness: 0.6, energy: 0.7, hygiene: 1.0, social: 0.5 } as Record<string, number>,
  /** Fraction of cost refunded when selling a placed item. */
  sellRefund: 0.5,
  /** Mock "online players" range. */
  online: { min: 58000, max: 79000 },
  /** Real-world start for the in-game clock. */
  startHour: 8,
};
