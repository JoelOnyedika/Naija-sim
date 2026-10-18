import { useMemo, useState } from 'react';
import { useEconomyStore, refOf } from '@/stores/economyStore';
import { Card, Chip, EmptyState, Btn, SearchField } from '../../ui';
import { FILTERS, TxRow, matchesFilter, type Filter } from './common';

const PAGE = 30;
/** The full ledger: searchable, filterable, loaded in pages so a long history stays quick. */
export function HistoryTab({ openReceipt }: { openReceipt: (id: string) => void }) {
  const txs = useEconomyStore((s) => s.transactions);
  const [filter, setFilter] = useState<Filter>('all'), [q, setQ] = useState(''), [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return txs.filter((t) => matchesFilter(t, filter) && (!needle || `${t.label} ${t.kind} ${t.description ?? ""} ${t.counterparty ?? ""} ${refOf(t)}`.toLowerCase().includes(needle)));
  }, [txs, filter, q]);
  return (
    <div className="p-3">
      <SearchField label="Search transactions" value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} placeholder="Search by name, note or reference" />
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="Filter">
        {FILTERS.map(([id, text]) => <Chip key={id} active={filter === id} onClick={() => { setFilter(id); setShown(PAGE); }}>{text}</Chip>)}
      </div>
      <p className="mt-2 px-1 text-xs text-slate-500">{list.length} {list.length === 1 ? 'entry' : 'entries'}{txs.length >= 1000 ? ' (the latest 1,000 are kept)' : ''}</p>
      <div className="mt-2 space-y-2">
        {list.length === 0 && <Card><EmptyState glyph="🔎" title={txs.length ? 'Nothing matches' : 'No transactions yet'}>{txs.length ? 'Try another filter or search.' : 'Money you earn and spend is listed here.'}</EmptyState></Card>}
        {list.slice(0, shown).map((t) => <TxRow key={t.id} t={t} onOpen={openReceipt} showBalance />)}
        {list.length > shown && <Btn tone="light" className="w-full" onClick={() => setShown(shown + PAGE)}>Show more</Btn>}
      </div>
    </div>
  );
}
