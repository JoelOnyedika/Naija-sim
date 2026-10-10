import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { CONTACTS } from '@/data/contacts';
import { copy } from '@/data/copy';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Btn, Card, Chip, Row, Title } from '../ui';

const dateFmt = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function BankApp() {
  const { money, transactions, debit } = useEconomyStore();
  const [to, setTo] = useState('mama');
  const [amount, setAmount] = useState('');
  const value = Math.floor(Number(amount) || 0);
  const send = () => {
    const c = CONTACTS.find((x) => x.id === to)!;
    if (value <= 0) return toast('Enter an amount.', 'bad');
    if (!debit(value, `Transfer to ${c.name}`, 'transfer', c.name)) { sfx.error(); return toast(copy.broke(), 'bad'); }
    sfx.coin(); toast(`Sent ${formatNaira(value)} to ${c.name}`, 'good'); setAmount('');
    setTimeout(() => usePhoneStore.getState().say(c.id, 'them', 'Received. God bless you!'), 800);
  };
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 p-5 text-white shadow-lg"><p className="text-xs text-white/70">Available balance</p><p className="font-display text-3xl font-extrabold"><AnimatedNumber value={money} /></p><p className="mt-2 text-xs text-white/60">Eko Trust Bank · Savings</p></div>
      <Title>Send money</Title>
      <Card>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">{CONTACTS.filter((c) => c.group !== 'business').map((c) => <Chip key={c.id} active={to === c.id} onClick={() => setTo(c.id)}>{c.avatar} {c.name.split(' ')[0]}</Chip>)}</div>
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Amount (₦)" className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] font-bold outline-none" />
        <Btn className="mt-2 w-full" tone="green" onClick={send}>Send</Btn>
      </Card>
      <Title>Recent activity</Title>
      <div className="space-y-2">
        {transactions.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No transactions yet.</p>}
        {transactions.slice(0, 12).map((t) => <Card key={t.id}><Row title={t.label} sub={dateFmt.format(t.at)} right={<span className={`font-display font-extrabold tabular-nums ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{t.amount >= 0 ? '+' : ''}{formatNaira(t.amount)}</span>} /></Card>)}
      </div>
    </div>
  );
}
