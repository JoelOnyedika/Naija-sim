import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/core/format';
import type { AppId } from '@/data/apps';

export interface PhoneNotification { id: string; title: string; body: string; icon: string; appId?: AppId; at: number; read: boolean }
export interface ChatMessage {
  id: string; from: 'me' | 'them'; text: string; at: number;
  /** 'transaction' messages show a card read live from the banking record `txId`. */
  kind?: 'text' | 'transaction'; txId?: string;
  /** id of the message this one replies to (rendered as a quoted preview). */
  replyTo?: string;
  /** emoji -> who reacted. Reacting again with the same emoji removes it. */
  reactions?: Record<string, ('me' | 'them')[]>;
  /** In groups: who said it (a peer id or display name). */
  sender?: string;
  /** Pinned inside this chat (at most MAX_PINS per chat). */
  pinned?: boolean;
  /** A notice such as "You created the group", shown centred instead of as a bubble. */
  system?: boolean;
}
export const MAX_PINS = 3;
export type SayExtra = Partial<Pick<ChatMessage, 'kind' | 'txId' | 'replyTo' | 'sender' | 'system'>>;

/** Bumped on reset so delayed NPC replies from an old life never land in the new one. */
let epoch = 0;
export const phoneEpoch = () => epoch;

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
  /** Last time each thread was opened, for unread badges. */
  readAt: Record<string, number>;
  openPhone: () => void;
  closePhone: () => void;
  openApp: (id: AppId, origin?: { x: number; y: number }) => void;
  closeApp: () => void;
  setSwitcher: (v: boolean) => void;
  setChatWith: (id: string | null) => void;
  push: (n: Omit<PhoneNotification, 'id' | 'at' | 'read'>) => void;
  markRead: () => void;
  /** Adds a message and returns its id. */
  say: (contactId: string, from: 'me' | 'them', text: string, extra?: SayExtra) => string;
  react: (contactId: string, messageId: string, emoji: string, by: 'me' | 'them') => void;
  markThreadRead: (contactId: string) => void;
  /** Toggles a pin. Returns false if the chat already has MAX_PINS pinned messages. */
  pin: (contactId: string, messageId: string) => boolean;
  /** Clears the messages of one chat on this device. Bank records are separate and are never touched. */
  clearThread: (contactId: string) => void;
  markAllRead: () => void;
  reset: () => void;
}

export const usePhoneStore = create<PhoneState>()(persist((set, get) => ({
  open: false, appId: null, origin: { x: 50, y: 50 }, recents: [], switcher: false, chatWith: null, notifications: [], threads: {}, readAt: {},
  openPhone: () => set({ open: true }),
  closePhone: () => set({ open: false, appId: null, switcher: false }),
  openApp: (id, origin) => set((s) => ({ appId: id, switcher: false, origin: origin ?? s.origin, recents: [id, ...s.recents.filter((r) => r !== id)].slice(0, 6) })),
  closeApp: () => set({ appId: null, switcher: false }),
  setSwitcher: (switcher) => set({ switcher }),
  setChatWith: (chatWith) => set({ chatWith }),
  push: (n) => set((s) => ({ notifications: [{ ...n, id: uid(), at: Date.now(), read: false }, ...s.notifications].slice(0, 30) })),
  markRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  say: (contactId, from, text, extra) => {
    const id = uid();
    set((s) => ({ threads: { ...s.threads, [contactId]: [...(s.threads[contactId] ?? []), { id, from, text, at: Date.now(), ...extra }].slice(-300) } }));
    return id;
  },
  react: (contactId, messageId, emoji, by) => set((s) => ({
    threads: {
      ...s.threads,
      [contactId]: (s.threads[contactId] ?? []).map((m) => {
        if (m.id !== messageId) return m;
        const who = m.reactions?.[emoji] ?? [];
        const next = who.includes(by) ? who.filter((w) => w !== by) : [...who, by];
        const reactions = { ...m.reactions };
        if (next.length) reactions[emoji] = next; else delete reactions[emoji];
        return { ...m, reactions };
      }),
    },
  })),
  markThreadRead: (contactId) => set((s) => ({ readAt: { ...s.readAt, [contactId]: Date.now() } })),
  pin: (contactId, messageId) => {
    const list = get().threads[contactId] ?? [], m = list.find((x) => x.id === messageId);
    if (!m) return false;
    if (!m.pinned && list.filter((x) => x.pinned).length >= MAX_PINS) return false;
    set((s) => ({ threads: { ...s.threads, [contactId]: list.map((x) => (x.id === messageId ? { ...x, pinned: !x.pinned } : x)) } }));
    return true;
  },
  clearThread: (contactId) => set((s) => { const t = { ...s.threads }; delete t[contactId]; return { threads: t }; }),
  markAllRead: () => set((s) => ({ readAt: Object.fromEntries(Object.keys(s.threads).map((k) => [k, Date.now()])) })),
  reset: () => { epoch += 1; set({ open: false, appId: null, recents: [], switcher: false, chatWith: null, notifications: [], threads: {}, readAt: {} }); },
}), { name: 'nigerialife.phone', version: 1, partialize: (s) => ({ notifications: s.notifications, threads: s.threads, recents: s.recents, readAt: s.readAt }) }));
