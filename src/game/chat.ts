import { INTERIORS } from '@/data/interiors';
import type { InteriorPresence } from '@/stores/interiorStore';

/**
 * Chat rules (pure). Two scopes that never mix:
 *  local   one copy (instance) of one venue: `local:church:2` is a different channel from `local:church:1` and from `local:club:1`
 *  global  every eligible player in any venue that allows chat: `global`
 * Messages are validated here before they go anywhere. THE TRANSPORT IS A CLIENT STUB: `ChatTransport` is the boundary where a real
 * server decides who is in which channel, assigns ids and times, rate-limits, moderates and delivers. Offline, nothing leaves the device.
 */
export const CHAT = { maxLength: 140, minIntervalMs: 1500, keepPerChannel: 60 } as const;
export type ChatScope = 'local' | 'global';
export type SenderKind = 'player' | 'npc' | 'system';
export interface Sender { id: string; name: string; kind: SenderKind }
export interface ChatMessage { id: string; channel: string; scope: ChatScope; from: Sender; text: string; at: number }

/** The channel a player in `presence` writes to for a scope, or null if they may not (jail, not inside, venue without chat). */
export function channelFor(scope: ChatScope, presence: Pick<InteriorPresence, 'kind' | 'instance'> | null): string | null {
  if (!presence || !INTERIORS[presence.kind].chat) return null;
  return scope === 'global' ? 'global' : `local:${presence.kind}:${presence.instance}`;
}

/** Trim, drop control and invisible characters, collapse spaces. Returns the clean text, or an error. */
export function cleanMessage(raw: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Type something first.' };
  const text = raw.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, error: 'Type something first.' };
  if (text.length > CHAT.maxLength) return { ok: false, error: `Keep it under ${CHAT.maxLength} characters.` };
  return { ok: true, text };
}

export interface ChatTransport {
  /** true only when a server confirms delivery and enforces membership. */
  readonly authoritative: boolean;
  publish(m: ChatMessage): void;
}
export const localTransport: ChatTransport = { authoritative: false, publish() { /* offline: stays on this device */ } };
let transport: ChatTransport = localTransport;
export const getTransport = () => transport;
export const setTransport = (t: ChatTransport) => { transport = t; };

/** What tapping a name offers. Visiting someone needs the online service, so offline it is disabled with the reason. */
export interface MenuOption { id: 'profile' | 'visit' | 'travel'; label: string; enabled: boolean; reason?: string }
export function playerMenu(from: Sender, online: boolean): MenuOption[] {
  if (from.kind === 'system' || from.id === 'me') return [];
  const need = online ? undefined : 'Needs the online service';
  return from.kind === 'npc'
    ? [{ id: 'profile', label: 'View profile', enabled: true }]
    : [{ id: 'profile', label: 'View profile', enabled: online, reason: need }, { id: 'visit', label: 'Visit player', enabled: online, reason: need }, { id: 'travel', label: 'Go to their location', enabled: online, reason: need }];
}
