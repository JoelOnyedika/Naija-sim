import { Briefcase, LayoutDashboard, LineChart, Map } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { CITY_CATALOG } from '@/content/cities';
import { formatNaira } from '@/core/format';
import { fmtGame } from '@/core/gameTime';
import { DAY_MINUTES, LAND, WEEK_MINUTES } from '@/data/economy';
import { PLOTS, cityName, getPlot, plotsIn, type PlotDef } from '@/data/land';
import { buyPlot, saleProceeds, sellPlot, type Result } from '@/game/land';
import { computeNetWorth } from '@/game/wealth';
import { ASSETS, useAppsStore } from '@/stores/appsStore';
import { useBankStore } from '@/stores/bankStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLandStore } from '@/stores/landStore';
import { currentStateId } from '@/stores/mapStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, Note, Row, Segmented, Stat, Tabs, Title } from '../../ui';
import { useGameMinutes } from '../bank/common';

const say = (r: Result, ok: string) => { if (r.ok) { sfx.coin(); toast(ok, 'good'); } else { sfx.error(); toast(r.error, 'bad'); } };
const gainTone = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : 'plain') as 'good' | 'bad' | 'plain';
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatNaira(Math.abs(n))}`;

function Overview({ go }: { go: (t: 'land' | 'markets') => void }) {
  const owned = useLandStore((s) => s.owned), realized = useLandStore((s) => s.realized), bonds = useBankStore((s) => s.bonds), companies = useCompanyStore((s) => s.companies);
  const holdings = useAppsStore((s) => s.holdings), prices = useAppsStore((s) => s.prices), txs = useEconomyStore((s) => s.transactions), money = useEconomyStore((s) => s.money);
  const minutes = useGameMinutes();
  const nw = useMemo(computeNetWorth, [owned, bonds, companies, holdings, prices, money]);
  const total = nw.land + nw.markets + nw.bonds + nw.companies;
  const cost = Object.values(owned).reduce((s, o) => s + o.cost, 0), landGain = nw.land - cost;
  const compInvested = companies.reduce((s, c) => s + c.lifetime.investment + c.lifetime.marketing, 0), compPayouts = companies.reduce((s, c) => s + c.lifetime.payouts, 0);
  const compResult = compPayouts + nw.companies - compInvested;
  // Investment income = interest, bond returns and company payouts, read from the ledger (latest 1,000 entries are kept)
  const inc = txs.filter((t) => t.direction !== 'expense' && !t.internal && (t.kind === 'interest' || t.kind === 'bond' || (t.kind === 'business' && t.ref?.type === 'company')));
  const sum = (from: number) => inc.filter((t) => (t.gameMinutes ?? 0) >= from).reduce((s, t) => s + t.amount, 0);
  const today = sum(Math.floor(minutes / DAY_MINUTES) * DAY_MINUTES), week = sum(Math.floor(minutes / WEEK_MINUTES) * WEEK_MINUTES), life = sum(0);
  const parts: [string, number, string][] = [['Land', nw.land, 'bg-amber-500'], ['Markets', nw.markets, 'bg-emerald-500'], ['Bonds', nw.bonds, 'bg-sky-500'], ['Companies', nw.companies, 'bg-violet-500']];
  const byCity = CITY_CATALOG.map((c) => ({ c, plots: Object.keys(owned).filter((id) => getPlot(id)?.cityId === c.id), cos: companies.filter((x) => x.hqCity === c.id || x.branches.some((b) => b.cityId === c.id)).length })).filter((x) => x.plots.length || x.cos);
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-900 p-5 text-white shadow-lg">
        <p className="text-xs text-white/75">Total investment value</p>
        <p className="font-display text-3xl font-extrabold tabular-nums">{formatNaira(total)}</p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/20" role="img" aria-label="Assets by category">{total > 0 && parts.map(([k, v, c]) => <span key={k} className={c} style={{ width: `${(v / total) * 100}%` }} />)}</div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/85">{parts.map(([k, v, c]) => <span key={k} className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${c}`} />{k} {formatNaira(v)}</span>)}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Today" value={formatNaira(today)} tone="good" /><Stat label="This week" value={formatNaira(week)} tone="good" /><Stat label="Lifetime" value={formatNaira(life)} tone="good" />
      </div>
      <Note>Income = savings interest, bond returns and company payouts. Land growth is shown as gain below until you sell.</Note>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Land gain or loss" value={signed(landGain + realized)} tone={gainTone(landGain + realized)} sub={`Unrealised ${signed(landGain)} · sold ${signed(realized)}`} />
        <Stat label="Companies result" value={signed(compResult)} tone={gainTone(compResult)} sub={`Invested ${formatNaira(compInvested)} · paid out ${formatNaira(compPayouts)}`} />
      </div>
      <Title>Where your assets are</Title>
      <Card>
        {byCity.length === 0 ? <EmptyState glyph="🗺️" title="No assets yet">Buy land or start a company to build a portfolio.</EmptyState> : byCity.map(({ c, plots, cos }) => (
          <div key={c.id} className="flex justify-between border-b border-slate-100 py-1.5 text-[13px] last:border-0"><span className="font-semibold">{c.name}{c.id === currentStateId() ? ' · you are here' : ''}</span><span className="text-slate-500">{plots.length} plot{plots.length === 1 ? '' : 's'} · {cos} compan{cos === 1 ? 'y' : 'ies'}</span></div>))}
      </Card>
      <div className="mt-3 flex gap-2"><Btn className="flex-1 !bg-accent" onClick={() => go('land')}>Browse land</Btn><Btn tone="light" className="flex-1" onClick={() => go('markets')}>Markets</Btn></div>
    </div>
  );
}

