import { useMemo } from 'react';
import { formatNaira } from '@/core/format';
import { fmtGameSpan, fmtPlayTime } from '@/core/gameTime';
import { WEEK_MINUTES } from '@/data/economy';
import { billables } from '@/game/banking';
import { computeNetWorth } from '@/game/wealth';
import { useAppsStore } from '@/stores/appsStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useLandStore } from '@/stores/landStore';
import { useBankStore } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Btn, Card, EmptyState, Note, Row, Stat, Title } from '../../ui';
import { TxRow, useGameMinutes } from './common';

export function OverviewTab({ go, openReceipt }: { go: (tab: 'send' | 'savings' | 'bonds' | 'bills' | 'history') => void; openReceipt: (id: string) => void }) {
  const money = useEconomyStore((s) => s.money);
  const income = useEconomyStore((s) => s.lifetimeIncome), expense = useEconomyStore((s) => s.lifetimeExpense);
  const txs = useEconomyStore((s) => s.transactions);
  const savings = useBankStore((s) => s.savings.balance);
  const bonds = useBankStore((s) => s.bonds), bills = useBankStore((s) => s.bills);
  const home = usePropertyStore((s) => s.activeId), owned = usePropertyStore((s) => s.ownedIds), cars = useVehicleStore((s) => s.owned);
  const minutes = useGameMinutes();
  // These inputs change what a net worth or a bill is, so they are the dependencies.
  const land = useLandStore((s) => s.owned), cos = useCompanyStore((s) => s.companies), hold = useAppsStore((s) => s.holdings);
  const nw = useMemo(computeNetWorth, [money, savings, bonds, owned, cars, land, cos, hold]);
  const upcoming = useMemo(billables, [home, cars]);
  const overdue = bills.filter((b) => b.status === 'overdue');
  const nextRun = (Math.floor(minutes / WEEK_MINUTES) + 1) * WEEK_MINUTES - minutes;
  const activeBonds = bonds.filter((b) => b.status === 'active');
  const parts: [string, number][] = [['Wallet cash', nw.wallet], ['Savings', nw.savings], ['Bonds (principal)', nw.bonds], ['Homes', nw.homes], ['Land', nw.land], ['Market holdings', nw.markets], ['Company funds', nw.companies], ['Cars', nw.vehicles]];
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 p-5 text-white shadow-lg">
        <p className="text-xs text-white/70">Available balance</p>
        <p className="font-display text-3xl font-extrabold tabular-nums"><AnimatedNumber value={money} /></p>
        <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
          <div><p className="text-[11px] text-white/70">Net worth</p><p className="font-display text-lg font-bold tabular-nums">{formatNaira(nw.total)}</p></div>
          <div className="flex gap-2"><Btn className="!bg-white/15" onClick={() => go('send')}>Send</Btn><Btn className="!bg-white/15" onClick={() => go('savings')}>Save</Btn></div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Total income" value={formatNaira(income)} tone="good" sub="Pay, rewards, interest" />
        <Stat label="Total expenses" value={formatNaira(expense)} tone="bad" sub="Purchases, bills, fees" />
        <Stat label="Savings" value={formatNaira(savings)} sub="Not spendable cash" />
        <Stat label="Bonds" value={formatNaira(nw.bonds)} sub={`${activeBonds.length} active`} />
      </div>
      <Note>Income and expenses leave out money you move between your wallet, savings and bonds.</Note>

      <Title>Net worth</Title>
      <Card className="space-y-1.5">
        {parts.map(([k, v]) => <div key={k} className="flex justify-between text-[13px]"><span className="text-slate-500">{k}</span><span className="font-semibold tabular-nums">{formatNaira(v)}</span></div>)}
        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[13px] font-bold"><span>Total</span><span className="tabular-nums">{formatNaira(nw.total)}</span></div>
        <p className="text-[11px] leading-snug text-slate-500">Each naira is counted once. Cars count at 80% of their price, land at its current value, company funds as held. Furniture is not counted.</p>
      </Card>

      <Title>Upcoming bills</Title>
      <Card>
        {overdue.length > 0 && <Row glyph="⚠️" title={`${overdue.length} overdue`} sub={formatNaira(overdue.reduce((s, b) => s + b.amount, 0))} right={<Btn tone="red" onClick={() => go('bills')}>Pay</Btn>} />}
        {upcoming.length === 0 && overdue.length === 0 && <EmptyState glyph="🧾" title="Nothing to pay">Bills appear when you own a home or a car.</EmptyState>}
        {upcoming.length > 0 && (
          <div className={overdue.length ? 'mt-3 border-t border-slate-200 pt-3' : ''}>
            <Row glyph="🗓️" title={`${formatNaira(upcoming.reduce((s, b) => s + b.amount, 0))} next week`} sub={`Due in ${fmtGameSpan(nextRun)} of game time (about ${fmtPlayTime(nextRun)} of play)`} right={<Btn tone="light" onClick={() => go('bills')}>View</Btn>} />
          </div>
        )}
      </Card>

      <Title>Recent activity</Title>
      <div className="space-y-2">
        {txs.length === 0 && <Card><EmptyState glyph="💸" title="No transactions yet">Work a shift or buy something and it shows up here.</EmptyState></Card>}
        {txs.slice(0, 5).map((t) => <TxRow key={t.id} t={t} onOpen={openReceipt} />)}
        {txs.length > 5 && <Btn tone="light" className="w-full" onClick={() => go('history')}>See all activity</Btn>}
      </div>
    </div>
  );
}
