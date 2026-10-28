import { create } from 'zustand';

/** What each vendor is saying right now (a speech bubble over their head). `n` changes with every line so the bubble restarts. */
interface Say { text: string; n: number }
interface VendorTalk { says: Record<string, Say>; say: (vendorUid: string, text: string) => void }
let counter = 0;
export const useVendorTalk = create<VendorTalk>((set) => ({
  says: {},
  say: (uid, text) => set((s) => ({ says: { ...s.says, [uid]: { text, n: ++counter } } })),
}));