function PlotCard({ p }: { p: PlayerPlot }) {
  const own = useLandStore((s) => s.owned[p.id]), money = useEconomyStore((s) => s.money);
  const [confirm, setConfirm] = useState(false);
  const gain = own ? own.value - own.cost : 0;
  return (
    <Card>
      <Row glyph={p.kind === 'Farmland' ? '🌾' : p.kind === 'Commercial' ? '🏪' : p.kind === 'Industrial' ? '🏭' : '🏡'} title={`${p.district}, ${cityName(p.cityId)}`} sub={`${p.sqm} sqm ${p.kind.toLowerCase()} · +${p.growthBps / 100}% a week`} right={own ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Owned</span> : <b className="font-display text-sm tabular-nums">{formatNaira(p.price)}</b>} />
      {own ? (<>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]"><div><p className="text-slate-400">Cost</p><b>{formatNaira(own.cost)}</b></div><div><p className="text-slate-400">Value now</p><b>{formatNaira(own.value)}</b></div><div><p className="text-slate-400">Gain</p><b className={gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{signed(gain)}</b></div></div>
        {!confirm ? <Btn tone="light" className="mt-2 w-full" onClick={() => setConfirm(true)}>Sell</Btn> : (
          <div className="mt-2 rounded-xl border-2 border-rose-300 p-3"><p className="text-[13px]">Sell for <b>{formatNaira(saleProceeds(own.value))}</b>? The registry keeps a {LAND.sellFeeBps / 100}% fee.</p>
            <div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setConfirm(false)}>Keep</Btn><Btn tone="red" className="flex-1" onClick={() => { say(sellPlot(p.id), 'Plot sold'); setConfirm(false); }}>Sell</Btn></div></div>)}
      </>) : !confirm ? <Btn className="mt-2 w-full !bg-accent" disabled={p.price > money} onClick={() => setConfirm(true)}>{p.price > money ? 'Not enough money' : 'Buy'}</Btn> : (
        <div className="mt-2 rounded-xl border-2 border-accent p-3"><p className="text-[13px]">Buy for <b>{formatNaira(p.price)}</b>? It grows about {p.growthBps / 100}% a game week and can be sold later minus a {LAND.sellFeeBps / 100}% fee.</p>
          <div className="mt-2 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setConfirm(false)}>Cancel</Btn><Btn className="flex-1 !bg-accent" onClick={() => { say(buyPlot(p.id), 'Plot bought'); setConfirm(false); }}>Buy</Btn></div></div>)}
    </Card>
  );
}
type PlayerPlot = PlotDef;

function Land() {
  const [city, setCity] = useState(currentStateId()), [view, setView] = useState<'opps' | 'here' | 'all'>('opps');
  const owned = useLandStore((s) => s.owned), hist = useLandStore((s) => s.history);
  const list = useMemo(() => view === 'all' ? PLOTS.filter((p) => owned[p.id]) : view === 'here' ? plotsIn(city).filter((p) => owned[p.id]) : plotsIn(city).filter((p) => !owned[p.id]), [view, city, owned]);
  const playable = city === currentStateId();
  return (
    <div className="p-3">
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2" role="group" aria-label="City">{CITY_CATALOG.map((c) => <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>{c.name}{c.id === currentStateId() ? ' 📍' : ''}</Chip>)}</div>
      <Segmented label="Land view" value={view} onChange={setView} options={[['opps', `For sale in ${cityName(city)}`], ['here', 'Owned here'], ['all', 'All owned']]} />
      {!playable && view !== 'all' && <Note>You are on the {cityName(currentStateId())} map. {cityName(city)} is not playable yet, but land there is yours and counts in your portfolio.</Note>}
      <div className="mt-2 space-y-2">
        {list.length === 0 && <Card><EmptyState glyph={view === 'opps' ? '🏷️' : '🗺️'} title={view === 'opps' ? 'No more plots for sale' : 'No land here'}>{view === 'opps' ? 'You own everything listed in this city.' : 'Buy a plot from the For sale tab.'}</EmptyState></Card>}
        {list.map((p) => <PlotCard key={p.id} p={p} />)}
      </div>
      {view === 'all' && hist.length > 0 && (<><Title>Land activity</Title><Card>{hist.slice(0, 8).map((h) => <div key={h.id} className="flex justify-between border-b border-slate-100 py-1.5 text-[12.5px] last:border-0"><span>{h.kind === 'bought' ? 'Bought' : 'Sold'} {getPlot(h.plotId)?.district}<span className="text-slate-400"> · {fmtGame(h.at)}</span></span><b>{formatNaira(h.amount)}</b></div>)}</Card></>)}
      <Note>Land appreciates on the game clock and can be sold. Rent and building on plots are not available yet.</Note>
    </div>
  );
}

