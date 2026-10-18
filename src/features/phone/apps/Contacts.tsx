import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { CONTACTS, contactLabel, type ContactDef } from '@/data/contacts';
import { getPlayer, type PlayerDef } from '@/data/players';
import { addContact, removeContact, searchPlayers } from '@/game/social';
import { usePhoneStore } from '@/stores/phoneStore';
import { useSocialStore } from '@/stores/socialStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, EmptyState, Note, Row, SearchField, Title } from '../ui';

const GROUPS = [['family', 'Family'], ['friend', 'Friends'], ['business', 'Businesses'], ['npc', 'Neighbours']] as const;
const open = (id: string) => { usePhoneStore.getState().setChatWith(id); usePhoneStore.getState().openApp('messages'); };

function PlayerCard({ p }: { p: PlayerDef }) {
  const added = useSocialStore((s) => s.added.includes(p.id));
  return (
    <Card>
      <Row glyph={p.avatar} title={`@${p.username}`} sub={`${p.name} · ${p.city}`} right={<div className="flex gap-1.5"><Btn tone="light" onClick={() => open(p.id)}>Message</Btn>{added ? <Btn tone="light" aria-label={`Remove @${p.username}`} onClick={() => { removeContact(p.id); sfx.click(); }}>Remove</Btn> : <Btn onClick={() => { const r = addContact(p.id); if (r.ok) { sfx.pop(); toast(`@${p.username} added`, 'good'); } }}>Add</Btn>}</div>} />
      <p className="mt-1.5 text-xs text-slate-600">{p.bio}</p>
      <p className="mt-1 text-[11px] text-slate-400">Simulated player{p.services.length ? ` · offers ${p.services.map((s) => s.category.toLowerCase()).join(', ')}` : ''}</p>
    </Card>
  );
}

function CharacterCard({ c }: { c: ContactDef }) {
  return <Card><Row glyph={c.avatar} title={c.special === 'mom' ? 'Mom' : contactLabel(c)} sub={c.kind === 'player' ? 'Player' : `${c.role} · scripted character`} right={<Btn tone="light" onClick={() => open(c.id)}>Message</Btn>} /></Card>;
}

export function ContactsApp() {
  const [q, setQ] = useState('');
  const added = useSocialStore((s) => s.added);
  const results = searchPlayers(q);
  const mom = CONTACTS.find((c) => c.special === 'mom');
  return (
    <div className="p-3">
      {mom && <CharacterCard c={mom} />}
      <Title>Find a player</Title>
      <SearchField label="Search players by username" value={q} onChange={setQ} placeholder="Search by username, e.g. dj_kele" />
      {q.trim() && (
        <div className="mt-2 space-y-2" aria-live="polite">
          {results.length === 0 && <Card><EmptyState glyph="🔎" title="No player found">Check the username and try again.</EmptyState></Card>}
          {results.map((p) => <PlayerCard key={p.id} p={p} />)}
        </div>
      )}
      <Note>Nigeria Life has no other real players yet. Every player here is a simulated character.</Note>

      {added.length > 0 && (<><Title>My contacts</Title><div className="space-y-2">{added.map((id) => getPlayer(id)).filter((p): p is PlayerDef => !!p).map((p) => <PlayerCard key={p.id} p={p} />)}</div></>)}
      {GROUPS.map(([g, label]) => {
        const list = CONTACTS.filter((c) => c.group === g && c.special !== 'mom');
        return list.length ? (<div key={g}><Title>{label}</Title><div className="space-y-2">{list.map((c) => <CharacterCard key={c.id} c={c} />)}</div></div>) : null;
      })}
    </div>
  );
}
