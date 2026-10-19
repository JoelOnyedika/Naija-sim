import { Bell, Inbox, MessageCircle, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { acceptRequest, deleteChat, leaveGroup, rejectRequest, unreadCount } from '@/game/social';
import { resolvePeer, type Peer } from '@/game/peers';
import { getPlayer } from '@/data/players';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSocialStore } from '@/stores/socialStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, SearchField, Tabs } from '../../ui';
import { dayFmt, preview, sameDay, timeFmt } from './Conversation';

export type Section = 'chats' | 'groups' | 'requests';
type Filter = 'all' | 'unread' | 'read';
const FILTERS: [Filter, string][] = [['all', 'All'], ['unread', 'Unread'], ['read', 'Read']];

function Avatar({ glyph }: { glyph: string }) {
  return <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl`} aria-hidden>{glyph}</span>;
}

function Row({ peer, editing, onOpen }: { peer: Peer; editing: boolean; onOpen: (id: string) => void }) {
  const msgs = usePhoneStore((s) => s.threads[peer.id]);
  usePhoneStore((s) => s.readAt[peer.id]);
  const last = msgs?.at(-1); if (!last) return null;
  const unread = unreadCount(peer.id);
  const remove = () => { const r = peer.kind === 'group' ? leaveGroup(peer.id) : deleteChat(peer.id); if (r.ok) { sfx.click(); toast(peer.kind === 'group' ? 'You left the group' : 'Chat deleted from this device'); } };
  return (
    <li className="flex items-center">
      <button onClick={() => { sfx.click(); onOpen(peer.id); }} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left active:bg-slate-50" aria-label={`${peer.label}${unread ? `, ${unread} unread` : ''}`}>
        <Avatar glyph={peer.avatar} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-bold text-slate-900">{peer.label}</span><span className={`shrink-0 text-[11px] ${unread ? 'font-bold text-accent' : 'text-slate-400'}`}>{sameDay(last.at, Date.now()) ? timeFmt.format(last.at) : dayFmt.format(last.at)}</span></span>
          <span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] text-slate-500">{last.from === 'me' && !last.system ? '✓ ' : ''}{peer.kind === 'group' && last.sender ? `${last.sender}: ` : ''}{preview(last)}</span>{unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{unread}</span>}</span>
        </span>
      </button>
      {editing && <button onClick={remove} aria-label={peer.kind === 'group' ? `Leave ${peer.label}` : `Delete chat with ${peer.label}`} className="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Trash2 size={17} /></button>}
    </li>
  );
}

function RequestsList() {
  const requests = useSocialStore((s) => s.requests).filter((r) => r.status === 'pending');
  if (!requests.length) return <EmptyState glyph="📨" title="No message requests">When someone you have not added messages you, it waits here until you accept. Players you reject cannot request again.</EmptyState>;
  return (
    <div className="space-y-2 p-3">
      {requests.map((r) => { const p = getPlayer(r.playerId)!; return (
        <Card key={r.id}>
          <div className="flex items-start gap-3"><Avatar glyph={p.avatar} /><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold">@{p.username}</p><p className="text-[11px] text-slate-400">Simulated player · {p.city}</p><p className="mt-1 text-[13px] leading-snug text-slate-700">{r.text}</p></div></div>
          <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => { rejectRequest(r.id); sfx.click(); }}>Reject</Btn><Btn className="flex-1 !bg-accent" onClick={() => { acceptRequest(r.id); sfx.pop(); toast('Moved to Chats', 'good'); }}>Accept</Btn></div>
        </Card>); })}
    </div>
  );
}

function NotificationSheet({ close }: { close: () => void }) {
  const prefs = useSocialStore((s) => s.prefs);
  const set = (k: keyof typeof prefs) => useSocialStore.setState((s) => ({ prefs: { ...s.prefs, [k]: !s.prefs[k] } }));
  const T = ({ k, label, sub }: { k: keyof typeof prefs; label: string; sub: string }) => (
    <button role="switch" aria-checked={prefs[k]} onClick={() => { sfx.click(); set(k); }} className="flex w-full items-center justify-between gap-3 py-2 text-left"><span><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-slate-500">{sub}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full ${prefs[k] ? 'bg-emerald-500' : 'bg-slate-300'}`}><i className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[k] ? 'left-[22px]' : 'left-0.5'}`} /></span></button>);
  return (
    <Card className="m-3" >
      <div className="flex items-center justify-between"><p className="font-display text-base font-extrabold">Notifications</p><button onClick={close} className="text-sm font-bold text-accent">Done</button></div>
      <T k="messages" label="New messages" sub="Alert me when someone messages me" />
      <T k="requests" label="Message requests" sub="Alert me when someone new wants to chat" />
      <T k="groups" label="Group messages" sub="Alert me about activity in groups" />
    </Card>
  );
}

export function MessagesList({ section, setSection, onOpen, onNewGroup }: { section: Section; setSection: (s: Section) => void; onOpen: (id: string) => void; onNewGroup: () => void }) {
  const [filter, setFilter] = useState<Filter>('all'), [q, setQ] = useState('');
  const [editing, setEditing] = useState(false), [bell, setBell] = useState(false);
  const threads = usePhoneStore((s) => s.threads), readAt = usePhoneStore((s) => s.readAt);
  const groups = useSocialStore((s) => s.groups), requests = useSocialStore((s) => s.requests).filter((r) => r.status === 'pending').length;
  const rows = useMemo(() => {
    const ids = Object.keys(threads).filter((id) => threads[id]?.length);
    const needle = q.trim().toLowerCase();
    return ids.map((id) => resolvePeer(id)).filter((p): p is Peer => !!p && (section === 'groups' ? p.kind === 'group' : p.kind !== 'group'))
      .filter((p) => { const u = unreadCount(p.id); return filter === 'all' || (filter === 'unread' ? u > 0 : u === 0); })
      .filter((p) => !needle || `${p.label} ${p.name} ${preview(threads[p.id].at(-1)!)}`.toLowerCase().includes(needle))
      .sort((a, b) => threads[b.id].at(-1)!.at - threads[a.id].at(-1)!.at);
  }, [threads, readAt, groups, section, filter, q]);
  const anyUnread = Object.keys(threads).some((id) => unreadCount(id) > 0);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="flex-1"><SearchField label="Search conversations" value={q} onChange={setQ} placeholder="Search conversations" /></div>
        <button onClick={() => setBell(!bell)} aria-label="Notification settings" aria-expanded={bell} className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Bell size={19} />{(anyUnread || requests > 0) && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />}</button>
      </div>
      {bell && <NotificationSheet close={() => setBell(false)} />}
      <Tabs label="Message sections" tabs={[['chats', 'Chats', MessageCircle], ['groups', 'Groups', Users], ['requests', requests ? `Requests (${requests})` : 'Requests', Inbox]] as const} value={section} onChange={(s) => { setSection(s); setEditing(false); }} />
      {section !== 'requests' && (
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto" role="group" aria-label="Filter">{FILTERS.map(([id, t]) => <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{t}</Chip>)}</div>
          {section === 'groups' && <button onClick={onNewGroup} className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[13px] font-bold text-white"><Plus size={15} />New Group</button>}
        </div>
      )}
      {section !== 'requests' && rows.length > 0 && (
        <div className="flex justify-between px-4 pb-1 text-[12px] font-bold text-accent">
          <button disabled={!anyUnread} className="disabled:text-slate-300" onClick={() => { usePhoneStore.getState().markAllRead(); sfx.click(); }}>Mark all as read</button>
          <button onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
      )}
      {section === 'requests' ? <RequestsList /> : rows.length === 0
        ? <EmptyState glyph={section === 'groups' ? '👥' : '💬'} title={q || filter !== 'all' ? 'Nothing matches' : section === 'groups' ? 'No groups yet' : 'No chats yet'}>{q || filter !== 'all' ? 'Try another search or filter.' : section === 'groups' ? 'Create a group to chat with several people at once.' : 'Start a chat from Contacts.'}</EmptyState>
        : <ul className="divide-y divide-slate-200">{rows.map((p) => <Row key={p.id} peer={p} editing={editing} onOpen={onOpen} />)}</ul>}
    </div>
  );
}
