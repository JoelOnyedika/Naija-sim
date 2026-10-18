import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CAREERS, SECTORS, type CareerDef } from '@/data/careers';
import { acceptOffer, applyForJob, currentJob, jobBlocked, progressOf, promotionStatus, quitJob, requestPromotion, requirementsFor, startShift, type Requirement, type Result } from '@/game/jobs';
import { useCareerStore } from '@/stores/careerStore';
import { skillName, useSkillStore } from '@/stores/skillStore';
import { useStatsStore } from '@/stores/statsStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Progress, Row, SearchField, Tabs, Title } from '../ui';

const say = (r: Result, ok: string) => { if (r.ok) { sfx.coin(); toast(ok, 'good'); } else { sfx.error(); toast(r.error, 'bad'); } };

function Checklist({ items }: { items: Requirement[] }) {
  if (!items.length) return <p className="text-xs text-slate-500">No requirements.</p>;
  return <ul className="space-y-1">{items.map((r) => (
    <li key={r.label} className="flex items-center gap-2 text-[13px]">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${r.met ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{r.met ? <Check size={13} /> : <X size={13} />}</span>
      <span className="flex-1">{r.label}</span><span className="tabular-nums text-slate-500">{r.have} / {r.need}</span>
    </li>))}</ul>;
}

function ShiftBanner() {
  const activity = useStatsStore((s) => s.activity);
  if (activity?.kind !== 'job') return null;
  return <Card className="mb-2 bg-emerald-50"><div className="text-sm font-bold">Working: {activity.label}</div><div className="mt-2"><Progress label="Shift progress" value={activity.elapsed} max={activity.seconds} /></div></Card>;
}

function MyJob({ browse }: { browse: () => void }) {
  useCareerStore((s) => s.employed); useCareerStore((s) => s.progress); useStatsStore((s) => s.stats); useStatsStore((s) => s.activity); useSkillStore((s) => s.xp);
  const job = currentJob();
  const [confirmQuit, setConfirmQuit] = useState(false);
  if (!job) return (<div className="p-3"><ShiftBanner /><Card><EmptyState glyph="💼" title="You are not employed">Pick a career to apply for, or start with open work like a POS kiosk or street vending.</EmptyState><Btn className="w-full !bg-accent" onClick={browse}>Explore careers</Btn></Card></div>);
  const { career, rank, rankIndex, progress } = job, promo = promotionStatus(career.id), why = jobBlocked(career.id), top = rankIndex >= career.ranks.length - 1;
  return (
    <div className="p-3">
      <ShiftBanner />
      <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-teal-900 p-5 text-white shadow-lg">
        <p className="text-xs text-white/70">{career.employer}</p>
        <p className="font-display text-2xl font-extrabold">{career.glyph} {rank.title}</p>
        <p className="mt-0.5 text-sm text-white/80">Rank {rankIndex + 1} of {career.ranks.length} · {career.name}</p>
        <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{formatNaira(rank.salary)}<span className="text-sm font-semibold text-white/70"> per shift</span></p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <Card className="!p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Shift</p><p className="font-bold">{rank.seconds}s · ⚡ {rank.energyCost} energy</p></Card>
        <Card className="!p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Schedule</p><p className="font-bold">Flexible</p><p className="text-[11px] text-slate-500">Work any day, any hour</p></Card>
      </div>
      <Btn tone="green" className="mt-3 w-full" disabled={!!why} onClick={() => startShift(career.id)}>{why ?? `Work a shift (${formatNaira(rank.salary)})`}</Btn>
      <Note>Shifts are simulated: the timer runs, you are paid, and the shift counts toward promotion.</Note>

      <Title>Career progression</Title>
      <Card>
        <ol className="space-y-1.5">{career.ranks.map((r, i) => (
          <li key={r.title} className={`flex items-center justify-between text-[13px] ${i === rankIndex ? 'font-bold text-accent' : i < rankIndex ? 'text-slate-400' : ''}`}>
            <span>{i < rankIndex ? '✓ ' : i === rankIndex ? '▶ ' : '○ '}{r.title}</span><span className="tabular-nums">{formatNaira(r.salary)}</span></li>))}</ol>
        {!top && promo.shifts && (<div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-2 text-[13px] font-bold">Next: {career.ranks[promo.nextRank!].title}</p>
          <Progress label="Shifts toward promotion" value={Math.min(progress.shiftsInRank, Number(promo.shifts.need))} max={Number(promo.shifts.need)} />
          <div className="mt-2"><Checklist items={[promo.shifts, ...promo.others]} /></div>
          <Btn className="mt-3 w-full !bg-accent" disabled={!promo.eligible} onClick={() => say(requestPromotion(career.id), 'Promoted!')}>{promo.eligible ? 'Accept promotion' : 'Not eligible yet'}</Btn>
        </div>)}
        {top && <p className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-500">You have reached the top of this career. {progress.totalShifts} shifts worked.</p>}
      </Card>

      <Title>Your job</Title>
      <Card>
        {!confirmQuit ? <Btn tone="light" className="w-full" onClick={() => setConfirmQuit(true)}>Quit this job</Btn> : (
          <div><p className="text-[13px]">Quit {rank.title}? Your progress in {career.name} is kept if you come back.</p>
            <div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setConfirmQuit(false)}>Keep job</Btn><Btn tone="red" className="flex-1" onClick={() => { say(quitJob(), 'You quit.'); setConfirmQuit(false); }}>Quit</Btn></div></div>)}
      </Card>
    </div>
  );
}

function CareerCard({ c }: { c: CareerDef }) {
  const [open, setOpen] = useState(false);
  const emp = useCareerStore((s) => s.employed), offer = useCareerStore((s) => s.offers[c.id]);
  useStatsStore((s) => s.stats); useSkillStore((s) => s.xp);
  const p = progressOf(c.id), reqs = requirementsFor(c, p.rank), here = emp?.careerId === c.id, why = jobBlocked(c.id);
  const first = c.ranks[p.rank];
  return (
    <Card>
      <button className="w-full text-left" onClick={() => { sfx.click(); setOpen(!open); }} aria-expanded={open}>
        <Row glyph={c.glyph} title={c.name} sub={`${c.employer} · ${c.openHire ? 'Open work' : 'Apply'}`} right={<div className="text-right"><div className="font-display text-sm font-extrabold text-emerald-700">{formatNaira(first.salary)}</div><div className="text-[10px] text-slate-400">per shift</div></div>} />
      </button>
      {here && <span className="mt-1.5 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Your job</span>}
      {open && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-[13px] text-slate-600">{c.blurb}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ranks · skill: {skillName(c.skill)}</p>
          <ol className="mt-1 space-y-0.5">{c.ranks.map((r, i) => <li key={r.title} className={`flex justify-between text-[13px] ${i === p.rank ? 'font-bold' : 'text-slate-500'}`}><span>{i + 1}. {r.title}</span><span className="tabular-nums">{formatNaira(r.salary)}</span></li>)}</ol>
          <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">To start as {first.title}</p>
          <Checklist items={reqs} />
          <div className="mt-3">
            {here ? <Btn tone="green" className="w-full" disabled={!!why} onClick={() => startShift(c.id)}>{why ?? 'Work a shift'}</Btn>
              : offer ? <Btn className="w-full !bg-accent" onClick={() => say(acceptOffer(c.id), `You are now ${first.title}`)}>Accept offer{emp ? ' (leaves your current job)' : ''}</Btn>
              : c.openHire ? <Btn tone="green" className="w-full" disabled={!!why} onClick={() => startShift(c.id)}>{why ?? 'Start a shift'}</Btn>
              : <Btn className="w-full" disabled={reqs.some((r) => !r.met)} onClick={() => say(applyForJob(c.id), 'Offer received')}>{reqs.some((r) => !r.met) ? 'Requirements not met' : 'Apply'}</Btn>}
          </div>
        </div>
      )}
    </Card>
  );
}

function Careers() {
  const [sector, setSector] = useState<string>('All'), [q, setQ] = useState('');
  const list = useMemo(() => { const n = q.trim().toLowerCase(); return CAREERS.filter((c) => (sector === 'All' || c.sector === sector) && (!n || `${c.name} ${c.employer} ${c.ranks.map((r) => r.title).join(' ')}`.toLowerCase().includes(n))); }, [sector, q]);
  return (
    <div className="p-3">
      <SearchField label="Search careers" value={q} onChange={setQ} placeholder="Search careers or job titles" />
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Sector">
        {['All', ...SECTORS].map((s) => <Chip key={s} active={sector === s} onClick={() => setSector(s)}>{s}</Chip>)}
      </div>
      <div className="mt-2 space-y-2">
        {list.length === 0 && <Card><EmptyState glyph="🔎" title="No careers match">Try another sector or search.</EmptyState></Card>}
        {list.map((c) => <CareerCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

export function JobsApp() {
  const [tab, setTab] = useState<'job' | 'careers'>('job');
  const offers = useCareerStore((s) => Object.keys(s.offers).length);
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Jobs sections" tabs={[['job', 'My Job'], ['careers', offers ? `Careers (${offers} offer${offers > 1 ? 's' : ''})` : 'Careers']] as const} value={tab} onChange={setTab} />
      {tab === 'job' ? <MyJob browse={() => setTab('careers')} /> : <Careers />}
    </div>
  );
}
