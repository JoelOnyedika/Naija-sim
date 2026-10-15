import { create } from 'zustand';

/**
 * What the avatar has been told to do. Pure intent: the scene (AvatarWalker) turns it into walking and animation, and the
 * simulation (statsStore) only starts an activity once the avatar has actually arrived. Not persisted.
 */
export type Order =
  | { id: number; kind: 'walk'; x: number; z: number }
  | { id: number; kind: 'use'; uid: string };

/** The ONLY things the avatar may do on its own when the player is away (see game/afk.ts). Purely visual. */
export type CosmeticKind = 'tv' | 'eat' | 'pushups' | 'relax';

interface ActorState {
  order: Order | null;
  seq: number;
  cosmetic: { kind: CosmeticKind; uid?: string; until: number } | null;
  /** performance.now() of the last player input; AFK looks at this. */
  lastInput: number;
  walkTo: (x: number, z: number) => void;
  useItem: (uid: string) => void;
  clearOrder: () => void;
  setCosmetic: (c: ActorState['cosmetic']) => void;
  touch: () => void;
  reset: () => void;
}

export const useActorStore = create<ActorState>((set, get) => ({
  order: null, seq: 0, cosmetic: null, lastInput: typeof performance !== 'undefined' ? performance.now() : 0,
  walkTo: (x, z) => set({ order: { id: get().seq + 1, kind: 'walk', x, z }, seq: get().seq + 1, cosmetic: null }),
  useItem: (uid) => set({ order: { id: get().seq + 1, kind: 'use', uid }, seq: get().seq + 1, cosmetic: null }),
  clearOrder: () => set({ order: null }),
  setCosmetic: (cosmetic) => set({ cosmetic }),
  touch: () => set({ lastInput: performance.now() }),
  reset: () => set({ order: null, cosmetic: null, lastInput: performance.now() }),
}));
