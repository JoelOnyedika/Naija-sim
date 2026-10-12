import { ArrowDownLeft, ArrowUpRight, CircleCheck, X } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { type ContactDef } from '@/data/contacts';
import { MAX_DESCRIPTION, MAX_TRANSFER, TRANSFER_PRESETS, sendTransfer, transferableContacts, validateTransfer } from '@/game/bank';
import { useEconomyStore } from '@/stores/economyStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { toast } from '@/stores/uiStore';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Btn, Card, Chip, Empty, Title } from '../ui';

const dateFmt = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Bank: balance, transfers (presets, description, review step), and an honest history. Rules live in game/bank.ts. */
export function BankApp() {
  const money = useEconomyStore((s) => s.money);
  const transactions = useEconomyStore((s) => s.transactions);
  const people = transferableContacts();
  const [to, setTo] = useState(people[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [review, setReview] = useState(false);
  const [done, setDone] = useState<{ txId: string; to: ContactDef; amount: number } | null>(null);
  const value = Number(amount) || 0;
  const problem = amount ? validateTransfer({ toId: to, amount: value, description: note }) : null;
  const recipient = people.find((c) => c.id === to);
  const canReview = !!amount && !problem;

  const confirm = () => {
    const r = sendTransfer({ toId: to, amount: value, description: note });
    setReview(false);
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    sfx.coin(); setDone({ txId: r.txId, to: r.recipient, amount: value }); setAmount(''); setNote('');
  };
  const openChat = () => { if (!done) return; usePhoneStore.getState().setChatWith(done.to.id); usePhoneStore.getState().openApp('messages'); };

  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-900 p-5 text-white shadow-lg">
        <p className="text-xs text-white/70">Available balance</p>
        <p className="font-display text-3xl font-extrabold tabular-nums"><AnimatedNumber value={money} /></p>
      </div>

      <Title>Send money</Title>
      <Card>
        {done && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-2.5 text-emerald-800" role="status">
            <CircleCheck size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 text-[13px]"><b>Sent {formatNaira(done.amount)}</b> to {done.to.name}.<button onClick={openChat} className="ml-1 font-bold underline">View in chat</button></div>
            <button onClick={() => setDone(null)} aria-label="Dismiss" className="shrink-0"><X size={15} /></button>
          </div>
        )}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2" role="group" aria-label="Recipient">
          {people.map((c) => <Chip key={c.id} active={to === c.id} onClick={() => { setTo(c.id); setDone(null); }}>{c.avatar} {c.name.split(' ')[0]}</Chip>)}
        </div>
        <label className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</label>
        <input inputMode="numeric" value={amount} maxLength={12} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '').replace(/^0+/, '')); setDone(null); }} placeholder="₦0" aria-invalid={!!problem}
          className={`mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[16px] font-bold outline-none ring-2 ${problem ? 'ring-rose-400' : 'ring-transparent focus:ring-accent'}`} />
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Preset amounts">
          {TRANSFER_PRESETS.map((p) => <Chip key={p} active={value === p} onClick={() => setAmount(String(p))}>{formatNaira(p)}</Chip>)}
        </div>
        {amount && !problem && <p className="mt-1 text-xs text-slate-500">You will send <b className="text-slate-800">{formatNaira(value)}</b></p>}
        {problem && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{problem}</p>}
        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description (optional)</label>
        <input value={note} maxLength={MAX_DESCRIPTION} onChange={(e) => setNote(e.target.value)} placeholder="What is it for?" className="mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-[15px] outline-none ring-2 ring-transparent focus:ring-accent" />
        {!review && <Btn className="mt-3 w-full !bg-accent" disabled={!canReview} onClick={() => setReview(true)}>Review transfer</Btn>}
        {review && recipient && (
          <div className="mt-3 rounded-xl border-2 border-accent bg-accent/5 p-3" role="group" aria-label="Confirm transfer">
            <h4 className="font-display text-base font-extrabold">Confirm transfer</h4>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">To</dt><dd className="font-semibold">{recipient.avatar} {recipient.name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-display font-extrabold">{formatNaira(value)}</dd></div>
              {note.trim() && <div className="flex justify-between gap-3"><dt className="text-slate-500">Note</dt><dd className="truncate font-semibold">{note.trim()}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Balance after</dt><dd className="font-semibold tabular-nums">{formatNaira(money - value)}</dd></div>
            </dl>
            <div className="mt-3 flex gap-2">
              <Btn tone="light" className="flex-1" onClick={() => setReview(false)}>Cancel</Btn>
              <Btn className="flex-1 !bg-accent" onClick={confirm}>Send {formatNaira(value)}</Btn>
            </div>
          </div>
        )}
        <p className="mt-1.5 text-center text-[11px] text-slate-400">Limit {formatNaira(MAX_TRANSFER)} per transfer</p>
      </Card>

      <Title>Recent activity</Title>
      <div className="space-y-2">
        {transactions.length === 0 && <Empty>No transactions yet.</Empty>}
        {transactions.slice(0, 40).map((t) => {
          const out = t.amount < 0;
          return (
            <Card key={t.id} className="!p-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${out ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{out ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold leading-tight">{t.label}</div>
                  <div className="truncate text-xs text-slate-500">{dateFmt.format(t.at)}{t.description ? ` · ${t.description}` : ''}</div>
                  {t.status && <span className="mt-0.5 inline-block rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700">Completed</span>}
                </div>
                <span className={`font-display font-extrabold tabular-nums ${out ? 'text-rose-600' : 'text-emerald-600'}`}>{out ? '-' : '+'}{formatNaira(Math.abs(t.amount))}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
