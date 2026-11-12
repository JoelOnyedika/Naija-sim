import { Banknote, CircleHelp, History, RotateCcw, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { LENDERS, LOAN_RULES, type Lender } from '@/data/loans';
import type { LenderId } from '@/data/loans';
import { activeLoan, borrow, lateFee, limitFor, overdueMinutes, owedOn, quote, repay, whyNotBorrow } from '@/game/loans';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLoanStore, type Loan } from '@/stores/loanStore';
import { toast } from '@/stores/uiStore';
import { LOAN_LOGOS } from './logos';

/** "1d 6h" in game time (1 game minute = 1 real second); `real` says how long that is in real play. */
const span = (min: number) => { const m = Math.max(0, Math.round(min)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`; };
const real = (min: number) => `${Math.max(1, Math.round(min / 60))} min`;
const k = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

type Tab = 'borrow' | 'repay' | 'history' | 'info';
const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [{ id: 'borrow', label: 'Borrow', Icon: Banknote }, { id: 'repay', label: 'Repay', Icon: RotateCcw }, { id: 'history', label: 'History', Icon: History }, { id: 'info', label: 'How it works', Icon: CircleHelp }];

/** Each brand's own feel: page, card, button shapes and tone (OFAY airy and green, FALMFAY deep purple and rounded, KWIKKASH black, yellow and sharp). */
function look(d: Lender) {
  const t = d.theme;
  if (d.id === 'ofay') return { page: '#F2F8F5', card: '#FFFFFF', ink: '#0B2A1C', sub: '#6B7F75', line: '#E3EEE8', cardR: 'rounded-[22px]', btnR: 'rounded-full', cta: `linear-gradient(135deg, ${t.from}, #00A35A)`, ctaInk: '#fff', chip: '#E3F6EC', chipOn: t.accent, chipOnInk: '#fff', shadow: '0 6px 18px rgba(0,120,70,0.10)' };
  if (d.id === 'falmfay') return { page: '#F4F0FE', card: '#FFFFFF', ink: '#241047', sub: '#7A6C9C', line: '#E9E1FB', cardR: 'rounded-[26px]', btnR: 'rounded-2xl', cta: 'linear-gradient(135deg, #8B5CF6, #5B21B6)', ctaInk: '#fff', chip: '#EFE7FE', chipOn: '#7C3AED', chipOnInk: '#fff', shadow: '0 8px 22px rgba(91,33,182,0.14)' };
  return { page: '#0B0A09', card: '#171412', ink: '#F7F5F2', sub: '#A39B90', line: '#2A2622', cardR: 'rounded-lg', btnR: 'rounded-md', cta: 'linear-gradient(180deg, #FDE047, #EAB308)', ctaInk: '#111', chip: '#24201C', chipOn: '#FACC15', chipOnInk: '#111', shadow: '0 0 0 1px #2A2622' };
}

export function LenderApp({ id }: { id: LenderId }) {
  const d = LENDERS[id], t = d.theme, s = look(d), Logo = LOAN_LOGOS[id];
  useLoanStore((x) => x.loans); useLoanStore((x) => x.record);
  const minutes = useClockStore((x) => x.minutes), money = useEconomyStore((x) => x.money);
  const limit = limitFor(id), loan = activeLoan(id), rec = useLoanStore.getState().record[id];
  const history = useLoanStore.getState().loans.filter((l) => l.lender === id && l.status === 'repaid');
  const [tab, setTab] = useState<Tab>(loan ? 'repay' : 'borrow');
  const next = Math.min(d.maxLimit, Math.round((limit * d.growth) / 1000) * 1000), level = rec.onTime + 1;

  return (
    <div className="min-h-full pb-6" style={{ background: s.page, color: s.ink }}>
      {/* header: logo, brand, the limit and the way to the next one */}
      <div className="relative overflow-hidden px-4 pb-12 pt-4" style={{ background: `linear-gradient(160deg, ${t.from}, ${t.to})`, color: t.dark ? '#111' : '#fff' }}>
        {id === 'ofay' && <><span className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15" /><span className="absolute right-12 top-20 h-14 w-14 rounded-full bg-white/10" /><span className="absolute -left-6 bottom-2 h-24 w-24 rounded-full bg-black/10" /></>}
        {id === 'falmfay' && <svg className="absolute -right-3 -top-2 h-40 w-40 opacity-[0.18]" viewBox="0 0 100 100" aria-hidden><g fill="#fff"><path d="M50 90 C46 70 48 55 56 40" stroke="#fff" strokeWidth="5" fill="none" /><path d="M56 40 C42 22 24 26 16 40 C32 34 44 36 56 40Z" /><path d="M56 40 C48 18 60 4 76 4 C66 16 62 28 56 40Z" /><path d="M56 40 C72 24 90 28 96 42 C82 35 68 36 56 40Z" /></g></svg>}
        {id === 'kwikkash' && <span className="absolute inset-x-0 top-0 h-2" style={{ background: 'repeating-linear-gradient(45deg,#111 0 10px,#FACC15 10px 20px)' }} />}
        <div className="relative flex items-center gap-2.5">
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md" style={{ borderRadius: id === 'kwikkash' ? 8 : undefined }}><Logo /></span>
          <div className="min-w-0 flex-1"><div className={`text-[19px] leading-none tracking-tight ${id === 'kwikkash' ? 'font-black uppercase' : 'font-extrabold'}`}>{d.name}</div><div className="mt-0.5 truncate text-[11px] opacity-80">{d.tagline}</div></div>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ background: t.dark ? '#111' : 'rgba(255,255,255,0.22)', color: t.dark ? '#FACC15' : '#fff' }}>Level {level}</span>
        </div>
        <div className="relative mt-4 text-[11px] font-semibold uppercase tracking-wider opacity-80">Available to borrow</div>
        <div className="relative text-[36px] font-black leading-none">{formatNaira(limit)}</div>
        <div className="relative mt-3 flex items-center gap-2 text-[11px] font-semibold opacity-90"><div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: t.dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)' }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (limit / d.maxLimit) * 100)}%`, background: t.dark ? '#111' : '#fff' }} /></div>{limit >= d.maxLimit ? 'Top limit' : `Repay on time: ${formatNaira(next)}`}</div>
      </div>

      {/* the four actions */}
      <div className={`relative z-10 -mt-7 mx-3 grid grid-cols-4 gap-1 p-2 ${s.cardR}`} style={{ background: s.card, boxShadow: s.shadow }} role="tablist">
        {TABS.map(({ id: tid, label, Icon }) => { const on = tab === tid; return (
          <button key={tid} role="tab" aria-selected={on} onClick={() => { sfx.click(); setTab(tid); }} className="flex flex-col items-center gap-1 py-1.5 active:scale-95">
            <span className={`flex h-10 w-10 items-center justify-center ${id === 'kwikkash' ? 'rounded-md' : 'rounded-full'}`} style={{ background: on ? s.chipOn : s.chip, color: on ? s.chipOnInk : s.ink }}><Icon size={19} strokeWidth={2.2} /></span>
            <span className="text-[10.5px] font-bold" style={{ color: on ? s.ink : s.sub }}>{label}</span>
          </button>); })}
      </div>

      <div className="mt-3 space-y-3 px-3">
        {tab === 'borrow' && <Borrow d={d} s={s} limit={limit} next={next} />}
        {tab === 'repay' && <Repay d={d} s={s} loan={loan} minutes={minutes} money={money} goBorrow={() => setTab('borrow')} />}
        {tab === 'history' && <HistoryTab s={s} rows={history} />}
        {tab === 'info' && <Info d={d} s={s} rec={rec} />}
      </div>
    </div>
  );
}
type Look = ReturnType<typeof look>;
const Card = ({ s, children, className = '' }: { s: Look; children: ReactNode; className?: string }) => <div className={`${s.cardR} p-4 ${className}`} style={{ background: s.card, boxShadow: s.shadow }}>{children}</div>;
const Row = ({ k: key, v, bold, s }: { k: string; v: string; bold?: boolean; s: Look }) => <div className="flex items-center justify-between py-1.5 text-[13px]" style={{ borderTop: `1px solid ${s.line}` }}><span style={{ color: s.sub }}>{key}</span><span className={bold ? 'text-[15px] font-black' : 'font-bold'}>{v}</span></div>;

