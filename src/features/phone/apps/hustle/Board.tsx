import { useMemo, useState } from 'react';
import { HUSTLE_CATEGORIES } from '@/data/players';
import { LOCATIONS } from '@/game/hustle';
import { useHustleStore, type ListingStatus } from '@/stores/hustleStore';
import { Btn, Card, Chip, EmptyState, SearchField } from '../../ui';
import { useGameMinutes } from '../bank/common';
import { JobCard, clientName } from './common';

const BUDGETS = [['any', 'Any budget'], ['low', 'Under ₦20k'], ['mid', '₦20k to ₦50k'], ['high', 'Over ₦50k']] as const;
const STATUSES: ('all' | ListingStatus)[] = ['all', 'open', 'accepted', 'in_progress', 'completed', 'cancelled'];
const PAGE = 15;

/** The marketplace board. `work` = open jobs from others; `board` = every job, any status. */
export function Board({ mode, open }: { mode: 'work' | 'board'; open: (id: string) => void }) {
  const listings = useHustleStore((s) => s.listings), now = useGameMinutes();
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [loc, setLoc] = useState('All'), [bud, setBud] = useState<(typeof BUDGETS)[number][0]>('any'), [status, setStatus] = useState<'all' | ListingStatus>(mode === 'board' ? 'open' : 'all'), [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/^@/, '');
    return listings.filter((l) => (mode === 'board' || (l.clientId !== 'me' && l.status === 'open'))
      && (cat === 'All' || l.category === cat) && (loc === 'All' || l.location === loc)
      && (bud === 'any' || (bud === 'low' ? l.budget < 20_000 : bud === 'mid' ? l.budget >= 20_000 && l.budget <= 50_000 : l.budget > 50_000))
      && (status === 'all' || l.status === status)
      && (!n || `${l.title} ${clientName(l.clientId)} ${l.description} ${l.category}`.toLowerCase().includes(n)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [listings, q, cat, loc, bud, status, mode]);
  const row = (label: string, items: readonly string[], value: string, set: (v: string) => void) => (
    <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1.5" role="group" aria-label={label}>{items.map((i) => <Chip key={i} active={value === i} onClick={() => { set(i); setShown(PAGE); }}>{i === 'all' ? 'All statuses' : i.replace('_', ' ')}</Chip>)}</div>);
  return (
    <div className="p-3">
      <SearchField label="Search jobs or usernames" value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} placeholder="Search jobs or @username" />
      <div className="mt-2">
        {row('Category', ['All', ...HUSTLE_CATEGORIES], cat, setCat)}
        {row('Location', ['All', ...LOCATIONS], loc, setLoc)}
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1.5" role="group" aria-label="Budget">{BUDGETS.map(([id, t]) => <Chip key={id} active={bud === id} onClick={() => { setBud(id); setShown(PAGE); }}>{t}</Chip>)}</div>
        {mode === 'board' && row('Status', STATUSES, status, (v) => setStatus(v as 'all' | ListingStatus))}
      </div>
      <p className="px-1 py-1 text-xs text-slate-500">{list.length} job{list.length === 1 ? '' : 's'}</p>
      <div className="space-y-2">
        {list.length === 0 && <Card><EmptyState glyph="🔎" title="No jobs match">Try other filters. New sample jobs appear every game day.</EmptyState></Card>}
        {list.slice(0, shown).map((l) => <JobCard key={l.id} l={l} now={now} onOpen={open} mine={l.clientId === 'me'} />)}
        {list.length > shown && <Btn tone="light" className="w-full" onClick={() => setShown(shown + PAGE)}>Show more</Btn>}
      </div>
    </div>
  );
}
