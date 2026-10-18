import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { HUSTLE_CATEGORIES, PLAYERS, getPlayer, type PlayerDef } from '@/data/players';
import { LOCATIONS, hireDirectly, postJob, validatePost, type Result } from '@/game/hustle';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, MoneyField, Note, Row, SearchField } from '../../ui';

const field = 'mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-accent';
const say = (r: Result, ok: string) => { if (r.ok) { sfx.pop(); toast(ok, 'good'); } else { sfx.error(); toast(r.error, 'bad'); } return r.ok; };
const Label = ({ children }: { children: string }) => <span className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</span>;

export function PostJob({ done }: { done: (id?: string) => void }) {
  const [f, setF] = useState({ title: '', category: '', description: '', budget: '', location: 'Lagos', requirements: '', deadlineDays: '3' });
  const [review, setReview] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setReview(false); };
  const input = { title: f.title, category: f.category, description: f.description, budget: Number(f.budget) || 0, location: f.location, requirements: f.requirements, deadlineDays: Number(f.deadlineDays) || undefined };
  const problem = validatePost(input);
  const submit = () => { const r = postJob(input); if (say(r, 'Job posted')) done(r.ok ? r.id : undefined); };
  return (
    <div className="p-3">
      <Card>
        <label><Label>Job title</Label><input value={f.title} maxLength={60} onChange={(e) => set('title')(e.target.value)} placeholder="e.g. DJ for a naming ceremony" className={field} /></label>
        <Label>Category</Label>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Category">{HUSTLE_CATEGORIES.map((c) => <Chip key={c} active={f.category === c} onClick={() => set('category')(c)}>{c}</Chip>)}</div>
        <label><Label>Description</Label><textarea value={f.description} maxLength={400} rows={3} onChange={(e) => set('description')(e.target.value)} placeholder="What needs doing?" className={field} /></label>
        <div className="mt-3"><MoneyField label="Budget (₦)" value={f.budget} onChange={set('budget')} /></div>
        <Label>Location</Label>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Location">{LOCATIONS.map((c) => <Chip key={c} active={f.location === c} onClick={() => set('location')(c)}>{c}</Chip>)}</div>
        <label><Label>Requirements (optional)</Label><input value={f.requirements} maxLength={120} onChange={(e) => set('requirements')(e.target.value)} placeholder="e.g. Own equipment" className={field} /></label>
        <Label>Open for</Label>
        <div className="mt-1 flex gap-1.5" role="group" aria-label="Deadline">{['1', '3', '7'].map((d) => <Chip key={d} active={f.deadlineDays === d} onClick={() => set('deadlineDays')(d)}>{d} game day{d === '1' ? '' : 's'}</Chip>)}</div>
      </Card>
      {!review ? <Btn className="mt-3 w-full !bg-accent" disabled={!!problem} onClick={() => setReview(true)}>{problem ?? 'Preview'}</Btn> : (
        <Card className="mt-3 border-2 border-accent">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preview</p>
          <p className="font-display text-lg font-extrabold">{f.title}</p><p className="text-sm text-slate-600">{f.description}</p>
          <p className="mt-1 text-[13px] font-bold">{formatNaira(Number(f.budget))} · {f.category} · {f.location}</p>
          <p className="mt-1 text-xs text-slate-500">Posting is free. Money is only held in escrow when you hire someone.</p>
          <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setReview(false)}>Edit</Btn><Btn className="flex-1 !bg-accent" onClick={submit}>Post job</Btn></div>
        </Card>)}
    </div>
  );
}

function HireForm({ p, close }: { p: PlayerDef; close: () => void }) {
  const money = useEconomyStore((s) => s.money);
  const [cat, setCat] = useState(p.services[0].category), [desc, setDesc] = useState(''), [loc, setLoc] = useState<string>('Lagos');
  const svc = p.services.find((s) => s.category === cat)!;
  const [amount, setAmount] = useState(String(svc.from));
  const amt = Number(amount) || 0;
  return (
    <Card className="mt-2 border-2 border-accent">
      <p className="text-sm font-bold">Hire @{p.username}</p>
      {p.services.length > 1 && <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Service">{p.services.map((s) => <Chip key={s.category} active={cat === s.category} onClick={() => { setCat(s.category); setAmount(String(s.from)); }}>{s.category}</Chip>)}</div>}
      <label><Label>What do you need?</Label><textarea value={desc} rows={2} maxLength={400} onChange={(e) => setDesc(e.target.value)} className={field} placeholder="Describe the work" /></label>
      <div className="mt-3"><MoneyField label="Your offer (₦)" value={amount} onChange={setAmount} /></div>
      <p className="mt-1 text-xs text-slate-500">Stated price: from {formatNaira(svc.from)}. If they accept, your offer is held in escrow until the work is done.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{LOCATIONS.map((c) => <Chip key={c} active={loc === c} onClick={() => setLoc(c)}>{c}</Chip>)}</div>
      <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={close}>Cancel</Btn>
        <Btn className="flex-1 !bg-accent" disabled={amt < 1000 || amt > money || desc.trim().length < 10} onClick={() => { if (say(hireDirectly({ playerId: p.id, category: cat, description: desc, amount: amt, location: loc }), 'Request sent')) close(); }}>{amt > money ? 'Not enough money' : `Send request`}</Btn></div>
    </Card>
  );
}

export function Pros({ start }: { start?: string }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [hiring, setHiring] = useState<string | null>(start ?? null);
  const list = useMemo(() => { const n = q.trim().toLowerCase().replace(/^@/, ''); return PLAYERS.filter((p) => p.services.length && (cat === 'All' || p.services.some((s) => s.category === cat)) && (!n || `${p.username} ${p.name} ${p.services.map((s) => s.category).join(' ')}`.toLowerCase().includes(n))); }, [q, cat]);
  return (
    <div className="p-3">
      <SearchField label="Search providers" value={q} onChange={setQ} placeholder="Search by username or service" />
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Service">{['All', ...HUSTLE_CATEGORIES].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <div className="mt-2 space-y-2">
        {list.length === 0 && <Card><EmptyState glyph="🔎" title="No provider found">Try another service or username.</EmptyState></Card>}
        {list.map((p) => (
          <Card key={p.id}>
            <Row glyph={p.avatar} title={`@${p.username}`} sub={`${p.name} · ${p.city}`} right={<div className="flex gap-1.5"><Btn tone="light" onClick={() => { usePhoneStore.getState().setChatWith(p.id); usePhoneStore.getState().openApp('messages'); }}>Contact</Btn><Btn onClick={() => setHiring(hiring === p.id ? null : p.id)}>Hire</Btn></div>} />
            <p className="mt-1.5 text-xs text-slate-600">{p.bio}</p>
            <ul className="mt-1.5 space-y-0.5">{p.services.map((s) => <li key={s.category} className="flex justify-between text-[12.5px]"><span>{s.category}: <span className="text-slate-500">{s.blurb}</span></span><b className="shrink-0 tabular-nums">from {formatNaira(s.from)}</b></li>)}</ul>
            <p className="mt-1 text-[11px] text-slate-400">Simulated player · stated prices, no reviews</p>
            {hiring === p.id && <HireForm p={getPlayer(p.id)!} close={() => setHiring(null)} />}
          </Card>))}
      </div>
      <Note>Direct requests are answered after a short wait. They accept offers that are close to their stated price.</Note>
    </div>
  );
}
