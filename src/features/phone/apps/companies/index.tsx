import { useEffect, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { CITY_CATALOG } from '@/content/cities';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan } from '@/core/gameTime';
import { COMPANY, COMPANY_CATEGORIES, LOGOS, MARKETING, getCategory, scaled } from '@/data/companies';
import { cityName } from '@/data/land';
import * as C from '@/game/companies';
import { useCompanyStore, type Company } from '@/stores/companyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Progress, Row, Stat, Tabs, Title } from '../../ui';
import { useGameMinutes } from '../bank/common';

const say = (r: C.Result, ok: string) => { if (r.ok) { sfx.coin(); toast(ok, 'good'); } else { sfx.error(); toast(r.error, 'bad'); } return r.ok; };
const field = 'mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-accent';
const signed = (n: number) => `${n < 0 ? '-' : ''}${formatNaira(Math.abs(n))}`;

function Create({ done }: { done: (id?: string) => void }) {
  const money = useEconomyStore((s) => s.money);
  const [f, setF] = useState({ name: '', logo: LOGOS[0], categoryId: 'food', description: '', hqCity: 'lagos' });
  const cat = getCategory(f.categoryId)!, problem = C.validateCreate(f);
  return (
    <div className="p-3">
      <Card>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company name<input value={f.name} maxLength={30} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Mama Ife Kitchen" className={field} /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Logo</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Logo">{LOGOS.map((l) => <button key={l} role="radio" aria-checked={f.logo === l} aria-label={`Logo ${l}`} onClick={() => setF({ ...f, logo: l })} className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${f.logo === l ? 'bg-accent/15 ring-2 ring-accent' : 'bg-slate-100'}`}>{l}</button>)}</div>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Business type</p>
        <div className="space-y-1.5">{COMPANY_CATEGORIES.map((c) => <button key={c.id} onClick={() => setF({ ...f, categoryId: c.id })} aria-pressed={f.categoryId === c.id} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${f.categoryId === c.id ? 'bg-accent/10 ring-2 ring-accent' : 'bg-slate-100'}`}><span className="text-2xl">{c.glyph}</span><span className="flex-1"><b className="block text-[13.5px]">{c.name}</b><span className="text-[11.5px] text-slate-500">{c.blurb}</span></span><b className="text-[12px] tabular-nums">{formatNaira(c.startup)}</b></button>)}</div>
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description (optional)<textarea value={f.description} maxLength={120} rows={2} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} /></label>
        <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Headquarters</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Headquarters">{CITY_CATALOG.map((c) => <Chip key={c.id} active={f.hqCity === c.id} onClick={() => setF({ ...f, hqCity: c.id })}>{c.name}</Chip>)}</div>
      </Card>
      <Card className="mt-3"><p className="text-[13px] leading-snug">Startup cost <b>{formatNaira(cat.startup)}</b>, paid from your wallet. A new company has <b>no funds</b> and earns nothing until you <b>hire a manager</b>.</p></Card>
      <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => done()}>Cancel</Btn><Btn className="flex-1 !bg-accent" disabled={!!problem || cat.startup > money} onClick={() => { const r = C.createCompany(f); if (say(r, 'Company founded')) done(r.ok ? r.id : undefined); }}>{problem ?? (cat.startup > money ? 'Not enough money' : `Create for ${formatNaira(cat.startup)}`)}</Btn></div>
    </div>
  );
}

