import { useMemo } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan, fmtPlayTime } from '@/core/gameTime';
import { BILLS, WEEK_MINUTES } from '@/data/economy';
import { billables, payBill } from '@/game/banking';
import { useBankStore } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, EmptyState, Note, Row, Title } from '../../ui';
import { useGameMinutes } from './common';

export function BillsTab() {
  const bills = useBankStore((s) => s.bills), money = useEconomyStore((s) => s.money);
  const home = usePropertyStore((s) => s.activeId), cars = useVehicleStore((s) => s.owned);
  const minutes = useGameMinutes();
  const upcoming = useMemo(billables, [home, cars]);
  const overdue = bills.filter((b) => b.status === 'overdue'), paid = bills.filter((b) => b.status === 'paid');
  const nextAt = (Math.floor(minutes / WEEK_MINUTES) + 1) * WEEK_MINUTES;
  const pay = (id: string) => { const r = payBill(id); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); } else { sfx.coin(); toast('Bill paid', 'good'); } };
  return (
    <div className="p-3">
      {overdue.length > 0 && (<>
        <Title>Overdue</Title>
        <div className="space-y-2">{overdue.map((b) => (
          <Card key={b.id} className="ring-2 ring-rose-300"><Row glyph={b.glyph} title={`${b.label}`} sub={`${b.assetLabel} · due ${fmtGame(b.dueAt)}`} right={<div className="text-right"><div className="font-display font-extrabold tabular-nums text-rose-600">{formatNaira(b.amount)}</div><Btn tone="red" className="mt-1" disabled={money < b.amount} onClick={() => pay(b.id)}>Pay now</Btn></div>} /></Card>
        ))}</div>
        <Note>Overdue bills are retried automatically at the next weekly run and lower your credibility until paid. Nothing is ever taken beyond your balance.</Note>
      </>)}

      <Title>Next weekly run</Title>
      <Card>
        <p className="text-[13px] text-slate-600">Due in <b className="text-slate-900">{fmtGameSpan(nextAt - minutes)}</b> of game time (about {fmtPlayTime(nextAt - minutes)} of play).</p>
        {upcoming.length === 0 ? <EmptyState glyph="🧾" title="Nothing to pay">Bills start when you own a home or a car.</EmptyState> : (
          <div className="mt-3 space-y-3">{upcoming.map((b) => <Row key={`${b.def.id}:${b.assetId}`} glyph={b.def.glyph} title={b.def.label} sub={b.assetLabel} right={<span className="font-display font-extrabold tabular-nums">{formatNaira(b.amount)}</span>} />)}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-[13px] font-bold"><span>Total</span><span className="tabular-nums">{formatNaira(upcoming.reduce((s, b) => s + b.amount, 0))}</span></div></div>
        )}
      </Card>

      <Title>Paid</Title>
      <div className="space-y-2">
        {paid.length === 0 && <Card><EmptyState glyph="✅" title="No bills paid yet">Paid bills show here with the date and amount.</EmptyState></Card>}
        {paid.slice(0, 25).map((b) => <Card key={b.id} className="!p-3"><Row glyph={b.glyph} title={b.label} sub={`${b.assetLabel} · ${b.paidAt !== undefined ? fmtGame(b.paidAt) : ''}${b.onTime ? '' : ' · paid late'}`} right={<span className="font-display font-extrabold tabular-nums">{formatNaira(b.amount)}</span>} /></Card>)}
      </div>
      <Title>Bill rules</Title>
      <Card><ul className="space-y-1 text-[13px] leading-snug text-slate-600">{BILLS.map((b) => <li key={b.id}><b>{b.label}:</b> {b.rateBps / 100}% of the asset price each week (min {formatNaira(b.min)}, max {formatNaira(b.max)}). {b.note}</li>)}</ul></Card>
      <Note>Each bill is charged once per game week. These are game rules, not real utility prices.</Note>
    </div>
  );
}
