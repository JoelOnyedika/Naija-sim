import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';
import type { AppId } from '@/data/apps';

export interface PhoneNotification { id: string; title: string; body: string; icon: string; appId?: AppId; at: number; read: boolean }
export interface ChatMessage { id: string; from: 'me' | 'them'; text: string; at: number }

interface PhoneState {
  open: boolean;
  appId: AppId | null;
  /** Where the open app should grow from, as % of the phone screen. */
  origin: { x: number; y: number };
  recents: AppId[];
  switcher: boolean;
  chatWith: string | null;
  notifications: PhoneNotification[];
  threads: Record<string, ChatMessage[]>;
  openPhone: () => void;
  closePhone: () => void;
  openApp: (id: AppId, origin?: { x: number; y: number }) => void;
  closeApp: () => void;
  setSwitcher: (v: boolean) => void;
  setChatWith: (id: string | null) => void;
  push: (n: Omit<PhoneNotification, 'id' | 'at' | 'read'>) => void;
  markRead: () => void;
  say: (contactId: string, from: 'me' | 'them', text: string) => void;
  reset: () => void;
}

export const usePhoneStore = create<PhoneState>()(persist((set) => ({
  open: false, appId: null, origin: { x: 50, y: 50 }, recents: [], switcher: false, chatWith: null, notifications: [], threads: {},
  openPhone: () => set({ open: true }),
  closePhone: () => set({ open: false, appId: null, switcher: false }),
  openApp: (id, origin) => set((s) => ({ appId: id, switcher: false, origin: origin ?? s.origin, recents: [id, ...s.recents.filter((r) => r !== id)].slice(0, 6) })),
  closeApp: () => set({ appId: null, switcher: false }),
  setSwitcher: (switcher) => set({ switcher }),
  setChatWith: (chatWith) => set({ chatWith }),
  push: (n) => set((s) => ({ notifications: [{ ...n, id: uid(), at: Date.now(), read: false }, ...s.notifications].slice(0, 30) })),
  markRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  say: (contactId, from, text) => set((s) => ({ threads: { ...s.threads, [contactId]: [...(s.threads[contactId] ?? []), { id: uid(), from, text, at: Date.now() }].slice(-40) } })),
  reset: () => set({ open: false, appId: null, recents: [], switcher: false, notifications: [], threads: {} }),
}), { name: 'nigerialife.phone', version: 1, partialize: (s) => ({ notifications: s.notifications, threads: s.threads, recents: s.recents }) }));
