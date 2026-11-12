/**
 * Weapons. In this build a gun is a stat and an inventory item: it changes fight odds, raises "heat" and makes police stops harsher.
 * The fields `damage`, `range`, `noise`, `cooldownMs` and `ammoPerClip` are what the open world will need to shoot with (game/weapons.ts
 * defines the intents). Nothing renders a shot yet. Naira are balance values; a server must own buying and shooting (game/authority.ts).
 * Off-the-books: sold only through the Brotherhood app, never the normal Shops app.
 */
export type WeaponId = 'pistol_local' | 'pistol_import' | 'rifle';
export interface WeaponDef {
  id: WeaponId; name: string; glyph: string; blurb: string; price: number;
  /** Plus this many points on fight odds while carried (capped by GUN.fightBonusCap in total). */
  fightBonus: number;
  /** Open-world fields: damage per hit, range in metres, noise radius in metres, shots per clip, milliseconds between shots. */
  damage: number; range: number; noise: number; ammoPerClip: number; cooldownMs: number;
  concealable: boolean; legal: false;
  /** Heat added each time it is drawn or used. */
  heatPerUse: number;
  /** Not for sale yet (the rifle waits for the open world). */
  later?: boolean;
}
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol_local: { id: 'pistol_local', name: 'Local pistol', glyph: '🔫', blurb: 'Cheap, loud and not always reliable.', price: 450_000, fightBonus: 0.15, damage: 18, range: 18, noise: 60, ammoPerClip: 6, cooldownMs: 700, concealable: true, legal: false, heatPerUse: 6 },
  pistol_import: { id: 'pistol_import', name: 'Imported pistol', glyph: '🔫', blurb: 'Clean, quiet and expensive. Comes with a clip.', price: 2_800_000, fightBonus: 0.25, damage: 28, range: 30, noise: 40, ammoPerClip: 12, cooldownMs: 400, concealable: true, legal: false, heatPerUse: 5 },
  rifle: { id: 'rifle', name: 'Rifle', glyph: '🎯', blurb: 'Not available yet. Wait for the open world.', price: 12_000_000, fightBonus: 0.3, damage: 55, range: 120, noise: 140, ammoPerClip: 5, cooldownMs: 1200, concealable: false, legal: false, heatPerUse: 12, later: true },
};
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const GUN = {
  /** The most a weapon can add to fight odds. */
  fightBonusCap: 0.25,
  /** An arrest with a gun on you doubles the sentence and the gun is taken. */
  policeJailMultiplier: 2, confiscateOnArrest: true,
  /** Heat falls by this much every game hour and is capped at maxHeat. */
  heatDecayPerHour: 4, maxHeat: 100,
  /** From this heat up, every roadblock and police stop treats you as a suspect. */
  hotHeat: 40,
} as const;
