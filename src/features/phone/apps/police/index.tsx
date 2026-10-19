import { BadgeCheck, ClipboardList, FileWarning, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { fmtGame } from '@/core/gameTime';
import { REPORT_CATEGORIES, POLICE, stationFor } from '@/data/legal';
import { getPlayer } from '@/data/players';
import { cityName } from '@/data/land';
import { submitReport, validateReport } from '@/game/legal';
import { useCourtNav } from '@/stores/courtNavStore';
import { useLegalStore, type ReportStatus } from '@/stores/legalStore';
import { currentStateId } from '@/stores/mapStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Row, Stat, Tabs, Title } from '../../ui';

const STATUS: Record<ReportStatus, [string, string]> = { submitted: ['Submitted', 'bg-sky-100 text-sky-800'], review: ['Under review', 'bg-amber-100 text-amber-800'], referred: ['Referred to court', 'bg-violet-100 text-violet-800'], dismissed: ['Dismissed', 'bg-slate-200 text-slate-700'], resolved: ['Resolved', 'bg-emerald-100 text-emerald-800'] };
const field = 'mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-sky-600';
const openCourt = (caseId?: string) => { if (caseId) useCourtNav.getState().go(caseId); usePhoneStore.getState().openApp('court'); };

function Dashboard({ go }: { go: (t: 'report' | 'record') => void }) {
  const reports = useLegalStore((s) => s.reports), cases = useLegalStore((s) => s.cases);
  const city = currentStateId(), st = stationFor(city);
  const active = cases.filter((c) => c.status === 'live' && (c.plaintiff === 'me' || c.defendant === 'me' || c.reportId)).length;
  const reviewing = reports.filter((r) => r.status === 'submitted' || r.status === 'review').length;
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-sky-700 to-sky-950 p-5 text-white shadow-lg"><p className="text-xs tracking-widest text-sky-200">NIGERIA POLICE (IN-GAME)</p><p className="mt-1 font-display text-2xl font-extrabold">{st.name}</p><p className="text-sm text-white/75">{st.area} · {cityName(city)}</p></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><Stat label="Active cases" value={active} /><Stat label="Recorded incidents" value={0} sub="Against you" /><Stat label="Open investigations" value={reviewing} sub="Reports under review" /><Stat label="Arrests" value={0} sub="From your record" /></div>
      <div className="mt-3 grid gap-2"><Btn className="!bg-sky-800" onClick={() => go('report')}>Report a player</Btn><Btn tone="light" onClick={() => go('record')}>View my record</Btn><Btn tone="light" onClick={() => openCourt()}>Open Court</Btn></div>
      <Note>An in-game record only. These numbers come from events that really happened in your game, not from any real police database.</Note>
    </div>
  );
}

function Report({ done }: { done: () => void }) {
  const [f, setF] = useState({ reported: '', category: '', description: '', evidence: '' });
  const problem = validateReport(f);
  return (
    <div className="p-3">
      <Card>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reported username<input value={f.reported} onChange={(e) => setF({ ...f, reported: e.target.value })} placeholder="e.g. dj_kele" className={field} autoCapitalize="none" /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">{REPORT_CATEGORIES.map((c) => <Chip key={c} active={f.category === c} onClick={() => setF({ ...f, category: c })}>{c}</Chip>)}</div>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">What happened?<textarea value={f.description} rows={3} maxLength={400} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} placeholder="20 to 400 characters" /></label>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Evidence notes (optional)<input value={f.evidence} maxLength={300} onChange={(e) => setF({ ...f, evidence: e.target.value })} className={field} /></label>
      </Card>
      <Btn className="mt-3 w-full !bg-sky-800" disabled={!!problem} onClick={() => { const r = submitReport(f); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; } sfx.pop(); toast(`Report ${r.id} submitted`, 'good'); done(); }}>{problem ?? 'Submit report'}</Btn>
      <Note>A report is a claim, not a finding. It is reviewed in about {POLICE.reviewAfter} game minutes, then dismissed or, for theft, fraud and harassment, possibly referred to court. Reports are free; false or repeated reports are limited to {POLICE.maxOpenReports} at a time.</Note>
    </div>
  );
}

function Reports() {
  const reports = useLegalStore((s) => s.reports);
  return (
    <div className="space-y-2 p-3">
      {reports.length === 0 && <Card><EmptyState glyph="📝" title="You have not filed a report">Reports you file appear here with their status.</EmptyState></Card>}
      {reports.map((r) => <Card key={r.id}><Row glyph="📄" title={`${r.id} · ${r.category}`} sub={`Against @${getPlayer(r.reportedId)?.username} · ${fmtGame(r.filedAt)}`} right={<span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>} />
        <p className="mt-1.5 text-xs text-slate-600">{r.description}</p>{r.caseId && <Btn tone="light" className="mt-2 w-full" onClick={() => openCourt(r.caseId)}>View case {r.caseId} in Court</Btn>}</Card>)}
    </div>
  );
}

function Record() {
  const cases = useLegalStore((s) => s.cases).filter((c) => c.defendant === 'me');
  return (
    <div className="p-3">
      <Title>Incidents on your record</Title>
      {cases.length === 0 ? <Card><EmptyState glyph="✅" title="Clean record">Nothing is recorded against you. Entries only appear from real events in your game.</EmptyState></Card> : <div className="space-y-2">{cases.map((c) => <Card key={c.id}><Row glyph="⚖️" title={c.title} sub={`${c.id} · ${c.category}`} /></Card>)}</div>}
      <Title>Financial crimes (EFCC / ICPC style)</Title>
      <Card><EmptyState glyph="🏦" title="No records">In-game financial investigations are not part of the game yet, so none exist. This is not connected to any real agency or database.</EmptyState></Card>
    </div>
  );
}

const TABS = [['home', 'Station', ShieldCheck], ['report', 'Report', FileWarning], ['mine', 'My reports', ClipboardList], ['record', 'My record', BadgeCheck]] as const;
export function PoliceApp() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('home');
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Police sections" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'home' && <Dashboard go={setTab} />}{tab === 'report' && <Report done={() => setTab('mine')} />}{tab === 'mine' && <Reports />}{tab === 'record' && <Record />}
    </div>
  );
}
