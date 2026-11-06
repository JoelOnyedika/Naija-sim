import { BODYGUARD } from '@/data/bodyguard';
import { useBodyguardStore } from '@/stores/bodyguardStore';
import { useEconomyStore } from '@/stores/economyStore';
import { isOverdue } from './billEffects';
import { notify } from './notify';

const S = () => useBodyguardStore.getState();
/** He protects you while he is hired and his weekly wage is paid. An overdue wage means he stands down. */
export const hasBodyguard = (): boolean => S().hired && !isOverdue(BODYGUARD.id);

export function hireBodyguard(): { ok: boolean; message: string } {
  if (S().hired) return { ok: false, message: 'You already have a bodyguard.' };
  if (!useEconomyStore.getState().debit(BODYGUARD.hireFee, 'Hired a bodyguard', 'purchase', 'Security')) return { ok: false, message: 'Not enough money for the hiring fee.' };
  S().hire();
  return { ok: true, message: 'Bodyguard hired. He will be at your door.' };
}
export const dismissBodyguard = () => S().dismiss();

/** An Agbero roadblock was about to happen. Returns true when the bodyguard stops it (no roadblock, nothing paid, no story progress). */
export function guardStopsAgbero(): boolean {
  if (!hasBodyguard()) return false;
  S().stop('agbero');
  notify({ title: 'Your bodyguard stepped in', body: 'Agbero wanted to hold you, but your bodyguard stopped them.', icon: '🕶️' });
  return true;
}

/**
 * Someone tried to pickpocket the player. With a bodyguard the theft is stopped and the thief is arrested; `arrest` is how the caller
 * jails them. Nothing calls this yet because there is no multiplayer, but the rule is decided and tested here so it is ready:
 * a future server calls it when another player's pickpocket attempt targets this player.
 */
export function guardStopsTheft(arrest: (thiefId: string) => void, thiefId: string): boolean {
  if (!hasBodyguard()) return false;
  S().stop('thieves');
  arrest(thiefId);
  notify({ title: 'Pickpocket stopped', body: 'Your bodyguard caught a pickpocket. The police arrested them.', icon: '🚓' });
  return true;
}
