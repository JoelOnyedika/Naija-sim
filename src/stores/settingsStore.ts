import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState { sfx: boolean; music: boolean; toggleSfx: () => void; toggleMusic: () => void }
export const useSettingsStore = create<SettingsState>()(persist((set) => ({
  sfx: true, music: true,
  toggleSfx: () => set((s) => ({ sfx: !s.sfx })),
  toggleMusic: () => set((s) => ({ music: !s.music })),
}), { name: 'nigerialife.settings', version: 1 }));
