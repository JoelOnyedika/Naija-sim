import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { formatNaira } from '@/core/format';
import { useEconomyStore } from '@/stores/economyStore';

const dateFmt = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Receipt for one banking record. It reads the live transaction by id, so what you see here is exactly what the
 * bank history holds. If the record has aged out of the history, it says so instead of showing made-up figures.
 */
export function TransactionCard({ txId, compact = false }: { txId: string; compact?: boolean }) {
  const tx = useEconomyStore((s) => s.transactions.find((t) => t.id === txId));
  if (!tx) return <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500"><Receipt size={15} />Receipt no longer available</div>;
  const out = tx.amount < 0;
  const Icon = out ? ArrowUpRight : ArrowDownLeft;
  return (
    <div className={`w-full min-w-[13rem] rounded-xl bg-white text-slate-900 ring-1 ring-slate-200 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${out ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}><Icon size={17} strokeWidth={2.5} /></span>
        <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold text-slate-500">{out ? 'Transfer sent' : 'Money received'}</div><div className="font-display text-[17px] font-extrabold leading-tight tabular-nums">{formatNaira(Math.abs(tx.amount))}</div></div>
        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">{tx.status === 'completed' ? 'Completed' : 'Recorded'}</span>
      </div>
      <dl className="mt-2 space-y-0.5 text-[12px]">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">From</dt><dd className="truncate font-semibold">{tx.sender ?? (out ? 'You' : tx.counterparty ?? '-')}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">To</dt><dd className="truncate font-semibold">{tx.recipient ?? (out ? tx.counterparty ?? '-' : 'You')}</dd></div>
        {tx.description && <div className="flex justify-between gap-3"><dt className="text-slate-500">Note</dt><dd className="truncate font-semibold">{tx.description}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-slate-500">When</dt><dd className="font-semibold">{dateFmt.format(tx.at)}</dd></div>
      </dl>
    </div>
  );
}