function Borrow({ d, s, limit, next }: { d: Lender; s: Look; limit: number; next: number }) {
  const [amount, setAmount] = useState(() => Math.min(limit, Math.max(LOAN_RULES.minLoan, Math.round(limit / 2 / 1000) * 1000)));
  const q = quote(d.id, amount), err = whyNotBorrow(d.id, amount), t = d.theme;
  const doBorrow = () => { const r = borrow(d.id, amount); if (r.ok) toast(`${d.name}: ${formatNaira(amount)} sent to your wallet.`, 'good'); else { sfx.error(); toast(r.error, 'bad'); } };
  return (
    <>
      <div className={`flex items-center gap-3 ${s.cardR} p-3`} style={{ background: `linear-gradient(120deg, ${t.from}, ${t.to})`, color: t.dark ? '#111' : '#fff' }}>
        <span className="text-3xl">{d.id === 'kwikkash' ? '⚡' : d.id === 'falmfay' ? '🚀' : '🎁'}</span>
        <div className="text-[12.5px] font-semibold leading-snug">Pay back on time and your limit grows to <b>{formatNaira(next)}</b>. {d.id === 'kwikkash' ? 'Pay late and we come to you.' : 'Miss it and late fees add up.'}</div>
      </div>
      <Card s={s}>
        <div className="text-center"><div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.sub }}>How much do you need?</div><div className="mt-1 text-[38px] font-black leading-none">{formatNaira(amount)}</div></div>
        <input type="range" min={LOAN_RULES.minLoan} max={limit} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Loan amount" className="mt-3 h-2 w-full cursor-pointer" style={{ accentColor: t.dark ? '#FACC15' : t.accent }} />
        <div className="mt-1 flex justify-between text-[10.5px] font-semibold" style={{ color: s.sub }}><span>{formatNaira(LOAN_RULES.minLoan)}</span><span>{formatNaira(limit)}</span></div>
        <div className="mt-2 flex gap-2">{LOAN_RULES.chips.map((c) => { const v = Math.max(LOAN_RULES.minLoan, Math.round((limit * c) / 1000) * 1000), on = amount === v; return <button key={c} onClick={() => { sfx.click(); setAmount(v); }} className={`flex-1 py-1.5 text-[12px] font-extrabold ${d.id === 'kwikkash' ? 'rounded-md' : 'rounded-full'}`} style={{ background: on ? s.chipOn : s.chip, color: on ? s.chipOnInk : s.ink }}>{k(v)}</button>; })}</div>
      </Card>
      <Card s={s} className="!py-2">
        <Row s={s} k="You receive" v={formatNaira(amount)} /><Row s={s} k={`Interest (${Math.round(d.interest * 100)}%)`} v={formatNaira(q.interest)} /><Row s={s} k={`Repay in ${d.termDays} day${d.termDays > 1 ? 's' : ''} (about ${real(d.termDays * 1440)} of play)`} v={formatNaira(q.total)} bold />
      </Card>
      {err && <div className="px-1 text-[12px] font-bold text-rose-500">{err}</div>}
      <button disabled={!!err} onClick={doBorrow} className={`w-full py-3.5 text-[15px] font-black transition active:scale-[0.98] disabled:opacity-40 ${s.btnR} ${d.id === 'kwikkash' ? 'uppercase tracking-wide' : ''}`} style={{ background: s.cta, color: s.ctaInk, boxShadow: d.id === 'kwikkash' ? 'none' : s.shadow }}>{d.id === 'kwikkash' ? `Get ${formatNaira(amount)} now` : `Get ${formatNaira(amount)}`}</button>
    </>
  );
}

