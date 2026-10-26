import { sfx } from '@/audio/sfx';
import { nowMinutes } from '@/core/gameTime';
import { uid } from '@/core/format';
import { CONTACTS } from '@/data/contacts';
import { PLAYERS, getPlayer, type PlayerDef } from '@/data/players';
import { phoneEpoch, usePhoneStore } from '@/stores/phoneStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSocialStore, type Group } from '@/stores/socialStore';
import { guarded } from './guard';
import { notify } from './notify';
import { resolvePeer } from './peers';

/**
 * Messaging rules. All "other people" are scripted: scripted characters (Mama...) and SIMULATED players. Nothing here talks
 * to a server, and nothing implies a real person is on the other end.
 *
 * Who may start a chat with you (deliveryPolicy), for a player who contacts you:
 *   - you rejected them before               -> blocked
 *   - they are a contact you added           -> straight into Chats
 *   - your privacy is "Only friends"         -> blocked (they cannot even send a request)
 *   - you accepted a request from them before-> straight into Chats
 *   - anyone else                            -> a message request (not a chat) until you accept
 */
export type Result = { ok: true } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const social = () => useSocialStore.getState();
const phone = () => usePhoneStore.getState();

export const REPLIES = ['Okay o!', 'Hahaha, true.', 'No wahala. Let us talk later.', 'I dey hear you.', 'Make sure you rest too.', 'Sharp sharp.'];
export const GROUP_ICONS = ['👥', '🎉', '🏠', '💼', '⚽', '🍛', '🎧', '✈️', '🎓', '💬'];
export const MAX_GROUP_NAME = 30, MAX_GROUP_MEMBERS = 20, MAX_TEXT = 500;

// ── Contacts
export function searchPlayers(query: string): PlayerDef[] {
  const q = query.trim().toLowerCase().replace(/^@/, '');
  if (!q) return [];
  return PLAYERS.filter((p) => p.username.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    .sort((a, b) => Number(b.username.startsWith(q)) - Number(a.username.startsWith(q)) || a.username.localeCompare(b.username));
}
export const isContact = (id: string) => social().added.includes(id);

export function addContact(playerId: string): Result {
  if (!getPlayer(playerId)) return no('That player does not exist.');
  if (isContact(playerId)) return no('They are already in your contacts.');
  useSocialStore.setState((s) => ({ added: [...s.added, playerId], declined: s.declined.filter((x) => x !== playerId) }));
  return { ok: true };
}
export function removeContact(playerId: string): Result {
  if (!isContact(playerId)) return no('They are not in your contacts.');
  useSocialStore.setState((s) => ({ added: s.added.filter((x) => x !== playerId) }));
  return { ok: true };
}

// ── Message initiation
export type Policy = 'direct' | 'request' | 'blocked';
export function deliveryPolicy(playerId: string): Policy {
  const s = social();
  if (s.declined.includes(playerId)) return 'blocked';
  if (s.added.includes(playerId)) return 'direct';
  if (useSettingsStore.getState().messagePrivacy === 'friends') return 'blocked';
  return s.approved.includes(playerId) ? 'direct' : 'request';
}

/** Tell the player about a new message, unless they turned that kind off, or the chat is open right now. */
export function notifyMessage(peerId: string, text: string, kind: 'messages' | 'requests' | 'groups' = 'messages') {
  const peer = resolvePeer(peerId);
  if (!peer || !social().prefs[kind]) return;
  const ph = phone();
  if (ph.open && ph.appId === 'messages' && ph.chatWith === peerId) return;
  notify({ title: kind === 'requests' ? `Message request from ${peer.label}` : peer.label, body: text.slice(0, 80), icon: peer.avatar, appId: 'messages' });
}

export type Incoming = 'delivered' | 'requested' | 'blocked' | 'duplicate' | 'unknown';
/** A simulated player contacts you. The privacy rules above decide where it lands. */
export function receiveFromPlayer(playerId: string, text: string): Incoming {
  const player = getPlayer(playerId);
  if (!player) return 'unknown';
  const policy = deliveryPolicy(playerId);
  if (policy === 'blocked') return 'blocked';
  if (policy === 'direct') { phone().say(playerId, 'them', text); notifyMessage(playerId, text); return 'delivered'; }
  if (social().requests.some((r) => r.playerId === playerId && r.status === 'pending')) return 'duplicate';
  useSocialStore.setState((s) => ({ requests: [{ id: uid(), playerId, text, at: Date.now(), status: 'pending' as const }, ...s.requests].slice(0, 50) }));
  notifyMessage(playerId, text, 'requests');
  return 'requested';
}

export function acceptRequest(requestId: string): Result {
  const r = social().requests.find((x) => x.id === requestId);
  if (!r || r.status !== 'pending') return no('That request is no longer waiting.');
  useSocialStore.setState((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'accepted' as const } : x)), approved: s.approved.includes(r.playerId) ? s.approved : [...s.approved, r.playerId] }));
  phone().say(r.playerId, 'them', r.text); // the request becomes a normal chat
  return { ok: true };
}
export function rejectRequest(requestId: string): Result {
  const r = social().requests.find((x) => x.id === requestId);
  if (!r || r.status !== 'pending') return no('That request is no longer waiting.');
  useSocialStore.setState((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'rejected' as const } : x)), declined: s.declined.includes(r.playerId) ? s.declined : [...s.declined, r.playerId] }));
  return { ok: true };
}
export const pendingRequests = () => social().requests.filter((r) => r.status === 'pending');

