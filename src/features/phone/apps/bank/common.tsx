import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { formatNaira } from '@/core/format';
import { fmtGame } from '@/core/gameTime';
import { useClockStore } from '@/stores/clockStore';
import type { Transaction } from '@/stores/economyStore';
import { Card } from '../../ui';

const realFmt = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** Game time when the entry has it; older saved entries only have the real time. */
export const whenOf = (t: Transaction) => (t.gameMinutes !== undefined ? fmtGame(t.gameMinutes) : realFmt.format(t.at));
export const dirOf = (t: Transaction): 'income' | 'expense' => t.direction ?? (t.amount < 0 ? 'expense' : 'income');

/** The in-game minute, refreshed every few seconds (enough for countdowns without re-rendering every tick). */
export const useGameMinutes = () => useClockStore((s) => Math.floor(s.minutes / 5) * 5);

export const FILTERS = [['all', 'All'], ['income', 'Income'], ['expense', 'Expenses'], ['transfer', 'Transfers'], ['purchase', 'Purchases'], ['invest', 'Investments'], ['bill', 'Bills'], ['business', 'Business']] as const;
export type Filter = (typeof FILTERS)[number][0];
const GROUPS: Record<Exclude<Filter, 'all' | 'income' | 'expense'>, string[]> = {
  transfer: ['transfer'], purchase: ['purchase', 'food', 'visit', 'bet', 'refund'], invest: ['invest', 'bond', 'savings', 'interest'], bill: ['bill', 'tax'], business: ['business'],
};
export function matchesFilter(t: Transaction, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'income') return dirOf(t) === 'income' && !t.internal;
  if (f === 'expense') return dirOf(t) === 'expense' && !t.internal;
  return GROUPS[f].includes(t.kind);
}

export function TxRow({ t, onOpen, showBalance }: { t: Transaction; onOpen?: (id: string) => void; showBalance?: boolean }) {
  const out = dirOf(t) === 'expense';
  const Icon = t.internal ? ArrowLeftRight : out ? ArrowUpRight : ArrowDownLeft;
  const tone = t.internal ? 'bg-sky-100 text-sky-600' : out ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600';
  const body = (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={17} /></span>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[14px] font-bold leading-tight">{t.label}</div>
        <div className="truncate text-xs text-slate-500">{whenOf(t)}{t.description ? ` · ${t.description}` : ''}</div>
        {showBalance && t.balanceAfter !== undefined && <div className="text-[11px] text-slate-400">Balance {formatNaira(t.balanceAfter)}</div>}
      </div>
      <span className={`font-display font-extrabold tabular-nums ${t.internal ? 'text-sky-600' : out ? 'text-rose-600' : 'text-emerald-600'}`}>{out ? '-' : '+'}{formatNaira(Math.abs(t.amount))}</span>
    </div>
  );
  return <Card className="!p-3">{onOpen ? <button className="w-full" onClick={() => onOpen(t.id)} aria-label={`${t.label}, open receipt`}>{body}</button> : body}</Card>;
}
