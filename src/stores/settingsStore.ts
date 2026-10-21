import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type GraphicsMode = 'auto' | 'on' | 'off';
export type MessagePrivacy = 'everyone' | 'friends';

/**
 * Player settings. Missing keys in older saves are filled from the defaults below (zustand merges persisted state over
 * them), so adding a setting never resets the others.
 *  - theme: how phone apps look. Light is the original look and stays the default.
 *  - batterySaver: stops decorative animation and keeps graphics at 'low' or below.
 *  - messagePrivacy: 'everyone' = anyone can contact you (strangers arrive as message requests); 'friends' = only people you added.
 *  - showRelationship: show your relationship status on your profile (off by default).
 *  - graphics: auto = measured per device (PerfGovernor), on = best quality the device allows, off = lowest tier.
 */
interface SettingsState {
  sfx: boolean; music: boolean; theme: ThemeMode; batterySaver: boolean; graphics: GraphicsMode; messagePrivacy: MessagePrivacy; showRelationship: boolean;
  /** Advertising consent for third-party ad providers. 'unknown' until the player chooses. No third-party provider is active today. */
  adConsent: 'unknown' | 'granted' | 'denied'; setAdConsent: (c: 'unknown' | 'granted' | 'denied') => void;
  toggleSfx: () => void; toggleMusic: () => void;
  setTheme: (t: ThemeMode) => void; setBatterySaver: (v: boolean) => void; setGraphics: (g: GraphicsMode) => void; setMessagePrivacy: (m: MessagePrivacy) => void; setShowRelationship: (v: boolean) => void;
}
export const useSettingsStore = create<SettingsState>()(persist((set) => ({
  sfx: true, music: true, theme: 'light', batterySaver: false, graphics: 'auto', messagePrivacy: 'everyone', showRelationship: false, adConsent: 'unknown', setAdConsent: (adConsent) => set({ adConsent }),
  toggleSfx: () => set((s) => ({ sfx: !s.sfx })),
  toggleMusic: () => set((s) => ({ music: !s.music })),
  setTheme: (theme) => set({ theme }),
  setBatterySaver: (batterySaver) => set({ batterySaver }),
  setGraphics: (graphics) => set({ graphics }),
  setMessagePrivacy: (messagePrivacy) => set({ messagePrivacy }),
  setShowRelationship: (showRelationship) => set({ showRelationship }),
}), { name: 'nigerialife.settings', version: 1 }));

/** Lowest-quality tier index the governor may use for the current settings (0 = best). */
export const tierFloor = (s: Pick<SettingsState, 'batterySaver'>) => (s.batterySaver ? 2 : 0);
