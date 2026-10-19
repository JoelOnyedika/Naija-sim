import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { formatNaira } from '@/core/format';
import { cleanUsername, findRecipient, sendTransfer, validateTransfer } from '@/game/bank';
import { useEconomyStore } from '@/stores/economyStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card } from '../../ui';

const field = 'w-full bg-transparent text-[17px] font-semibold text-slate-900 outline-none focus:outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-slate-400';

/** Send money: two boxes (the receiver's username, the amount) and one button. Rules live in game/bank.ts. */
export function SendTab({ openReceipt }: { openReceipt?: (id: string) => void }) {
  const money = useEconomyStore((s) => s.money);
  const [to, setTo] = useState(''), [amount, setAmount] = useState(''), [confirm, setConfirm] = useState(false), [done, setDone] = useState<{ txId: string; text: string } | null>(null);
  const value = Number(amount) || 0, name = cleanUsername(to), found = name ? findRecipient(to) : null;
  const problem = name && amount ? validateTransfer({ to, amount: value }) : null;
  const ready = !!name && value > 0 && !validateTransfer({ to, amount: value });
  const edit = () => { setConfirm(false); setDone(null); };

  const send = () => {
    const r = sendTransfer({ to, amount: value });
    setConfirm(false);
    if (!r.ok) { sfx.error(); toast(r.error, 'bad'); return; }
    sfx.coin();
    setDone({ txId: r.txId, text: `${formatNaira(value)} sent to @${r.recipient.username}` });
    setTo(''); setAmount('');
  };

  if (done) return (
    <div className="p-4">
      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <CircleCheck size={52} className="text-emerald-500" strokeWidth={1.6} />
        <p className="font-display text-xl font-extrabold">Money sent</p><p className="text-[14px] text-slate-600">{done.text}</p>
      </Card>
      <div className="mt-3 grid gap-2">{openReceipt && <Btn tone="light" onClick={() => openReceipt(done.txId)}>View receipt</Btn>}<Btn onClick={() => setDone(null)}>Send again</Btn></div>
    </div>
  );

  return (
    <div className="p-4">
      <p className="px-1 text-[13px] text-slate-500">Available <b className="text-slate-800">{formatNaira(money)}</b></p>
      <div className="mt-2 overflow-hidden rounded-2xl bg-white">
        <label className="flex items-center gap-2 px-4 py-3.5"><span className="w-20 shrink-0 text-[13px] font-semibold text-slate-500">To</span>
          <span className="text-[17px] font-semibold text-slate-400">@</span>
          <input value={to} onChange={(e) => { setTo(e.target.value.replace(/\s/g, '')); edit(); }} placeholder="username" aria-label="Receiver's username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={30} className={field} />
          {found && <CircleCheck size={20} className="shrink-0 text-emerald-500" aria-label="Username found" />}</label>
        <div className="mx-4 border-t border-slate-100" />
        <label className="flex items-center gap-2 px-4 py-3.5"><span className="w-20 shrink-0 text-[13px] font-semibold text-slate-500">Amount</span>
          <span className="text-[17px] font-semibold text-slate-400">₦</span>
          <input inputMode="numeric" value={amount ? Number(amount).toLocaleString('en-NG') : ''} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)); edit(); }} placeholder="0" aria-label="Amount in naira" className={field} /></label>
      </div>
      <p className="mt-2 min-h-5 px-1 text-[12.5px] font-medium text-rose-600" role={problem ? 'alert' : undefined}>
        {problem ?? (name && !found ? `No player has the username @${name}.` : '')}
      </p>
      {!confirm ? <Btn className="w-full !bg-accent !py-3.5 !text-[15px]" disabled={!ready} onClick={() => setConfirm(true)}>{ready ? `Send ${formatNaira(value)}` : 'Send'}</Btn> : (
        <Card className="border-2 border-accent">
          <p className="text-[14px]">Send <b>{formatNaira(value)}</b> to <b>@{found?.username}</b>? This cannot be undone.</p>
          <div className="mt-3 flex gap-2"><Btn tone="light" className="flex-1" onClick={() => setConfirm(false)}>Cancel</Btn><Btn className="flex-1 !bg-accent" onClick={send}>Send</Btn></div>
        </Card>
      )}
    </div>
  );
}
