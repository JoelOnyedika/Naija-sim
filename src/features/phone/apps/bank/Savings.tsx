import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { fmtGame, fmtGameSpan, fmtPlayTime } from '@/core/gameTime';
import { SAVINGS, WEEK_MINUTES } from '@/data/economy';
import { depositSavings, projectedInterest, withdrawSavings } from '@/game/banking';
import { useBankStore } from '@/stores/bankStore';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, EmptyState, MoneyField, Note, Segmented, Stat, Title } from '../../ui';
import { useGameMinutes } from './common';

export function SavingsTab() {
  const wallet = useEconomyStore((s) => s.money);
  const { balance, entries } = useBankStore((s) => s.savings);
  const minutes = useGameMinutes();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const value = Number(amount) || 0, limit = mode === 'deposit' ? wallet : balance;
  const problem = !amount ? null : value > limit ? (mode === 'deposit' ? 'That is more than your wallet balance.' : 'That is more than your savings balance.') : mode === 'deposit' && value < SAVINGS.minDeposit ? `The minimum deposit is ${formatNaira(SAVINGS.minDeposit)}.` : null;
  const earned = entries.filter((e) => e.kind === 'interest').reduce((s, e) => s + e.amount, 0);
  const nextAt = (Math.floor(minutes / WEEK_MINUTES) + 1) * WEEK_MINUTES;

  const submit = () => {
    const r = mode === 'deposit' ? depositSavings(value) : withdrawSavings(value);
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    sfx.coin(); toast(mode === 'deposit' ? `${formatNaira(value)} saved` : `${formatNaira(value)} moved to your wallet`, 'good'); setAmount('');
  };
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white shadow-lg">
        <p className="text-xs text-white/75">Savings balance</p>
        <p className="font-display text-3xl font-extrabold tabular-nums">{formatNaira(balance)}</p>
        <p className="mt-1 text-xs text-white/80">Earns {SAVINGS.weeklyRateBps / 100}% each game week</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Next interest" value={formatNaira(projectedInterest())} sub={`In ${fmtGameSpan(nextAt - minutes)} (about ${fmtPlayTime(nextAt - minutes)} of play)`} />
        <Stat label="Interest earned" value={formatNaira(earned)} tone="good" sub={`Last at ${entries.find((e) => e.kind === 'interest') ? fmtGame(entries.find((e) => e.kind === 'interest')!.at) : 'no payout yet'}`} />
      </div>

      <Title>Move money</Title>
      <Card>
        <Segmented label="Deposit or withdraw" value={mode} onChange={(m) => { setMode(m); setAmount(''); }} options={[['deposit', 'Deposit'], ['withdraw', 'Withdraw']]} />
        <div className="mt-3"><MoneyField label={mode === 'deposit' ? 'Amount to save' : 'Amount to withdraw'} value={amount} onChange={setAmount} invalid={!!problem} /></div>
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Quick amounts">
          {[25, 50, 100].map((p) => <Chip key={p} onClick={() => setAmount(String(Math.floor((limit * p) / 100)))}>{p === 100 ? 'All' : `${p}%`}</Chip>)}
        </div>
        {problem && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{problem}</p>}
        <Btn className="mt-3 w-full !bg-accent" disabled={!amount || !!problem || value <= 0} onClick={submit}>{mode === 'deposit' ? 'Save' : 'Withdraw'} {value > 0 ? formatNaira(value) : ''}</Btn>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">Wallet {formatNaira(wallet)} · Savings {formatNaira(balance)}</p>
      </Card>

      <Title>How interest works</Title>
      <Card>
        <p className="text-[13px] leading-snug text-slate-600">Once per game week the bank pays {SAVINGS.weeklyRateBps / 100}% of whatever is in savings at that moment, rounded down to the naira. Interest is paid to your wallet, not added to savings. Money in savings cannot be spent until you withdraw it. Opening the app or reloading the game never pays interest twice.</p>
      </Card>

      <Title>Savings history</Title>
      <div className="space-y-2">
        {entries.length === 0 && <Card><EmptyState glyph="🐖" title="No savings activity yet">Deposit some money to start earning interest.</EmptyState></Card>}
        {entries.slice(0, 20).map((e) => (
          <Card key={e.id} className="!p-3"><div className="flex items-center justify-between gap-3">
            <div><p className="text-[14px] font-bold capitalize">{e.kind === 'interest' ? 'Interest paid' : e.kind}</p><p className="text-xs text-slate-500">{fmtGame(e.at)} · Savings {formatNaira(e.balanceAfter)}</p></div>
            <span className={`font-display font-extrabold tabular-nums ${e.kind === 'withdraw' ? 'text-rose-600' : 'text-emerald-600'}`}>{e.kind === 'withdraw' ? '-' : '+'}{formatNaira(e.amount)}</span>
          </div></Card>
        ))}
      </div>
      <Note>Savings are an in-game account. No real bank or payment service is connected.</Note>
    </div>
  );
}
