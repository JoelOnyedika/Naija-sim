import { create } from 'zustand';

/** One-shot hint (not saved): the in-house wardrobe opens the Boutique showing only clothes you own. */
export const useBoutiqueNav = create<{ ownedOnly: boolean; setOwnedOnly: (v: boolean) => void }>((set) => ({ ownedOnly: false, setOwnedOnly: (ownedOnly) => set({ ownedOnly }) }));