function Markets() {
  const { prices, holdings, trade } = useAppsStore();
  const value = ASSETS.reduce((s, a) => s + Math.round((holdings[a.id] ?? 0) * prices[a.id]), 0);
  const buy = (id: string, name: string) => { const p = Math.round(prices[id]); if (!useEconomyStore.getState().debit(p, `Bought ${name}`, 'invest', undefined, { internal: true })) { sfx.error(); return toast('Not enough money.', 'bad'); } trade(id, 1); sfx.coin(); };
  const sell = (id: string, name: string) => { if (!(holdings[id] > 0)) return; useEconomyStore.getState().credit(Math.round(prices[id]), `Sold ${name}`, 'invest', undefined, { internal: true }); trade(id, -1); sfx.coin(); };
  return (
    <div className="p-3">
      <Card className="bg-emerald-50"><p className="text-xs text-slate-500">Market holdings</p><p className="font-display text-2xl font-extrabold text-emerald-700">{formatNaira(value)}</p></Card>
      <Title>Markets (simulated prices)</Title>
      <div className="space-y-2">{ASSETS.map((a) => { const up = prices[a.id] >= a.price; return (
        <Card key={a.id}><Row glyph={a.glyph} title={a.name} sub={`You hold ${holdings[a.id] ?? 0}`} right={<span className={`font-display font-extrabold tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{formatNaira(Math.round(prices[a.id]))}</span>} />
          <div className="mt-2 flex gap-2"><Btn tone="green" className="flex-1" onClick={() => buy(a.id, a.name)}>Buy 1</Btn><Btn tone="light" className="flex-1" disabled={!(holdings[a.id] > 0)} onClick={() => sell(a.id, a.name)}>Sell 1</Btn></div></Card>); })}</div>
      <Note>Prices are random in this prototype and not linked to real markets. Buying and selling move money between your wallet and holdings; a loss is only visible in the holding's value.</Note>
    </div>
  );
}

function Portfolio() {
  const owned = useLandStore((s) => s.owned), bonds = useBankStore((s) => s.bonds), companies = useCompanyStore((s) => s.companies), holdings = useAppsStore((s) => s.holdings), prices = useAppsStore((s) => s.prices);
  const rows: { g: string; t: string; s: string; v: number }[] = [
    ...Object.entries(owned).map(([id, o]) => ({ g: '🗺️', t: getPlot(id)?.name ?? id, s: `Land · ${cityName(getPlot(id)?.cityId ?? '')}`, v: o.value })),
    ...bonds.filter((b) => b.status === 'active').map((b) => ({ g: '📜', t: b.name, s: 'Bond · locked until maturity', v: b.principal })),
    ...ASSETS.filter((a) => (holdings[a.id] ?? 0) > 0).map((a) => ({ g: a.glyph, t: a.name, s: `Market · ${holdings[a.id]} held`, v: Math.round(holdings[a.id] * prices[a.id]) })),
    ...companies.map((c) => ({ g: c.logo, t: c.name, s: `Company funds · ${cityName(c.hqCity)}`, v: c.funds })),
  ];
  return (
    <div className="p-3">
      {rows.length === 0 ? <Card><EmptyState glyph="💼" title="Your portfolio is empty">Land, bonds, market holdings and company funds all appear here, each counted once.</EmptyState></Card>
        : <div className="space-y-2">{rows.map((r, i) => <Card key={i} className="!p-3"><Row glyph={r.g} title={r.t} sub={r.s} right={<b className="font-display tabular-nums">{formatNaira(r.v)}</b>} /></Card>)}</div>}
      <Note>A company's funds count here, but not its "value", and homes and cars are in your net worth in Bank. Nothing is counted twice.</Note>
    </div>
  );
}

export function InvestApp() {
  const [tab, setTab] = useState<'overview' | 'land' | 'markets' | 'portfolio'>('overview');
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Investment sections" tabs={[['overview', 'Overview', LayoutDashboard], ['land', 'Land', Map], ['markets', 'Markets', LineChart], ['portfolio', 'Portfolio', Briefcase]] as const} value={tab} onChange={setTab} />
      {tab === 'overview' && <Overview go={setTab} />}{tab === 'land' && <Land />}{tab === 'markets' && <Markets />}{tab === 'portfolio' && <Portfolio />}
    </div>
  );
}
