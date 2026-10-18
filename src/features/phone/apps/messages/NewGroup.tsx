import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { CONTACTS } from '@/data/contacts';
import { PLAYERS } from '@/data/players';
import { GROUP_ICONS, MAX_GROUP_MEMBERS, MAX_GROUP_NAME, createGroup, groupCandidates } from '@/game/social';
import { resolvePeer } from '@/game/peers';
import { useSocialStore } from '@/stores/socialStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, SearchField } from '../../ui';

/** Create a group: name, icon, then search by username and pick people shown as removable chips. */
export function NewGroup({ done }: { done: (groupId?: string) => void }) {
  const [name, setName] = useState(''), [icon, setIcon] = useState(GROUP_ICONS[0]), [q, setQ] = useState(''), [picked, setPicked] = useState<string[]>([]);
  const added = useSocialStore((s) => s.added);
  const results = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/^@/, '');
    const base = n ? groupCandidates() : [...CONTACTS.filter((c) => c.group !== 'business').map((c) => c.id), ...added];
    return [...new Set(base)].map((id) => resolvePeer(id)!).filter((p) => p && (!n || `${p.label} ${p.name}`.toLowerCase().includes(n))).slice(0, 12);
  }, [q, added]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_GROUP_MEMBERS ? p : [...p, id]));
  const create = () => {
    const r = createGroup({ name, icon, members: picked });
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    sfx.pop(); toast('Group created', 'good'); done(r.group!.id);
  };
  return (
    <div className="min-h-full bg-slate-100 p-3">
      <Card>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Group name
          <input value={name} maxLength={MAX_GROUP_NAME} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Crew" className="mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] normal-case tracking-normal text-slate-900 outline-none ring-2 ring-transparent focus:ring-accent" /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Icon</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Group icon">{GROUP_ICONS.map((e) => <button key={e} role="radio" aria-checked={icon === e} aria-label={`Icon ${e}`} onClick={() => setIcon(e)} className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${icon === e ? 'bg-accent/15 ring-2 ring-accent' : 'bg-slate-100'}`}>{e}</button>)}</div>
      </Card>
      <Card className="mt-3">
        <SearchField label="Search usernames" value={q} onChange={setQ} placeholder="Search by username" />
        {picked.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected people">{picked.map((id) => { const p = resolvePeer(id)!; return (
          <span key={id} className="flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-1 pr-1.5 text-[13px] font-semibold text-accent"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">{p.avatar}</span>{p.label}<button aria-label={`Remove ${p.label}`} onClick={() => toggle(id)}><X size={14} /></button></span>); })}</div>}
        <ul className="mt-2 divide-y divide-slate-200">
          {results.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No one matches. Players you find are simulated characters.</li>}
          {results.map((p) => (
            <li key={p.id}><button onClick={() => toggle(p.id)} role="checkbox" aria-checked={picked.includes(p.id)} className="flex w-full items-center gap-3 py-2 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">{p.avatar}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{p.label}</span><span className="block text-[11px] text-slate-500">{p.subtitle}</span></span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${picked.includes(p.id) ? 'border-accent bg-accent text-white' : 'border-slate-300'}`}>{picked.includes(p.id) ? '✓' : ''}</span>
            </button></li>))}
        </ul>
        <p className="mt-1 text-[11px] text-slate-400">{PLAYERS.length} simulated players can be found by username.</p>
      </Card>
      <div className="sticky bottom-0 mt-3 flex gap-2 bg-slate-100 pb-1 pt-2">
        <Btn tone="light" className="flex-1" onClick={() => done()}>Cancel</Btn>
        <Btn className="flex-1 !bg-accent" disabled={!name.trim() || picked.length < 1} onClick={create}>Create Group{picked.length ? ` (${picked.length})` : ''}</Btn>
      </div>
    </div>
  );
}
