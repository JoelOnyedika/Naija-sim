import { PET_CARE } from '@/data/balance';
import { getFurniture, type UseDef } from '@/data/items';
import { toast } from '@/stores/uiStore';
import { usePetStore, type PetAction, type PetRecord } from '@/stores/petStore';
import { getActiveHome } from './active';

export type Mood = 'hungry' | 'content' | 'happy' | 'devoted';
export const MOOD_LABEL: Record<Mood, { label: string; glyph: string }> = {
  hungry: { label: 'Hungry', glyph: '😿' }, content: { label: 'Content', glyph: '🙂' }, happy: { label: 'Happy', glyph: '😸' }, devoted: { label: 'Devoted', glyph: '🥰' },
};
export function petMood(r: Pick<PetRecord, 'bond' | 'hunger'>): Mood {
  if (r.hunger >= 70) return 'hungry';
  if (r.bond >= 80) return 'devoted';
  if (r.bond >= 30 && r.hunger < 50) return 'happy';
  return 'content';
}

/** Live pets of the active home, as { uid, defId }. */
export const livePets = () => (getActiveHome()?.placed ?? []).filter((p) => getFurniture(p.defId)?.pet).map((p) => ({ uid: p.uid, defId: p.defId }));

/** One simulation step: pets get hungry over time (only pets that are out in the active home). */
export function stepPets(dt: number) {
  const live = livePets(); if (!live.length) return;
  const st = usePetStore.getState();
  st.sync(live); usePetStore.getState().tick(dt, live.map((l) => l.uid));
}

/** Why this pet activity cannot start right now, or null. Checked in the menu and again when the character arrives. */
export function petBlockedReason(u: UseDef, uid: string): string | null {
  if (!u.petAction) return null;
  const r = usePetStore.getState().pets[uid]; if (!r) return null;
  if (u.petAction === 'feed' && r.hunger < PET_CARE.feedMinHunger) return `${r.name} is not hungry right now.`;
  if (u.petAction === 'play' && r.hunger > PET_CARE.playMaxHunger) return `${r.name} is too hungry to play. Feed it first.`;
  return null;
}

/** Happiness gain multiplier from bond for activities with this pet. */
export function bondMultiplier(uid: string): number {
  const r = usePetStore.getState().pets[uid];
  return 1 + (r ? r.bond / 100 : 0) * PET_CARE.bondHappinessBonus;
}

const SOUND = { pet_cat: 'Purrr 🐱', pet_dog: 'Woof woof! 🐶', pet_lion: 'A deep rumble. Simba approves. 🦁' } as Record<string, string>;

/** Called ONCE when a pet activity finishes (the activity runner returns a finished activity a single time). */
export function finishPetAction(uid: string | undefined, action: PetAction) {
  if (!uid) return;
  const st = usePetStore.getState(), r = st.pets[uid]; if (!r) return;
  const gain = st.apply(uid, action);
  toast(`${r.name}: ${SOUND[r.defId] ?? 'happy'}${gain > 0 ? `  Bond +${gain}` : ''}`, 'good');
}
