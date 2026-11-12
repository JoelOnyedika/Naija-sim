import { GUN, WEAPONS, type WeaponId } from '@/data/weapons';
import { useEconomyStore } from '@/stores/economyStore';
import { useStoryStore } from '@/stores/storyStore';
import { useWeaponStore } from '@/stores/weaponStore';

const W = () => useWeaponStore.getState();
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const isMember = () => useStoryStore.getState().confraternity.member;
export const equippedWeapon = () => { const id = W().equipped; return id ? WEAPONS[id] : null; };

/** Points added to fight odds while a weapon is carried (0..1, capped). Used by agbero.fighterNow, so the loan collectors get it too. */
export const gunFightBonus = (): number => { const w = equippedWeapon(); return w ? Math.min(GUN.fightBonusCap, w.fightBonus) : 0; };

export function whyNotBuy(id: WeaponId, money = useEconomyStore.getState().money): string | null {
  const w = WEAPONS[id];
  if (!isMember()) return 'Only members can buy this.';
  if (w.later) return 'Not available yet.';
  if (W().owned.includes(id)) return 'You already have one.';
  if (money < w.price) return 'You cannot afford it.';
  return null;
}
/** Off-the-books purchase through the Brotherhood app. A server must own this. */
export function buyWeapon(id: WeaponId): { ok: boolean; message: string } {
  const why = whyNotBuy(id); if (why) return { ok: false, message: why };
  const w = WEAPONS[id];
  if (!useEconomyStore.getState().debit(w.price, `Brotherhood: ${w.name}`, 'purchase')) return { ok: false, message: 'You cannot afford it.' };
  W().set({ owned: [...W().owned, id], equipped: W().equipped ?? id });
  return { ok: true, message: `${w.name} bought.` };
}
export function equip(id: WeaponId | null): boolean { if (id && !W().owned.includes(id)) return false; W().set({ equipped: id }); return true; }
export const addHeat = (n: number) => W().set({ heat: clamp(W().heat + n, 0, GUN.maxHeat) });
export const isHot = () => W().heat >= GUN.hotHeat;
/** Heat falls with time (called from the game loop with game hours passed). */
export function coolDown(hours: number) { if (W().heat > 0) W().set({ heat: clamp(W().heat - GUN.heatDecayPerHour * hours, 0, GUN.maxHeat) }); }

/** Police: an arrest with a weapon on you doubles the sentence and the weapon is taken. Returns the sentence to serve. */
export function policeSearch(minutes: number): { minutes: number; confiscated: WeaponId | null } {
  const id = W().equipped; if (!id) return { minutes, confiscated: null };
  W().set({ owned: W().owned.filter((x) => x !== id), equipped: null, heat: clamp(W().heat + 20, 0, GUN.maxHeat) });
  return { minutes: minutes * GUN.policeJailMultiplier, confiscated: id };
}

// ---- Open-world hooks: server-validated intents with pure rules. They return events and change nothing, so a server or a physics layer can call them.
export type WeaponEvent = { type: 'draw' | 'holster'; weapon: WeaponId } | { type: 'shot'; weapon: WeaponId; hit: boolean; damage: number; noise: number; cooldownMs: number } | { type: 'denied'; reason: string };
export const draw = (weapon: WeaponId, owned: WeaponId[]): WeaponEvent => owned.includes(weapon) ? { type: 'draw', weapon } : { type: 'denied', reason: 'not owned' };
export const holster = (weapon: WeaponId): WeaponEvent => ({ type: 'holster', weapon });
/** Pure damage rule: out of range never hits; inside range the hit chance falls with distance; damage is the weapon's. */
export function fire(weapon: WeaponId, distance: number, rnd: () => number = Math.random, ammo = 1): WeaponEvent {
  const w = WEAPONS[weapon]; if (ammo <= 0) return { type: 'denied', reason: 'empty' };
  const chance = distance > w.range ? 0 : clamp(1 - distance / w.range * 0.7, 0.1, 0.95), hit = rnd() < chance;
  return { type: 'shot', weapon, hit, damage: hit ? w.damage : 0, noise: w.noise, cooldownMs: w.cooldownMs };
}
