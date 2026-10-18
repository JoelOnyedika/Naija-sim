import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan, fmtPlayTime } from '@/core/gameTime';
import { BONDS, bondReturn, type BondDef } from '@/data/economy';
import { buyBond } from '@/game/banking';
import { useBankStore } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, EmptyState, MoneyField, Note, Row, Title } from '../../ui';
import { useGameMinutes } from './common';

function Product({ def }: { def: BondDef }) {
  const wallet = useEconomyStore((s) => s.money);
  const [open, setOpen] = useState(false), [amount, setAmount] = useState(''), [review, setReview] = useState(false);
  const value = Number(amount) || 0;
  const problem = !amount ? null : value < def.min ? `The minimum is ${formatNaira(def.min)}.` : value > def.max ? `The maximum is ${formatNaira(def.max)}.` : value > wallet ? 'That is more than your wallet balance.' : null;
  const buy = () => {
    const r = buyBond(def.id, value); setReview(false);
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    sfx.coin(); toast(`${def.name} bought`, 'good'); setAmount(''); setOpen(false);
  };
  return (
    <Card>
      <Row glyph={def.glyph} title={def.name} sub={`${def.termDays} days · ${def.returnBps / 100}% fixed return`} right={<Btn tone={open ? 'light' : 'dark'} onClick={() => { setOpen(!open); setReview(false); }}>{open ? 'Close' : 'Invest'}</Btn>} />
      <p className="mt-1.5 text-xs text-slate-500">{def.blurb} From {formatNaira(def.min)} to {formatNaira(def.max)}.</p>
      {open && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <MoneyField label="Amount to invest" value={amount} onChange={(v) => { setAmount(v); setReview(false); }} invalid={!!problem} />
          {problem && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{problem}</p>}
          {amount && !problem && <p className="mt-1 text-xs text-slate-500">You get back <b className="text-slate-800">{formatNaira(value + bondReturn(value, def))}</b> after {def.termDays} game days ({formatNaira(bondReturn(value, def))} return).</p>}
          {!review && <Btn className="mt-3 w-full !bg-accent" disabled={!amount || !!problem} onClick={() => setReview(true)}>Review</Btn>}
          {review && (
            <div className="mt-3 rounded-xl border-2 border-accent bg-accent/5 p-3" role="group" aria-label="Confirm bond purchase">
              <p className="text-[13px] leading-snug">Lock <b>{formatNaira(value)}</b> for {def.termDays} game days. You cannot take it out early. At maturity you receive <b>{formatNaira(value + bondReturn(value, def))}</b>.</p>
              <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setReview(false)}>Cancel</Btn><Btn className="flex-1 !bg-accent" onClick={buy}>Lock {formatNaira(value)}</Btn></div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function BondsTab() {
  const bonds = useBankStore((s) => s.bonds);
  const minutes = useGameMinutes();
  const active = bonds.filter((b) => b.status === 'active');
  return (
    <div className="p-3">
      <Title>Available bonds</Title>
      <div className="space-y-2">{BONDS.map((d) => <Product key={d.id} def={d} />)}</div>
      <Note>In-game bonds only. The return is fixed by the game rules and paid at maturity; early redemption is not available. No real securities or financial services are involved.</Note>

      <Title>Your bonds</Title>
      <div className="space-y-2">
        {bonds.length === 0 && <Card><EmptyState glyph="📜" title="No bonds yet">Lock money for a few game days to earn a fixed return.</EmptyState></Card>}
        {bonds.map((b) => (
          <Card key={b.id} className="!p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-[14px] font-bold">{b.name}</p><p className="text-xs text-slate-500">Bought {fmtGame(b.boughtAt)} · {formatNaira(b.principal)}</p></div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${b.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{b.status === 'active' ? 'Active' : 'Matured'}</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-600">
              <span>{b.status === 'active' ? `Matures in ${fmtGameSpan(b.maturesAt - minutes)} (about ${fmtPlayTime(b.maturesAt - minutes)} of play)` : `Paid ${b.paidAt !== undefined ? fmtGame(b.paidAt) : ''}`}</span>
              <span className="font-semibold">At maturity {formatNaira(b.principal + b.expectedReturn)}</span>
            </div>
          </Card>
        ))}
        {active.length > 0 && <Note>{active.length} active · {formatNaira(active.reduce((s, b) => s + b.principal, 0))} locked. Locked bonds are not spendable cash.</Note>}
      </div>
    </div>
  );
}