function Overview({ c }: { c: Company }) {
  const now = useGameMinutes(), d = C.dailyFigures(c, now), op = C.isOperating(c), wait = C.nextPayoutInMinutes(c, now), cat = getCategory(c.categoryId)!;
  const last = c.lastDayResult;
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">{c.logo}</span><div><p className="font-display text-xl font-extrabold leading-tight">{c.name}</p><p className="text-xs text-white/75">{cat.name} · Level {c.level} · HQ {cityName(c.hqCity)}</p></div></div>
        <div className="mt-3 flex justify-between text-sm"><span>{c.branches.length} branch{c.branches.length === 1 ? '' : 'es'}</span><span>{c.employees.length}/{C.capacityOf(c)} staff</span><span>{c.manager ? 'Manager ✓' : 'No manager'}</span></div>
      </div>
      {!op && <Card className="mt-3 bg-amber-50"><p className="text-sm font-bold text-amber-900">Not operating yet</p><p className="mt-1 text-[13px] leading-snug text-amber-800">A company only earns once it has a manager. Hiring costs {formatNaira(C.costs.manager(c))} now, then {formatNaira(scaled(COMPANY.base.managerWage, c.categoryId))} a game day from company funds.</p><Btn className="mt-2 w-full !bg-accent" onClick={() => say(C.hireManager(c.id), 'Manager hired. The company is operating.')}>Hire manager ({formatNaira(C.costs.manager(c))})</Btn></Card>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Company funds" value={formatNaira(c.funds)} sub="Not yours until paid out" />
        <Stat label="Net per day" value={signed(d.net)} tone={d.net > 0 ? 'good' : 'plain'} sub={op ? 'At today\'s staffing' : 'Starts with a manager'} />
        <Stat label="Revenue per day" value={formatNaira(d.revenue)} /><Stat label="Payroll per day" value={formatNaira(d.payroll)} />
        <Stat label="Branch costs per day" value={formatNaira(d.opex)} /><Stat label="Marketing (lifetime)" value={formatNaira(c.lifetime.marketing)} />
      </div>
      <Title>Payout</Title>
      <Card>
        <div className="space-y-1 text-[13px]"><div className="flex justify-between"><span className="text-slate-500">Revenue earned (lifetime)</span><b>{formatNaira(c.lifetime.revenue)}</b></div><div className="flex justify-between"><span className="text-slate-500">Kept as company funds</span><b>{formatNaira(c.funds)}</b></div><div className="flex justify-between"><span className="text-slate-500">Paid to you so far</span><b>{formatNaira(c.lifetime.payouts)}</b></div>{last && <div className="flex justify-between"><span className="text-slate-500">Last day closed</span><b>{signed(last.revenue - last.payroll - last.opex)}</b></div>}</div>
        <Btn tone="green" className="mt-3 w-full" disabled={c.funds <= 0 || wait > 0} onClick={() => say(C.cashOut(c.id), 'Payout received')}>{c.funds <= 0 ? 'No funds to pay out' : wait > 0 ? `Next payout in ${fmtGameSpan(wait)}` : `Take payout (${formatNaira(c.funds)})`}</Btn>
        <p className="mt-2 text-[11.5px] leading-snug text-slate-500">Revenue goes to company funds when a game day closes. Only a payout moves money to your wallet (one per day), and payouts count as taxable business income.</p>
      </Card>
    </div>
  );
}

