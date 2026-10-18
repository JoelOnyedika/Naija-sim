import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan } from '@/core/gameTime';
import { CASE_CATEGORIES, COURT, LAWYERS, getLawyer } from '@/data/legal';
import { getPlayer } from '@/data/players';
import { fileCase, filingCost, stageOf, validateFiling, visibleEvents, type FileInput } from '@/game/legal';
import { useCourtNav } from '@/stores/courtNavStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLegalStore, type CourtCase } from '@/stores/legalStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Progress, Row, Tabs, Title } from '../../ui';
import { useGameMinutes } from '../bank/common';

const who = (id: string) => (id === 'me' ? 'You' : id === 'state' ? 'The State' : `@${getPlayer(id)?.username ?? id}`);
const field = 'mt-1 w-full rounded-xl bg-stone-100 px-3 py-2.5 text-[16px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-stone-500';

/** Court: formal, stone-and-brass look. All proceedings are simulated; see data/legal.ts and game/legal.ts. */
function CaseCard({ c, onWatch, now }: { c: CourtCase; onWatch: (id: string) => void; now: number }) {
  const lawyer = c.lawyerId ? getLawyer(c.lawyerId) : undefined;
  return (
    <Card className="border-l-4 border-stone-500">
      <Row glyph="⚖️" title={c.title} sub={`${c.id} · ${c.category}`} right={<span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${c.status === 'live' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'}`}>{c.status === 'live' ? stageOf(c, now) : `Closed`}</span>} />
      <p className="mt-1.5 text-xs text-slate-500">{who(c.plaintiff)} v {who(c.defendant)}{lawyer ? ` · counsel ${lawyer.name}` : ''}{c.sample ? ' · sample case' : ''}</p>
      {c.status === 'closed' && c.verdict && <p className="mt-1 text-xs font-bold text-stone-700">Judgment for the {c.verdict}</p>}
      <Btn tone="light" className="mt-2 w-full" onClick={() => onWatch(c.id)}>{c.status === 'live' ? 'Watch case' : 'View record'}</Btn>
    </Card>
  );
}

function Viewer({ id, back }: { id: string; back: () => void }) {
  const c = useLegalStore((s) => s.cases.find((x) => x.id === id)), now = useGameMinutes();
  if (!c) return <Card className="m-3"><EmptyState glyph="🤷🏾" title="Case not found" /></Card>;
  const seen = visibleEvents(c, now), last = c.events[c.events.length - 1], next = c.events.find((e) => e.at > now);
  return (
    <div className="p-3">
      <button onClick={back} className="mb-2 flex items-center gap-1 text-sm font-bold text-stone-600"><ChevronLeft size={18} />Back</button>
      <div className="rounded-3xl bg-gradient-to-br from-stone-700 to-stone-950 p-5 text-white shadow-lg">
        <p className="text-xs tracking-widest text-amber-300">{c.id} · {c.category.toUpperCase()}</p>
        <p className="mt-1 font-display text-xl font-extrabold leading-tight">{c.title}</p>
        <p className="mt-1 text-xs text-white/70">Plaintiff {who(c.plaintiff)} · Defendant {who(c.defendant)}{c.lawyerId ? ` · Counsel ${getLawyer(c.lawyerId)?.name}` : ''}</p>
        <div className="mt-3"><Progress label="Case progress" value={seen.length} max={c.events.length} /></div>
        <p className="mt-1 text-[11px] text-white/70">{c.status === 'closed' ? 'Closed' : `Stage: ${stageOf(c, now)}${next ? ` · next in ${fmtGameSpan(next.at - now)}` : ''}`}</p>
      </div>
      <Title>Proceedings</Title>
      <ol className="space-y-2" aria-label="Case timeline">
        {seen.map((e) => <li key={e.stage}><Card className="!p-3"><div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-stone-500"><span>{e.stage}</span><span>{fmtGame(e.at)}</span></div><p className="mt-1 text-[13.5px] leading-snug">{e.text}</p></Card></li>)}
      </ol>
      {c.status === 'closed' && c.verdict && <Card className="mt-3 border-2 border-amber-400 bg-amber-50"><p className="text-sm font-bold text-amber-900">Verdict</p><p className="text-[13px] text-amber-900">Judgment for the {c.verdict}. {last.text}</p></Card>}
      {c.status === 'live' && <Note>This is a scripted simulation. The same events happen at the same times whenever you watch.</Note>}
    </div>
  );
}

function FileForm({ lawyer, setLawyer, done }: { lawyer: string | null; setLawyer: (id: string | null) => void; done: (id: string) => void }) {
  const money = useEconomyStore((s) => s.money);
  const [f, setF] = useState({ defendant: '', category: '', description: '', evidence: '' }), [review, setReview] = useState(false);
  const input: FileInput = { ...f, lawyerId: lawyer ?? undefined };
  const problem = validateFiling(input), cost = filingCost(lawyer ?? undefined);
  const set = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setReview(false); };
  const submit = () => { const r = fileCase(input); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; } sfx.coin(); toast(`Case ${r.id} filed`, 'good'); done(r.id!); };
  return (
    <div className="p-3">
      <Card>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Defendant username<input value={f.defendant} onChange={(e) => set('defendant')(e.target.value)} placeholder="e.g. lekki_larry" className={field} autoCapitalize="none" /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Category</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">{CASE_CATEGORIES.map((c) => <Chip key={c} active={f.category === c} onClick={() => { set('category')(c); if (lawyer && !getLawyer(lawyer)?.specialty.includes(c)) setLawyer(null); }}>{c}</Chip>)}</div>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Complaint<textarea value={f.description} rows={3} maxLength={500} onChange={(e) => set('description')(e.target.value)} placeholder="What happened? (20 to 500 characters)" className={field} /></label>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">Evidence notes (optional)<input value={f.evidence} maxLength={300} onChange={(e) => set('evidence')(e.target.value)} placeholder="e.g. chat screenshots, receipts" className={field} /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Lawyer (optional)</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lawyer"><Chip active={!lawyer} onClick={() => { setLawyer(null); setReview(false); }}>None</Chip>{LAWYERS.filter((l) => l.available && (!f.category || l.specialty.includes(f.category))).map((l) => <Chip key={l.id} active={lawyer === l.id} onClick={() => { setLawyer(l.id); setReview(false); }}>{l.name.replace('Barr. ', '')} · {formatNaira(l.fee)}</Chip>)}</div>
      </Card>
      {!review ? <Btn className="mt-3 w-full !bg-stone-800" disabled={!!problem} onClick={() => setReview(true)}>{problem ?? 'Review filing'}</Btn> : (
        <Card className="mt-3 border-2 border-stone-600">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Review</p>
          <p className="font-display text-lg font-extrabold">You v @{f.defendant.replace(/^@/, '')}</p><p className="text-sm text-slate-600">{f.category}: {f.description}</p>
          <div className="mt-2 space-y-0.5 text-[13px]"><div className="flex justify-between"><span>Filing fee</span><b>{formatNaira(COURT.filingFee)}</b></div>{lawyer && <div className="flex justify-between"><span>{getLawyer(lawyer)!.name}</span><b>{formatNaira(getLawyer(lawyer)!.fee)}</b></div>}<div className="flex justify-between border-t border-stone-200 pt-1"><span>Total</span><b>{formatNaira(cost)}</b></div></div>
          {cost > money && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">You do not have enough money.</p>}
          <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setReview(false)}>Edit</Btn><Btn className="flex-1 !bg-stone-800" disabled={cost > money} onClick={submit}>File case</Btn></div>
        </Card>)}
      <Note>A simulated legal process. Verdicts are records only: no money is awarded or taken apart from your fees.</Note>
    </div>
  );
}

const TABS = [['file', 'File a Case'], ['live', 'Live Cases'], ['mine', 'My Cases'], ['lawyers', 'Lawyers'], ['history', 'History']] as const;
export function CourtApp() {
  const cases = useLegalStore((s) => s.cases), now = useGameMinutes();
  const nav = useCourtNav();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('live'), [watch, setWatch] = useState<string | null>(null), [lawyer, setLawyer] = useState<string | null>(null);
  useEffect(() => { if (nav.caseId) { setWatch(nav.caseId); nav.go(null); } }, [nav]);
  if (watch) return <Viewer id={watch} back={() => setWatch(null)} />;
  const involved = (c: CourtCase) => c.plaintiff === 'me' || c.defendant === 'me' || (c.plaintiff === 'state' && !!c.reportId);
  const list = (items: CourtCase[], empty: string, glyph: string) => <div className="space-y-2 p-3">{items.length === 0 ? <Card><EmptyState glyph={glyph} title={empty} /></Card> : items.map((c) => <CaseCard key={c.id} c={c} onWatch={setWatch} now={now} />)}</div>;
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Court sections" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'file' && <FileForm lawyer={lawyer} setLawyer={setLawyer} done={(id) => { setTab('mine'); void id; }} />}
      {tab === 'live' && list(cases.filter((c) => c.status === 'live'), 'No live cases right now', '🏛️')}
      {tab === 'mine' && list(cases.filter((c) => involved(c) && c.status === 'live'), 'You have no open cases', '📁')}
      {tab === 'lawyers' && (
        <div className="space-y-2 p-3">
          {LAWYERS.map((l) => <Card key={l.id}><Row glyph={l.icon} title={l.name} sub={`${l.specialty.join(', ')} · ${l.experience}`} right={l.available ? <Btn tone="light" onClick={() => { setLawyer(l.id); setTab('file'); }}>Select</Btn> : <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-600">Unavailable</span>} /><p className="mt-1 text-xs text-slate-500">Fee {formatNaira(l.fee)} · adds {l.strength} to your chance of winning (out of 100)</p></Card>)}
          <Note>Lawyers are fictional characters, not real legal professionals.</Note>
        </div>)}
      {tab === 'history' && list(cases.filter((c) => involved(c) && c.status === 'closed'), 'No closed cases yet', '🗂️')}
    </div>
  );
}
