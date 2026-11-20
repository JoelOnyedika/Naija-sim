/**
 * Weapons. In this build a gun is a stat and an inventory item: it changes fight odds, raises "heat" and makes police stops harsher.
 * The fields `damage`, `range`, `noise`, `cooldownMs` and `ammoPerClip` are what the open world will need to shoot with (game/weapons.ts
 * defines the intents). Nothing renders a shot yet. Naira are balance values; a server must own buying and shooting (game/authority.ts).
 * Off-the-books: sold only through the Brotherhood app, never the normal Shops app. One gun only: the AK-47.
 */
export type WeaponId = 'ak47';
export interface WeaponDef {
  id: WeaponId; name: string; glyph: string; blurb: string; price: number;
  /** Plus this many points on fight odds while carried (capped by GUN.fightBonusCap in total). */
  fightBonus: number;
  /** Open-world fields: damage per hit, range in metres, noise radius in metres, shots per clip, milliseconds between shots. */
  damage: number; range: number; noise: number; ammoPerClip: number; cooldownMs: number;
  concealable: boolean; legal: false;
  /** Heat added each time it is drawn or used. */
  heatPerUse: number;
}
/** The game has exactly one gun: the AK-47. */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ak47: { id: 'ak47', name: 'AK-47', glyph: '🔫', blurb: 'The only gun in town. Loud, rough and it does not jam.', price: 4_500_000, fightBonus: 0.3, damage: 30, range: 120, noise: 140, ammoPerClip: 30, cooldownMs: 120, concealable: false, legal: false, heatPerUse: 2.5 },
};
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const GUN = {
  /** The most a weapon can add to fight odds. */
  fightBonusCap: 0.25,
  /** An arrest with a gun on you takes the gun (the sentence stays the same short one). */
  policeJailMultiplier: 1, confiscateOnArrest: true,
  /** Heat falls by this much every game hour and is capped at maxHeat. */
  heatDecayPerHour: 4, maxHeat: 100,
  /** From this heat up, every roadblock and police stop treats you as a suspect. */
  hotHeat: 40,
} as const;