function Team({ c }: { c: Company }) {
  const cat = getCategory(c.categoryId)!, cap = C.capacityOf(c);
  const [role, setRole] = useState(cat.roles[0]), [branch, setBranch] = useState('hq');
  useEffect(() => { setRole(cat.roles[0]); setBranch('hq'); }, [c.id, cat]);
  return (
    <div className="p-3">
      <Card><div className="flex justify-between text-[13px]"><b>Staff</b><span>{c.employees.length} / {cap}</span></div><div className="mt-2"><Progress label="Staff capacity" value={c.employees.length} max={cap} /></div>
        <p className="mt-2 text-xs text-slate-500">Each employee costs {formatNaira(scaled(COMPANY.base.staffWage, c.categoryId))} a game day and adds {formatNaira(scaled(COMPANY.base.perStaff, c.categoryId))} of revenue. Capacity: {COMPANY.capacity.join(' / ')} at levels 1, 2, 3.</p></Card>
      <Title>Hire</Title>
      <Card>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Role">{cat.roles.map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>)}</div>
        {c.branches.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Location"><Chip active={branch === 'hq'} onClick={() => setBranch('hq')}>HQ</Chip>{c.branches.map((b) => <Chip key={b.id} active={branch === b.id} onClick={() => setBranch(b.id)}>{b.label}</Chip>)}</div>}
        <Btn className="mt-3 w-full !bg-accent" disabled={c.employees.length >= cap} onClick={() => say(C.hireEmployee(c.id, role, branch), `${role} hired`)}>{c.employees.length >= cap ? 'Company is full. Upgrade to hire more' : `Hire ${role.toLowerCase()} (${formatNaira(C.costs.staff(c))})`}</Btn>
      </Card>
      <Title>Your team</Title>
      <div className="space-y-2">
        {c.employees.length === 0 && <Card><EmptyState glyph="🧑🏾‍🍳" title="No staff yet">Staff raise revenue once the company has a manager.</EmptyState></Card>}
        {c.employees.map((e) => <Card key={e.id} className="!p-3"><Row glyph="🧑🏾" title={e.role} sub={`${e.branchId === 'hq' ? 'HQ' : c.branches.find((b) => b.id === e.branchId)?.label ?? 'Branch'} · ${formatNaira(scaled(COMPANY.base.staffWage, c.categoryId))}/day`} right={<Btn tone="light" onClick={() => say(C.fireEmployee(c.id, e.id), 'Let go')}>Let go</Btn>} /></Card>)}
      </div>
    </div>
  );
}

function Branches({ c }: { c: Company }) {
  const cap = C.branchCapOf(c);
  return (
    <div className="p-3">
      <Card><Row glyph="🏢" title={`Headquarters: ${cityName(c.hqCity)}`} sub="Where the company is based" /></Card>
      <Title>Branches ({c.branches.length} / {cap})</Title>
      <div className="space-y-2">
        {c.branches.length === 0 && <Card><EmptyState glyph="🏬" title="No branches">{cap === 0 ? 'Upgrade to level 2 to open your first branch.' : 'Open a branch in another city for extra revenue.'}</EmptyState></Card>}
        {c.branches.map((b) => <Card key={b.id} className="!p-3"><Row glyph="🏬" title={b.label} sub={`${cityName(b.cityId)} · opened ${fmtGame(b.openedAt)} · ${c.employees.filter((e) => e.branchId === b.id).length} staff`} right={<span className="text-[11.5px] text-slate-500">{formatNaira(scaled(COMPANY.base.branchOpex, c.categoryId))}/day</span>} /></Card>)}
      </div>
      {cap > c.branches.length && (<><Title>Open a branch ({formatNaira(C.costs.branch(c))})</Title><Card>
        <div className="flex flex-wrap gap-1.5">{CITY_CATALOG.map((x) => <Chip key={x.id} onClick={() => say(C.openBranch(c.id, x.id), `Branch opened in ${x.name}`)}>{x.name}</Chip>)}</div>
        <p className="mt-2 text-xs text-slate-500">A branch adds {formatNaira(scaled(COMPANY.base.branchRevenue, c.categoryId))} revenue and costs {formatNaira(scaled(COMPANY.base.branchOpex, c.categoryId))} a game day. It stays yours when you change city.</p></Card></>)}
    </div>
  );
}

function Marketing({ c }: { c: Company }) {
  const now = useGameMinutes(), active = C.activeCampaigns(c, now);
  return (
    <div className="p-3">
      <div className="space-y-2">{MARKETING.map((m) => { const run = active.find((k) => k.channelId === m.id); return (
        <Card key={m.id}><Row glyph={m.glyph} title={m.name} sub={`${m.days} game day${m.days > 1 ? 's' : ''} · +${m.bonusBps / 100}% revenue`} right={<b className="text-sm tabular-nums">{formatNaira(C.costs.marketing(c, m.id))}</b>} />
          <p className="mt-1 text-xs text-slate-500">{m.blurb}</p>
          {run ? <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[12.5px] font-semibold text-emerald-700">Running, ends in {fmtGameSpan(run.endsAt - now)}</p> : <Btn className="mt-2 w-full !bg-accent" onClick={() => say(C.runCampaign(c.id, m.id), `${m.name} started`)}>Start campaign</Btn>}</Card>); })}</div>
      <Note>The bonus is a game rule, not a guarantee: it only raises revenue while the campaign runs and the company is operating. Bonuses from several campaigns add up to at most +35%.</Note>
    </div>
  );
}

function Upgrades({ c }: { c: Company }) {
  const block = C.levelUpBlocker(c), eff = COMPANY.efficiency;
  return (
    <div className="p-3 space-y-2">
      <Card><Row glyph="⬆️" title={`Level ${c.level} of 3`} sub={c.level >= 3 ? 'Top level' : `To level ${c.level + 1}: ${formatNaira(C.costs.level(c))}`} />
        <p className="mt-1.5 text-xs text-slate-500">Level {Math.min(3, c.level + 1)}: {COMPANY.capacity[Math.min(2, c.level)]} staff, {COMPANY.branchCap[Math.min(2, c.level)]} branch{COMPANY.branchCap[Math.min(2, c.level)] === 1 ? '' : 'es'}, revenue ×{COMPANY.levelRevenueBps[Math.min(2, c.level)] / 10_000}.</p>
        {c.level < 3 && <p className="mt-1 text-xs text-slate-500">Needs: {COMPANY.prereq[c.level].staff ? `${COMPANY.prereq[c.level].staff} staff, ` : ''}{COMPANY.prereq[c.level].branches ? `${COMPANY.prereq[c.level].branches} branch, ` : ''}a manager.</p>}
        <Btn className="mt-2 w-full !bg-accent" disabled={!!block} onClick={() => say(C.upgradeLevel(c.id), `Now level ${c.level + 1}`)}>{block ?? `Upgrade for ${formatNaira(C.costs.level(c))}`}</Btn></Card>
      <Card><Row glyph="⚙️" title={`Efficiency ${c.efficiency} of ${eff.max}`} sub={c.efficiency >= eff.max ? 'Maxed' : `Next: ${formatNaira(C.costs.efficiency(c))}`} />
        <p className="mt-1.5 text-xs text-slate-500">Each level adds +{eff.bonusBps / 100}% revenue.</p>
        <Btn className="mt-2 w-full !bg-accent" disabled={c.efficiency >= eff.max} onClick={() => say(C.upgradeEfficiency(c.id), 'Efficiency improved')}>{c.efficiency >= eff.max ? 'Maxed' : `Upgrade for ${formatNaira(C.costs.efficiency(c))}`}</Btn></Card>
    </div>
  );
}

function Activity({ c }: { c: Company }) {
  return (
    <div className="p-3"><div className="space-y-2">
      {c.activity.length === 0 && <Card><EmptyState glyph="📒" title="No activity yet">Hiring, upgrades, revenue and payouts are listed here.</EmptyState></Card>}
      {c.activity.map((a) => <Card key={a.id} className="!p-3"><div className="flex justify-between gap-3"><div><p className="text-[13.5px] font-semibold">{a.text}</p><p className="text-xs text-slate-500">{fmtGame(a.at)}</p></div>{a.amount !== undefined && <b className={`shrink-0 font-display text-sm tabular-nums ${a.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{signed(a.amount)}</b>}</div></Card>)}
    </div><Note>Owner payments (setup, hiring, upgrades, marketing) come from your wallet and also appear in Bank. Revenue, wages and branch costs stay inside company funds.</Note></div>
  );
}

const TABS = [['overview', 'Overview'], ['team', 'Team'], ['branches', 'Branches'], ['marketing', 'Marketing'], ['upgrades', 'Upgrades'], ['activity', 'Activity']] as const;

/** Companies: slots, creation and a dashboard per company. Rules in game/companies.ts, numbers in data/companies.ts. */
export function CompaniesApp() {
  const companies = useCompanyStore((s) => s.companies);
  const [sel, setSel] = useState<string | null>(null), [creating, setCreating] = useState(false), [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  const c = companies.find((x) => x.id === sel) ?? null;
  if (creating) return <Create done={(id) => { setCreating(false); if (id) { setSel(id); setTab('overview'); } }} />;
  const slots = Array.from({ length: COMPANY.slots }, (_, i) => companies[i] ?? null);
  return (
    <div className="flex min-h-full flex-col">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3" role="group" aria-label="Companies">
        <Chip active={!c} onClick={() => setSel(null)}>All</Chip>
        {companies.map((x) => <Chip key={x.id} active={sel === x.id} onClick={() => { setSel(x.id); setTab('overview'); }}>{x.logo} {x.name}</Chip>)}
      </div>
      {!c ? (
        <div className="p-3">
          <Title>Your companies ({companies.length} / {COMPANY.slots})</Title>
          <div className="space-y-2">
            {slots.map((s, i) => s ? (
              <Card key={s.id}><button className="w-full text-left" onClick={() => { setSel(s.id); setTab('overview'); }} aria-label={`Open ${s.name}`}>
                <Row glyph={s.logo} title={s.name} sub={`${getCategory(s.categoryId)?.name} · Level ${s.level} · ${cityName(s.hqCity)}`} right={<span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${C.isOperating(s) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{C.isOperating(s) ? 'Operating' : 'Needs manager'}</span>} />
                <p className="mt-1.5 text-xs text-slate-500">Funds {formatNaira(s.funds)} · {s.employees.length} staff · {s.branches.length} branch{s.branches.length === 1 ? '' : 'es'}</p></button></Card>
            ) : (
              <button key={`e${i}`} onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-5 text-sm font-bold text-slate-500 active:bg-white">＋ Create company</button>
            ))}
            {Array.from({ length: COMPANY.futureSlots }, (_, i) => <div key={`f${i}`} className="flex items-center justify-between rounded-2xl bg-slate-200/60 px-4 py-3 text-sm text-slate-500" aria-disabled="true"><span>🔒 Extra slot</span><span className="rounded-md bg-slate-300 px-2 py-0.5 text-[11px] font-bold">Coming later</span></div>)}
          </div>
          <Note>Everyone gets {COMPANY.slots} company slots. Extra slots are a planned feature and cannot be bought: no payments exist in this game.</Note>
        </div>
      ) : (<>
        <Tabs label="Company sections" tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'overview' && <Overview c={c} />}{tab === 'team' && <Team c={c} />}{tab === 'branches' && <Branches c={c} />}{tab === 'marketing' && <Marketing c={c} />}{tab === 'upgrades' && <Upgrades c={c} />}{tab === 'activity' && <Activity c={c} />}
      </>)}
    </div>
  );
}
