import { create } from 'zustand';
import { CHAT, channelFor, cleanMessage, getTransport, type ChatMessage, type ChatScope, type Sender } from '@/game/chat';
import { useInteriorStore } from './interiorStore';

/** Chat state. Each channel keeps its own list: nothing is ever stored in one shared pile and filtered later. Not persisted. */
interface ChatState {
  channels: Record<string, ChatMessage[]>;
  lastSentAt: number; seq: number;
  /** Send as the player. */
  send: (scope: ChatScope, raw: string, now?: number) => { ok: boolean; error?: string };
  /** Receive something from elsewhere (NPC chatter, system notices, and later the server). */
  receive: (channel: string, scope: ChatScope, from: Sender, text: string, at?: number) => void;
  reset: () => void;
}
const ME: Sender = { id: 'me', name: 'You', kind: 'player' };

export const useChatStore = create<ChatState>((set, get) => ({
  channels: {}, lastSentAt: 0, seq: 0,
  send: (scope, raw, now = Date.now()) => {
    const channel = channelFor(scope, useInteriorStore.getState().current);
    if (!channel) return { ok: false, error: 'You cannot chat from here.' };
    const c = cleanMessage(raw); if (!c.ok) return c;
    if (now - get().lastSentAt < CHAT.minIntervalMs) return { ok: false, error: 'Slow down a little.' };
    const m: ChatMessage = { id: `m${get().seq + 1}`, channel, scope, from: ME, text: c.text, at: now };
    set((s) => ({ seq: s.seq + 1, lastSentAt: now, channels: { ...s.channels, [channel]: [...(s.channels[channel] ?? []), m].slice(-CHAT.keepPerChannel) } }));
    getTransport().publish(m);
    return { ok: true };
  },
  receive: (channel, scope, from, text, at = Date.now()) => {
    const c = cleanMessage(text); if (!c.ok) return;
    set((s) => ({ seq: s.seq + 1, channels: { ...s.channels, [channel]: [...(s.channels[channel] ?? []), { id: `m${s.seq + 1}`, channel, scope, from, text: c.text, at }].slice(-CHAT.keepPerChannel) } }));
  },
  reset: () => set({ channels: {}, lastSentAt: 0, seq: 0 }),
}));
