import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PET_CARE } from '@/data/balance';

export type PetAction = 'pet' | 'feed' | 'play';
export interface PetRecord {
  defId: string; name: string;
  /** 0..100. Grows when you care for the pet, falls slowly if it starves. */
  bond: number;
  /** 0 = full, 100 = starving. */
  hunger: number;
  /** Last time each action earned bond (ms), for the anti-spam cooldown. */
  last: Partial<Record<PetAction, number>>;
}
const NAMES: Record<string, string> = { pet_cat: 'Mimi', pet_dog: 'Bingo', pet_lion: 'Simba' };
const clamp = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));

/** Pet care state, keyed by the placed pet's uid. A pet that is stored or sold keeps its record, and the next pet of the same kind adopts it. */
interface PetState {
  pets: Record<string, PetRecord>;
  /** Make sure every live pet has a record; adopt a leftover record of the same kind before creating a fresh one. */
  sync: (live: { uid: string; defId: string }[]) => void;
  tick: (dt: number, liveUids: string[]) => void;
  /** Returns the bond actually gained (0 inside the cooldown). */
  apply: (uid: string, action: PetAction, at?: number) => number;
  reset: () => void;
}
const MAX_ORPHANS = 6;

export const usePetStore = create<PetState>()(persist((set, get) => ({
  pets: {},
  sync: (live) => {
    const liveSet = new Set(live.map((l) => l.uid));
    let pets = get().pets, changed = false;
    for (const l of live) {
      if (pets[l.uid]) continue;
      const orphan = Object.entries(pets).find(([k, r]) => !liveSet.has(k) && r.defId === l.defId);
      const next = { ...pets };
      if (orphan) { next[l.uid] = orphan[1]; delete next[orphan[0]]; } else next[l.uid] = { defId: l.defId, name: NAMES[l.defId] ?? 'Pet', bond: 0, hunger: 25, last: {} };
      pets = next; changed = true;
    }
    const orphans = Object.keys(pets).filter((k) => !liveSet.has(k));
    if (orphans.length > MAX_ORPHANS) { const next = { ...pets }; for (const k of orphans.slice(0, orphans.length - MAX_ORPHANS)) delete next[k]; pets = next; changed = true; }
    if (changed) set({ pets });
  },
  tick: (dt, liveUids) => set((s) => {
    const d = Math.max(0, Math.min(dt, 600)); if (!d) return s;
    const pets = { ...s.pets }; let changed = false;
    for (const uid of liveUids) {
      const r = pets[uid]; if (!r) continue;
      const hunger = clamp(r.hunger + PET_CARE.hungerPerSecond * d);
      const bond = hunger >= 100 ? clamp(r.bond - PET_CARE.starvingBondLoss * d) : r.bond;
      if (hunger !== r.hunger || bond !== r.bond) { pets[uid] = { ...r, hunger, bond }; changed = true; }
    }
    return changed ? { pets } : s;
  }),
  apply: (uid, action, at = Date.now()) => {
    const r = get().pets[uid]; if (!r) return 0;
    const ready = at - (r.last[action] ?? -Infinity) >= PET_CARE.bondCooldownSeconds[action] * 1000;
    // a hungry pet is less interested: half the bond
    const gain = ready ? PET_CARE.bondGain[action] * (r.hunger >= 70 && action !== 'feed' ? 0.5 : 1) : 0;
    const hunger = action === 'feed' ? clamp(r.hunger - PET_CARE.feedRelief) : r.hunger;
    set((s) => ({ pets: { ...s.pets, [uid]: { ...r, hunger, bond: clamp(r.bond + gain), last: ready ? { ...r.last, [action]: at } : r.last } } }));
    return gain;
  },
  reset: () => set({ pets: {} }),
}), { name: 'nigerialife.pets', version: 1 }));
