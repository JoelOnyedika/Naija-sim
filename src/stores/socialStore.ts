import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Who you know and who may talk to you. Message TEXT lives in phoneStore.threads (one message store for every kind of chat);
 * this store holds the relationships around it. Everything refers to people by id: `p:<username>` for simulated players,
 * contact ids for scripted characters, `g:<id>` for groups.
 */
export interface MessageRequest { id: string; playerId: string; text: string; at: number; status: 'pending' | 'accepted' | 'rejected' }
export interface Group { id: string; name: string; icon: string; members: string[]; createdAt: number }
export interface NotifyPrefs { messages: boolean; requests: boolean; groups: boolean }
interface SocialState {
  /** Players you added as contacts ("friends"). */
  added: string[];
  /** Players whose message request you accepted. */
  approved: string[];
  /** Players whose request you rejected. They cannot request again. */
  declined: string[];
  requests: MessageRequest[];
  groups: Group[];
  /** Your first message to a player who is not a contact: pending until they accept. */
  outbound: Record<string, 'pending' | 'accepted'>;
  prefs: NotifyPrefs;
  reset: () => void;
}
const fresh = () => ({ added: [], approved: [], declined: [], requests: [], groups: [], outbound: {}, prefs: { messages: true, requests: true, groups: true } });
export const useSocialStore = create<SocialState>()(persist((set) => ({ ...fresh(), reset: () => set(fresh()) }), { name: 'nigerialife.social', version: 1 }));
