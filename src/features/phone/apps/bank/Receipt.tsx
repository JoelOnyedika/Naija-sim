import { formatNaira } from '@/core/format';
import { refOf, useEconomyStore } from '@/stores/economyStore';
import { Card, EmptyState, Note } from '../../ui';
import { dirOf, whenOf } from './common';

const REF_LABEL: Record<string, string> = { bond: 'Bond', bill: 'Weekly bill', savings: 'Savings account', tax: 'Income tax' };

/** A receipt for one ledger entry (the latest unless one was chosen in Money History). Nothing here is invented: every line is read from the entry. */
export function ReceiptTab({ txId }: { txId: string | null }) {
  const tx = useEconomyStore((s) => (txId ? s.transactions.find((t) => t.id === txId) : s.transactions[0]));
  if (!tx) return <div className="p-3"><Card><EmptyState glyph="🧾" title="No receipt yet">Your most recent transaction appears here as a receipt. Pick any entry in Money History to see its receipt.</EmptyState></Card></div>;
  const out = dirOf(tx) === 'expense';
  const to = tx.recipient ?? (out ? tx.counterparty ?? tx.label : 'You'), from = tx.sender ?? (out ? 'You' : tx.counterparty ?? tx.label);
  const rows: [string, string][] = [
    [out ? 'Paid to' : 'Received from', out ? to : from], ['Description', tx.description ?? tx.label], ['Date and time', whenOf(tx)],
    ['Payment method', tx.internal ? 'Wallet and in-game accounts' : 'Wallet'], ['Reference', refOf(tx)], ['Status', (tx.status ?? 'completed').replace(/^./, (c) => c.toUpperCase())],
    ...(tx.ref ? [['Related to', REF_LABEL[tx.ref.type] ?? tx.ref.type] as [string, string]] : []),
    ...(tx.balanceAfter !== undefined ? [['Balance after', formatNaira(tx.balanceAfter)] as [string, string]] : []),
  ];
  return (
    <div className="p-3">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-md" style={{ backgroundImage: 'radial-gradient(circle at 10px 100%, transparent 7px, #fff 8px)', backgroundSize: '20px 14px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom' }}>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Nigeria Life · Receipt</p>
        <p className="mt-3 text-center text-xs text-slate-500">{tx.label}</p>
        <p className={`text-center font-display text-4xl font-extrabold tabular-nums ${tx.internal ? 'text-sky-600' : out ? 'text-slate-900' : 'text-emerald-600'}`}>{formatNaira(Math.abs(tx.amount))}</p>
        <dl className="mt-4 space-y-2 border-t border-dashed border-slate-300 pt-4 text-[13px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 break-words text-right font-semibold">{v}</dd></div>)}
        </dl>
        <p className="mt-4 pb-3 text-center text-[11px] text-slate-400">In-game record</p>
      </div>
      <div className="mt-3"><Note>Receipts are made from your ledger entries, so they always match your Money History.</Note></div>
    </div>
  );
}
