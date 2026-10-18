import { CONTACTS, contactLabel } from '@/data/contacts';
import { getPlayer } from '@/data/players';
import { useSocialStore } from '@/stores/socialStore';

/** Anything you can chat with, in one shape: a scripted character, a simulated player, or a group. */
export interface Peer {
  id: string; kind: 'npc' | 'player' | 'group';
  /** Shown in lists: @username for players, the name for characters and groups. */
  label: string; name: string; avatar: string; subtitle: string; line: string;
  members?: string[]; username?: string;
}

export function resolvePeer(id: string): Peer | undefined {
  const c = CONTACTS.find((x) => x.id === id);
  if (c) return { id, kind: 'npc', label: contactLabel(c), name: c.name, avatar: c.avatar, subtitle: `${c.role} · character`, line: c.line };
  const p = getPlayer(id);
  if (p) return { id, kind: 'player', label: `@${p.username}`, name: p.name, avatar: p.avatar, subtitle: 'Simulated player', line: p.lines[0], username: p.username };
  const g = useSocialStore.getState().groups.find((x) => x.id === id);
  if (g) return { id, kind: 'group', label: g.name, name: g.name, avatar: g.icon, subtitle: `${g.members.length + 1} members`, line: '', members: g.members };
  return undefined;
}