/**
 * Simulated: every 2 game days a player you have not approved tries to contact you (at most 2 requests waiting at once).
 * This only exists so Message Requests and the privacy setting can be seen working; it is not real activity.
 */
export function simulateContactAttempt(period: number) {
  if (pendingRequests().length >= 2) return;
  const s = social();
  const pool = PLAYERS.filter((p) => !s.added.includes(p.id) && !s.approved.includes(p.id) && !s.declined.includes(p.id) && !s.requests.some((r) => r.playerId === p.id && r.status === 'pending'));
  if (!pool.length) return;
  const p = pool[period % pool.length];
  receiveFromPlayer(p.id, p.opener);
}

// ── Sending
const later = (ms: number, fn: () => void) => { const e = phoneEpoch(); window.setTimeout(() => { if (e === phoneEpoch()) fn(); }, ms); };

/** Whether a simulated player will answer you: they accept strangers, or you are already connected. */
export function playerWillReply(playerId: string): boolean {
  const p = getPlayer(playerId), s = social();
  return !!p && (p.acceptsStrangers || s.added.includes(playerId) || s.approved.includes(playerId));
}
export function playerReplyLine(playerId: string, n = Math.floor(Math.random() * 100)): string {
  const p = getPlayer(playerId)!; return p.lines[n % p.lines.length];
}

/** Sends a message in any chat: character, simulated player or group. Replies are scripted and arrive a moment later. */
export function sendMessage(peerId: string, text: string, replyTo?: string): Result {
  const t = text.trim();
  if (!t) return no('Type a message first.');
  if (t.length > MAX_TEXT) return no(`Keep it under ${MAX_TEXT} characters.`);
  const peer = resolvePeer(peerId);
  if (!peer) return no('That chat does not exist.');
  phone().say(peerId, 'me', t, replyTo ? { replyTo } : undefined);
  if (peer.kind === 'npc') {
    const c = CONTACTS.find((x) => x.id === peerId);
    later(1200, () => { phone().say(peerId, 'them', Math.random() > 0.5 ? (c?.line ?? peer.line) : REPLIES[Math.floor(Math.random() * REPLIES.length)]); sfx.notify(); });
  } else if (peer.kind === 'player') {
    const s = social();
    if (!s.outbound[peerId]) useSocialStore.setState({ outbound: { ...s.outbound, [peerId]: playerWillReply(peerId) ? 'accepted' : 'pending' } });
    // you wrote to them, so a player who later writes back is not a stranger any more
    if (playerWillReply(peerId)) { useSocialStore.setState((x) => ({ approved: x.approved.includes(peerId) || x.added.includes(peerId) ? x.approved : [...x.approved, peerId], declined: x.declined.filter((d) => d !== peerId) })); later(1400, () => { phone().say(peerId, 'them', playerReplyLine(peerId)); sfx.notify(); }); }
  } else {
    later(1800, () => groupReply(peerId));
  }
  return { ok: true };
}

