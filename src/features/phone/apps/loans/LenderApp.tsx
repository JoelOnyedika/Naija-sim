import { useState, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { LENDERS, LOAN_RULES, type Lender, type LenderId } from '@/data/loans';
import { activeLoan, borrow, lateFee, limitFor, overdueMinutes, owedOn, quote, repay, whyNotBorrow } from '@/game/loans';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLoanStore, type Loan } from '@/stores/loanStore';
import { toast } from '@/stores/uiStore';
import { MoneyField } from '../../ui';

/** "1d 6h" in game time, with the real minutes of play it equals (1 game minute = 1 real second). */
const span = (min: number) => { const m = Math.max(0, Math.round(min)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`; };
const real = (min: number) => `${Math.max(1, Math.round(min / 60))} min of play`;

/** One screen for all three loan apps. Colours, hero art, button shape and tone differ per lender (see THEMES), the rules are the same code. */
export function LenderApp({ id }: { id: LenderId }) {
  const d = LENDERS[id], t = d.theme;
  useLoanStore((s) => s.loans); useLoanStore((s) => s.record);
  const minutes = useClockStore((s) => s.minutes), money = useEconomyStore((s) => s.money);
  const limit = limitFor(id), loan = activeLoan(id), history = useLoanStore.getState().loans.filter((l) => l.lender === id && l.status === 'repaid').slice(0, 5);
  const [amount, setAmount] = useState(String(Math.min(limit, Math.max(LOAN_RULES.minLoan, Math.round(limit / 2 / 1000) * 1000))));
  const [part, setPart] = useState('');
  const n = Number(amount) || 0, q = quote(id, n), err = n ? whyNotBorrow(id, n) : null;
  const rec = useLoanStore.getState().record[id];
  const ink = t.dark ? '#F5F5F4' : t.ink, sub = t.dark ? '#A8A29E' : '#64748B', card = t.dark ? '#1C1917' : '#FFFFFF';
  const page: CSSProperties = { background: t.dark ? '#0C0A09' : t.soft, color: ink };

  const doBorrow = () => { const r = borrow(id, n); if (r.ok) toast(`${d.name}: ${formatNaira(n)} sent to your wallet.`, 'good'); else { sfx.error(); toast(r.error, 'bad'); } };
  const doRepay = (amt?: number) => { if (!loan) return; const r = repay(loan.id, amt); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); } else setPart(''); };

  return (
    <div className="min-h-full pb-8" style={page}>
      <Hero d={d} limit={limit} />
      <div className="-mt-6 space-y-3 px-3">
        {loan ? <Active d={d} loan={loan} minutes={minutes} money={money} part={part} setPart={setPart} onRepay={doRepay} card={card} ink={ink} sub={sub} />
          : (
            <Panel card={card} dark={t.dark}>
              <div className="flex items-baseline justify-between"><div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: sub }}>Borrow</div><div className="text-[11px]" style={{ color: sub }}>Limit {formatNaira(limit)}</div></div>
              <div className="mt-2"><MoneyField label="Amount" value={amount} onChange={setAmount} invalid={!!err} /></div>
              <div className="mt-2 flex gap-2">
                {LOAN_RULES.chips.map((c) => { const v = Math.max(LOAN_RULES.minLoan, Math.round((limit * c) / 1000) * 1000); return <button key={c} onClick={() => { sfx.click(); setAmount(String(v)); }} className="flex-1 rounded-full py-1.5 text-[12px] font-bold" style={{ background: Number(amount) === v ? t.accent : t.dark ? '#292524' : t.soft, color: Number(amount) === v ? (t.dark ? '#111' : '#fff') : ink }}>{formatNaira(v).replace(/,000$/, 'k')}</button>; })}
              </div>
              <div className="mt-3 space-y-1 rounded-2xl p-3 text-[13px]" style={{ background: t.dark ? '#292524' : t.soft }}>
                <Line k="You get" v={formatNaira(n)} /><Line k={`Interest (${Math.round(d.interest * 100)}%)`} v={formatNaira(q.interest)} /><Line k={`Repay within ${d.termDays} day${d.termDays > 1 ? 's' : ''}`} v={formatNaira(q.total)} bold />
                <div className="text-[11px]" style={{ color: sub }}>{d.termDays} game day{d.termDays > 1 ? 's' : ''} is about {real(d.termDays * 1440)}. Late fee: {Math.round(d.lateFeePerDay * 100)}% of the loan for every day late.</div>
              </div>
              {err && n > 0 && <div className="mt-2 text-[12px] font-semibold text-rose-500">{err}</div>}
              <button disabled={!!err || n <= 0} onClick={doBorrow} className={`mt-3 w-full py-3 text-[15px] font-extrabold transition active:scale-[0.98] disabled:opacity-40 ${d.id === 'ofay' ? 'rounded-full' : d.id === 'falmfay' ? 'rounded-2xl' : 'rounded-md uppercase tracking-wide'}`} style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, color: t.dark ? '#111' : '#fff' }}>
                {d.id === 'kwikkash' ? `Get ${formatNaira(n)} now` : `Borrow ${formatNaira(n)}`}
              </button>
            </Panel>
          )}
        <Panel card={card} dark={t.dark}>
          <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: sub }}>How it works</div>
          <ol className="mt-2 space-y-1.5">{d.steps.map((s, i) => <li key={s} className="flex gap-2 text-[13px]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: t.accent, color: t.dark ? '#111' : '#fff' }}>{i + 1}</span>{s}</li>)}</ol>
          <div className="mt-3 text-[12px]" style={{ color: sub }}>On time: {rec.onTime} · Late: {rec.late}. Each loan repaid on time lifts your limit (up to {formatNaira(d.maxLimit)}). Stay overdue and {d.collectors.crew} will come looking for you.</div>
        </Panel>
        {history.length > 0 && <Panel card={card} dark={t.dark}><div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: sub }}>Past loans</div>{history.map((l) => <div key={l.id} className="mt-2 flex items-center justify-between text-[13px]"><span>{formatNaira(l.principal)}</span><span className="font-semibold" style={{ color: l.onTime ? '#16A34A' : '#F59E0B' }}>{l.onTime ? 'Paid on time' : 'Paid late'}</span></div>)}</Panel>}
      </div>
    </div>
  );
}

const Panel = ({ children, card, dark }: { children: ReactNode; card: string; dark: boolean }) => <div className="rounded-[22px] p-4 shadow-sm" style={{ background: card, border: dark ? '1px solid #292524' : 'none' }}>{children}</div>;
const Line = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => <div className="flex justify-between"><span>{k}</span><span className={bold ? 'font-extrabold' : 'font-semibold'}>{v}</span></div>;

/** The top of each app. Each lender has its own art on purpose. */
function Hero({ d, limit }: { d: Lender; limit: number }) {
  const t = d.theme;
  return (
    <div className="relative overflow-hidden px-4 pb-10 pt-4" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})`, color: t.dark ? '#111' : '#fff' }}>
      {d.id === 'ofay' && <><span className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15" /><span className="absolute right-10 top-16 h-16 w-16 rounded-full bg-white/10" /></>}
      {d.id === 'falmfay' && <span className="absolute -right-2 -top-2 select-none text-[110px] leading-none opacity-25">🌴</span>}
      {d.id === 'kwikkash' && <span className="absolute inset-x-0 top-0 h-2" style={{ background: 'repeating-linear-gradient(45deg,#111 0 10px,#FACC15 10px 20px)' }} />}
      <div className="relative flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-xl" style={{ background: t.dark ? '#111' : 'rgba(255,255,255,0.22)', color: t.dark ? '#FACC15' : '#fff' }}>{d.glyph}</span><div><div className={`text-[20px] leading-none tracking-tight ${d.id === 'kwikkash' ? 'font-black uppercase' : 'font-extrabold'}`}>{d.name}</div><div className="text-[11px] opacity-80">{d.tagline}</div></div></div>
      <div className="relative mt-4 text-[12px] font-semibold uppercase tracking-wider opacity-80">You can borrow up to</div>
      <div className="relative text-[34px] font-black leading-tight">{formatNaira(limit)}</div>
    </div>
  );
}

