import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan, fmtPlayTime } from '@/core/gameTime';
import { INCOME_TAX, WEEK_MINUTES, taxOn } from '@/data/economy';
import { payTax, taxableIncomeFor } from '@/game/banking';
import { useBankStore } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, EmptyState, Note, Row, Stat, Title } from '../../ui';
import { useGameMinutes } from './common';

/** Income tax: an in-game rule (data/economy.ts). Assessed once a game week on the previous week's salary and business income. */
export function TaxTab() {
  const taxes = useBankStore((s) => s.taxes), money = useEconomyStore((s) => s.money);
  useEconomyStore((s) => s.transactions);
  const minutes = useGameMinutes(), week = Math.floor(minutes / WEEK_MINUTES);
  const taxable = taxableIncomeFor(week), estimate = taxOn(taxable), nextIn = (week + 1) * WEEK_MINUTES - minutes;
  const paid = taxes.filter((t) => t.status === 'paid').reduce((s, t) => s + t.tax, 0), unpaid = taxes.filter((t) => t.status === 'unpaid');
  const owed = unpaid.reduce((s, t) => s + t.tax, 0);
  let floor = 0;
  const pay = (id: string) => { const r = payTax(id); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); } else { sfx.coin(); toast('Tax paid', 'good'); } };
  return (
    <div className="p-3">
      {!INCOME_TAX.enabled && <Card className="bg-sky-50"><p className="text-sm font-bold text-sky-900">Income tax is switched off</p><p className="mt-1 text-[13px] leading-snug text-sky-800">The game economy currently has no tax, so nothing is charged.</p></Card>}
      {unpaid.length > 0 && <Card className="mb-3 ring-2 ring-rose-300"><p className="text-sm font-bold text-rose-700">Tax outstanding: {formatNaira(owed)}</p><p className="mt-1 text-xs text-slate-500">Unpaid tax is retried at the next weekly run. Nothing is taken beyond your balance.</p></Card>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Taxable this week" value={formatNaira(taxable)} sub="Job, Hustle and company income" />
        <Stat label="Estimated tax" value={formatNaira(estimate)} sub={`Assessed in ${fmtGameSpan(nextIn)} (about ${fmtPlayTime(nextIn)} of play)`} />
        <Stat label="Paid" value={formatNaira(paid)} tone="good" /><Stat label="Outstanding" value={formatNaira(owed)} tone={owed ? 'bad' : 'plain'} />
      </div>
      {unpaid.length > 0 && (<><Title>Pay now</Title><div className="space-y-2">{unpaid.map((t) => <Card key={t.id}><Row glyph="🏛️" title={`Week ${t.period - 1} tax`} sub={`On ${formatNaira(t.taxable)}`} right={<Btn tone="red" disabled={money < t.tax} onClick={() => pay(t.id)}>Pay {formatNaira(t.tax)}</Btn>} /></Card>)}</div></>)}
      <Title>Tax rates (per game week)</Title>
      <Card>
        <table className="w-full text-[13px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="pb-1 font-semibold">Income slice</th><th className="pb-1 text-right font-semibold">Rate</th></tr></thead>
          <tbody>{INCOME_TAX.brackets.map((b, i) => { const from = floor; floor = b.upTo ?? Infinity; return <tr key={i} className="border-t border-slate-100"><td className="py-1.5">{b.upTo === null ? `Over ${formatNaira(from)}` : from === 0 ? `Up to ${formatNaira(b.upTo)}` : `${formatNaira(from)} to ${formatNaira(b.upTo)}`}</td><td className="py-1.5 text-right font-bold tabular-nums">{b.rateBps / 100}%</td></tr>; })}</tbody></table>
        <p className="mt-2 text-[11.5px] leading-snug text-slate-500">Each rate applies only to the income inside its slice. Taxed: job pay, Hustle pay and company payouts. Not taxed: interest, bond returns, selling assets, transfers and refunds.</p>
      </Card>
      <Title>Assessment history</Title>
      <div className="space-y-2">
        {taxes.length === 0 && <Card><EmptyState glyph="🏛️" title="No assessments yet">Your first one comes after a game week.</EmptyState></Card>}
        {taxes.slice(0, 20).map((t) => <Card key={t.id} className="!p-3"><div className="flex justify-between gap-3"><div><p className="text-[14px] font-bold">Week {t.period - 1}</p><p className="text-xs text-slate-500">On {formatNaira(t.taxable)}{t.status === 'paid' ? (t.tax > 0 && t.paidAt !== undefined ? ` · paid ${fmtGame(t.paidAt)}` : ' · nothing due') : ' · unpaid'}</p></div><span className={`font-display font-extrabold tabular-nums ${t.status === 'unpaid' ? 'text-rose-600' : ''}`}>{formatNaira(t.tax)}</span></div></Card>)}
      </div>
      <Note>This is the in-game "Revenue Service", not Nigerian tax law, and has no real-world meaning.</Note>
    </div>
  );
}