// ── Groups
export function groupReply(groupId: string) {
  const g = social().groups.find((x) => x.id === groupId);
  if (!g) return;
  const speakers = g.members.filter((m) => !!getPlayer(m) || !!CONTACTS.find((c) => c.id === m));
  if (!speakers.length) return;
  const who = speakers[Math.floor(Math.random() * speakers.length)], peer = resolvePeer(who)!;
  const line = getPlayer(who) ? playerReplyLine(who) : CONTACTS.find((c) => c.id === who)!.line;
  phone().say(groupId, 'them', line, { sender: peer.name });
  notifyMessage(groupId, `${peer.name}: ${line}`, 'groups');
}

/** People who can be put in a group: family, friends, neighbours and players. Businesses cannot. */
export const groupCandidates = () => [...CONTACTS.filter((c) => c.group !== 'business').map((c) => c.id), ...PLAYERS.map((p) => p.id)];

export function createGroup(input: { name: string; icon: string; members: string[] }): Result & { group?: Group } {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const members = [...new Set(input.members)];
  if (!name) return no('Give the group a name.');
  if (name.length > MAX_GROUP_NAME) return no(`Keep the name under ${MAX_GROUP_NAME} characters.`);
  if (!GROUP_ICONS.includes(input.icon)) return no('Choose an icon.');
  if (members.length < 1) return no('Add at least one person.');
  if (members.length > MAX_GROUP_MEMBERS) return no(`A group can have up to ${MAX_GROUP_MEMBERS} people.`);
  const allowed = new Set(groupCandidates());
  if (members.some((m) => !allowed.has(m))) return no('One of those people cannot be added to a group.');
  const key = `${name.toLowerCase()}|${[...members].sort().join(',')}`;
  if (social().groups.some((g) => g.name.toLowerCase() === name.toLowerCase() && [...g.members].sort().join(',') === [...members].sort().join(','))) return no('You already have that group.');
  return guarded(`group|${key}`, () => {
    const group: Group = { id: `g:${uid()}`, name, icon: input.icon, members, createdAt: nowMinutes() };
    useSocialStore.setState((s) => ({ groups: [group, ...s.groups] }));
    phone().say(group.id, 'me', 'You created this group', { system: true });
    return { ok: true, group } as Result & { group: Group };
  }, no('That group was already created.') as Result & { group?: Group });
}

export function leaveGroup(groupId: string): Result {
  if (!social().groups.some((g) => g.id === groupId)) return no('That group does not exist.');
  useSocialStore.setState((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) }));
  phone().clearThread(groupId);
  if (phone().chatWith === groupId) phone().setChatWith(null);
  return { ok: true };
}

/** Removes a chat from your list by clearing its messages on this device. Bank records and the other person are untouched. */
export function deleteChat(peerId: string): Result {
  if (!resolvePeer(peerId)) return no('That chat does not exist.');
  phone().clearThread(peerId);
  if (phone().chatWith === peerId) phone().setChatWith(null);
  return { ok: true };
}

// ── Unread
export const unreadCount = (peerId: string) => { const ph = phone(); return (ph.threads[peerId] ?? []).filter((m) => m.from === 'them' && !m.system && m.at > (ph.readAt[peerId] ?? 0)).length; };