function Ring({ pct, color, track, children }: { pct: number; color: string; track: string; children: ReactNode }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[132px] w-[132px]"><svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" aria-hidden><circle cx="55" cy="55" r={r} fill="none" stroke={track} strokeWidth="9" /><circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div></div>
  );
}

function Repay({ d, s, loan, minutes, money, goBorrow }: { d: Lender; s: Look; loan: Loan | undefined; minutes: number; money: number; goBorrow: () => void }) {
  const [part, setPart] = useState('');
  if (!loan) return <Card s={s}><div className="py-6 text-center"><div className="text-4xl">✅</div><div className="mt-2 text-[15px] font-extrabold">No loan to repay</div><div className="mt-1 text-[12px]" style={{ color: s.sub }}>You owe {d.name} nothing right now.</div><button onClick={goBorrow} className={`mt-3 px-5 py-2 text-[13px] font-extrabold ${s.btnR}`} style={{ background: s.cta, color: s.ctaInk }}>Borrow</button></div></Card>;
  const owed = owedOn(loan, minutes), late = overdueMinutes(loan, minutes) > 0, fee = lateFee(loan, minutes), left = loan.dueAt - minutes, term = loan.dueAt - loan.takenAt;
  const go = (amt?: number) => { const r = repay(loan.id, amt); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); } else setPart(''); };
  const t = d.theme, num = Number(part);
  return (
    <>
      <Card s={s}>
        <Ring pct={late ? 1 : Math.max(0, left / term)} color={late ? '#EF4444' : t.dark ? '#FACC15' : t.accent} track={s.line}>
          <span className="text-[10.5px] font-bold uppercase" style={{ color: s.sub }}>{late ? 'Overdue' : 'Due in'}</span>
          <span className="text-[22px] font-black leading-tight" style={{ color: late ? '#EF4444' : s.ink }}>{span(late ? -left : left)}</span>
          <span className="text-[10px]" style={{ color: s.sub }}>{late ? '' : `about ${real(left)} of play`}</span>
        </Ring>
        <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: s.sub }}>You owe</div>
        <div className="text-center text-[32px] font-black leading-none">{formatNaira(owed)}</div>
      </Card>
      <Card s={s} className="!py-2">
        <Row s={s} k="Borrowed" v={formatNaira(loan.principal)} /><Row s={s} k="Interest" v={formatNaira(loan.interest)} />{fee > 0 && <Row s={s} k="Late fees" v={formatNaira(fee)} />}{loan.paid > 0 && <Row s={s} k="Already paid" v={`− ${formatNaira(loan.paid)}`} />}
      </Card>
      {late && <div className="rounded-xl bg-rose-500/10 p-3 text-[12px] font-bold text-rose-500">Overdue loans get {d.collectors.crew} sent to you. They will embarrass you wherever you are.</div>}
      <button onClick={() => go()} disabled={money <= 0} className={`w-full py-3.5 text-[15px] font-black transition active:scale-[0.98] disabled:opacity-40 ${s.btnR}`} style={{ background: s.cta, color: s.ctaInk }}>{money >= owed ? `Repay ${formatNaira(owed)}` : `Pay what you have (${formatNaira(money)})`}</button>
      <Card s={s} className="!p-3"><div className="flex items-center gap-2"><input inputMode="numeric" value={part} onChange={(e) => setPart(e.target.value.replace(/\D/g, ''))} placeholder="Pay part" aria-label="Amount to pay" className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[14px] font-bold outline-none" style={{ background: s.chip, color: s.ink }} /><button disabled={!num} onClick={() => go(num)} className={`px-5 py-2.5 text-[13px] font-black disabled:opacity-40 ${s.btnR}`} style={{ background: s.chipOn, color: s.chipOnInk }}>Pay</button></div></Card>
    </>
  );
}