function Active({ d, loan, minutes, money, part, setPart, onRepay, card, ink, sub }: { d: Lender; loan: Loan; minutes: number; money: number; part: string; setPart: (v: string) => void; onRepay: (a?: number) => void; card: string; ink: string; sub: string }) {
  const owed = owedOn(loan, minutes), late = overdueMinutes(loan, minutes) > 0, fee = lateFee(loan, minutes), left = loan.dueAt - minutes;
  const pct = Math.min(100, Math.round((loan.paid / (loan.total + fee)) * 100));
  return (
    <Panel card={card} dark={d.theme.dark}>
      <div className="flex items-center justify-between"><div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: sub }}>Your loan</div><span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold" style={{ background: late ? '#FEE2E2' : '#DCFCE7', color: late ? '#B91C1C' : '#166534' }}>{late ? `Overdue ${span(-left)}` : `Due in ${span(left)}`}</span></div>
      <div className="mt-1 text-[30px] font-black leading-tight" style={{ color: ink }}>{formatNaira(owed)}</div>
      <div className="text-[12px]" style={{ color: sub }}>Borrowed {formatNaira(loan.principal)} + interest {formatNaira(loan.interest)}{fee ? ` + late fees ${formatNaira(fee)}` : ''}{loan.paid ? ` − paid ${formatNaira(loan.paid)}` : ''}. {late ? '' : `(${real(left)} left)`}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: d.theme.dark ? '#292524' : '#E2E8F0' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.theme.accent }} /></div>
      {late && <div className="mt-2 rounded-xl bg-rose-500/10 p-2 text-[12px] font-semibold text-rose-500">Pay now. If this drags on, {d.collectors.crew} will come to your door, and sometimes they bring police.</div>}
      <button onClick={() => onRepay()} disabled={money <= 0} className="mt-3 w-full rounded-xl py-3 text-[15px] font-extrabold transition active:scale-[0.98] disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${d.theme.from}, ${d.theme.to})`, color: d.theme.dark ? '#111' : '#fff' }}>{money >= owed ? `Repay ${formatNaira(owed)}` : `Pay what you have (${formatNaira(money)})`}</button>
      <div className="mt-2 flex items-end gap-2"><div className="flex-1"><MoneyField label="Pay part" value={part} onChange={setPart} /></div><button disabled={!Number(part)} onClick={() => onRepay(Number(part))} className="rounded-xl px-4 py-2.5 text-[13px] font-bold disabled:opacity-40" style={{ background: d.theme.dark ? '#292524' : d.theme.soft, color: ink }}>Pay</button></div>
    </Panel>
  );
}