function HistoryTab({ s, rows }: { s: Look; rows: Loan[] }) {
  if (!rows.length) return <Card s={s}><div className="py-6 text-center text-[13px]" style={{ color: s.sub }}>No past loans yet. Your first repayment shows here.</div></Card>;
  return <Card s={s} className="!py-1">{rows.slice(0, 12).map((l, i) => <div key={l.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${s.line}` : 'none' }}><span className="flex h-9 w-9 items-center justify-center rounded-full text-base" style={{ background: l.onTime ? '#DCFCE7' : '#FEF3C7' }}>{l.onTime ? '✓' : '!'}</span><div className="flex-1"><div className="text-[14px] font-extrabold">{formatNaira(l.principal)}</div><div className="text-[11px]" style={{ color: s.sub }}>{l.onTime ? 'Paid on time, limit raised' : 'Paid late, no raise'}</div></div><div className="text-right text-[12px] font-bold">{formatNaira(l.total)}</div></div>)}</Card>;
}

function Info({ d, s, rec }: { d: Lender; s: Look; rec: { onTime: number; late: number } }) {
  return (
    <>
      <Card s={s}>
        <ol className="space-y-3">{d.steps.map((st, i) => <li key={st} className="flex items-center gap-3 text-[13px] font-semibold"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black" style={{ background: s.chipOn, color: s.chipOnInk }}>{i + 1}</span>{st}</li>)}</ol>
      </Card>
      <Card s={s} className="!py-2">
        <Row s={s} k="Interest" v={`${Math.round(d.interest * 100)}%`} /><Row s={s} k="Time to repay" v={`${d.termDays} game day${d.termDays > 1 ? 's' : ''}`} /><Row s={s} k="Late fee" v={`${Math.round(d.lateFeePerDay * 100)}% a day`} /><Row s={s} k="Highest limit" v={formatNaira(d.maxLimit)} /><Row s={s} k="Your record" v={`${rec.onTime} on time · ${rec.late} late`} />
      </Card>
    </>
  );
}
